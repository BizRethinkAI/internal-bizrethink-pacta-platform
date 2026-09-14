import type { SessionUser } from '@documenso/auth/server/lib/session/session';
import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { Role } from '@prisma/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { bizrethinkRouter } from '../server-only/trpc/router';

const { db } = vi.hoisted(() => ({
  db: { bizrethinkInstanceResourcePolicy: { findUnique: vi.fn(), upsert: vi.fn() } },
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
const policy = { trialDocuments: 5, trialEmails: 10, trialRecipients: 10, trialOrganisations: 1 };
const user: SessionUser = {
  id: 71,
  name: 'Synthetic admin',
  email: 'admin@example.invalid',
  disabled: false,
  roles: [Role.ADMIN],
  emailVerified: new Date(),
  avatarImageId: null,
  signature: null,
  twoFactorEnabled: false,
};
const context = (actor: SessionUser | null): TrpcContext => ({
  ...(actor
    ? {
        user: actor,
        session: {
          id: 'synthetic',
          sessionToken: 'synthetic',
          userId: actor.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          ipAddress: null,
          userAgent: null,
          expiresAt: new Date(Date.now() + 60000),
        },
      }
    : { user: null, session: null }),
  teamId: undefined,
  req: new Request('http://fixture.invalid'),
  res: new Response(),
  metadata: { auth: null, source: 'app', requestMetadata: {} },
  logger,
});
const caller = (actor: SessionUser | null) =>
  bizrethinkRouter.createCaller(context(actor)) as unknown as {
    resourcePolicy: { get(): Promise<typeof policy>; update(input: typeof policy): Promise<{ ok: true }> };
  };
beforeEach(() => {
  vi.resetAllMocks();
  logger.level = 'silent';
  db.bizrethinkInstanceResourcePolicy.findUnique.mockResolvedValue(null);
});
it('A-11 exposes the approved fresh-instance defaults to an instance admin', async () => {
  expect(await caller(user).resourcePolicy.get()).toEqual(policy);
});
it('A-11 allows an instance admin to persist finite edited limits with attribution', async () => {
  await expect(caller(user).resourcePolicy.update({ ...policy, trialDocuments: 4 })).resolves.toEqual({ ok: true });
  expect(db.bizrethinkInstanceResourcePolicy.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ create: { id: 'singleton', ...policy, trialDocuments: 4, updatedByUserId: user.id } }),
  );
});
it.each([
  null,
  { ...user, roles: [Role.USER] },
])('A-11 rejects unauthenticated or ordinary users before reading settings', async (actor) => {
  await expect(caller(actor).resourcePolicy.get()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(db.bizrethinkInstanceResourcePolicy.findUnique).not.toHaveBeenCalled();
});
it('A-11 refuses an unlimited or malformed cap', async () => {
  await expect(caller(user).resourcePolicy.update({ ...policy, trialDocuments: Infinity })).rejects.toMatchObject({
    code: 'BAD_REQUEST',
  });
  expect(db.bizrethinkInstanceResourcePolicy.upsert).not.toHaveBeenCalled();
});
