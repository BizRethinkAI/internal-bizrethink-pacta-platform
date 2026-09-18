import { beforeEach, describe, expect, it, vi } from 'vitest';
import { entityFixture } from '../../entities/entity.fixture';
import { compileMcaTemplate } from '../compile';

const mocks = vi.hoisted(() => {
  const template = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() };
  const revision = { create: vi.fn() };
  const db = {
    team: { findFirst: vi.fn(), findMany: vi.fn() },
    bizrethinkMcaTemplate: template,
    bizrethinkMcaTemplateRevision: revision,
  };
  return {
    db: { ...db, $transaction: vi.fn(async (run: (value: typeof db) => unknown) => run(db)) },
    grant: vi.fn(),
    entity: vi.fn(),
  };
});
vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('../../../server-only/feature-access', () => ({ getFeatureAccess: mocks.grant }));

/*
  The entity is READ, never handed in. ADR 0026 §4: a template copies its
  entity into each revision, so both creating and revising one fetch it — which
  is what makes an entity edit reach a document only through a new revision.
*/
vi.mock('../../entities/server-only/service', () => ({ getMcaEntity: mocks.entity }));

import {
  assertMcaTeamAccess,
  createMcaTemplate,
  getMcaTemplate,
  previewMcaTemplate,
  reviseMcaTemplate,
} from './service';

const identity = { userId: 41, teamId: 17 };
const entity = entityFixture();
const existing = () => ({
  id: 'mca-existing',
  label: entity.label,
  instrument: 'frpa',
  entityId: 'mcaent_1',
  currentRevision: 1,
  revisions: [{ version: 1, entity, fingerprint: compileMcaTemplate(entity, 'frpa').fingerprint }],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.team.findFirst.mockResolvedValue({ id: 17, organisationId: 'org-a' });
  mocks.grant.mockResolvedValue(true);
  mocks.entity.mockResolvedValue({ ...entityFixture(), id: 'mcaent_1', version: 1, updatedAt: new Date() });
  mocks.db.bizrethinkMcaTemplate.findFirst.mockResolvedValue(existing());
  mocks.db.bizrethinkMcaTemplate.create.mockResolvedValue({ id: 'created', currentRevision: 1 });
  mocks.db.bizrethinkMcaTemplate.updateMany.mockResolvedValue({ count: 1 });
});

describe('team-owned provider template revisions and independent draft access', () => {
  it('denies an inaccessible team before asking a permissive user grant', async () => {
    mocks.db.team.findFirst.mockResolvedValue(null);
    await expect(assertMcaTeamAccess(identity)).rejects.toThrow();
    expect(mocks.grant).not.toHaveBeenCalled();
  });
  it('denies access when membership exists but the feature is disabled', async () => {
    mocks.grant.mockResolvedValue(false);
    await expect(getMcaTemplate({ ...identity, id: 'mca-existing' })).rejects.toThrow();
    expect(mocks.db.bizrethinkMcaTemplate.findFirst).not.toHaveBeenCalled();
  });
  it('requires a team manager for provider policy writes', async () => {
    await createMcaTemplate({ ...identity, entityId: 'mcaent_1', instrument: 'frpa' });
    expect(mocks.db.team.findFirst.mock.calls[0]?.[0].where.teamGroups.some.teamRole.in).toEqual(['ADMIN', 'MANAGER']);
  });
  it('keeps every template lookup scoped to the authorized team', async () => {
    await getMcaTemplate({ ...identity, id: 'mca-existing' });
    expect(mocks.db.bizrethinkMcaTemplate.findFirst.mock.calls[0]?.[0].where).toEqual({
      id: 'mca-existing',
      teamId: 17,
      organisationId: 'org-a',
    });
  });
  it('returns the entity it was compiled from, without stored or compiled legal bodies', async () => {
    const result = await getMcaTemplate({ ...identity, id: 'mca-existing' });
    expect(result.entity).toEqual(entity);
    expect(result).not.toHaveProperty('snapshot');
    expect(result).not.toHaveProperty('documents');
  });
  it('requires the distinct draft-text permission on the preview endpoint', async () => {
    mocks.grant.mockImplementation(async ({ feature }) => feature === 'mca-builder');
    await expect(previewMcaTemplate({ ...identity, id: 'mca-existing', version: 1 })).rejects.toThrow(
      'Internal draft preview access is required',
    );
  });
  it('rejects stale legal content rather than silently updating a saved revision', async () => {
    const row = existing();
    row.revisions[0].fingerprint = 'outdated';
    mocks.db.bizrethinkMcaTemplate.findFirst.mockResolvedValue(row);
    await expect(previewMcaTemplate({ ...identity, id: row.id, version: 1 })).rejects.toThrow('Create a new revision');
  });
  it('rejects a stale editor without appending a revision', async () => {
    mocks.db.bizrethinkMcaTemplate.updateMany.mockResolvedValue({ count: 0 });
    await expect(reviseMcaTemplate({ ...identity, id: 'mca-existing', expectedVersion: 1 })).rejects.toThrow('Reload');
    expect(mocks.db.bizrethinkMcaTemplateRevision.create).not.toHaveBeenCalled();
  });
  it('appends a new exact revision without mutating previous content', async () => {
    await reviseMcaTemplate({ ...identity, id: 'mca-existing', expectedVersion: 1 });
    expect(mocks.db.bizrethinkMcaTemplate.updateMany.mock.calls[0]?.[0].where).toEqual({
      id: 'mca-existing',
      teamId: 17,
      organisationId: 'org-a',
      currentRevision: 1,
    });
    expect(mocks.db.bizrethinkMcaTemplateRevision.create.mock.calls[0]?.[0].data).toMatchObject({
      templateId: 'mca-existing',
      version: 2,
      entity,
      createdByUserId: 41,
    });
  });
});

/**
 * `BizrethinkMcaTemplate.instrument` is a `String` column, so reading it back
 * proves nothing on its own and every call site used to cast. A cast asserts
 * what nothing checked, on the path that decides whether a template can be
 * published — so the read parses instead, and these are the two halves of that.
 */
describe('a stored row that names a document we do not produce', () => {
  it.each([
    ['a processor form no builder produces', 'split-funding'],
    ['a value from outside the enum entirely', 'not-an-instrument'],
    ['an empty column', ''],
  ])('refuses %s rather than casting it', async (_label, instrument) => {
    mocks.db.bizrethinkMcaTemplate.findFirst.mockResolvedValue({ ...existing(), instrument });

    await expect(getMcaTemplate({ ...identity, id: 'mca-existing' })).rejects.toThrow(/does not produce/i);
  });

  /**
   * ADR 0019 is why `split-funding` is in that list. The letter is the
   * processor's, used exactly as supplied, so a template claiming to be one is
   * a state to report rather than one to render a publish control for.
   */
  it('reads a produced document back without complaint', async () => {
    expect((await getMcaTemplate({ ...identity, id: 'mca-existing' })).instrument).toBe('frpa');
  });
});
