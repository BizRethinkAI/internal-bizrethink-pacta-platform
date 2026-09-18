import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const publication = { create: vi.fn(), findMany: vi.fn() };
  return {
    db: { team: { findFirst: vi.fn() }, bizrethinkMcaPublication: publication },
    grant: vi.fn(),
  };
});

vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('../../../server-only/feature-access', () => ({ getFeatureAccess: mocks.grant }));

import { currentMcaPublications, recordMcaPublication } from './publications';

const identity = { userId: 41, teamId: 17 };

const published = (over: Record<string, unknown> = {}) => ({
  id: 'pub-1',
  organisationId: 'org-a',
  teamId: 17,
  templateId: 'mca-template',
  templateRevision: 2,
  instrument: 'frpa',
  documensoTemplateId: 121,
  envelopeId: 'envelope_abc',
  widgets: ['merchant_legal_name', 'purchase_price'],
  recipients: [{ role: 'merchant', signingOrder: 1, recipientId: 1250 }],
  recipientStates: ['US-VA', 'US-NY'],
  venueRule: 'merchant-state',
  fingerprint: 'fp-1',
  publishedAt: new Date('2026-09-17T10:00:00Z'),
  publishedByUserId: 41,
  ...over,
});

const input = {
  ...identity,
  templateId: 'mca-template',
  templateRevision: 2,
  instrument: 'frpa' as const,
  documensoTemplateId: 121,
  envelopeId: 'envelope_abc',
  widgets: ['merchant_legal_name', 'purchase_price'],
  recipients: [{ role: 'merchant', signingOrder: 1, recipientId: 1250 }],
  recipientStates: ['US-VA', 'US-NY'],
  venueRule: 'merchant-state',
  fingerprint: 'fp-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.team.findFirst.mockResolvedValue({ id: 17, organisationId: 'org-a' });
  mocks.grant.mockResolvedValue(true);
  mocks.db.bizrethinkMcaPublication.create.mockResolvedValue(published());
  mocks.db.bizrethinkMcaPublication.findMany.mockResolvedValue([published()]);
});

/**
 * ADR 0023 §2 and ADR 0024: the record of what was published lives with the
 * producer.
 *
 * WHAT THIS REPLACES. `lombard-platform` vendors a COPY of every published
 * template into `src/templates/*.published.json`, and its own widget-totality
 * spec compares its builders against that copy. Both sides of that comparison
 * come from one snapshot, so nothing there can notice the snapshot going stale
 * against what is actually published: republish without refreshing the copy and
 * CI stays green while production drifts. Serving this row from the producer is
 * what removes the copy — not a guard on the symptom, the cause.
 */
describe('publishing writes a record, and the record is the truth', () => {
  it('keeps what was published against the exact revision that produced it', async () => {
    await recordMcaPublication(input);

    expect(mocks.db.bizrethinkMcaPublication.create.mock.calls[0]?.[0].data).toMatchObject({
      organisationId: 'org-a',
      teamId: 17,
      templateId: 'mca-template',
      templateRevision: 2,
      instrument: 'frpa',
      documensoTemplateId: 121,
      fingerprint: 'fp-1',
      publishedByUserId: 41,
    });
  });

  /**
   * The widget names and the signing roles are the interface a caller prefills
   * and addresses against. Keeping them here is what lets that caller stop
   * holding its own copy of them.
   */
  it('keeps the interface, not just the identifier', async () => {
    await recordMcaPublication(input);

    const written = mocks.db.bizrethinkMcaPublication.create.mock.calls[0]?.[0].data;

    expect(written.widgets).toEqual(['merchant_legal_name', 'purchase_price']);
    expect(written.recipients).toEqual([{ role: 'merchant', signingOrder: 1, recipientId: 1250 }]);
  });

  /**
   * Append-only, like `BizrethinkMcaTemplateRevision`. A row is the record of
   * what a merchant was actually sent, so re-publishing writes a new row rather
   * than editing the old one — an earlier publication stays readable after it
   * has been replaced.
   */
  it('never updates or deletes a previous publication', async () => {
    await recordMcaPublication(input);

    expect(mocks.db.bizrethinkMcaPublication).not.toHaveProperty('updateMany');
    expect(mocks.db.bizrethinkMcaPublication).not.toHaveProperty('deleteMany');
  });
});

describe('reading back what is current', () => {
  it('asks for the newest first, scoped to the caller’s own team', async () => {
    await currentMcaPublications(identity);

    const query = mocks.db.bizrethinkMcaPublication.findMany.mock.calls[0]?.[0];

    expect(query.where).toMatchObject({ teamId: 17, organisationId: 'org-a' });
    expect(query.orderBy).toEqual({ publishedAt: 'desc' });
  });

  /**
   * Append-only means the table holds every past publication too. "Current" is
   * the newest per instrument, and the resolution happens here rather than in
   * the caller, because a caller that had to work it out could work it out
   * differently.
   */
  it('returns one row per instrument, the most recent', async () => {
    mocks.db.bizrethinkMcaPublication.findMany.mockResolvedValue([
      published({
        id: 'newest',
        instrument: 'frpa',
        documensoTemplateId: 200,
        publishedAt: new Date('2026-09-17T12:00:00Z'),
      }),
      published({
        id: 'older',
        instrument: 'frpa',
        documensoTemplateId: 121,
        publishedAt: new Date('2026-09-17T10:00:00Z'),
      }),
      published({ id: 'lease', instrument: 'equipment-lease', documensoTemplateId: 120 }),
    ]);

    const current = await currentMcaPublications(identity);

    expect(current.map((row) => [row.instrument, row.documensoTemplateId])).toEqual([
      ['frpa', 200],
      ['equipment-lease', 120],
    ]);
  });

  it('is empty before anything has been published, rather than failing', async () => {
    mocks.db.bizrethinkMcaPublication.findMany.mockResolvedValue([]);

    expect(await currentMcaPublications(identity)).toEqual([]);
  });
});

/**
 * The same boundaries every other MCA service has (ADR 0016, ADR 0022): live
 * team membership before the grant, and every query bound to the caller's own
 * team and organisation.
 */
describe('a publication belongs to its team', () => {
  it('refuses a caller who is not a member', async () => {
    mocks.db.team.findFirst.mockResolvedValue(null);

    await expect(currentMcaPublications(identity)).rejects.toThrow();
    await expect(recordMcaPublication(input)).rejects.toThrow();
  });

  it('refuses a caller without the builder grant', async () => {
    mocks.grant.mockResolvedValue(false);

    await expect(currentMcaPublications(identity)).rejects.toThrow();
  });
});

/**
 * A PUBLICATION ROW'S `instrument` IS A `String` COLUMN, so reading it back
 * proved nothing and the code cast. `publishMcaTemplate` only ever writes a
 * `ProducedInstrument`, so a row saying otherwise means something wrote outside
 * the service — a tripwire rather than a path anyone travels.
 *
 * Refused rather than served: a caller handed an instrument it cannot interpret
 * is worse off than one told the record is unreadable.
 */
describe('a publication row naming a document we do not produce', () => {
  it.each([
    ['a processor form', 'split-funding'],
    ['nonsense', 'not-an-instrument'],
    ['nothing at all', ''],
  ])('refuses %s rather than casting it', async (_label, instrument) => {
    mocks.db.bizrethinkMcaPublication.findMany.mockResolvedValue([{ ...published(), instrument }]);

    await expect(currentMcaPublications(identity)).rejects.toThrow(/does not produce/i);
  });
});
