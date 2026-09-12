/** A-03: actual JWTs, HTTP routes and PostgreSQL in the isolated E2E environment. */
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { createEmbeddingPresignToken } from '@documenso/lib/server-only/embedding-presign/create-embedding-presign-token';
import { createApiToken } from '@documenso/lib/server-only/public-api/create-api-token';
import { mapSecondaryIdToDocumentId, mapSecondaryIdToTemplateId } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import { seedBlankDocument } from '@documenso/prisma/seed/documents';
import { seedTeam, seedTeamMember } from '@documenso/prisma/seed/teams';
import { seedBlankTemplate } from '@documenso/prisma/seed/templates';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
type Kind = 'document' | 'template' | 'envelope';
const fixture = async (kind: Kind = 'document') => {
  const { owner, team } = await seedTeam();
  const issuer = await seedTeamMember({ teamId: team.id });
  const foreignTeam = await prisma.team.findFirstOrThrow({ where: { organisation: { ownerUserId: issuer.id } } });
  const key = await createApiToken({
    userId: issuer.id,
    teamId: team.id,
    tokenName: 'A-03 synthetic',
    expiresIn: null,
  });
  const seed = (teamId: number) =>
    kind === 'template'
      ? seedBlankTemplate(issuer, teamId)
      : seedBlankDocument(issuer, teamId, { internalVersion: kind === 'envelope' ? 2 : 1 });
  const records = await Promise.all([seed(team.id), seed(team.id), seed(foreignTeam.id)]);
  const [local, sibling, foreign] = await Promise.all(
    records.map((row) =>
      prisma.envelope.findUniqueOrThrow({
        where: { id: row.id },
        include: { envelopeItems: { include: { documentData: true } } },
      }),
    ),
  );
  const presign = async (scope?: string) => (await createEmbeddingPresignToken({ apiToken: key.token, scope })).token;
  return { owner, team, issuer, key, local, sibling, foreign, presign };
};
type Envelope = Awaited<ReturnType<typeof fixture>>['local'];
const scopeFor = (kind: Kind, envelope: Envelope) =>
  kind === 'envelope'
    ? `envelopeId:${envelope.id}`
    : kind === 'template'
      ? `templateId:${mapSecondaryIdToTemplateId(envelope.secondaryId)}`
      : `documentId:${mapSecondaryIdToDocumentId(envelope.secondaryId)}`;
const paths = (envelope: Envelope, token: string) => {
  const item = envelope.envelopeItems[0];
  return [
    `${baseURL}/api/files/envelope/${envelope.id}/envelopeItem/${item.id}?token=${encodeURIComponent(token)}`,
    `${baseURL}/api/files/envelope/${envelope.id}/envelopeItem/${item.id}/dataId/${item.documentDataId}/current/item.pdf?presignToken=${encodeURIComponent(token)}`,
  ];
};
const expectOk = async (response: APIResponse) => {
  expect(response.ok(), await response.text()).toBe(true);
};
const expectPdf = async (response: APIResponse) => {
  await expectOk(response);
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  expect(response.headers()['cache-control']).toContain('private');
  expect(response.headers()['cache-control']).toContain('no-store');
};
const expectDenied = async (response: APIResponse) => {
  expect(response.ok()).toBe(false);
  expect((await response.json()).error.json.data.code).toBe('UNAUTHORIZED');
};
const trpc = (request: APIRequestContext, name: string, token: string, input: Record<string, unknown>) =>
  request.post(`${baseURL}/api/trpc/embeddingPresign.${name}`, {
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    data: JSON.stringify({ json: input }),
  });
const file = (envelope: Envelope) => ({
  name: 'a03-test.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from(envelope.envelopeItems[0].documentData.data, 'base64'),
});

test('A-03 PDF consumers keep the issuing team and the chosen resource', async ({ request }) => {
  const { local, sibling, foreign, presign } = await fixture();
  const broad = await presign();
  for (const path of paths(foreign, broad)) {
    expect((await request.get(path)).status()).toBe(404);
  }
  for (const path of paths(sibling, broad)) {
    await expectPdf(await request.get(path));
  }
  for (const scope of [scopeFor('document', local), scopeFor('envelope', local)]) {
    const restricted = await presign(scope);
    for (const path of paths(sibling, restricted)) {
      expect((await request.get(path)).status()).toBe(404);
    }
    for (const path of paths(local, restricted)) {
      await expectPdf(await request.get(path));
    }
  }
});

