import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { reserveTrialUsage } from '@bizrethink/customizations/server-only/resources/trial-policy';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';
import { seedBlankDocument } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { type APIRequestContext, type APIResponse, expect, test } from '@playwright/test';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
const call = (
  request: APIRequestContext,
  name: string,
  input: Record<string, unknown>,
  teamId?: number,
  mutation = true,
) => {
  const headers = { 'content-type': 'application/json', ...(teamId ? { 'x-team-id': String(teamId) } : {}) };
  const data = JSON.stringify({ json: input });
  return mutation
    ? request.post(`${baseURL}/api/trpc/${name}`, { headers, data })
    : request.get(`${baseURL}/api/trpc/${name}?input=${encodeURIComponent(data)}`, { headers });
};
const signIn = async (request: APIRequestContext, email: string) => {
  const { csrfToken } = await (await request.get(`${baseURL}/api/auth/csrf`)).json();
  const response = await request.post(`${baseURL}/api/auth/email-password/authorize`, {
    data: { email, password: 'password', csrfToken },
  });
  expect(response.status(), await response.text()).toBe(201);
};
const ok = async (response: APIResponse) => {
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).result.data.json;
};
const seedTrial = async () => seedUser({ isExternalTrial: true });
const makeSource = async (fixture: Awaited<ReturnType<typeof seedUser>>) => {
  return seedBlankDocument(fixture.user, fixture.team.id);
};

test('A-11 real concurrent HTTP duplicates cannot both consume the fifth document', async ({ request }) => {
  const fixture = await seedTrial();
  const source = await makeSource(fixture);
  await prisma.bizrethinkTrialBudget.update({ where: { ownerUserId: fixture.user.id }, data: { documentsUsed: 4 } });
  await signIn(request, fixture.user.email);
  const responses = await Promise.all(
    [1, 2].map(() => call(request, 'envelope.duplicate', { envelopeId: source.id }, fixture.team.id)),
  );
  expect(
    responses.map((response) => response.status()).sort(),
    (await Promise.all(responses.map((response) => response.text()))).join('\n'),
  ).toEqual([200, 429]);
  expect(await prisma.envelope.count({ where: { teamId: fixture.team.id } })).toBe(2);
  expect(
    (await prisma.bizrethinkTrialBudget.findUniqueOrThrow({ where: { ownerUserId: fixture.user.id } })).documentsUsed,
  ).toBe(5);
});

test('A-11 real PostgreSQL reservations cannot both consume the tenth recipient email', async () => {
  const fixture = await seedTrial();
  await prisma.bizrethinkTrialBudget.update({ where: { ownerUserId: fixture.user.id }, data: { emailsUsed: 9 } });
  const results = await Promise.allSettled(
    [1, 2].map(() => reserveTrialUsage({ organisationId: fixture.organisation.id, type: 'email', count: 1 })),
  );
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  expect(
    (await prisma.bizrethinkTrialBudget.findUniqueOrThrow({ where: { ownerUserId: fixture.user.id } })).emailsUsed,
  ).toBe(10);
});

test('A-11 another trial organisation is denied before any organisation commits', async ({ request }) => {
  const fixture = await seedTrial();
  await signIn(request, fixture.user.email);
  const response = await call(request, 'organisation.create', { name: 'Another external trial' });
  expect(response.status(), await response.text()).toBe(429);
  expect(await prisma.organisation.count({ where: { ownerUserId: fixture.user.id } })).toBe(1);
});

test('A-11 deleting the trial organisation does not reset its lifetime allowance', async ({ request }) => {
  const fixture = await seedTrial();
  await signIn(request, fixture.user.email);
  await prisma.organisation.delete({ where: { id: fixture.organisation.id } });
  const response = await call(request, 'organisation.create', { name: 'Replacement external trial' });
  expect(response.status(), await response.text()).toBe(429);
  expect(await prisma.organisation.count({ where: { ownerUserId: fixture.user.id } })).toBe(0);
});

