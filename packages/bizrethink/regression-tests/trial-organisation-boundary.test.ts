import { createOrganisation } from '@documenso/lib/server-only/organisation/create-organisation';
import type { SubscriptionClaim } from '@prisma/client';
import { OrganisationType } from '@prisma/client';
import { beforeEach, expect, it, vi } from 'vitest';

const { db } = vi.hoisted(() => ({
  db: {
    organisation: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    organisationGlobalSettings: { create: vi.fn() },
    organisationClaim: { create: vi.fn() },
    organisationAuthenticationPortal: { create: vi.fn() },
    organisationMember: { create: vi.fn() },
    bizrethinkOrganisationBilling: { findMany: vi.fn(), upsert: vi.fn() },
    bizrethinkInstanceResourcePolicy: { findUnique: vi.fn() },
    bizrethinkTrialBudget: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    bizrethinkTrialOrganisation: { create: vi.fn(), createMany: vi.fn() },
    organisationMonthlyStat: { aggregate: vi.fn() },
    envelope: { count: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/constants/app', () => ({ IS_BILLING_ENABLED: () => false }));
vi.mock('@documenso/ee/server-only/stripe/create-customer', () => ({ createCustomer: vi.fn() }));
vi.mock('@documenso/lib/server-only/team/create-team', () => ({ createTeam: vi.fn() }));
const claim = {
  id: 'pro',
  flags: {},
  documentRateLimits: [],
  emailRateLimits: [],
  apiRateLimits: [],
} as unknown as Omit<SubscriptionClaim, 'createdAt' | 'updatedAt'>;
const create = () =>
  createOrganisation({ userId: 31, name: 'Synthetic trial', type: OrganisationType.ORGANISATION, claim });
let budget: {
  ownerUserId: number;
  startedAt: Date;
  expiresAt: Date;
  documentsUsed: number;
  emailsUsed: number;
  organisationsCreated: number;
};

beforeEach(() => {
  vi.resetAllMocks();
  budget = {
    ownerUserId: 31,
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    documentsUsed: 0,
    emailsUsed: 0,
    organisationsCreated: 0,
  };
  db.bizrethinkTrialBudget.findUnique.mockImplementation(() => Promise.resolve({ ...budget }));
  db.bizrethinkInstanceResourcePolicy.findUnique.mockResolvedValue(null);
  db.bizrethinkTrialBudget.update.mockImplementation(({ data }) => {
    budget.organisationsCreated += data.organisationsCreated.increment;
    return Promise.resolve({ ...budget });
  });
  db.organisationGlobalSettings.create.mockResolvedValue({ id: 'settings' });
  db.organisationClaim.create.mockResolvedValue({ id: 'claim' });
  db.organisationAuthenticationPortal.create.mockResolvedValue({ id: 'portal' });
  db.organisation.create.mockImplementation(({ data }) =>
    Promise.resolve({ ...data, groups: [{ id: 'group', organisationRole: 'ADMIN' }] }),
  );
  let previous = Promise.resolve<unknown>(undefined);
  db.$transaction.mockImplementation((operation) => {
    const result = previous.then(() => operation(db));
    previous = result.catch(() => undefined);
    return result;
  });
});
it('A-11 a trial organisation cannot commit without its durable allowance and billing window', async () => {
  const organisation = await create();
  expect(db.bizrethinkTrialOrganisation.create).toHaveBeenCalledWith({
    data: { organisationId: organisation.id, ownerUserId: 31 },
  });
  expect(db.bizrethinkOrganisationBilling.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: {
        organisationId: organisation.id,
        bizrethinkInternal: false,
        trialStartedAt: budget.startedAt,
        trialEndsAt: budget.expiresAt,
      },
    }),
  );
  expect(budget.organisationsCreated).toBe(1);
});
it('A-11 concurrent free organisation creation shares one lifetime slot', async () => {
  const results = await Promise.allSettled([create(), create(), create()]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(db.organisation.create).toHaveBeenCalledOnce();
});
it('A-11 deleting an organisation does not restore its lifetime slot', async () => {
  budget.organisationsCreated = 1;
  db.organisation.findMany.mockResolvedValue([]);
  await expect(create()).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  expect(db.organisation.create).not.toHaveBeenCalled();
});
it('A-11 failure to record the entitlement rejects the constructor transaction', async () => {
  db.bizrethinkTrialOrganisation.create.mockRejectedValue(new Error('synthetic persistence failure'));
  await expect(create()).rejects.toThrow('synthetic persistence failure');
});
