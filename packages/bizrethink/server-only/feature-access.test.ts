import { describe, expect, it } from 'vitest';

import {
  canRenderClause,
  describeTeamGrants,
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
    expect(
      resolveFeatureAccess({
        userGrant: { enabled: false },
        orgGrant: { enabled: true },
      }),
    ).toBe(false);
  });

  it('lets a user-level grant override an organisation-wide denial', () => {
    expect(
      resolveFeatureAccess({
        userGrant: { enabled: true },
        orgGrant: { enabled: false },
      }),
    ).toBe(true);
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

/**
 * Which teams a grant actually reaches, and why.
 *
 * The admin page used to offer one button — "Enable my provider interview
 * access" — which writes the USER-scoped grant. A user grant is not scoped to
 * anything: `getFeatureAccess` returns true for every organisationId it is
 * asked about, so the single button turned the feature on everywhere the
 * person was a member and there was no way to choose. Nothing ever wrote the
 * organisation scope the resolver has understood since the lease builder.
 *
 * Presenting a per-team toggle means the page has to be able to say, for each
 * team, whether it is on and WHICH grant made it so. Two cases make that
 * load-bearing rather than decorative:
 *
 *   - the account-wide grant is on, so an organisation toggle appears to do
 *     nothing;
 *   - two teams share one organisation, so a toggle beside one silently moves
 *     the other.
 *
 * A toggle that lies about either is worse than the single button it replaces.
 */
describe('describeTeamGrants — which teams a grant reaches', () => {
  const teams = [
    { id: 1, url: 'acme', name: 'Acme', organisationId: 'org-a' },
    { id: 2, url: 'acme-east', name: 'Acme East', organisationId: 'org-a' },
    { id: 3, url: 'globex', name: 'Globex', organisationId: 'org-b' },
  ];

  it('reports every team the user belongs to, not only the granted ones', () => {
    // The old query returned only teams that resolved true, which is why a
    // disabled feature offered nothing to switch on.
    const described = describeTeamGrants({
      teams,
      userGrant: null,
      orgGrants: {},
    });

    expect(described.map((row) => row.team.url)).toEqual(['acme', 'acme-east', 'globex']);
    expect(described.every((row) => !row.allowed)).toBe(true);
  });

  it('turns on only the organisation that was granted', () => {
    const described = describeTeamGrants({
      teams,
      userGrant: null,
      orgGrants: { 'org-b': { enabled: true } },
    });

    expect(described.filter((row) => row.allowed).map((row) => row.team.url)).toEqual(['globex']);
    expect(described.find((row) => row.team.url === 'globex')?.source).toBe('organisation');
  });

  /*
    THE TOGGLE THAT LOOKS BROKEN. With the account-wide grant on, every team
    reads as allowed whatever the organisation rows say, so the page has to
    attribute it — otherwise an admin switches a team "off", sees it stay on,
    and concludes the control does not work.
  */
  it('attributes access to the account-wide grant when that is what is carrying it', () => {
    const described = describeTeamGrants({
      teams,
      userGrant: { enabled: true },
      orgGrants: {},
    });

    expect(described.every((row) => row.allowed && row.source === 'user')).toBe(true);
  });

  /*
    And the same in reverse: a user-scoped DENIAL outranks an organisation
    grant, so a team can be off while its own toggle is on.
  */
  it('attributes a shut-out to the account-wide grant even where the organisation is granted', () => {
    const described = describeTeamGrants({
      teams,
      userGrant: { enabled: false },
      orgGrants: { 'org-b': { enabled: true } },
    });

    expect(described.find((row) => row.team.url === 'globex')).toMatchObject({
      allowed: false,
      source: 'user',
    });
  });

  /*
    ONE TOGGLE, TWO TEAMS. Grants are recorded per organisation because that is
    what the resolver reads; teams are what a person recognises. Where those
    disagree the page says so rather than implying a per-team switch it does
    not have.
  */
  it('names the other teams an organisation toggle moves with it', () => {
    const described = describeTeamGrants({
      teams,
      userGrant: null,
      orgGrants: {},
    });

    expect(described.find((row) => row.team.url === 'acme')?.alsoCovers).toEqual(['Acme East']);
    expect(described.find((row) => row.team.url === 'globex')?.alsoCovers).toEqual([]);
  });

  it('reports the organisation grant as set even where it is switched off', () => {
    // Distinguishing "never granted" from "granted false" is what lets the
    // toggle render its own state rather than the resolved one.
    const described = describeTeamGrants({
      teams,
      userGrant: null,
      orgGrants: { 'org-b': { enabled: false } },
    });

    expect(described.find((row) => row.team.url === 'globex')).toMatchObject({
      allowed: false,
      organisationEnabled: false,
    });
    expect(described.find((row) => row.team.url === 'acme')?.organisationEnabled).toBe(null);
  });
});
