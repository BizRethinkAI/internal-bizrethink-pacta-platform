/** A-04: real HTTP, login cookies, PostgreSQL and PDF bytes in the isolated E2E environment. */
import { PDFDocument } from '@cantoo/pdf-lib';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { createApiToken } from '@documenso/lib/server-only/public-api/create-api-token';
import { getFileServerSide } from '@documenso/lib/universal/upload/get-file.server';
import { mapSecondaryIdToTemplateId } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import { seedBlankDocument } from '@documenso/prisma/seed/documents';
import { seedTeam, seedTeamMember } from '@documenso/prisma/seed/teams';
import { seedBlankTemplate } from '@documenso/prisma/seed/templates';
import { seedUser } from '@documenso/prisma/seed/users';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { DocumentDataType, DocumentVisibility, TeamMemberRole } from '@prisma/client';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
const twoPagePdf = async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('A-04 permitted replacement, page one');
  pdf.addPage().drawText('A-04 permitted replacement, page two');
  pdf
    .getForm()
    .createTextField('customer_name')
    .addToPage(pdf.getPages()[0], { x: 40, y: 100, width: 240, height: 24 });
  return Buffer.from(await pdf.save());
};
const expectOk = async (response: APIResponse) => {
  expect(response.ok(), await response.text()).toBe(true);
};
const signIn = async (request: APIRequestContext, email: string) => {
  const csrf = await request.get(`${baseURL}/api/auth/csrf`);
  await expectOk(csrf);
  const { csrfToken } = await csrf.json();
  await expectOk(
    await request.post(`${baseURL}/api/auth/email-password/authorize`, {
      data: { email, password: 'password', csrfToken },
    }),
  );
  const session = await request.get(`${baseURL}/api/auth/session`);
  expect((await session.json()).user?.email).toBe(email);
};
const inputFor = (template: { secondaryId: string }) => ({
  templateId: mapSecondaryIdToTemplateId(template.secondaryId),
  recipients: [],
  distributeDocument: false,
});
const humanUse = (request: APIRequestContext, teamId: number, input: Record<string, unknown>) =>
  request.post(`${baseURL}/api/trpc/template.createDocumentFromTemplate`, {
    headers: { 'x-team-id': String(teamId), 'content-type': 'application/json' },
    data: JSON.stringify({ json: input }),
  });
const expectCopiedPdf = async (teamId: number, externalId: string, originalId?: string) => {
  const document = await prisma.envelope.findFirstOrThrow({
    where: { teamId, externalId, type: 'DOCUMENT' },
    include: { envelopeItems: { include: { documentData: true } } },
  });
  const item = document.envelopeItems[0];
  expect(item.documentDataId).not.toBe(originalId);
  const pdf = await PDFDocument.load(await getFileServerSide(item.documentData));
  expect(pdf.getPageCount()).toBe(2);
  return pdf;
};

for (const mapping of ['legacy', 'explicit'] as const) {
  test(`A-04 ${mapping} replacements retain the API team boundary before document creation`, async ({ request }) => {
    const { team: teamB } = await seedTeam();
    const user = await seedTeamMember({ teamId: teamB.id });
    const teamA = await prisma.team.findFirstOrThrow({ where: { organisation: { ownerUserId: user.id } } });
    const key = await createApiToken({ userId: user.id, teamId: teamA.id, tokenName: 'A-04 source', expiresIn: null });
    const template = await seedBlankTemplate(user, teamA.id);
    // The creator really owns this foreign-team document. A-02 forbids the
    // key reading it directly; A-04 must also forbid copying its known data ID.
    const foreign = await seedBlankDocument(user, teamB.id);
    const local = await seedBlankDocument(user, teamA.id);
    const replacement = (id: string) =>
      mapping === 'legacy'
        ? { customDocumentDataId: id }
        : {
            customDocumentData: [{ documentDataId: id, envelopeItemId: template.envelopeItems[0].id }],
          };
    const headers = { Authorization: `Bearer ${key.token}`, 'x-team-id': String(teamB.id) };
    const foreignData = await prisma.documentData.findFirstOrThrow({
      where: { envelopeItem: { envelopeId: foreign.id } },
    });
    const foreignId = foreignData.id;
    const before = await prisma.envelope.count({ where: { userId: user.id } });
    const denied = await request.post(`${baseURL}/api/v2/template/use`, {
      headers,
      data: { ...inputFor(template), ...replacement(foreignId) },
    });
    expect(denied.status()).toBe(404);
    expect(await denied.text()).toContain('Replacement PDF not found or unavailable');
    expect(await prisma.envelope.count({ where: { userId: user.id } })).toBe(before);
    expect(await prisma.documentData.findUnique({ where: { id: foreignId } })).toEqual(foreignData);

    const { id: localId } = await prisma.documentData.findFirstOrThrow({
      where: { envelopeItem: { envelopeId: local.id } },
    });
    const bytes = (await twoPagePdf()).toString('base64');
    await prisma.documentData.update({ where: { id: localId }, data: { data: bytes, initialData: bytes } });
    const externalId = `a04-${template.id}`;
    await expectOk(
      await request.post(`${baseURL}/api/v2/template/use`, {
        headers,
        data: { ...inputFor(template), ...replacement(localId), externalId },
      }),
    );
    await expectCopiedPdf(teamA.id, externalId, localId);
    // Existing consumers can still use only a template and form values.
    await prisma.documentData.update({
      where: { id: template.envelopeItems[0].documentDataId },
      data: { data: bytes, initialData: bytes },
    });
    const formExternalId = `a04-form-${template.id}`;
    await expectOk(
      await request.post(`${baseURL}/api/v2/template/use`, {
        headers,
        data: {
          ...inputFor(template),
          externalId: formExternalId,
          formValues: { customer_name: 'Synthetic A-04 customer' },
        },
      }),
    );
    const filledPdf = await expectCopiedPdf(teamA.id, formExternalId, template.envelopeItems[0].documentDataId);
    expect(filledPdf.getForm().getTextField('customer_name').getText()).toBe('Synthetic A-04 customer');
  });
}

