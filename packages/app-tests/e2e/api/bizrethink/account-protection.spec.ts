/** Account protection: actual HTTP sessions and isolated PostgreSQL, no production targets. */
import { randomUUID } from 'node:crypto';
import { claimInvitesOnVerification } from '@bizrethink/customizations/server-only/auto-claim-invites-on-signup';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { EMAIL_VERIFICATION_STATE, USER_SIGNUP_VERIFICATION_TOKEN_IDENTIFIER } from '@documenso/lib/constants/email';
import { getBackupCodes } from '@documenso/lib/server-only/2fa/get-backup-code';
import { hashSync } from '@documenso/lib/server-only/auth/hash';
import { createPersonalOrganisation } from '@documenso/lib/server-only/organisation/create-organisation';
import { disableUser } from '@documenso/lib/server-only/user/disable-user';
import { prisma } from '@documenso/prisma';
import { seedBlankDocument } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { OrganisationGroupType, OrganisationMemberRole } from '@prisma/client';
import { base32 } from '@scure/base';
import { generateHOTP } from 'oslo/otp';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
const test = base.extend<{
  clients: { create: () => Promise<APIRequestContext>; login: (email: string) => Promise<APIRequestContext> };
}>({
  clients: async ({ playwright }, use) => {
    const opened: APIRequestContext[] = [];
    const create = async () => {
      const client = await playwright.request.newContext({ baseURL });
      opened.push(client);
      return client;
    };
    const login = async (email: string) => {
      const client = await create();
      const response = await authorize(client, email);
      expect(response.status(), await response.text()).toBe(201);
      expect((await (await client.get('/api/auth/session')).json()).user?.email).toBe(email);
      return client;
    };
    try {
      await use({ create, login });
    } finally {
      await Promise.all(opened.map((client) => client.dispose()));
    }
  },
});
const authorize = async (client: APIRequestContext, email: string, backupCode?: string) => {
  const csrf = await client.get('/api/auth/csrf');
  expect(csrf.status()).toBe(200);
  const { csrfToken } = await csrf.json();
  return client.post('/api/auth/email-password/authorize', {
    data: { email, password: 'password', csrfToken, backupCode },
  });
};
const expectOk = async (response: APIResponse) => expect(response.status(), await response.text()).toBe(200);
const otp = (secret: string) => generateHOTP(base32.decode(secret), Math.floor(Date.now() / 30000));
const enroll = async (client: APIRequestContext) => {
  const setup = await client.post('/api/auth/two-factor/setup');
  await expectOk(setup);
  const { secret } = await setup.json();
  const enable = await client.post('/api/auth/two-factor/enable', { data: { code: await otp(secret) } });
  await expectOk(enable);
  const { recoveryCodes } = await enable.json();
  expect(recoveryCodes).toHaveLength(10);
  return { secret: String(secret), recoveryCodes: recoveryCodes as string[] };
};
const bareUser = (verified = false) =>
  prisma.user.create({
    data: {
      name: 'Account protection fixture',
      email: `account-${randomUUID()}@example.test`,
      password: hashSync('password'),
      emailVerified: verified ? new Date() : null,
    },
  });
const tokenFor = (userId: number, completed = false) =>
  prisma.verificationToken.create({
    data: {
      userId,
      token: randomUUID(),
      identifier: USER_SIGNUP_VERIFICATION_TOKEN_IDENTIFIER,
      expires: new Date(Date.now() + 86400000),
      completed,
    },
  });
const inviteUser = (email: string, organisationId: string) =>
  prisma.organisationMemberInvite.create({
    data: {
      id: `invite_${randomUUID()}`,
      email,
      organisationId,
      token: randomUUID(),
      organisationRole: OrganisationMemberRole.MEMBER,
    },
  });

test('A-15 an existing cookie loses file and account authority as soon as the account is disabled', async ({
  clients,
}) => {
  const seed = await seedUser();
  const client = await clients.login(seed.user.email);
  const document = await seedBlankDocument(seed.user, seed.team.id);
  const item = await prisma.envelopeItem.findFirstOrThrow({ where: { envelopeId: document.id } });
  const path = `/api/files/envelope/${document.id}/envelopeItem/${item.id}`;
  await expectOk(await client.get(path));
  // Keep the session row to exercise the validator, independently of disableUser revocation.
  await prisma.user.update({ where: { id: seed.user.id }, data: { disabled: true } });
  expect(await prisma.session.count({ where: { userId: seed.user.id } })).toBeGreaterThan(0);
  expect((await (await client.get('/api/auth/session')).json()).isAuthenticated).toBe(false);
  expect((await client.get(path)).status()).toBe(401);
  const setup = await client.post('/api/auth/two-factor/setup');
  expect(setup.status()).toBe(500); // Existing auth envelope for UNAUTHORIZED.
  expect((await setup.json()).code).toBe('UNAUTHORIZED');
  expect((await prisma.user.findUniqueOrThrow({ where: { id: seed.user.id } })).twoFactorSecret).toBeNull();
});