test('A-11 internal organisations retain their document allowance', async ({ request }) => {
  const fixture = await seedUser();
  const source = await makeSource(fixture);
  await prisma.bizrethinkTrialBudget.update({
    where: { ownerUserId: fixture.user.id },
    data: { documentsUsed: 5, emailsUsed: 10 },
  });
  await signIn(request, fixture.user.email);
  await ok(await call(request, 'envelope.duplicate', { envelopeId: source.id }, fixture.team.id));
});

test('A-11 ordinary users cannot change the instance trial policy', async ({ request }) => {
  const fixture = await seedTrial();
  await signIn(request, fixture.user.email);
  const response = await call(request, 'bizrethink.resourcePolicy.update', {
    trialDocuments: 100,
    trialEmails: 100,
    trialRecipients: 10,
    trialOrganisations: 1,
  });
  expect(response.status(), await response.text()).toBe(401);
});

test('A-10 rejects large JSON with an explicit 413 before processing', async ({ request }) => {
  const response = await request.post(`${baseURL}/api/auth/email-password/authorize`, {
    data: { padding: 'x'.repeat(3 * 1024 * 1024) },
  });
  expect(response.status(), await response.text()).toBe(413);
});

test('A-10 preserves authenticated PDF upload and records its actual owner', async ({ request }) => {
  const fixture = await seedTrial();
  await signIn(request, fixture.user.email);
  const response = await request.post(`${baseURL}/api/files/upload-pdf`, {
    multipart: {
      file: {
        name: 'resource-fixture.pdf',
        mimeType: 'application/pdf',
        buffer: readFileSync(resolve(__dirname, '../../../../../assets/example.pdf')),
      },
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  const { id } = await response.json();
  expect(await prisma.bizrethinkPdfUpload.findUnique({ where: { documentDataId: id } })).toMatchObject({
    userId: fixture.user.id,
  });
});

test('A-20 pending domain requests remain separate, visible only to their organisation and deletable without SES', async ({
  playwright,
}) => {
  const first = await seedTrial();
  const second = await seedTrial();
  // This scenario exercises authorised custom-sender onboarding. seedUser
  // deliberately overrides feature flags, so grant this entitlement explicitly.
  for (const fixture of [first, second]) {
    await prisma.organisationClaim.update({
      where: { id: fixture.organisation.organisationClaim.id },
      data: { flags: { allowLegacyEnvelopes: true, emailDomains: true } },
    });
  }
  const a = await playwright.request.newContext();
  const b = await playwright.request.newContext();
  const domain = `proof-${randomUUID()}.example.invalid`;
  try {
    await signIn(a, first.user.email);
    await signIn(b, second.user.email);
    const left = await ok(
      await call(a, 'enterprise.organisation.emailDomain.create', { organisationId: first.organisation.id, domain }),
    );
    const right = await ok(
      await call(b, 'enterprise.organisation.emailDomain.create', { organisationId: second.organisation.id, domain }),
    );
    expect(left.emailDomain.id).not.toBe(right.emailDomain.id);
    expect(await prisma.emailDomain.count({ where: { domain } })).toBe(0);
    expect(await prisma.bizrethinkEmailDomainChallenge.count({ where: { domain } })).toBe(2);
    const list = await ok(
      await call(
        a,
        'enterprise.organisation.emailDomain.find',
        { organisationId: first.organisation.id },
        undefined,
        false,
      ),
    );
    expect(list.data.map((item: { id: string }) => item.id)).toEqual([left.emailDomain.id]);
    const foreign = await call(
      b,
      'enterprise.organisation.emailDomain.get',
      { emailDomainId: left.emailDomain.id },
      undefined,
      false,
    );
    expect(foreign.status(), await foreign.text()).toBe(404);
    await ok(await call(a, 'enterprise.organisation.emailDomain.delete', { emailDomainId: left.emailDomain.id }));
    expect(await prisma.bizrethinkEmailDomainChallenge.count({ where: { domain } })).toBe(1);
  } finally {
    await a.dispose();
    await b.dispose();
  }
});
