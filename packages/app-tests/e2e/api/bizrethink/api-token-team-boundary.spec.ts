import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { createApiToken } from '@documenso/lib/server-only/public-api/create-api-token';
import { mapSecondaryIdToDocumentId } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import { seedBlankDocument, seedCompletedDocument } from '@documenso/prisma/seed/documents';
import { seedTeam, seedTeamMember } from '@documenso/prisma/seed/teams';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';

// BizRethink A-02: real HTTP, token authentication and PostgreSQL queries.
// Use the isolated CI/local E2E environment, never a production target.
const baseUrl = NEXT_PUBLIC_WEBAPP_URL();

const crossTeamFixture = async (legacy: boolean) => {
  const { team: teamB } = await seedTeam();
  // The new member also owns its own separate organisation/team A. This is a
  // legitimate multi-tenant user, not a guessed userId or a spoofed x-team-id.
  const user = await seedTeamMember({ teamId: teamB.id });
  const teamA = await prisma.team.findFirstOrThrow({
    where: { organisation: { ownerUserId: user.id } },
  });
  const keyA = await createApiToken({ userId: user.id, teamId: teamA.id, tokenName: 'A-02 A', expiresIn: null });
  const keyB = await createApiToken({ userId: user.id, teamId: teamB.id, tokenName: 'A-02 B', expiresIn: null });
  if (legacy) {
    await prisma.apiToken.update({ where: { id: keyA.id }, data: { userId: null } });
  }
  const documentA = await seedBlankDocument(user, teamA.id);
  const documentB = await seedBlankDocument(user, teamB.id);
  return { user, teamA, teamB, keyA, keyB, documentA, documentB };
};

for (const legacy of [false, true]) {
  test(`A-02 keys cannot inherit foreign ownership; same-team operations work (legacy: ${legacy})`, async ({
    request,
  }) => {
    const { teamB, keyA, keyB, documentA, documentB } = await crossTeamFixture(legacy);
    const headers = { Authorization: `Bearer ${keyA.token}`, 'x-team-id': String(teamB.id) };
    const documentIdA = mapSecondaryIdToDocumentId(documentA.secondaryId);
    const documentIdB = mapSecondaryIdToDocumentId(documentB.secondaryId);

    // Verify both published v2 URL families and their actual response data.
    for (const version of ['v2', 'v2-beta']) {
      const foreign = await request.get(`${baseUrl}/api/${version}/envelope/${documentB.id}`, { headers });
      expect(foreign.status()).toBe(404);
      expect(await foreign.text()).toContain('Envelope could not be found');

      const own = await request.get(`${baseUrl}/api/${version}/envelope/${documentA.id}`, { headers });
      expect(own.status()).toBe(200);
      expect(await own.json()).toMatchObject({ id: documentA.id, teamId: documentA.teamId });
    }

    const foreignV1 = await request.get(`${baseUrl}/api/v1/documents/${documentIdB}`, { headers });
    expect(foreignV1.status()).toBe(404);
    expect(await foreignV1.json()).toEqual({ message: 'Document not found' });
    const ownV1 = await request.get(`${baseUrl}/api/v1/documents/${documentIdA}`, { headers });
    expect(ownV1.status()).toBe(200);
    expect(await ownV1.json()).toMatchObject({ id: documentIdA, teamId: documentA.teamId });

    const bulk = await request.post(`${baseUrl}/api/v2-beta/envelope/get-many`, {
      headers,
      data: { ids: { type: 'envelopeId', ids: [documentA.id, documentB.id] } },
    });
    expect(bulk.status()).toBe(200);
    const bulkBody = await bulk.json();
    expect(bulkBody.data.map((entry: { id: string }) => entry.id)).toEqual([documentA.id]);

    // The foreign document really is accessible with the other team's key.
    const otherKey = await request.get(`${baseUrl}/api/v2-beta/envelope/${documentB.id}`, {
      headers: { Authorization: keyB.token },
    });
    expect(otherKey.status()).toBe(200);
    expect(await otherKey.json()).toMatchObject({ id: documentB.id, teamId: documentB.teamId });

    const foreignDelete = await request.post(`${baseUrl}/api/v2/document/delete`, {
      headers,
      data: { documentId: documentIdB },
    });
    expect(foreignDelete.status()).toBe(404);
    expect(await foreignDelete.text()).toContain('Document not found');
    expect(await prisma.envelope.findUnique({ where: { id: documentB.id } })).toMatchObject({
      id: documentB.id,
      deletedAt: null,
      status: 'DRAFT',
    });

    const ownDelete = await request.post(`${baseUrl}/api/v2/document/delete`, {
      headers,
      data: { documentId: documentIdA },
    });
    expect(ownDelete.status()).toBe(200);
    expect(await ownDelete.json()).toEqual({ success: true });
    expect(await prisma.envelope.findUnique({ where: { id: documentA.id } })).toBeNull();
  });
}

