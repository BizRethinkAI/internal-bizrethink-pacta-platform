/** A-14: real HTTP and PostgreSQL. Synthetic destinations must be denied before connection. */
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';
import { seedUser } from '@documenso/prisma/seed/users';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { OrganisationMemberRole } from '@prisma/client';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
const action = 'bizrethink.smtp-test';
const inputFor = (organisationId: string) => ({
  organisationId,
  host: '127.0.0.1',
  port: 587,
  secure: false,
  username: 'synthetic',
  password: 'synthetic-test-password',
});
const call = (request: APIRequestContext, input: Record<string, unknown>) =>
  request.post(`${baseURL}/api/trpc/bizrethink.organisationSmtp.test`, {
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify({ json: input }),
  });
const expectError = async (response: APIResponse, code: string, status: number) => {
  expect(response.status(), await response.text()).toBe(status);
  expect((await response.json()).error.json.data.code).toBe(code);
};
const signIn = async (request: APIRequestContext, email: string) => {
  const csrf = await request.get(`${baseURL}/api/auth/csrf`);
  expect(csrf.ok(), await csrf.text()).toBe(true);
  const { csrfToken } = await csrf.json();
  const result = await request.post(`${baseURL}/api/auth/email-password/authorize`, {
    data: { email, password: 'password', csrfToken },
  });
  expect(result.ok(), await result.text()).toBe(true);
  const session = await request.get(`${baseURL}/api/auth/session`);
  expect((await session.json()).user.email).toBe(email);
};
const countersFor = (userId: number, organisationId: string) =>
  prisma.rateLimit.findMany({
    where: { action, key: { in: [`user:${userId}`, `org:${organisationId}`] } },
  });
const seedFullBudget = async (key: string, count: number) => {
  const windowMs = 10 * 60 * 1000;
  const current = Date.now() - (Date.now() % windowMs);
  // Include the next bucket so a ten-minute boundary cannot make this fixture
  // flaky. Every row belongs only to this newly seeded user/organisation.
  for (const time of [current, current + windowMs]) {
    const bucket = new Date(time);
    await prisma.rateLimit.upsert({
      where: { key_action_bucket: { key, action, bucket } },
      create: { key, action, bucket, count },
      update: { count },
    });
  }
};

test('A-14 rejects an anonymous SMTP test without creating counters', async ({ request }) => {
  const fixture = await seedUser();
  await expectError(await call(request, inputFor(fixture.organisation.id)), 'UNAUTHORIZED', 401);
  expect(await countersFor(fixture.user.id, fixture.organisation.id)).toEqual([]);
});

test('A-14 rejects a foreign organisation and a member without manage permission', async ({ request }) => {
  const [fixture, foreign] = await Promise.all([seedUser(), seedUser()]);
  await signIn(request, fixture.user.email);
  await expectError(await call(request, inputFor(foreign.organisation.id)), 'UNAUTHORIZED', 401);
  expect(await countersFor(fixture.user.id, foreign.organisation.id)).toEqual([]);
  await prisma.organisationGroup.updateMany({
    where: { organisationId: fixture.organisation.id },
    data: { organisationRole: OrganisationMemberRole.MEMBER },
  });
  await expectError(await call(request, inputFor(fixture.organisation.id)), 'UNAUTHORIZED', 401);
  expect(await countersFor(fixture.user.id, fixture.organisation.id)).toEqual([]);
});

test('A-14 permits a manager to run the test but rejects a private destination', async ({ request }) => {
  const fixture = await seedUser();
  await signIn(request, fixture.user.email);
  const response = await call(request, inputFor(fixture.organisation.id));
  expect(response.ok(), await response.text()).toBe(true);
  expect((await response.json()).result.data.json).toEqual({
    ok: false,
    error: 'The outbound destination is not permitted or could not be resolved.',
  });
  const counters = await countersFor(fixture.user.id, fixture.organisation.id);
  expect(counters.map(({ key, count }) => ({ key, count }))).toEqual(
    expect.arrayContaining([
      { key: `user:${fixture.user.id}`, count: 1 },
      { key: `org:${fixture.organisation.id}`, count: 1 },
    ]),
  );
  expect(counters).toHaveLength(2);
  expect(
    await prisma.bizrethinkOrganisationSmtpConfig.findUnique({ where: { organisationId: fixture.organisation.id } }),
  ).toBeNull();
});

for (const scope of ['user', 'org'] as const) {
  test(`A-14 enforces its ${scope} budget independently`, async ({ request }) => {
    const fixture = await seedUser();
    await signIn(request, fixture.user.email);
    await seedFullBudget(
      scope === 'user' ? `user:${fixture.user.id}` : `org:${fixture.organisation.id}`,
      scope === 'user' ? 5 : 10,
    );
    await expectError(await call(request, inputFor(fixture.organisation.id)), 'TOO_MANY_REQUESTS', 429);
  });
}

test('A-14 atomically admits only one concurrent test when one user attempt remains', async ({ request }) => {
  const fixture = await seedUser();
  await signIn(request, fixture.user.email);
  await seedFullBudget(`user:${fixture.user.id}`, 4);
  const responses = await Promise.all(
    Array.from({ length: 4 }, () => call(request, inputFor(fixture.organisation.id))),
  );
  expect(responses.filter((response) => response.status() === 200)).toHaveLength(1);
  const denied = responses.filter((response) => response.status() !== 200);
  expect(denied).toHaveLength(3);
  for (const response of denied) {
    await expectError(response, 'TOO_MANY_REQUESTS', 429);
  }
});

test('A-14 SMTP form sends its organisation and shows a rate-limit failure', async ({ page }) => {
  const fixture = await seedUser();
  await signIn(page.request, fixture.user.email);
  await page.goto(`${baseURL}/o/${fixture.organisation.url}/settings/smtp`);
  await page.getByLabel('Host', { exact: true }).fill('127.0.0.1');
  await page.getByLabel('Username', { exact: true }).fill('synthetic');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-test-password');
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('bizrethink.organisationSmtp.test') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Test connection', exact: true }).click();
  const response = await responsePromise;
  expect(response.request().postData()).toContain(fixture.organisation.id);
  expect(response.ok(), await response.text()).toBe(true);
  await expect(
    page.getByText('The outbound destination is not permitted or could not be resolved.', { exact: true }),
  ).toBeVisible();
  await seedFullBudget(`user:${fixture.user.id}`, 5);
  await page.getByRole('button', { name: 'Test connection', exact: true }).click();
  await expect(
    page.getByText('Connection test unavailable. Check your permissions or try again later.', { exact: true }),
  ).toBeVisible();
});
