/** A-12/A-13/A-23/A-24: real HTTP, signed sessions and PostgreSQL in isolated CI. */
import { randomUUID } from 'node:crypto';

import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { createEmbeddingPresignToken } from '@documenso/lib/server-only/embedding-presign/create-embedding-presign-token';
import { createApiToken } from '@documenso/lib/server-only/public-api/create-api-token';
import { createTeam } from '@documenso/lib/server-only/team/create-team';
import { mapSecondaryIdToDocumentId } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import { seedBlankDocument } from '@documenso/prisma/seed/documents';
import { seedTeamMember } from '@documenso/prisma/seed/teams';
import { seedBlankTemplate } from '@documenso/prisma/seed/templates';
import { seedUser } from '@documenso/prisma/seed/users';
import { createTeamMembers } from '@documenso/trpc/server/team-router/create-team-members';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import {
  DocumentVisibility,
  FolderType,
  OrganisationGroupType,
  Prisma,
  TeamMemberRole,
  TemplateType,
} from '@prisma/client';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
const seedDocument = async (...args: Parameters<typeof seedBlankDocument>) => {
  const document = await seedBlankDocument(...args);
  return await prisma.envelope.findUniqueOrThrow({ where: { id: document.id }, include: { envelopeItems: true } });
};

type Seed = Awaited<ReturnType<typeof seedUser>>;
type Access = {
  sender: Seed;
  member: Seed['user'];
  memberRequest: APIRequestContext;
  login: (email: string) => Promise<APIRequestContext>;
};
const test = base.extend<{ access: Access }>({
  access: async ({ playwright }, use) => {
    const sender = await seedUser();
    const member = await seedTeamMember({ teamId: sender.team.id, role: TeamMemberRole.MEMBER });
    const clients: APIRequestContext[] = [];
    const login = async (email: string) => {
      const client = await playwright.request.newContext({ baseURL });
      clients.push(client);
      const csrf = await client.get('/api/auth/csrf');
      expect(csrf.status()).toBe(200);
      const { csrfToken } = await csrf.json();
      const response = await client.post('/api/auth/email-password/authorize', {
        data: { email, password: 'password', csrfToken },
      });
      expect(response.status(), await response.text()).toBe(200);
      expect((await (await client.get('/api/auth/session')).json()).user?.email).toBe(email);
      return client;
    };
    try {
      const memberRequest = await login(member.email);
      await use({ sender, member, memberRequest, login });
    } finally {
      await Promise.all(clients.map((client) => client.dispose()));
    }
  },
});

const trpc = (
  request: APIRequestContext,
  name: string,
  teamId: number,
  input: Record<string, unknown>,
  mutation = false,
) => {
  const headers = { 'x-team-id': String(teamId), 'content-type': 'application/json' };
  const data = JSON.stringify({ json: input });
  return mutation
    ? request.post(`/api/trpc/${name}`, { headers, data })
    : request.get(`/api/trpc/${name}?input=${encodeURIComponent(data)}`, { headers });
};
const expectOk = async (response: APIResponse) => expect(response.status(), await response.text()).toBe(200);
const expectNotFound = async (response: APIResponse) => {
  expect(response.status(), await response.text()).toBe(404);
  const body = (await response.json()).error.json;
  expect(body.data.code).toBe('NOT_FOUND');
  return { message: body.message, code: body.data.code };
};
type FileEnvelope = { id: string; envelopeItems: Array<{ id: string; documentDataId: string }> };
const pdfPaths = (envelope: FileEnvelope) => {
  const item = envelope.envelopeItems[0];
  const path = `/api/files/envelope/${envelope.id}/envelopeItem/${item.id}`;
  return [
    path,
    `${path}/download/original`,
    `${path}/download/signed`,
    `${path}/dataId/${item.documentDataId}/current/item.pdf`,
  ];
};
const expectPdf = async (response: APIResponse) => {
  await expectOk(response);
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  expect(response.headers()['cache-control']).toContain('private');
  expect(response.headers()['cache-control']).toContain('no-store');
};
const folder = (
  access: Access,
  parentId: string | null = null,
  visibility: DocumentVisibility = DocumentVisibility.EVERYONE,
) =>
  prisma.folder.create({
    data: {
      name: 'Permission fixture',
      userId: access.sender.user.id,
      teamId: access.sender.team.id,
      parentId,
      visibility,
      type: FolderType.DOCUMENT,
    },
  });
const remove = (access: Access, folderId: string, request = access.memberRequest) =>
  trpc(request, 'folder.deleteFolder', access.sender.team.id, { folderId }, true);
