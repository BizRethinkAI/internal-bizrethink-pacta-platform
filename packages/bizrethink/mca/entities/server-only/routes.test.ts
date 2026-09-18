import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
}));

vi.mock('./service', () => ({
  createMcaEntity: mocks.create,
  updateMcaEntity: mocks.update,
  getMcaEntity: mocks.get,
  listMcaEntities: mocks.list,
}));

import { entityFixture } from '../entity.fixture';
import { mcaEntitiesRouter } from './router';

/**
 * ADR 0026: an entity is our side, saved once and chosen when a template is
 * created. #310 shipped the record and the service; these are the routes that
 * let a person reach them.
 *
 * WHAT IS WORTH TESTING AT THIS LAYER is not that the service works — it has
 * its own tests — but the two things only the route can get wrong: who the
 * caller is, and what shape is allowed through.
 */
const context = (userId = 41): TrpcContext =>
  ({
    user: {
      id: userId,
      name: 'Synthetic funder',
      email: 'funder@example.invalid',
      disabled: false,
      roles: ['USER'],
      emailVerified: new Date('2026-09-17T00:00:00Z'),
      avatarImageId: null,
      signature: null,
      twoFactorEnabled: false,
    },
    session: {
      id: 'synthetic-session',
      sessionToken: 'synthetic-session',
      userId,
      createdAt: new Date('2026-09-17T00:00:00Z'),
      updatedAt: new Date('2026-09-17T00:00:00Z'),
      expiresAt: new Date('2030-01-01T00:00:00Z'),
      ipAddress: null,
      userAgent: null,
    },
    teamId: 17,
    req: new Request('http://test.invalid/api/trpc'),
    res: new Response(),
    logger,
    metadata: { auth: null, source: 'app', requestMetadata: {} },
  }) as unknown as TrpcContext;

const caller = (userId = 41) => mcaEntitiesRouter.createCaller(context(userId));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.create.mockResolvedValue({ id: 'mcaent_1', version: 1 });
  mocks.update.mockResolvedValue({ id: 'mcaent_1', version: 2 });
  mocks.get.mockResolvedValue({ ...entityFixture(), id: 'mcaent_1', version: 1, updatedAt: new Date() });
  mocks.list.mockResolvedValue([]);
});

/**
 * THE CALLER IS THE SESSION, NEVER THE REQUEST.
 *
 * Every one of these procedures authorises against `userId`, so a route that
 * read it from input would let anyone act as anyone. The service cannot catch
 * this — it is handed whatever the route passes.
 */
describe('who the caller is', () => {
  it.each([
    ['create', () => caller(41).create({ teamId: 17, entity: entityFixture() })],
    [
      'update',
      () => caller(41).update({ teamId: 17, id: 'mcaent_1', data: { expectedVersion: 1, entity: entityFixture() } }),
    ],
    ['get', () => caller(41).get({ teamId: 17, id: 'mcaent_1' })],
    ['list', () => caller(41).list({ teamId: 17 })],
  ])('%s takes the user from the session', async (name, call) => {
    await call();

    const used = { create: mocks.create, update: mocks.update, get: mocks.get, list: mocks.list }[name];

    expect(used?.mock.calls[0]?.[0]).toMatchObject({ userId: 41, teamId: 17 });
  });

  it('refuses a userId supplied by the caller rather than trusting it', async () => {
    await expect(
      // @ts-expect-error — the point of the test is that the schema has no such field.
      caller(41).list({ teamId: 17, userId: 9000 }),
    ).rejects.toThrow();

    expect(mocks.list).not.toHaveBeenCalled();
  });
});

/**
 * The entity's own schema owns what an entity may contain, and it is strict —
 * these check the route hands it the whole thing rather than a subset it
 * happens to know about, so a field added there needs no change here.
 */
describe('what shape gets through', () => {
  it('passes the entity to the service unflattened', async () => {
    const entity = entityFixture();

    await caller().create({ teamId: 17, entity });

    expect(mocks.create.mock.calls[0]?.[0].entity).toEqual(entity);
  });

  it('carries the expected version so a concurrent edit is a conflict', async () => {
    await caller().update({ teamId: 17, id: 'mcaent_1', data: { expectedVersion: 3, entity: entityFixture() } });

    expect(mocks.update.mock.calls[0]?.[0]).toMatchObject({ id: 'mcaent_1', expectedVersion: 3 });
  });

  it('refuses an update with no expected version rather than defaulting one', async () => {
    await expect(
      // @ts-expect-error — omitting it must fail rather than silently last-write-wins.
      caller().update({ teamId: 17, id: 'mcaent_1', data: { entity: entityFixture() } }),
    ).rejects.toThrow();

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('refuses an unknown field rather than ignoring it', async () => {
    await expect(
      // @ts-expect-error — `.strict()` is the assertion.
      caller().create({ teamId: 17, entity: entityFixture(), instrument: 'frpa' }),
    ).rejects.toThrow();

    expect(mocks.create).not.toHaveBeenCalled();
  });
});