test('A-02 cannot hide a foreign document through recipient status', async ({ request }) => {
  const { user, teamB, keyA } = await crossTeamFixture(false);
  const otherOwner = await seedUser();
  const foreign = await seedBlankDocument(otherOwner.user, teamB.id);
  const recipient = await prisma.recipient.create({
    data: { envelopeId: foreign.id, email: user.email, token: `a02-recipient-${foreign.id}` },
  });
  const response = await request.post(`${baseUrl}/api/v2/document/delete`, {
    headers: { Authorization: `Bearer ${keyA.token}` },
    data: { documentId: mapSecondaryIdToDocumentId(foreign.secondaryId) },
  });
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain('Document not found');
  expect(await prisma.recipient.findUnique({ where: { id: recipient.id } })).toMatchObject({
    documentDeletedAt: null,
  });
  expect(await prisma.envelope.findUnique({ where: { id: foreign.id } })).toMatchObject({ deletedAt: null });
});

test('A-02 team-email ownership cannot expose a foreign document', async ({ request }) => {
  const ownerB = await seedUser();
  const ownerA = await seedUser({ teamEmail: ownerB.user.email });
  const { token } = await createApiToken({
    userId: ownerA.user.id,
    teamId: ownerA.team.id,
    tokenName: 'A-02 shared sender',
    expiresIn: null,
  });
  const foreign = await seedBlankDocument(ownerB.user, ownerB.team.id);
  const sameTeam = await seedBlankDocument(ownerB.user, ownerA.team.id);
  const headers = { Authorization: `Bearer ${token}` };

  const refused = await request.get(`${baseUrl}/api/v2/envelope/${foreign.id}`, { headers });
  expect(refused.status()).toBe(404);
  expect(await refused.text()).toContain('Envelope could not be found');
  const allowed = await request.get(`${baseUrl}/api/v2/envelope/${sameTeam.id}`, { headers });
  expect(allowed.status()).toBe(200);
  expect(await allowed.json()).toMatchObject({ id: sameTeam.id, teamId: ownerA.team.id });
});

test('A-02 shadow download routes retain the API team before generating PDFs', async ({ request }) => {
  const { user, teamA, teamB, keyA } = await crossTeamFixture(false);
  const own = await seedCompletedDocument(user, teamA.id, ['recipient@test.documenso.com']);
  const foreign = await seedCompletedDocument(user, teamB.id, ['recipient@test.documenso.com']);
  const paths = [
    (document: typeof own) => `/envelope/${document.id}/audit-log/download`,
    (document: typeof own) => `/envelope/${document.id}/certificate/download`,
    (document: typeof own) => `/document/${mapSecondaryIdToDocumentId(document.secondaryId)}/download`,
  ];
  const headers = { Authorization: `Bearer ${keyA.token}` };
  for (const path of paths) {
    const refused = await request.get(`${baseUrl}/api/v2${path(foreign)}`, { headers });
    expect(refused.status()).toBe(404);
    expect(await refused.json()).toEqual({ error: 'Document not found' });

    const allowed = await request.get(`${baseUrl}/api/v2${path(own)}`, { headers });
    expect(allowed.status()).toBe(200);
    expect(allowed.headers()['content-type']).toContain('application/pdf');
    expect((await allowed.body()).subarray(0, 4).toString()).toBe('%PDF');
  }
});