const move = (access: Access, folderId: string, parentId: string | null, request = access.memberRequest) =>
  trpc(request, 'folder.updateFolder', access.sender.team.id, { folderId, data: { parentId } }, true);

test('A-12 rejects foreign-team contact suggestions for empty and matching queries', async ({ access }) => {
  const foreign = await seedUser();
  for (const query of ['', foreign.user.email]) {
    const response = await trpc(access.memberRequest, 'recipient.suggestions.find', foreign.team.id, { query });
    await expectNotFound(response);
    expect(await response.text()).not.toContain(foreign.user.email);
  }
  const own = await trpc(access.memberRequest, 'recipient.suggestions.find', access.sender.team.id, {
    query: access.sender.user.email,
  });
  await expectOk(own);
  expect((await own.json()).result.data.json.results).toContainEqual({
    name: access.sender.user.name,
    email: access.sender.user.email,
  });
});

test('A-12 suggestions retain visible and owned history while excluding role-hidden recipients', async ({ access }) => {
  const marker = `permission-${randomUUID()}`;
  const visible = await seedDocument(access.sender.user, access.sender.team.id);
  const hidden = await seedDocument(access.sender.user, access.sender.team.id, {
    createDocumentOptions: { visibility: DocumentVisibility.ADMIN },
  });
  const owned = await seedDocument(access.member, access.sender.team.id, {
    createDocumentOptions: { visibility: DocumentVisibility.ADMIN },
  });
  for (const [kind, envelope] of [
    ['visible', visible],
    ['hidden', hidden],
    ['owned', owned],
  ] as const) {
    await prisma.recipient.create({
      data: { envelopeId: envelope.id, email: `${kind}@example.invalid`, name: marker, token: randomUUID() },
    });
  }
  const response = await trpc(access.memberRequest, 'recipient.suggestions.find', access.sender.team.id, {
    query: marker,
  });
  await expectOk(response);
  expect((await response.json()).result.data.json.results.map((row: { email: string }) => row.email).sort()).toEqual([
    'owned@example.invalid',
    'visible@example.invalid',
  ]);
  const owner = await access.login(access.sender.user.email);
  const all = await trpc(owner, 'recipient.suggestions.find', access.sender.team.id, { query: marker });
  await expectOk(all);
  expect((await all.json()).result.data.json.results.map((row: { email: string }) => row.email).sort()).toEqual([
    'hidden@example.invalid',
    'owned@example.invalid',
    'visible@example.invalid',
  ]);
});

test('A-13 PDF HTTP routes enforce role visibility, owner access and fresh cache checks', async ({ access }) => {
  const manager = await seedTeamMember({ teamId: access.sender.team.id, role: TeamMemberRole.MANAGER });
  const managerRequest = await access.login(manager.email);
  const ownerRequest = await access.login(access.sender.user.email);
  for (const visibility of [
    DocumentVisibility.EVERYONE,
    DocumentVisibility.MANAGER_AND_ABOVE,
    DocumentVisibility.ADMIN,
  ]) {
    const document = await seedDocument(access.sender.user, access.sender.team.id, {
      createDocumentOptions: { visibility },
    });
    for (const path of pdfPaths(document)) {
      for (const [client, allowed] of [
        [access.memberRequest, visibility === DocumentVisibility.EVERYONE],
        [managerRequest, visibility !== DocumentVisibility.ADMIN],
        [ownerRequest, true],
      ] as const) {
        const response = await client.get(path);
        if (allowed) {
          await expectPdf(response);
        } else {
          expect(response.status()).toBe(404);
          expect(await response.json()).toEqual({ error: 'Not found' });
        }
      }
    }
  }
  const owned = await seedDocument(access.member, access.sender.team.id, {
    createDocumentOptions: { visibility: DocumentVisibility.ADMIN },
  });
  await expectPdf(await access.memberRequest.get(pdfPaths(owned)[0]));
  const changing = await seedDocument(access.sender.user, access.sender.team.id);
  const previous = await access.memberRequest.get(pdfPaths(changing)[0]);
  await expectPdf(previous);
  await prisma.envelope.update({ where: { id: changing.id }, data: { visibility: DocumentVisibility.ADMIN } });
  const denied = await access.memberRequest.get(pdfPaths(changing)[0], {
    headers: { 'If-None-Match': previous.headers().etag },
  });
  expect(denied.status()).toBe(404);
  expect(await denied.json()).toEqual({ error: 'Not found' });
});