for (const reason of [
  'expired',
  'issuer disabled',
  'organisation owner disabled',
  'membership removed',
  'parent deleted',
] as const) {
  test(`A-03 a previously valid PDF pass is revoked when its parent is ${reason}`, async ({ request }) => {
    const { owner, issuer, team, key, local, presign } = await fixture();
    const jwt = await presign(scopeFor('document', local));
    const before = await request.get(paths(local, jwt)[0]);
    await expectPdf(before);
    if (reason === 'expired') {
      await prisma.apiToken.update({ where: { id: key.id }, data: { expires: new Date(0) } });
    } else if (reason === 'parent deleted') {
      await prisma.apiToken.delete({ where: { id: key.id } });
    } else if (reason === 'membership removed') {
      const removed = await prisma.organisationGroupMember.deleteMany({
        where: { organisationMember: { userId: issuer.id, organisationId: team.organisationId } },
      });
      expect(removed.count).toBeGreaterThan(0);
    } else {
      await prisma.user.update({
        where: { id: reason === 'issuer disabled' ? issuer.id : owner.id },
        data: { disabled: true },
      });
    }
    for (const path of paths(local, jwt)) {
      const denied = await request.get(path, { headers: { 'If-None-Match': before.headers().etag ?? 'cached' } });
      expect(denied.status()).toBe(404);
      expect((await denied.body()).subarray(0, 5).toString()).not.toBe('%PDF-');
    }
  });
}

for (const kind of ['document', 'template', 'envelope'] as const) {
  test(`A-03 restricted passes cannot create ${kind}s; team-wide creation still works`, async ({ request }) => {
    const { team, issuer, local, presign } = await fixture();
    const restricted = await presign(scopeFor('document', local));
    const broad = await presign();
    const upload = await request.post(`${baseURL}/api/files/upload-pdf?token=${encodeURIComponent(broad)}`, {
      multipart: { file: file(local) },
    });
    await expectOk(upload);
    const { id: documentDataId } = await upload.json();
    const create = (jwt: string) =>
      kind === 'envelope'
        ? request.post(`${baseURL}/api/trpc/embeddingPresign.createEmbeddingEnvelope`, {
            headers: { Authorization: `Bearer ${jwt}` },
            multipart: {
              payload: JSON.stringify({ title: 'A-03 permitted creation', type: 'DOCUMENT' }),
              files: file(local),
            },
          })
        : trpc(request, kind === 'document' ? 'createEmbeddingDocument' : 'createEmbeddingTemplate', jwt, {
            title: 'A-03 permitted creation',
            documentDataId,
            recipients: [],
          });
    const count = await prisma.envelope.count({ where: { userId: issuer.id } });
    await expectDenied(await create(restricted));
    expect(await prisma.envelope.count({ where: { userId: issuer.id } })).toBe(count);
    await expectOk(await create(broad));
    expect(await prisma.envelope.count({ where: { userId: issuer.id } })).toBe(count + 1);
    expect(
      await prisma.envelope.count({ where: { userId: issuer.id, teamId: team.id, title: 'A-03 permitted creation' } }),
    ).toBe(1);
  });

  test(`A-03 ${kind} updates enforce resource and team while allowing their intended target`, async ({ request }) => {
    const { local, sibling, foreign, presign } = await fixture(kind);
    const restricted = await presign(scopeFor(kind, local));
    const broad = await presign();
    const editPage = (envelope: Envelope, jwt: string) => {
      const id =
        kind === 'envelope'
          ? envelope.id
          : kind === 'template'
            ? mapSecondaryIdToTemplateId(envelope.secondaryId)
            : mapSecondaryIdToDocumentId(envelope.secondaryId);
      return `${baseURL}/embed/${kind === 'envelope' ? 'v2' : 'v1'}/authoring/${kind}/edit/${id}?token=${encodeURIComponent(jwt)}`;
    };
    const update = (envelope: Envelope, jwt: string) =>
      kind === 'envelope'
        ? request.post(`${baseURL}/api/trpc/embeddingPresign.updateEmbeddingEnvelope`, {
            headers: { Authorization: `Bearer ${jwt}` },
            multipart: {
              payload: JSON.stringify({
                envelopeId: envelope.id,
                data: {
                  title: 'A-03 authorized update',
                  envelopeItems: envelope.envelopeItems.map(({ id, title, order }) => ({ id, title, order })),
                  recipients: [],
                  attachments: [],
                },
              }),
            },
          })
        : trpc(request, kind === 'document' ? 'updateEmbeddingDocument' : 'updateEmbeddingTemplate', jwt, {
            ...(kind === 'document'
              ? { documentId: mapSecondaryIdToDocumentId(envelope.secondaryId) }
              : { templateId: mapSecondaryIdToTemplateId(envelope.secondaryId) }),
            title: 'A-03 authorized update',
            recipients: [],
          });
    for (const [target, jwt] of [
      [sibling, restricted],
      [foreign, broad],
    ] as const) {
      await expectDenied(await update(target, jwt));
      expect(await prisma.envelope.findUnique({ where: { id: target.id } })).toMatchObject({ title: target.title });
      expect(await prisma.documentAuditLog.count({ where: { envelopeId: target.id } })).toBe(0);
      const page = await request.get(editPage(target, jwt), { maxRedirects: 0 });
      expect(page.ok()).toBe(false);
    }
    await expectOk(await update(local, restricted));
    expect(await prisma.envelope.findUnique({ where: { id: local.id } })).toMatchObject({
      title: 'A-03 authorized update',
    });
    await expectOk(await request.get(editPage(local, restricted)));
    for (const path of paths(local, restricted)) {
      await expectPdf(await request.get(path));
    }
  });
}
