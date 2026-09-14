import { getServerLimits } from '@documenso/ee/server-only/limits/server';
import { assertOrganisationRatesAndLimits } from '@documenso/lib/server-only/rate-limit/assert-organisation-rates-and-limits';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  db: {
    organisation: { findUniqueOrThrow: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    user: { findUniqueOrThrow: vi.fn() },
    bizrethinkOrganisationBilling: { findUnique: vi.fn(), findMany: vi.fn() },
    bizrethinkInstanceResourcePolicy: { findUnique: vi.fn() },
    bizrethinkTrialBudget: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    bizrethinkTrialOrganisation: { findUnique: vi.fn(), create: vi.fn(), createMany: vi.fn() },
    organisationMonthlyStat: { aggregate: vi.fn() },
    envelope: { count: vi.fn() },
    rateLimit: { upsert: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  monthly: vi.fn(),
  rates: vi.fn(),
  billing: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('@documenso/lib/server-only/rate-limit/check-monthly-quota', () => ({ checkMonthlyQuota: mocks.monthly }));
vi.mock('@documenso/lib/server-only/rate-limit/check-organisation-rate-limits', () => ({
  checkOrganisationRateLimits: mocks.rates,
}));
vi.mock('@documenso/lib/constants/app', () => ({ IS_BILLING_ENABLED: mocks.billing }));
const now = new Date('2026-09-14T12:00:00Z');
const startedAt = new Date('2026-09-13T12:00:00Z');
const expiresAt = new Date('2026-09-27T12:00:00Z');
const claim = {
  id: 'cloned_pro_claim',
  documentQuota: null,
  emailQuota: null,
  apiQuota: null,
  documentRateLimits: [],
  emailRateLimits: [],
  apiRateLimits: [],
  envelopeItemCount: 100,
  flags: { unlimitedDocuments: true },
};
let organisation: Record<string, unknown>;
let budget: {
  ownerUserId: number;
  startedAt: Date;
  expiresAt: Date;
  documentsUsed: number;
  emailsUsed: number;
  organisationsCreated: number;
} | null;
let internal: boolean;
let policy: null | { trialDocuments: number; trialEmails: number; trialRecipients: number; trialOrganisations: number };
const reserve = (type: 'document' | 'email' | 'api', count = 1) =>
  assertOrganisationRatesAndLimits({ organisationId: 'trial_org', count, type });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv('DANGEROUS_BYPASS_RATE_LIMITS', 'false');
  internal = false;
  policy = null;
  budget = { ownerUserId: 17, startedAt, expiresAt, documentsUsed: 0, emailsUsed: 0, organisationsCreated: 1 };
  organisation = {
    id: 'trial_org',
    ownerUserId: 17,
    createdAt: startedAt,
    organisationClaim: claim,
    subscription: null,
  };
  for (const reader of [
    mocks.db.organisation.findFirst,
    mocks.db.organisation.findUnique,
    mocks.db.organisation.findUniqueOrThrow,
  ]) {
    reader.mockImplementation(() => Promise.resolve(organisation));
  }
  mocks.db.organisation.findMany.mockImplementation(() => Promise.resolve([organisation]));
  mocks.db.user.findUniqueOrThrow.mockResolvedValue({ id: 17, createdAt: startedAt });
  mocks.db.bizrethinkOrganisationBilling.findUnique.mockImplementation(() =>
    Promise.resolve({ bizrethinkInternal: internal, trialStartedAt: startedAt, trialEndsAt: expiresAt }),
  );
  mocks.db.bizrethinkOrganisationBilling.findMany.mockImplementation(() =>
    Promise.resolve([
      { organisationId: 'trial_org', bizrethinkInternal: internal, trialStartedAt: startedAt, trialEndsAt: expiresAt },
    ]),
  );
  mocks.db.bizrethinkInstanceResourcePolicy.findUnique.mockImplementation(() => Promise.resolve(policy));
  mocks.db.bizrethinkTrialBudget.findUnique.mockImplementation(() => Promise.resolve(budget && { ...budget }));
  mocks.db.bizrethinkTrialBudget.create.mockImplementation(({ data }) => {
    budget = data;
    return Promise.resolve({ ...data });
  });
  mocks.db.bizrethinkTrialBudget.update.mockImplementation(({ data }) => {
    if (!budget) {
      throw new Error('Missing synthetic budget');
    }
    for (const key of ['documentsUsed', 'emailsUsed', 'organisationsCreated'] as const) {
      const value = data[key];
      if (value !== undefined) {
        budget[key] = typeof value === 'number' ? value : budget[key] + value.increment;
      }
    }
    return Promise.resolve({ ...budget });
  });
  mocks.db.bizrethinkTrialOrganisation.findUnique.mockResolvedValue({ organisationId: 'trial_org', ownerUserId: 17 });
  mocks.db.organisationMonthlyStat.aggregate.mockResolvedValue({ _sum: { documentCount: 0, emailCount: 0 } });
  mocks.db.envelope.count.mockResolvedValue(0);
  mocks.db.rateLimit.upsert.mockResolvedValue({ count: 1 });
  mocks.billing.mockReturnValue(false);
  // Serial transactions model the User row lock; the HTTP suite proves it against PostgreSQL.
  let previous = Promise.resolve<unknown>(undefined);
  mocks.db.$transaction.mockImplementation((operation) => {
    const result = previous.then(() => operation(mocks.db));
    previous = result.catch(() => undefined);
    return result;
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it('A-11 accepts five document reservations and rejects the sixth with billing off and an unlimited cloned claim', async () => {
  for (let i = 0; i < 5; i++) {
    await reserve('document');
  }
  await expect(reserve('document')).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  expect(budget?.documentsUsed).toBe(5);
});
it('A-11 accepts ten recipient emails and rejects the eleventh across the trial, not just a month', async () => {
  await reserve('email', 10);
  vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
  if (budget) {
    budget.expiresAt = new Date('2026-10-02T12:00:00Z');
  }
  await expect(reserve('email')).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  expect(budget?.emailsUsed).toBe(10);
});
it('A-11 the test/development rate bypass cannot disable a trial cap', async () => {
  vi.stubEnv('DANGEROUS_BYPASS_RATE_LIMITS', 'true');
  await expect(reserve('document', 6)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  expect(budget?.documentsUsed).toBe(0);
});
it('A-11 simultaneous document reservations cannot all consume the last slot', async () => {
  if (budget) {
    budget.documentsUsed = 4;
  }
  const results = await Promise.allSettled([reserve('document'), reserve('document'), reserve('document')]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(budget?.documentsUsed).toBe(5);
});
it.each(['document', 'email', 'api'] as const)('A-11 refuses %s after the 14-day trial expires', async (type) => {
  if (budget) {
    budget.expiresAt = now;
  }
  await expect(reserve(type)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
});
it('A-11 reads edited admin limits for each request', async () => {
  policy = { trialDocuments: 2, trialEmails: 3, trialRecipients: 4, trialOrganisations: 1 };
  await expect(reserve('document', 3)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  policy.trialDocuments = 3;
  await expect(reserve('document', 3)).resolves.toBeUndefined();
});
it('A-11 settings failures never turn a trial into unlimited access', async () => {
  mocks.db.bizrethinkInstanceResourcePolicy.findUnique.mockRejectedValue(new Error('synthetic DB failure'));
  await expect(reserve('document')).rejects.toThrow('synthetic DB failure');
  expect(mocks.monthly).not.toHaveBeenCalled();
});
it('A-11 imports existing usage before granting a legacy trial more capacity', async () => {
  budget = null;
  mocks.db.organisationMonthlyStat.aggregate.mockResolvedValue({ _sum: { documentCount: 5, emailCount: 10 } });
  await expect(reserve('document')).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
});
it('A-11 the UI reports a finite trial allowance despite billing being disabled', async () => {
  if (budget) {
    budget.documentsUsed = 2;
  }
  const result = await getServerLimits({ userId: 17, teamId: 9 });
  expect(result.quota.documents).toBe(5);
  expect(result.remaining.documents).toBe(3);
  expect(result.quota.recipients).toBe(10);
});
it.each(['ACTIVE', 'PAST_DUE'])('preserves approved limits for a real %s paid subscription', async (status) => {
  organisation.subscription = { status };
  await expect(reserve('document', 40)).resolves.toBeUndefined();
  expect(mocks.monthly).toHaveBeenCalledOnce();
  expect(budget?.documentsUsed).toBe(0);
});
it('preserves approved internal organisation limits', async () => {
  internal = true;
  await expect(reserve('email', 100)).resolves.toBeUndefined();
  expect(mocks.monthly).toHaveBeenCalledOnce();
  expect(budget?.emailsUsed).toBe(0);
});
it('zero reservations consume no capacity', async () => {
  await expect(reserve('document', 0)).resolves.toBeUndefined();
  expect(budget?.documentsUsed).toBe(0);
});
