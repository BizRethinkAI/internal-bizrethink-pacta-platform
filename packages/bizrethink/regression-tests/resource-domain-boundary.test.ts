import { createEmailDomain } from '@documenso/ee/server-only/lib/create-email-domain';
import { verifyEmailDomain } from '@documenso/ee/server-only/lib/verify-email-domain';
import { beforeEach, expect, it, vi } from 'vitest';

const { db, dns } = vi.hoisted(() => ({
  dns: vi.fn(),
  db: {
    emailDomain: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    organisation: { findUniqueOrThrow: vi.fn() },
    bizrethinkEmailDomainOwnership: { findUnique: vi.fn(), upsert: vi.fn() },
    bizrethinkEmailDomainChallenge: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    rateLimit: { upsert: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));
vi.mock('node:dns/promises', () => ({
  Resolver: vi.fn(function DomainResolver() {
    return { setServers: vi.fn(), resolveTxt: dns, cancel: vi.fn() };
  }),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/constants/crypto', () => ({ DOCUMENSO_ENCRYPTION_KEY: '00'.repeat(32) }));
const domain = 'proof.example.invalid';
const create = () => createEmailDomain({ domain, organisationId: 'org_legitimate' });
beforeEach(() => {
  vi.resetAllMocks();
  db.organisation.findUniqueOrThrow.mockResolvedValue({ id: 'org_legitimate', ownerUserId: 17 });
  db.emailDomain.findUnique.mockResolvedValue(null);
  db.emailDomain.findFirst.mockResolvedValue(null);
  db.emailDomain.count.mockResolvedValue(0);
  db.bizrethinkEmailDomainChallenge.findUnique.mockResolvedValue(null);
  db.bizrethinkEmailDomainChallenge.count.mockResolvedValue(0);
  const createRow = ({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ ...data, createdAt: new Date(), updatedAt: new Date(), lastVerifiedAt: null, emails: [] });
  db.emailDomain.create.mockImplementation(createRow);
  db.bizrethinkEmailDomainChallenge.create.mockImplementation(createRow);
  db.rateLimit.upsert.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation((operation) => operation(db));
});
it('A-20 an unverified reservation cannot exclude another organisation from proving the same domain', async () => {
  const pending = { id: 'unproved', domain, organisationId: 'org_other', status: 'PENDING', emails: [] };
  db.emailDomain.findUnique.mockResolvedValue(pending);
  db.emailDomain.findFirst.mockResolvedValue(pending);
  const result = await create();
  expect(result.emailDomain.organisationId).toBe('org_legitimate');
  expect(result.emailDomain.status).toBe('PENDING');
  expect(db.emailDomain.create).not.toHaveBeenCalled();
});
it('A-20 new pending requests use a nonexclusive expiring challenge, not the global ownership table', async () => {
  const result = await create();
  expect(db.emailDomain.create).not.toHaveBeenCalled();
  expect(db.bizrethinkEmailDomainChallenge.create).toHaveBeenCalledOnce();
  const data = db.bizrethinkEmailDomainChallenge.create.mock.calls[0][0].data;
  expect(data.expiresAt.getTime() - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
  expect(data.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  expect(result.emailDomain).not.toHaveProperty('privateKey');
});
it('preserves a known active owner until an authorized ownership change', async () => {
  const active = { id: 'proved', domain, organisationId: 'org_other', status: 'ACTIVE', emails: [] };
  db.emailDomain.findUnique.mockResolvedValue(active);
  db.emailDomain.findFirst.mockResolvedValue(active);
  await expect(create()).rejects.toMatchObject({ code: 'ALREADY_EXISTS' });
  expect(db.bizrethinkEmailDomainChallenge.create).not.toHaveBeenCalled();
});
it('A-20 rejects new pending claims once the bounded pending allowance is exhausted', async () => {
  db.bizrethinkEmailDomainChallenge.count.mockResolvedValue(100);
  await expect(create()).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  expect(db.emailDomain.create).not.toHaveBeenCalled();
});

const challenge = () => ({
  id: 'fresh-proof',
  domain,
  organisationId: 'org_legitimate',
  ownerUserId: 17,
  selector: `unique._domainkey.${domain}`,
  publicKey: 'cHVibGlja2V5',
  privateKey: 'encrypted-fixture',
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 60000),
  lastVerifiedAt: null,
});
it('grants exclusive ownership only after matching fresh DNS proof, without returning a private key', async () => {
  const pending = challenge();
  db.bizrethinkEmailDomainChallenge.findUnique.mockResolvedValue(pending);
  dns.mockResolvedValue([[`v=DKIM1; k=rsa; p=${pending.publicKey}`]]);
  db.emailDomain.create.mockImplementation(({ data }) => {
    const { privateKey: _key, ...safe } = data;
    return Promise.resolve({ ...safe, emails: [] });
  });
  const result = await verifyEmailDomain(pending.id);
  expect(result.isVerified).toBe(true);
  expect(result.emailDomain.status).toBe('ACTIVE');
  expect(result.emailDomain).not.toHaveProperty('privateKey');
  expect(db.bizrethinkEmailDomainOwnership.upsert).toHaveBeenCalledOnce();
  expect(db.bizrethinkEmailDomainChallenge.delete).toHaveBeenCalledWith({ where: { id: pending.id } });
});
it('a valid competing proof cannot replace a previously verified owner now marked pending', async () => {
  const pending = challenge();
  db.bizrethinkEmailDomainChallenge.findUnique.mockResolvedValue(pending);
  dns.mockResolvedValue([[`v=DKIM1; p=${pending.publicKey}`]]);
  db.emailDomain.findFirst.mockResolvedValue({ id: 'older-owner', status: 'PENDING', emails: [] });
  db.bizrethinkEmailDomainOwnership.findUnique.mockResolvedValue({ emailDomainId: 'older-owner' });
  await expect(verifyEmailDomain(pending.id)).rejects.toMatchObject({ code: 'ALREADY_EXISTS' });
  expect(db.emailDomain.delete).not.toHaveBeenCalled();
  expect(db.emailDomain.create).not.toHaveBeenCalled();
});
it('rechecks challenge expiration after DNS rather than admitting a late proof', async () => {
  const pending = challenge();
  db.bizrethinkEmailDomainChallenge.findUnique
    .mockResolvedValueOnce(pending)
    .mockResolvedValue({ ...pending, expiresAt: new Date(0) });
  dns.mockResolvedValue([[`v=DKIM1; p=${pending.publicKey}`]]);
  await expect(verifyEmailDomain(pending.id)).rejects.toMatchObject({ code: 'EXPIRED_CODE' });
  expect(db.emailDomain.create).not.toHaveBeenCalled();
});
it('rejects an already expired challenge before doing DNS work', async () => {
  db.bizrethinkEmailDomainChallenge.findUnique.mockResolvedValue({ ...challenge(), expiresAt: new Date(0) });
  await expect(verifyEmailDomain('expired')).rejects.toMatchObject({ code: 'EXPIRED_CODE' });
  expect(dns).not.toHaveBeenCalled();
});
it('a mismatched public key remains nonexclusive', async () => {
  const pending = challenge();
  db.bizrethinkEmailDomainChallenge.findUnique.mockResolvedValue(pending);
  db.bizrethinkEmailDomainChallenge.update.mockResolvedValue(pending);
  dns.mockResolvedValue([['v=DKIM1; p=d3Jvbmc=']]);
  expect((await verifyEmailDomain(pending.id)).isVerified).toBe(false);
  expect(db.emailDomain.create).not.toHaveBeenCalled();
});