test('A-13 organisation-shared templates require a permitted role and remain usable across teams', async ({
  access,
}) => {
  const teamUrl = `permission-${randomUUID()}`;
  await createTeam({
    userId: access.sender.user.id,
    organisationId: access.sender.organisation.id,
    teamName: 'Permission sibling',
    teamUrl,
    inheritMembers: false,
  });
  const sibling = await prisma.team.findUniqueOrThrow({ where: { url: teamUrl } });
  const template = await seedBlankTemplate(access.sender.user, sibling.id, {
    createTemplateOptions: { templateType: TemplateType.ORGANISATION, visibility: DocumentVisibility.EVERYONE },
  });
  for (const path of pdfPaths(template)) {
    await expectPdf(await access.memberRequest.get(path));
  }
  for (const data of [
    { visibility: DocumentVisibility.ADMIN },
    { visibility: DocumentVisibility.EVERYONE, templateType: TemplateType.PRIVATE },
  ]) {
    await prisma.envelope.update({ where: { id: template.id }, data });
    for (const path of pdfPaths(template)) {
      const response = await access.memberRequest.get(path);
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: 'Not found' });
    }
  }
});

test('A-13 presign PDFs cannot borrow a sibling admin role after an issuing-team demotion', async ({
  access,
  request,
}) => {
  const teamUrl = `permission-${randomUUID()}`;
  await createTeam({
    userId: access.sender.user.id,
    organisationId: access.sender.organisation.id,
    teamName: 'Delegation sibling',
    teamUrl,
    inheritMembers: false,
  });
  const sibling = await prisma.team.findUniqueOrThrow({ where: { url: teamUrl } });
  const membership = await prisma.organisationMember.findFirstOrThrow({
    where: { userId: access.member.id, organisationId: access.sender.organisation.id },
  });
  for (const teamId of [access.sender.team.id, sibling.id]) {
    await createTeamMembers({
      userId: access.sender.user.id,
      teamId,
      membersToCreate: [{ organisationMemberId: membership.id, teamRole: TeamMemberRole.ADMIN }],
    });
  }
  const key = await createApiToken({
    userId: access.member.id,
    teamId: access.sender.team.id,
    tokenName: 'A-13 synthetic',
    expiresIn: null,
  });
  const template = await seedBlankTemplate(access.sender.user, access.sender.team.id, {
    createTemplateOptions: { templateType: TemplateType.ORGANISATION, visibility: DocumentVisibility.ADMIN },
  });
  const paths = pdfPaths(template);
  const delegatedPaths: string[] = [];
  for (const scope of [undefined, `envelopeId:${template.id}`]) {
    const { token } = await createEmbeddingPresignToken({ apiToken: key.token, scope });
    delegatedPaths.push(
      `${paths[0]}?token=${encodeURIComponent(token)}`,
      `${paths[3]}?presignToken=${encodeURIComponent(token)}`,
    );
  }
  for (const path of delegatedPaths) {
    await expectPdf(await request.get(path));
  }
  const removed = await prisma.organisationGroupMember.deleteMany({
    where: {
      organisationMemberId: membership.id,
      group: {
        type: OrganisationGroupType.INTERNAL_TEAM,
        teamGroups: { some: { teamId: access.sender.team.id, teamRole: TeamMemberRole.ADMIN } },
      },
    },
  });
  expect(removed.count).toBe(1);
  // Human sharing can still use the sibling role; credentials retain the issuing team's current role.
  await expectPdf(await access.memberRequest.get(paths[0]));
  for (const path of delegatedPaths) {
    const denied = await request.get(path);
    expect(denied.status()).toBe(404);
    expect(await denied.json()).toEqual({ error: 'Not found' });
    expect(denied.headers()['cache-control']).toContain('no-store');
  }
  await prisma.envelope.update({ where: { id: template.id }, data: { visibility: DocumentVisibility.EVERYONE } });
  for (const path of delegatedPaths) {
    await expectPdf(await request.get(path));
  }
});

test('A-23 file responses do not distinguish absent from foreign identifiers', async ({ access }) => {
  const foreign = await seedUser();
  const document = await seedDocument(foreign.user, foreign.team.id);
  const missing = { ...document, id: `absent-${randomUUID()}` };
  for (const [index, path] of pdfPaths(document).entries()) {
    const response = await access.memberRequest.get(path);
    const absent = await access.memberRequest.get(pdfPaths(missing)[index]);
    expect(response.status()).toBe(404);
    expect(absent.status()).toBe(404);
    expect(await response.json()).toEqual(await absent.json());
  }
});

