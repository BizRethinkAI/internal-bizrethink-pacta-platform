import { describe, expect, it } from 'vitest';

import {
  canRenderClause,
  LEASE_BUILDER_FEATURE,
  LEASE_CLAUSE_DRAFT_FEATURE,
  resolveFeatureAccess,
} from './feature-access';

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
    expect(canRenderClause({ status: 'published', draftRenderingAllowed: false })).toBe(true);
  });

  it('refuses a draft clause for an ordinary organisation', () => {
    // Access alone must never be enough to put unreviewed legal text in front
    // of a third party. This is the lock that survives an accidental grant.
    expect(canRenderClause({ status: 'draft', draftRenderingAllowed: false })).toBe(false);
  });

  it('refuses a clause still in review for an ordinary organisation', () => {
    expect(canRenderClause({ status: 'review', draftRenderingAllowed: false })).toBe(false);
  });

  it('renders a draft clause where draft rendering is explicitly allowed', () => {
    // This is what makes the tool usable internally before the attorney
    // engagement has happened.
    expect(canRenderClause({ status: 'draft', draftRenderingAllowed: true })).toBe(true);
  });

  it('refuses a retired clause even where draft rendering is allowed', () => {
    // Retired means superseded. Nothing should ever render it again.
    expect(canRenderClause({ status: 'retired', draftRenderingAllowed: true })).toBe(false);
  });
});

describe('the two locks are keyed separately', () => {
  /*
    WHY THIS TEST EXISTS.

    Lock 2 used to read `BizrethinkOrganisationBilling.bizrethinkInternal`.
    That column was created for BILLING — its migration says so: it stamps the
    8 organisations that predate the SaaS layer so the trial-expire cron skips
    them and the banner reads "BizRethink Internal" rather than "Pro trial
    active". It was never a statement about legal review.

    Reusing it as the safety lock made one flag carry two meanings, which is
    the same defect this whole feature exists to fix — the Zillow lease had one
    `securityDeposit` field carrying both money HELD and money COLLECTED.

    In production it had already drifted: 7 organisations carried the flag,
    four of them auto-created "Personal Organisation" rows. Every one of them
    had silently acquired permission to render unreviewed legal text. Nothing
    was exploitable, because lock 1 had a single grant — but the second lock,
    whose entire job is to survive an accidental first-lock grant, was weaker
    than its own docstring claimed.

    So the two now have separate keys and cannot drift into each other again.
  */
  it('does not share a feature key', () => {
    expect(LEASE_CLAUSE_DRAFT_FEATURE).not.toBe(LEASE_BUILDER_FEATURE);
  });

  it('names the clause-rendering key for what it controls, not for who holds it', () => {
    // 'bizrethink-internal' would repeat the original mistake: a name about
    // WHO an organisation is rather than WHAT it is permitted to do.
    expect(LEASE_CLAUSE_DRAFT_FEATURE).toBe('lease-clause-draft-rendering');
  });

  it('grants nothing by default — both locks deny on an unknown organisation', () => {
    expect(resolveFeatureAccess({ userGrant: null, orgGrant: null })).toBe(false);
  });
});