test('A-04 historical unattached PDFs cannot be claimed by knowing their ID', async ({ request }) => {
  const { user, team } = await seedUser();
  const template = await seedBlankTemplate(user, team.id);
  const bytes = (await twoPagePdf()).toString('base64');
  const orphan = await prisma.documentData.create({
    data: { type: DocumentDataType.BYTES_64, data: bytes, initialData: bytes },
  });
  await signIn(request, user.email);
  for (const documentDataId of [orphan.id, 'a04-nonexistent-data-id']) {
    const response = await humanUse(request, team.id, { ...inputFor(template), customDocumentDataId: documentDataId });
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('Replacement PDF not found or unavailable');
  }
  expect(await prisma.envelope.count({ where: { userId: user.id, type: 'DOCUMENT' } })).toBe(0);
  expect(await prisma.bizrethinkPdfUpload.findUnique({ where: { documentDataId: orphan.id } })).toBeNull();
});

test('A-04 a real browser upload belongs to its uploader, without granting their API keys global access', async ({
  request,
  playwright,
}) => {
  const owner = await seedUser();
  const stranger = await seedUser();
  const template = await seedBlankTemplate(owner.user, owner.team.id);
  const strangerTemplate = await seedBlankTemplate(stranger.user, stranger.team.id);
  await signIn(request, owner.user.email);
  const upload = await request.post(`${baseURL}/api/files/upload-pdf`, {
    multipart: {
      file: { name: 'replacement.pdf', mimeType: 'application/pdf', buffer: await twoPagePdf() },
      userId: String(stranger.user.id),
      teamId: String(stranger.team.id),
    },
  });
  await expectOk(upload);
  const { id } = await upload.json();
  expect(await prisma.bizrethinkPdfUpload.findUnique({ where: { documentDataId: id } })).toMatchObject({
    userId: owner.user.id,
    teamId: null,
  });
  const otherRequest = await playwright.request.newContext();
  const apiRequest = await playwright.request.newContext();
  try {
    await signIn(otherRequest, stranger.user.email);
    const denied = await humanUse(otherRequest, stranger.team.id, {
      ...inputFor(strangerTemplate),
      customDocumentDataId: id,
    });
    expect(denied.status()).toBe(404);
    const key = await createApiToken({
      userId: owner.user.id,
      teamId: owner.team.id,
      tokenName: 'A-04 browser isolation',
      expiresIn: null,
    });
    const apiDenied = await apiRequest.post(`${baseURL}/api/v2/template/use`, {
      headers: { Authorization: `Bearer ${key.token}` },
      data: { ...inputFor(template), customDocumentDataId: id },
    });
    expect(apiDenied.status()).toBe(404);
  } finally {
    await otherRequest.dispose();
    await apiRequest.dispose();
  }
  const externalId = `a04-upload-${template.id}`;
  await expectOk(
    await humanUse(request, owner.team.id, { ...inputFor(template), customDocumentDataId: id, externalId }),
  );
  await expectCopiedPdf(owner.team.id, externalId, id);
  expect(await prisma.envelope.count({ where: { userId: stranger.user.id, type: 'DOCUMENT' } })).toBe(0);
});

test('A-04 multipart envelope use records the authenticated API team and copies its fresh upload', async ({
  request,
}) => {
  const { user, team } = await seedUser();
  const key = await createApiToken({ userId: user.id, teamId: team.id, tokenName: 'A-04 multipart', expiresIn: null });
  const template = await seedBlankTemplate(user, team.id, { createTemplateOptions: { internalVersion: 2 } });
  const externalId = `a04-multipart-${template.id}`;
  await expectOk(
    await request.post(`${baseURL}/api/v2/envelope/use`, {
      headers: { Authorization: `Bearer ${key.token}` },
      multipart: {
        payload: JSON.stringify({
          envelopeId: template.id,
          recipients: [],
          externalId,
          customDocumentData: [{ identifier: 'replacement.pdf', envelopeItemId: template.envelopeItems[0].id }],
        }),
        files: { name: 'replacement.pdf', mimeType: 'application/pdf', buffer: await twoPagePdf() },
      },
    }),
  );
  const receipts = await prisma.bizrethinkPdfUpload.findMany({ where: { userId: user.id, teamId: team.id } });
  expect(receipts).toHaveLength(1);
  await expectCopiedPdf(team.id, externalId, receipts[0].documentDataId);
});

test('A-04 same-team membership cannot copy an ADMIN-only source', async ({ request }) => {
  const { user: owner, team } = await seedUser();
  const member = await seedTeamMember({ teamId: team.id, role: TeamMemberRole.MEMBER });
  const template = await seedBlankTemplate(member, team.id);
  const protectedDocument = await seedBlankDocument(owner, team.id, {
    createDocumentOptions: { visibility: DocumentVisibility.ADMIN },
  });
  await signIn(request, member.email);
  const source = await prisma.documentData.findFirstOrThrow({
    where: { envelopeItem: { envelopeId: protectedDocument.id } },
  });
  const response = await humanUse(request, team.id, {
    ...inputFor(template),
    customDocumentDataId: source.id,
  });
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain('Replacement PDF not found or unavailable');
  expect(await prisma.envelope.count({ where: { userId: member.id, type: 'DOCUMENT' } })).toBe(0);
});