test('A-15 disable revokes sessions permanently, including after re-enabling the account', async ({ clients }) => {
  const seed = await seedUser();
  const client = await clients.login(seed.user.email);
  await disableUser({ id: seed.user.id });
  expect(await prisma.session.count({ where: { userId: seed.user.id } })).toBe(0);
  await prisma.user.update({ where: { id: seed.user.id }, data: { disabled: false } });
  expect((await (await client.get('/api/auth/session')).json()).isAuthenticated).toBe(false);
});

test('A-16 both setup routes preserve an enabled factor and its recovery codes', async ({ clients }) => {
  const seed = await seedUser();
  const client = await clients.login(seed.user.email);
  await enroll(client);
  const before = await prisma.user.findUniqueOrThrow({ where: { id: seed.user.id } });
  for (const path of ['/api/auth/two-factor/setup', '/api/auth/email-password/2fa/setup']) {
    const response = await client.post(path);
    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('TWO_FACTOR_ALREADY_ENABLED');
  }
  const after = await prisma.user.findUniqueOrThrow({ where: { id: seed.user.id } });
  expect(after.twoFactorEnabled).toBe(true);
  expect(after.twoFactorSecret).toBe(before.twoFactorSecret);
  expect(after.twoFactorBackupCodes).toBe(before.twoFactorBackupCodes);
});

test('A-16 a recovery code permits exactly one concurrent password login and cannot be replayed', async ({
  clients,
}) => {
  const seed = await seedUser();
  const client = await clients.login(seed.user.email);
  const { recoveryCodes } = await enroll(client);
  const attempts = await Promise.all(Array.from({ length: 3 }, () => clients.create()));
  const responses = await Promise.all(attempts.map((attempt) => authorize(attempt, seed.user.email, recoveryCodes[0])));
  expect(responses.filter((response) => response.status() === 201)).toHaveLength(1);
  for (const response of responses.filter((response) => response.status() !== 201)) {
    expect(response.status()).toBe(500);
    expect((await response.json()).code).toBe('INVALID_TWO_FACTOR_CODE');
  }
  const replay = await authorize(await clients.create(), seed.user.email, recoveryCodes[0]);
  expect(replay.status()).toBe(500);
  expect((await replay.json()).code).toBe('INVALID_TWO_FACTOR_CODE');
  const saved = await prisma.user.findUniqueOrThrow({ where: { id: seed.user.id } });
  expect(getBackupCodes({ user: saved })).toEqual(recoveryCodes.slice(1));
});

test('A-16 viewing remaining codes consumes its proof; a remaining code can disable before re-enrollment', async ({
  clients,
}) => {
  const seed = await seedUser();
  const client = await clients.login(seed.user.email);
  const { recoveryCodes } = await enroll(client);
  const view = await client.post('/api/auth/two-factor/view-recovery-codes', { data: { token: recoveryCodes[0] } });
  await expectOk(view);
  expect((await view.json()).backupCodes).toEqual(recoveryCodes.slice(1));
  const disable = await client.post('/api/auth/two-factor/disable', { data: { backupCode: recoveryCodes[1] } });
  expect(disable.status(), await disable.text()).toBe(201);
  const saved = await prisma.user.findUniqueOrThrow({ where: { id: seed.user.id } });
  expect(saved.twoFactorEnabled).toBe(false);
  expect(saved.twoFactorSecret).toBeNull();
  expect(saved.twoFactorBackupCodes).toBeNull();
  await enroll(client);
});

test('R-03 concurrent verification claims an invitation once with its assigned group', async ({ clients }) => {
  const inviting = await seedUser();
  const user = await bareUser();
  const invite = await inviteUser(user.email, inviting.organisation.id);
  const token = await tokenFor(user.id);
  const attempts = await Promise.all([clients.create(), clients.create()]);
  const responses = await Promise.all(
    attempts.map((client) => client.post('/api/auth/email-password/verify-email', { data: { token: token.token } })),
  );
  for (const response of responses) {
    await expectOk(response);
  }
  expect(await prisma.organisationMember.count({ where: { userId: user.id } })).toBe(1);
  const member = await prisma.organisationMember.findUniqueOrThrow({
    where: { userId_organisationId: { userId: user.id, organisationId: inviting.organisation.id } },
    include: { organisationGroupMembers: { include: { group: true } } },
  });
  expect(member.organisationGroupMembers.map((entry) => entry.group.organisationRole)).toEqual([
    OrganisationMemberRole.MEMBER,
  ]);
  expect((await prisma.organisationMemberInvite.findUniqueOrThrow({ where: { id: invite.id } })).status).toBe(
    'ACCEPTED',
  );
  expect(await prisma.organisation.count({ where: { ownerUserId: user.id } })).toBe(0);
});