test('A-23 document/envelope delete gives one absence result and preserves forbidden data', async ({ access }) => {
  const foreign = await seedUser();
  const hidden = await seedDocument(access.sender.user, access.sender.team.id, {
    createDocumentOptions: { visibility: DocumentVisibility.ADMIN },
  });
  const other = await seedDocument(foreign.user, foreign.team.id);
  const missing = await seedDocument(foreign.user, foreign.team.id);
  await prisma.envelope.delete({ where: { id: missing.id } });
  for (const kind of ['document', 'envelope']) {
    const responses = [];
    for (const record of [hidden, other, missing]) {
      const input =
        kind === 'document'
          ? { documentId: mapSecondaryIdToDocumentId(record.secondaryId) }
          : { envelopeId: record.id };
      responses.push(
        await expectNotFound(await trpc(access.memberRequest, `${kind}.delete`, access.sender.team.id, input, true)),
      );
    }
    expect(responses[0]).toEqual(responses[2]);
    expect(responses[1]).toEqual(responses[2]);
  }
  expect(await prisma.envelope.count({ where: { id: { in: [hidden.id, other.id] } } })).toBe(2);
  expect(await prisma.documentAuditLog.count({ where: { envelopeId: { in: [hidden.id, other.id] } } })).toBe(0);
  const owner = await access.login(access.sender.user.email);
  await expectOk(await trpc(owner, 'envelope.delete', access.sender.team.id, { envelopeId: hidden.id }, true));
  expect(await prisma.envelope.findUnique({ where: { id: hidden.id } })).toBeNull();
});

test('A-23 recipients can still hide their own copy without deleting the sender document', async ({ access }) => {
  const foreign = await seedUser();
  for (const kind of ['document', 'envelope']) {
    const document = await seedDocument(foreign.user, foreign.team.id);
    const recipient = await prisma.recipient.create({
      data: { envelopeId: document.id, email: access.member.email, token: randomUUID() },
    });
    const input =
      kind === 'document'
        ? { documentId: mapSecondaryIdToDocumentId(document.secondaryId) }
        : { envelopeId: document.id };
    await expectOk(await trpc(access.memberRequest, `${kind}.delete`, access.sender.team.id, input, true));
    expect(await prisma.envelope.findUnique({ where: { id: document.id } })).toMatchObject({ deletedAt: null });
    expect(
      (await prisma.recipient.findUniqueOrThrow({ where: { id: recipient.id } })).documentDeletedAt,
    ).not.toBeNull();
    expect(await prisma.documentAuditLog.count({ where: { envelopeId: document.id } })).toBe(0);
  }
});

test('A-24 forbids hidden destinations while preserving permitted moves and root moves', async ({ access }) => {
  const source = await folder(access);
  const hidden = await folder(access, null, DocumentVisibility.ADMIN);
  const visible = await folder(access);
  await expectNotFound(await move(access, source.id, hidden.id));
  expect((await prisma.folder.findUniqueOrThrow({ where: { id: source.id } })).parentId).toBeNull();
  await expectOk(await move(access, source.id, visible.id));
  expect((await prisma.folder.findUniqueOrThrow({ where: { id: source.id } })).parentId).toBe(visible.id);
  await expectOk(await move(access, source.id, null));
  const owner = await access.login(access.sender.user.email);
  await expectOk(await move(access, source.id, hidden.id, owner));
  expect((await prisma.folder.findUniqueOrThrow({ where: { id: source.id } })).parentId).toBe(hidden.id);
});

test('A-24 protects hidden grandchildren, and authorized cascades preserve documents and PDF bytes', async ({
  access,
}) => {
  const root = await folder(access);
  const child = await folder(access, root.id);
  const hidden = await folder(access, child.id, DocumentVisibility.ADMIN);
  const document = await seedDocument(access.sender.user, access.sender.team.id, {
    createDocumentOptions: { folderId: hidden.id },
  });
  await expectNotFound(await remove(access, root.id));
  expect(await prisma.folder.count({ where: { id: { in: [root.id, child.id, hidden.id] } } })).toBe(3);
  expect((await prisma.envelope.findUniqueOrThrow({ where: { id: document.id } })).folderId).toBe(hidden.id);
  const owner = await access.login(access.sender.user.email);
  await expectOk(await remove(access, root.id, owner));
  expect(await prisma.folder.count({ where: { id: { in: [root.id, child.id, hidden.id] } } })).toBe(0);
  expect((await prisma.envelope.findUniqueOrThrow({ where: { id: document.id } })).folderId).toBeNull();
  await expectPdf(await owner.get(pdfPaths(document)[0]));
});

