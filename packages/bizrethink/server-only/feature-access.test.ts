import { describe, expect, it } from 'vitest';

import { canRenderClause, resolveFeatureAccess } from './feature-access';

/**
 * Two independent locks keep the lease builder internal until per-state
 * attorney review lands. They are deliberately separate: the first controls
 * who can open the feature, the second controls whether unreviewed legal text
 * is allowed to reach paper. Neither is an env var — instance config in this
 * codebase is DB-backed and administered through /admin, per the standing rule.
 *
 * Lock 1 — access. Deny by default; grants are recorded per organisation or
 * per user, and a user-level row always wins over the organisation's.
 *
 * Lock 2 — clause status. Even with access granted, a clause that has not been
 * through attorney review renders only for a BizRethink-internal organisation.
 * That is what makes the §3 UPL posture a property of the data rather than
 * something someone has to remember before flipping a switch.
 */

describe('resolveFeatureAccess — lock 1, who can open it', () => {
  it('denies when nothing has been granted', () => {
    expect(resolveFeatureAccess({ userGrant: null, orgGrant: null })).toBe(false);
  });

  it('allows when the organisation is granted', () => {
    expect(resolveFeatureAccess({ userGrant: null, orgGrant: { enabled: true } })).toBe(true);
  });

  it('allows a single user inside an organisation that has no grant', () => {
    expect(resolveFeatureAccess({ userGrant: { enabled: true }, orgGrant: null })).toBe(true);
  });

  it('lets a user-level denial override an organisation-wide grant', () => {
    // The case that matters for revoking one person without disabling a team.
    expect(resolveFeatureAccess({ userGrant: { enabled: false }, orgGrant: { enabled: true } })).toBe(false);
  });

  it('lets a user-level grant override an organisation-wide denial', () => {
    expect(resolveFeatureAccess({ userGrant: { enabled: true }, orgGrant: { enabled: false } })).toBe(true);
  });

  it('denies when the organisation grant is explicitly disabled', () => {
    expect(resolveFeatureAccess({ userGrant: null, orgGrant: { enabled: false } })).toBe(false);
  });
});

describe('canRenderClause — lock 2, what is allowed onto paper', () => {
  it('renders a published clause for an ordinary organisation', () => {
    expect(canRenderClause({ status: 'published', organisationIsInternal: false })).toBe(true);
  });

  it('refuses a draft clause for an ordinary organisation', () => {
    // Access alone must never be enough to put unreviewed legal text in front
    // of a third party. This is the lock that survives an accidental grant.
    expect(canRenderClause({ status: 'draft', organisationIsInternal: false })).toBe(false);
  });

  it('refuses a clause still in review for an ordinary organisation', () => {
    expect(canRenderClause({ status: 'review', organisationIsInternal: false })).toBe(false);
  });

  it('renders a draft clause for a BizRethink-internal organisation', () => {
    // This is what makes the tool usable internally before the attorney
    // engagement has happened.
    expect(canRenderClause({ status: 'draft', organisationIsInternal: true })).toBe(true);
  });

  it('refuses a retired clause even for an internal organisation', () => {
    // Retired means superseded. Nothing should ever render it again.
    expect(canRenderClause({ status: 'retired', organisationIsInternal: true })).toBe(false);
  });
});

describe('a feature gate is not an authorization check', () => {
  /*
    This is the trap that produced a real cross-tenant bug in
    lease-builder-router.ts on 2026-08-29, caught by security review.

    `resolveFeatureAccess` deliberately short-circuits on a user-scoped grant
    WITHOUT looking at the organisation — that is the whole point of user scope,
    so one person can hold access across every org they belong to.

    The consequence is that it answers "is this switched on for this person?"
    and NOT "may this person see this organisation's data?". The router used it
    as though it answered both, on an organisationId taken from client input,
    so a user holding a user-scoped grant could read another organisation's
    properties and leases by passing a different id.

    Callers must pair it with a membership check — buildOrganisationWhereQuery.
    These tests exist so the property is stated rather than assumed.
  */
  it('passes on a user grant regardless of which organisation is asked about', () => {
    const userGrant = { enabled: true };

    for (const orgGrant of [null, { enabled: false }]) {
      expect(
        resolveFeatureAccess({ userGrant, orgGrant }),
        'A user-scoped grant is org-agnostic by design. Anything calling this MUST separately ' +
          'verify the user belongs to the organisation whose data is being returned.',
      ).toBe(true);
    }
  });

  it('takes no organisation identifier at all, which is the tell', () => {
    // The function has no way to check membership even if it wanted to.
    expect(resolveFeatureAccess.length).toBe(1);
  });
});