test('R-03 a failed claim leaves verification complete and no partial membership, then a completed-token retry recovers', async ({
  clients,
}) => {
  const firstOrganisation = await seedUser();
  const inviting = await seedUser();
  const user = await bareUser();
  const firstInvite = await inviteUser(user.email, firstOrganisation.organisation.id);
  const invite = await inviteUser(user.email, inviting.organisation.id);
  await prisma.organisationMemberInvite.update({
    where: { id: firstInvite.id },
    data: { id: `invite_0_${randomUUID()}` },
  });
  await prisma.organisationMemberInvite.update({ where: { id: invite.id }, data: { id: `invite_1_${randomUUID()}` } });
  const failedInvite = await prisma.organisationMemberInvite.findFirstOrThrow({
    where: { email: user.email, organisationId: inviting.organisation.id },
  });
  const group = await prisma.organisationGroup.findFirstOrThrow({
    where: {
      organisationId: inviting.organisation.id,
      type: OrganisationGroupType.INTERNAL_ORGANISATION,
      organisationRole: OrganisationMemberRole.MEMBER,
    },
  });
  await prisma.organisationGroup.update({ where: { id: group.id }, data: { type: OrganisationGroupType.CUSTOM } });
  const token = await tokenFor(user.id);
  const client = await clients.create();
  const first = await client.post('/api/auth/email-password/verify-email', { data: { token: token.token } });
  await expectOk(first);
  expect((await first.json()).state).toBe(EMAIL_VERIFICATION_STATE.VERIFIED);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).not.toBeNull();
  expect(await prisma.organisationMember.count({ where: { userId: user.id } })).toBe(0);
  expect((await prisma.organisationMemberInvite.findUniqueOrThrow({ where: { id: failedInvite.id } })).status).toBe(
    'PENDING',
  );
  await prisma.organisationGroup.update({ where: { id: group.id }, data: { type: group.type } });
  const retry = await client.post('/api/auth/email-password/verify-email', { data: { token: token.token } });
  await expectOk(retry);
  expect((await retry.json()).state).toBe(EMAIL_VERIFICATION_STATE.ALREADY_VERIFIED);
  expect(await prisma.organisationMember.count({ where: { userId: user.id } })).toBe(2);
});

test('R-03 login repairs a historical pending invitation with an existing membership without changing its role', async ({
  clients,
}) => {
  const seed = await seedUser();
  const invitation = await inviteUser(seed.user.email, seed.organisation.id);
  const before = await prisma.organisationGroupMember.findMany({
    where: { organisationMember: { userId: seed.user.id, organisationId: seed.organisation.id } },
  });
  await clients.login(seed.user.email);
  expect((await prisma.organisationMemberInvite.findUniqueOrThrow({ where: { id: invitation.id } })).status).toBe(
    'ACCEPTED',
  );
  expect(
    await prisma.organisationGroupMember.findMany({
      where: { organisationMember: { userId: seed.user.id, organisationId: seed.organisation.id } },
    }),
  ).toEqual(before);
});

test('R-03 retries create one complete personal workspace with unchanged trial accounting', async () => {
  const user = await bareUser(true);
  await Promise.all(
    Array.from({ length: 4 }, () => claimInvitesOnVerification({ userId: user.id, email: user.email })),
  );
  const organisations = await prisma.organisation.findMany({
    where: { ownerUserId: user.id },
    include: { teams: true },
  });
  expect(organisations).toHaveLength(1);
  expect(organisations[0].teams).toHaveLength(1);
  expect(await prisma.organisationMember.count({ where: { userId: user.id } })).toBe(1);
  expect(await prisma.bizrethinkOrganisationBilling.count({ where: { organisationId: organisations[0].id } })).toBe(1);
});

test('R-03 workspace construction participates fully in rollback before a later retry', async () => {
  const user = await bareUser(true);
  let rolledBackId = '';
  await expect(
    prisma.$transaction(async (transaction) => {
      const organisation = await createPersonalOrganisation({ userId: user.id, transaction });
      expect(organisation).toBeTruthy();
      rolledBackId = organisation!.id;
      throw new Error('Synthetic failure after team creation');
    }),
  ).rejects.toThrow('Synthetic failure after team creation');
  expect(await prisma.organisation.count({ where: { ownerUserId: user.id } })).toBe(0);
  expect(await prisma.organisationMember.count({ where: { userId: user.id } })).toBe(0);
  expect(await prisma.team.count({ where: { organisationId: rolledBackId } })).toBe(0);
  expect(await prisma.bizrethinkOrganisationBilling.count({ where: { organisationId: rolledBackId } })).toBe(0);
  await claimInvitesOnVerification({ userId: user.id, email: user.email });
  expect(await prisma.organisation.count({ where: { ownerUserId: user.id } })).toBe(1);
});

test('R-03 reconciliation refuses unverified and disabled users even with a matching invite', async () => {
  const inviting = await seedUser();
  for (const disabled of [false, true]) {
    const user = await bareUser(disabled);
    if (disabled) {
      await prisma.user.update({ where: { id: user.id }, data: { disabled: true } });
    }
    const invite = await inviteUser(user.email, inviting.organisation.id);
    expect(await claimInvitesOnVerification({ userId: user.id, email: user.email })).toEqual([]);
    expect(await prisma.organisationMember.count({ where: { userId: user.id } })).toBe(0);
    expect((await prisma.organisationMemberInvite.findUniqueOrThrow({ where: { id: invite.id } })).status).toBe(
      'PENDING',
    );
  }
});
