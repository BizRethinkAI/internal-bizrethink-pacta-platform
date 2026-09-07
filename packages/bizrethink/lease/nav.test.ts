import { describe, expect, it } from 'vitest';

import { leaseBuilderTeamUrls } from './nav';

/**
 * The nav renders in the browser; the lease-builder gate is server-only and
 * per-ORGANISATION. The server answers "which of your organisations hold the
 * feature" and this function turns that into "which team URLs may show the
 * entry", using the organisation/team tree the session already carries.
 *
 * It is a separate pure function rather than inline in the hook so the mapping
 * — the part that can be wrong — is testable without a renderer.
 */

const ORGS = [
  { id: 'org_with', teams: [{ url: 'landlord' }, { url: 'landlord-two' }] },
  { id: 'org_without', teams: [{ url: 'acme' }] },
];

describe('leaseBuilderTeamUrls', () => {
  it('returns nothing when the server granted nothing', () => {
    expect(leaseBuilderTeamUrls({ organisations: ORGS, organisationIds: [] })).toEqual([]);
  });

  it('returns every team of a granted organisation', () => {
    expect(leaseBuilderTeamUrls({ organisations: ORGS, organisationIds: ['org_with'] })).toEqual([
      'landlord',
      'landlord-two',
    ]);
  });

  it('never returns a team of an organisation that was not granted', () => {
    expect(leaseBuilderTeamUrls({ organisations: ORGS, organisationIds: ['org_with'] })).not.toContain('acme');
  });

  /*
    The query is in flight on first paint. Undefined must read as "no", not as
    "not yet decided" — an entry that appears and then disappears is worse than
    one that appears a moment late, and the route 404s either way.
  */
  it('denies while the answer has not arrived', () => {
    expect(leaseBuilderTeamUrls({ organisations: ORGS, organisationIds: undefined })).toEqual([]);
  });

  it('ignores a granted organisation the session does not know about', () => {
    // Membership was removed between the query and the render.
    expect(leaseBuilderTeamUrls({ organisations: ORGS, organisationIds: ['org_gone'] })).toEqual([]);
  });
});
