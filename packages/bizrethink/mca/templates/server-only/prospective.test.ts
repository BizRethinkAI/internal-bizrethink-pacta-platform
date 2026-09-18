import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  db: {
    team: { findFirst: vi.fn() },
    bizrethinkMcaTemplate: { create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    bizrethinkMcaTemplateRevision: { create: vi.fn() },
  },
  grant: vi.fn(),
  entity: vi.fn(),
}));

vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('../../../server-only/feature-access', () => ({ getFeatureAccess: mocks.grant }));
vi.mock('../../entities/server-only/service', () => ({ getMcaEntity: mocks.entity }));

import { entityFixture } from '../../entities/entity.fixture';
import { previewProspectiveMcaTemplate } from './prospective';

const actor = { teamId: 17, userId: 41 };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.team.findFirst.mockResolvedValue({ id: 17, organisationId: 'org-a' });
  // Two different grants: the builder opens the vertical, the draft grant
  // allows authored legal text to be rendered. Answered separately so a test
  // can withhold one without withholding the other.
  mocks.grant.mockImplementation(
    async ({ feature }: { feature: string }) => feature === 'mca-builder' || feature === 'mca-clause-draft-rendering',
  );
  mocks.entity.mockResolvedValue({ ...entityFixture(), id: 'mcaent_1', version: 1, updatedAt: new Date() });
});

/**
 * ADR 0026 makes creating a template two choices — an entity and a document —
 * and nothing else. So the thing worth showing before it is created is the
 * document those two choices produce.
 *
 * This compiles one WITHOUT SAVING IT. `previewMcaTemplate` beside it needs a
 * saved template and a revision to name; this needs neither, because there is
 * nothing to name yet.
 */
describe('seeing the document before creating the template', () => {
  it('compiles what those two choices would produce', async () => {
    const preview = await previewProspectiveMcaTemplate({ ...actor, entityId: 'mcaent_1', instrument: 'frpa' });

    expect(preview.instrument).toBe('frpa');
    expect(preview.documents[0]?.items.length).toBeGreaterThan(0);
    expect(preview.entity.label).toBe(entityFixture().label);
  });

  /**
   * THE WHOLE POINT: nothing is written. A preview that quietly created a
   * template would leave a funder with paper they were only considering, and
   * revision 1 is not a draft — it is a record.
   */
  it('writes nothing at all', async () => {
    await previewProspectiveMcaTemplate({ ...actor, entityId: 'mcaent_1', instrument: 'frpa' });

    expect(mocks.db.bizrethinkMcaTemplate.create).not.toHaveBeenCalled();
    expect(mocks.db.bizrethinkMcaTemplateRevision.create).not.toHaveBeenCalled();
    expect(mocks.db.bizrethinkMcaTemplate.updateMany).not.toHaveBeenCalled();
  });

  /**
   * It renders legal text, so it needs the same permission the saved preview
   * needs — membership and the builder grant are not enough (ADR 0016).
   */
  it('needs the draft grant, not merely the builder', async () => {
    mocks.grant.mockImplementation(async ({ feature }: { feature: string }) => feature === 'mca-builder');

    await expect(previewProspectiveMcaTemplate({ ...actor, entityId: 'mcaent_1', instrument: 'frpa' })).rejects.toThrow(
      /draft preview access/i,
    );

    expect(mocks.entity).not.toHaveBeenCalled();
  });

  /** The entity is read through its own service, so its team scoping applies. */
  it('reads the entity as the caller, not around them', async () => {
    await previewProspectiveMcaTemplate({ ...actor, entityId: 'mcaent_1', instrument: 'frpa' });

    expect(mocks.entity).toHaveBeenCalledWith({ teamId: 17, userId: 41, id: 'mcaent_1' });
  });

  /**
   * A document the programme does not run is refused here for the same reason
   * `compileMcaTemplate` refuses it: showing one would advertise a template the
   * builder would then decline to create.
   */
  it('refuses a document this entity does not run', async () => {
    await expect(
      previewProspectiveMcaTemplate({ ...actor, entityId: 'mcaent_1', instrument: 'iso-pra' }),
    ).rejects.toThrow(/does not run/i);
  });
});
