import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tokenLookup: vi.fn(),
  grant: vi.fn(),
  db: { bizrethinkMcaPublication: { findMany: vi.fn() } },
}));

vi.mock('@documenso/lib/server-only/public-api/get-api-token-by-token', () => ({
  getApiTokenByToken: mocks.tokenLookup,
}));
vi.mock('../../../server-only/feature-access', () => ({ getFeatureAccess: mocks.grant }));
vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));

import { listMcaTemplatesForApi } from './templates-api';

const request = (token?: string) =>
  new Request('https://sign.pacta.ink/api/bizrethink/mca-templates', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const row = (over: Record<string, unknown> = {}) => ({
  id: 'pub-1',
  templateId: 'mca-template',
  templateRevision: 2,
  instrument: 'frpa',
  documensoTemplateId: 121,
  envelopeId: 'envelope_abc',
  widgets: ['merchant_legal_name', 'purchase_price'],
  recipients: [{ role: 'merchant', signingOrder: 1, recipientId: 1250 }],
  fingerprint: 'fp-1',
  publishedAt: new Date('2026-09-17T10:00:00Z'),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tokenLookup.mockResolvedValue({ teamId: 17, team: { id: 17, organisationId: 'org-a' }, userId: 41 });
  mocks.grant.mockResolvedValue(true);
  mocks.db.bizrethinkMcaPublication.findMany.mockResolvedValue([row()]);
});

/**
 * The endpoint that ends the vendored copy.
 *
 * `lombard-platform` holds `src/templates/*.published.json` — a snapshot of
 * every published template — and its widget-totality spec compares its builders
 * against that snapshot. Both sides come from the same copy, so nothing there
 * can notice it going stale against what is actually published. This is where
 * the caller reads the same facts from the producer instead.
 *
 * AUTHORISATION IS THE TOKEN, NOT A MEMBERSHIP. An `ApiToken` has a required
 * `teamId` and a NULLABLE `userId`, so a team token need not belong to a person
 * and the membership check the interactive services run cannot apply. The token
 * is the grant, scoped to its own team, and the feature grant is checked on
 * that team's organisation.
 */
describe('a caller reads what is published from the producer', () => {
  it('returns the current template per instrument, for the token’s team', async () => {
    const response = await listMcaTemplatesForApi(request('secret'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.templates).toEqual([
      expect.objectContaining({ instrument: 'frpa', templateId: 121, envelopeId: 'envelope_abc' }),
    ]);
  });

  /**
   * The names and roles travel with the id. A caller that got only a
   * `templateId` back would still need its own copy of the interface, which is
   * the thing being removed.
   */
  it('returns the interface alongside the identifier', async () => {
    const body = await (await listMcaTemplatesForApi(request('secret'))).json();

    expect(body.templates[0].acroformFields).toEqual(['merchant_legal_name', 'purchase_price']);
    expect(body.templates[0].recipients).toEqual({ merchant: { id: 1250, signingOrder: 1 } });
  });

  /**
   * `recipients` is shaped as the caller already consumes it — keyed by role,
   * as `*.published.json` is — so adopting this is a change of source and not a
   * rewrite of `sendDocument`.
   */
  it('shapes recipients the way the caller already reads them', async () => {
    mocks.db.bizrethinkMcaPublication.findMany.mockResolvedValue([
      row({
        recipients: [
          { role: 'merchant', signingOrder: 1, recipientId: 1250 },
          { role: 'guarantor', signingOrder: 2, recipientId: 1251 },
        ],
      }),
    ]);

    const body = await (await listMcaTemplatesForApi(request('secret'))).json();

    expect(body.templates[0].recipients).toEqual({
      merchant: { id: 1250, signingOrder: 1 },
      guarantor: { id: 1251, signingOrder: 2 },
    });
  });

  it('is an empty list before anything is published, not an error', async () => {
    mocks.db.bizrethinkMcaPublication.findMany.mockResolvedValue([]);

    const response = await listMcaTemplatesForApi(request('secret'));

    expect(response.status).toBe(200);
    expect((await response.json()).templates).toEqual([]);
  });

  it('never caches: a stale answer here is the problem it exists to solve', async () => {
    const response = await listMcaTemplatesForApi(request('secret'));

    expect(response.headers.get('Cache-Control')).toMatch(/no-store/);
  });
});

describe('it refuses anything it cannot place', () => {
  it('refuses a request with no token', async () => {
    expect((await listMcaTemplatesForApi(request())).status).toBe(401);
  });

  it('refuses a token it cannot resolve', async () => {
    mocks.tokenLookup.mockRejectedValue(new Error('Invalid token'));

    expect((await listMcaTemplatesForApi(request('wrong'))).status).toBe(401);
  });

  it('refuses a team without the builder grant', async () => {
    mocks.grant.mockResolvedValue(false);

    expect((await listMcaTemplatesForApi(request('secret'))).status).toBe(404);
  });

  /**
   * The query is bound to the token's own team. A token cannot read another
   * funder's templates, and the widget names of a funder's agreements are not
   * public.
   */
  it('reads only the token’s own team', async () => {
    await listMcaTemplatesForApi(request('secret'));

    expect(mocks.db.bizrethinkMcaPublication.findMany.mock.calls[0]?.[0].where).toMatchObject({
      teamId: 17,
      organisationId: 'org-a',
    });
  });

  it('answers GET only', async () => {
    const posted = new Request('https://sign.pacta.ink/api/bizrethink/mca-templates', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
    });

    expect((await listMcaTemplatesForApi(posted)).status).toBe(405);
  });
});