const waitForBlockedRequest = async (pid: number) => {
  let blockedPid: number | undefined;
  await expect
    .poll(
      async () => {
        const rows = await prisma.$queryRaw<Array<{ pid: number }>>(Prisma.sql`
      SELECT activity.pid FROM pg_stat_activity AS activity
      WHERE activity.datname = current_database() AND ${pid} = ANY(pg_blocking_pids(activity.pid))
    `);
        blockedPid = rows[0]?.pid;
        return Boolean(blockedPid);
      },
      { timeout: 4000 },
    )
    .toBe(true);
  if (!blockedPid) {
    throw new Error('Expected a database lock wait');
  }
  return blockedPid;
};

test('A-24 deletion sees a hidden child committed while waiting for its parent lock', async ({ access }) => {
  const root = await folder(access);
  const pending: { response?: Promise<APIResponse>; childId?: string } = {};
  try {
    await prisma.$transaction(
      async (tx) => {
        const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>(Prisma.sql`SELECT pg_backend_pid() AS pid`);
        const child = await tx.folder.create({
          data: {
            name: 'Concurrent hidden child',
            type: FolderType.DOCUMENT,
            parentId: root.id,
            teamId: access.sender.team.id,
            userId: access.sender.user.id,
            visibility: DocumentVisibility.ADMIN,
          },
        });
        pending.childId = child.id;
        pending.response = remove(access, root.id);
        await waitForBlockedRequest(pid);
      },
      { timeout: 10000 },
    );
    if (!pending.response || !pending.childId) {
      throw new Error('Concurrent request was not started');
    }
    await expectNotFound(await pending.response);
    expect(await prisma.folder.count({ where: { id: { in: [root.id, pending.childId] } } })).toBe(2);
  } finally {
    await pending.response?.catch(() => undefined);
  }
});

for (const operation of ['delete', 'move'] as const) {
  test(`A-24 ${operation} rechecks visibility after an actual row-lock wait`, async ({ access }) => {
    const source = await folder(access);
    const target = await folder(access, operation === 'delete' ? source.id : null);
    const pending: { response?: Promise<APIResponse> } = {};
    try {
      await prisma.$transaction(
        async (tx) => {
          const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>(Prisma.sql`SELECT pg_backend_pid() AS pid`);
          await tx.folder.update({ where: { id: target.id }, data: { visibility: DocumentVisibility.ADMIN } });
          pending.response = operation === 'delete' ? remove(access, source.id) : move(access, source.id, target.id);
          await waitForBlockedRequest(pid);
        },
        { timeout: 10000 },
      );
      if (!pending.response) {
        throw new Error('Concurrent request was not started');
      }
      await expectNotFound(await pending.response);
      expect(await prisma.folder.count({ where: { id: { in: [source.id, target.id] } } })).toBe(2);
      expect((await prisma.folder.findUniqueOrThrow({ where: { id: source.id } })).parentId).toBeNull();
    } finally {
      await pending.response?.catch(() => undefined);
    }
  });
}

test('A-24 checked parents block new children until the authorized cascade commits', async ({ access }) => {
  const root = await folder(access);
  const child = await folder(access, root.id);
  const leaf = await folder(access, child.id);
  const pending: { response?: Promise<APIResponse>; insert?: Promise<string> } = {};
  try {
    await prisma.$transaction(
      async (tx) => {
        const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>(Prisma.sql`SELECT pg_backend_pid() AS pid`);
        await tx.folder.update({ where: { id: leaf.id }, data: { name: 'Hold the last descendant' } });
        pending.response = remove(access, root.id);
        const deletionPid = await waitForBlockedRequest(pid);
        // At this point the request has locked root and child and waits for leaf.
        pending.insert = prisma.folder
          .create({
            data: {
              name: 'Late hidden child',
              type: FolderType.DOCUMENT,
              parentId: child.id,
              teamId: access.sender.team.id,
              userId: access.sender.user.id,
              visibility: DocumentVisibility.ADMIN,
            },
          })
          .then(
            () => 'inserted',
            (error: unknown) =>
              error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'unexpected-error',
          );
        await waitForBlockedRequest(deletionPid);
      },
      { timeout: 10000 },
    );
    if (!pending.response || !pending.insert) {
      throw new Error('Concurrent requests were not started');
    }
    await expectOk(await pending.response);
    expect(await pending.insert).toBe('P2003');
    expect(await prisma.folder.count({ where: { id: { in: [root.id, child.id, leaf.id] } } })).toBe(0);
  } finally {
    await pending.response?.catch(() => undefined);
    await pending.insert;
  }
});
