import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';
import { filledDraftFixture } from '../draft.fixture';

const mocks = vi.hoisted(() => {
  const deal = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  };
  const db = {
    team: { findFirst: vi.fn() },
    bizrethinkMcaTemplate: { findFirst: vi.fn() },
    bizrethinkMcaDeal: deal,
  };
  return { db, grant: vi.fn() };
});
vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('../../../server-only/feature-access', () => ({ getFeatureAccess: mocks.grant }));

import { deleteMcaDeal, listMcaDeals, openMcaDeal, saveMcaDeal } from './deals';

const identity = { userId: 41, teamId: 17 };
const profile = providerFixture();
const { input } = filledDraftFixture();
const template = () => ({
  id: 'mca-template',
  currentRevision: 1,
  revisions: [{ version: 1, profile, fingerprint: compileMcaTemplate(profile).fingerprint }],
});
const stored = () => ({
  id: 'deal-1',
  organisationId: 'org-a',
  teamId: 17,
  templateId: 'mca-template',
  templateRevision: 1,
  label: 'Example Merchant Inc.',
  version: 2,
  input,
  createdByUserId: 41,
  updatedByUserId: 41,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.team.findFirst.mockResolvedValue({ id: 17, organisationId: 'org-a' });
  mocks.grant.mockResolvedValue(true);
  mocks.db.bizrethinkMcaTemplate.findFirst.mockResolvedValue(template());
  mocks.db.bizrethinkMcaDeal.findFirst.mockResolvedValue(stored());
  mocks.db.bizrethinkMcaDeal.create.mockResolvedValue({ ...stored(), id: 'created', version: 1 });
  mocks.db.bizrethinkMcaDeal.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.bizrethinkMcaDeal.deleteMany.mockResolvedValue({ count: 1 });
  mocks.db.bizrethinkMcaDeal.findMany.mockResolvedValue([stored()]);
});

/**
 * ADR 0022: a deal is saved input, and a document is recompiled from it.
 *
 * The interview lost everything on reload, which made the builder unusable for
 * work that takes more than one sitting. What it must NOT become is a store of
 * assembled legal text: reopening recompiles from the named template revision,
 * so a deal cannot carry stale wording forward and there is no archived copy to
 * mistake for an executed one.
 */
describe('a deal survives a reload', () => {
  it('saves the answers and names the revision they were filled against', async () => {
    await saveMcaDeal({ ...identity, templateId: 'mca-template', label: 'Example Merchant Inc.', input });

    const written = mocks.db.bizrethinkMcaDeal.create.mock.calls[0]?.[0].data;
    expect(written).toMatchObject({
      teamId: 17,
      organisationId: 'org-a',
      templateId: 'mca-template',
      templateRevision: 1,
    });
    expect(written.input).toEqual(input);
  });

  it('stores no assembled document', async () => {
    await saveMcaDeal({ ...identity, templateId: 'mca-template', label: 'Example Merchant Inc.', input });

    const written = JSON.stringify(mocks.db.bizrethinkMcaDeal.create.mock.calls[0]?.[0].data);
    expect(written).not.toContain('Pursuant to');
    expect(written).not.toContain('documents');
  });

  it('reopens by recompiling, not by replaying stored text', async () => {
    const opened = await openMcaDeal({ ...identity, id: 'deal-1' });

    expect(opened.input).toEqual(input);
    expect(opened.draft.documents.length).toBeGreaterThan(0);
    expect(opened.draft.readyToSend).toBe(false);
    expect(opened.draft.audience).toBe('internal-draft');
  });

  it('keeps every guard on the saved input, including the venue blocker', async () => {
    const funderForum = {
      ...profile,
      buyer: { ...profile.buyer, venueState: 'Florida' },
      policy: { ...profile.policy, venueRule: 'funder-state' as const, recipientStates: ['US-FL' as const] },
    };
    mocks.db.bizrethinkMcaTemplate.findFirst.mockResolvedValue({
      id: 'mca-template',
      currentRevision: 1,
      revisions: [{ version: 1, profile: funderForum, fingerprint: compileMcaTemplate(funderForum).fingerprint }],
    });
    mocks.db.bizrethinkMcaDeal.findFirst.mockResolvedValue({
      ...stored(),
      input: { ...input, values: { ...input.values, 'merchant.principalState': 'Virginia' } },
    });

    const opened = await openMcaDeal({ ...identity, id: 'deal-1' });

    expect(opened.draft.blockers.map((blocker) => blocker.kind)).toContain('venue-conflict');
  });
});

describe('two people editing one deal is a conflict, not a last write', () => {
  it('refuses a save whose version has moved', async () => {
    mocks.db.bizrethinkMcaDeal.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      saveMcaDeal({ ...identity, id: 'deal-1', expectedVersion: 2, label: 'x', input, templateId: 'mca-template' }),
    ).rejects.toThrow(/version|changed|conflict/i);
  });

  it('advances the version on a clean save', async () => {
    await saveMcaDeal({ ...identity, id: 'deal-1', expectedVersion: 2, label: 'x', input, templateId: 'mca-template' });

    const where = mocks.db.bizrethinkMcaDeal.updateMany.mock.calls[0]?.[0].where;
    expect(where).toMatchObject({ id: 'deal-1', teamId: 17, version: 2 });
    expect(mocks.db.bizrethinkMcaDeal.updateMany.mock.calls[0]?.[0].data.version).toBe(3);
  });
});

describe('a deal belongs to its team', () => {
  it('refuses a caller who is not a member, whatever their grants', async () => {
    mocks.db.team.findFirst.mockResolvedValue(null);

    await expect(openMcaDeal({ ...identity, id: 'deal-1' })).rejects.toThrow();
  });

  it('refuses a caller without the builder grant', async () => {
    mocks.grant.mockResolvedValue(false);

    await expect(openMcaDeal({ ...identity, id: 'deal-1' })).rejects.toThrow();
  });

  it('scopes every lookup to the caller’s team and organisation', async () => {
    await openMcaDeal({ ...identity, id: 'deal-1' });

    expect(mocks.db.bizrethinkMcaDeal.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      id: 'deal-1',
      teamId: 17,
      organisationId: 'org-a',
    });
  });

  it('lists only that team’s deals, most recently worked first', async () => {
    await listMcaDeals(identity);

    const query = mocks.db.bizrethinkMcaDeal.findMany.mock.calls[0]?.[0];
    expect(query.where).toMatchObject({ teamId: 17, organisationId: 'org-a' });
    expect(query.orderBy).toEqual({ updatedAt: 'desc' });
  });

  it('does not ask for stored answers in a list', async () => {
    await listMcaDeals(identity);

    // Asserting on the mock's return would test the mock. The service controls
    // the projection, so that is what this checks.
    expect(mocks.db.bizrethinkMcaDeal.findMany.mock.calls[0]?.[0].select).not.toHaveProperty('input');
  });
});

describe('deleting a deal deletes it', () => {
  it('removes the row rather than flagging it', async () => {
    await deleteMcaDeal({ ...identity, id: 'deal-1' });

    expect(mocks.db.bizrethinkMcaDeal.deleteMany).toHaveBeenCalledWith({
      where: { id: 'deal-1', teamId: 17, organisationId: 'org-a' },
    });
    expect(mocks.db.bizrethinkMcaDeal.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to delete another team’s deal', async () => {
    mocks.db.bizrethinkMcaDeal.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteMcaDeal({ ...identity, id: 'deal-1' })).rejects.toThrow();
  });
});
