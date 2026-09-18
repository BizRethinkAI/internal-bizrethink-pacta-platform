import { randomUUID } from 'node:crypto';

import { entityFixture } from '@bizrethink/customizations/mca/entities/entity.fixture';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';
import { seedUser } from '@documenso/prisma/seed/users';
import { dataTransformer } from '@documenso/trpc/utils/data-transformer';
import { type APIRequestContext, expect, test } from '@playwright/test';

import { apiSignin } from '../fixtures/authentication';

/**
 * ADR 0026: an entity is our side, saved once and chosen when a template is
 * created. #310 shipped the record and the service and wired neither to
 * anything — an entity could not be created at all. This covers the routes that
 * changed that, over HTTP, because authorisation is what they add.
 */
const endpoint = (route: string) => `${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaEntities.${route}`;
const post = (request: APIRequestContext, route: string, input: unknown) =>
  request.post(endpoint(route), { data: dataTransformer.serialize(input) });
const get = (request: APIRequestContext, route: string, input: unknown) =>
  request.get(endpoint(route), { params: { input: JSON.stringify(dataTransformer.serialize(input)) } });

const grant = async (userId: number, enabled: boolean) => {
  const key = { feature: 'mca-builder', scope: 'user', scopeId: String(userId) };

  await prisma.bizrethinkFeatureAccess.upsert({
    where: { feature_scope_scopeId: key },
    create: { id: randomUUID(), ...key, enabled },
    update: { enabled },
  });
};

const cleanup = async (userId: number) => {
  await prisma.bizrethinkMcaEntity.deleteMany({ where: { createdByUserId: userId } });
  await prisma.bizrethinkFeatureAccess.deleteMany({
    where: { scope: 'user', scopeId: String(userId), feature: 'mca-builder' },
  });
};

test('an entity is saved once, read back whole, and edited only with the version it was opened at', async ({
  page,
}) => {
  const own = await seedUser();
  const teamId = own.organisation.teams[0].id;

  try {
    await grant(own.user.id, true);
    await apiSignin({ page, email: own.user.email });

    const created = await post(page.request, 'create', { teamId, entity: entityFixture() });
    expect(created.ok()).toBe(true);

    const row = await prisma.bizrethinkMcaEntity.findFirstOrThrow({ where: { createdByUserId: own.user.id } });

    const read = await get(page.request, 'get', { teamId, id: row.id });
    expect(read.ok()).toBe(true);
    // The policy is what decides clause selection, so a read has to carry it.
    expect(await read.text()).toContain('merchant-state');

    const listed = await get(page.request, 'list', { teamId });
    expect(listed.ok()).toBe(true);
    // A list is for choosing between entities, not for reading one.
    expect(await listed.text()).not.toContain('merchant-state');

    /*
      TWO PEOPLE EDITING ONE ENTITY IS A CONFLICT TO REPORT, not a silent last
      write: these terms decide clause selection for every document the entity
      issues. The second update sends the version the first already consumed.
    */
    const edit = { teamId, id: row.id, data: { expectedVersion: 1, entity: entityFixture() } };
    expect((await post(page.request, 'update', edit)).ok()).toBe(true);

    const stale = await post(page.request, 'update', edit);
    expect(stale.ok()).toBe(false);
    expect(await stale.text()).toMatch(/changed since it was opened/i);
  } finally {
    await cleanup(own.user.id);
  }
});

test('reading an entity needs the builder grant, and writing one needs more than membership', async ({ page }) => {
  const own = await seedUser();
  const foreign = await seedUser();
  const teamId = own.organisation.teams[0].id;
  const foreignTeamId = foreign.organisation.teams[0].id;

  try {
    await grant(own.user.id, true);
    await apiSignin({ page, email: own.user.email });

    /*
      A CONTRADICTION INSIDE THE GOODS IS REFUSED BEFORE IT IS STORED. Va. Code
      §6.2-2234(A) makes a forum outside the Commonwealth unenforceable for a
      covered transaction, so an entity cannot both fix its own forum and serve
      Virginia. Asserted over HTTP because the schema is the guard.
    */
    const contradictory = entityFixture();
    contradictory.policy.venueRule = 'funder-state';
    contradictory.policy.recipientStates = ['US-VA'];
    contradictory.identity.venueState = 'Florida';

    const refused = await post(page.request, 'create', { teamId, entity: contradictory });
    expect(refused.ok()).toBe(false);
    expect(await prisma.bizrethinkMcaEntity.count({ where: { teamId } })).toBe(0);

    // An entity belongs to its team; another team's is not reachable by id.
    expect((await post(page.request, 'create', { teamId: foreignTeamId, entity: entityFixture() })).ok()).toBe(false);
    expect(await prisma.bizrethinkMcaEntity.count({ where: { teamId: foreignTeamId } })).toBe(0);

    // Without the builder grant the record is unreachable, membership or not.
    await grant(own.user.id, false);
    expect((await get(page.request, 'list', { teamId })).ok()).toBe(false);
  } finally {
    await cleanup(own.user.id);
    await cleanup(foreign.user.id);
  }
});
