import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  db: { bizrethinkMcaEntity: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() } },
  access: vi.fn(),
}));

vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('../../templates/server-only/service', () => ({ assertMcaTeamAccess: mocks.access }));

import { entityFixture } from '../entity.fixture';
import { createMcaEntity, getMcaEntity, listMcaEntities, updateMcaEntity } from './service';

const actor = { userId: 41, teamId: 17 };
const team = { id: 17, organisationId: 'org-a' };

const stored = () => ({
  id: 'mcaent_1',
  label: 'Example Receipts Inc.',
  identity: entityFixture().identity,
  policy: entityFixture().policy,
  version: 1,
  updatedAt: new Date('2026-09-17T10:00:00Z'),
  updatedByUserId: 41,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue(team);
  mocks.db.bizrethinkMcaEntity.create.mockResolvedValue({ id: 'mcaent_1', version: 1 });
  mocks.db.bizrethinkMcaEntity.findFirst.mockResolvedValue(stored());
  mocks.db.bizrethinkMcaEntity.findMany.mockResolvedValue([stored()]);
  mocks.db.bizrethinkMcaEntity.updateMany.mockResolvedValue({ count: 1 });
});

/**
 * ADR 0026. An entity is our side, saved once and chosen when a template is
 * created.
 *
 * WHAT IS NOT TESTED HERE is that a template uses it — nothing does yet. This
 * is the record and its boundaries.
 */
describe('saving an entity', () => {
  it('validates before it writes, so a half-formed entity never lands', async () => {
    const broken = entityFixture();

    broken.policy.venueRule = 'funder-state';
    broken.identity.venueState = '';

    await expect(createMcaEntity({ ...actor, entity: broken })).rejects.toThrow();
    expect(mocks.db.bizrethinkMcaEntity.create).not.toHaveBeenCalled();
  });

  it('writes it against the caller’s own team and organisation', async () => {
    await createMcaEntity({ ...actor, entity: entityFixture() });

    expect(mocks.db.bizrethinkMcaEntity.create.mock.calls[0]?.[0].data).toMatchObject({
      teamId: 17,
      organisationId: 'org-a',
      label: 'Example Receipts Inc.',
      createdByUserId: 41,
      updatedByUserId: 41,
    });
  });

  /**
   * Changing an entity changes which clauses every document it issues contains.
   * That is a programme decision, so it needs the same authority as changing
   * provider policy did (ADR 0016), not merely membership.
   */
  it.each([
    ['create', () => createMcaEntity({ ...actor, entity: entityFixture() })],
    ['update', () => updateMcaEntity({ ...actor, id: 'mcaent_1', expectedVersion: 1, entity: entityFixture() })],
  ])('%s needs write authority over the team', async (_label, call) => {
    await call();

    expect(mocks.access).toHaveBeenCalledWith({ teamId: 17, userId: 41, write: true });
  });

  it('reading does not need write authority', async () => {
    await listMcaEntities(actor);

    expect(mocks.access).toHaveBeenCalledWith({ teamId: 17, userId: 41 });
  });
});

/**
 * Two people editing one entity is a conflict to report, not a silent last
 * write — these terms decide clause selection for every document the entity
 * issues. Same compare-and-swap a template revision uses.
 */
describe('two people editing one entity', () => {
  it('refuses an update whose version has moved', async () => {
    mocks.db.bizrethinkMcaEntity.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      updateMcaEntity({ ...actor, id: 'mcaent_1', expectedVersion: 1, entity: entityFixture() }),
    ).rejects.toThrow(/changed|version|conflict/i);
  });

  it('advances the version on a clean update', async () => {
    await updateMcaEntity({ ...actor, id: 'mcaent_1', expectedVersion: 1, entity: entityFixture() });

    const call = mocks.db.bizrethinkMcaEntity.updateMany.mock.calls[0]?.[0];

    expect(call.where).toMatchObject({ id: 'mcaent_1', teamId: 17, organisationId: 'org-a', version: 1 });
    expect(call.data.version).toBe(2);
    expect(call.data.updatedByUserId).toBe(41);
  });

  /**
   * An entity is EDITED, unlike a revision, which is why it has a version
   * rather than a history. What must not happen is an edit reaching a document
   * that was already published — that is prevented by copying the entity into
   * the revision, not by refusing the edit.
   */
  it('updates in place rather than writing a new row', async () => {
    await updateMcaEntity({ ...actor, id: 'mcaent_1', expectedVersion: 1, entity: entityFixture() });

    expect(mocks.db.bizrethinkMcaEntity.create).not.toHaveBeenCalled();
  });
});

describe('an entity belongs to its team', () => {
  it('scopes every read to the caller’s team and organisation', async () => {
    await getMcaEntity({ ...actor, id: 'mcaent_1' });

    expect(mocks.db.bizrethinkMcaEntity.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      id: 'mcaent_1',
      teamId: 17,
      organisationId: 'org-a',
    });
  });

  it('refuses a caller the access check refuses', async () => {
    mocks.access.mockRejectedValue(new Error('MCA templates are unavailable for this team.'));

    await expect(listMcaEntities(actor)).rejects.toThrow();
    expect(mocks.db.bizrethinkMcaEntity.findMany).not.toHaveBeenCalled();
  });

  it('reports a missing entity rather than returning nothing', async () => {
    mocks.db.bizrethinkMcaEntity.findFirst.mockResolvedValue(null);

    await expect(getMcaEntity({ ...actor, id: 'gone' })).rejects.toThrow();
  });

  it('lists the team’s entities, most recently worked first', async () => {
    await listMcaEntities(actor);

    const query = mocks.db.bizrethinkMcaEntity.findMany.mock.calls[0]?.[0];

    expect(query.where).toMatchObject({ teamId: 17, organisationId: 'org-a' });
    expect(query.orderBy).toEqual({ updatedAt: 'desc' });
  });

  /**
   * A list is for choosing between entities, so it carries what distinguishes
   * them and not the programme terms behind each.
   */
  it('does not carry policy in a list', async () => {
    await listMcaEntities(actor);

    expect(mocks.db.bizrethinkMcaEntity.findMany.mock.calls[0]?.[0].select).not.toHaveProperty('policy');
  });
});

describe('reading one back', () => {
  it('returns it parsed, so a stored row that no longer validates is caught', async () => {
    mocks.db.bizrethinkMcaEntity.findFirst.mockResolvedValue({ ...stored(), policy: { venueRule: 'nonsense' } });

    await expect(getMcaEntity({ ...actor, id: 'mcaent_1' })).rejects.toThrow();
  });

  it('returns the version, so an editor can send it back', async () => {
    expect((await getMcaEntity({ ...actor, id: 'mcaent_1' })).version).toBe(1);
  });
});
