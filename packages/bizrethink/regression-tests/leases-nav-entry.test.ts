import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The lease builder must be reachable, and only by the organisations that hold
 * the feature.
 *
 * `/t/:teamUrl/leases` shipped with no link to it from anywhere in the product
 * — it was reachable by typing the URL. The entry that fixes that lives in two
 * upstream files (desktop nav and mobile nav) via overlay 069, and a nav entry
 * present in one of them is a feature that is invisible on the other.
 *
 * The second half is the harder half. `canAccessLeaseBuilder` is server-only
 * and the nav renders client-side, so the entry could easily end up gated on
 * something ELSE — a claim flag, an env var, a hardcoded org id — that agrees
 * with the route's own 404 today and disagrees after the next grant is
 * changed. A nav entry that can disagree with the route it points at is worse
 * than no nav entry: it is a link to a 404 for one customer and a hidden
 * feature for another. So these assert not just that the gate exists but that
 * it is THE gate — the same `canAccessLeaseBuilder`, reached over tRPC.
 *
 * Static assertions rather than a rendered test, for the reason
 * `lease-library-is-staff-only.test.ts` gives: in a Remix app the file's
 * location IS the URL and the guard in the source IS the access control.
 */

/**
 * Code only — the comments explaining WHY these rules exist necessarily quote
 * the strings the rules forbid, and a guard that fires on its own
 * documentation is a guard people delete.
 */
const code = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '') // {/* jsx */}
    .replace(/\/\*[\s\S]*?\*\//g, '') //             /* block */
    .replace(/^\s*\/\/.*$/gm, ''); //                   // line

const REMIX = join(__dirname, '../../../apps/remix/app');

const DESKTOP_NAV = join(REMIX, 'components/general/app-nav-desktop.tsx');
const MOBILE_NAV = join(REMIX, 'components/general/app-nav-mobile.tsx');
const HOOK = join(REMIX, 'components/general/lease/use-lease-builder-team-urls.tsx');

const NAVS: [string, string][] = [
  ['app-nav-desktop.tsx', DESKTOP_NAV],
  ['app-nav-mobile.tsx', MOBILE_NAV],
];

const LEASES_HREF = /\/t\/\$\{teamUrl\}\/leases/;

describe('the Leases entry exists in both navs', () => {
  it.each(NAVS)('%s links to /t/:teamUrl/leases', (_name, path) => {
    expect(code(path)).toMatch(LEASES_HREF);
  });

  it.each(NAVS)('%s labels it "Leases"', (_name, path) => {
    expect(code(path)).toMatch(/`Leases`/);
  });
});

describe('the Leases entry is gated, on the same flag the route is', () => {
  it.each(NAVS)('%s reads the gate from the shared hook', (_name, path) => {
    const source = code(path);

    expect(source, 'the nav must import the shared access hook rather than deciding for itself').toMatch(
      /use-lease-builder-team-urls/,
    );
    expect(source).toMatch(/useLeaseBuilderTeamUrls\(\)/);
  });

  /*
    The href appears exactly once, and the gate is the condition immediately
    governing it. Both halves matter: a second unguarded href elsewhere in the
    file would be a hole, and a gate that sits in the file without governing
    the entry is decoration.
  */
  it.each(NAVS)('%s emits the entry only under that gate', (_name, path) => {
    const source = code(path);
    const occurrences = source.match(new RegExp(LEASES_HREF, 'g')) ?? [];

    expect(occurrences, 'exactly one /leases href, so there is one thing to guard').toHaveLength(1);

    const preceding = source.slice(Math.max(0, source.search(LEASES_HREF) - 200), source.search(LEASES_HREF));

    expect(preceding, 'the /leases entry must be spread in under the gate, not listed unconditionally').toMatch(
      /leaseBuilderTeamUrls\.includes\(teamUrl\)\s*\?/,
    );
  });

  it.each(NAVS)('%s does not import the server-only gate into the browser', (_name, path) => {
    expect(code(path)).not.toMatch(/server-only\/feature-access/);
  });

  it.each(NAVS)('%s does not invent a second source of truth for the flag', (_name, path) => {
    const source = code(path);

    expect(source).not.toMatch(/LEASE_BUILDER_FEATURE/);
    expect(source).not.toMatch(/lease-builder['"]/);
  });
});

describe('the hook is a read of the server gate, not a reimplementation of it', () => {
  it('exists', () => {
    expect(existsSync(HOOK), 'expected apps/remix/app/components/general/lease/use-lease-builder-team-urls.tsx').toBe(
      true,
    );
  });

  it('asks the server which organisations hold the feature', () => {
    expect(code(HOOK)).toMatch(/trpc\.bizrethink\.leaseBuilder\.access\.useQuery/);
  });

  it('maps organisations to teams through the tested pure function', () => {
    expect(code(HOOK)).toMatch(/leaseBuilderTeamUrls/);
  });
});

describe('the tRPC procedure behind it resolves the real gate', () => {
  const router = code(join(__dirname, '../server-only/trpc/lease-builder-router.ts'));
  const featureAccess = code(join(__dirname, '../server-only/feature-access.ts'));

  it('exposes `access` on the lease builder router', () => {
    expect(router).toMatch(/access:\s*authenticatedProcedure/);
  });

  it('answers it with listLeaseBuilderOrganisationIds', () => {
    expect(router).toMatch(/listLeaseBuilderOrganisationIds/);
  });

  /*
    The one assertion that makes the nav and the route incapable of
    disagreeing: the list is built by calling canAccessLeaseBuilder itself,
    which is what every lease route's loader calls.
  */
  it('builds that list by calling canAccessLeaseBuilder per organisation', () => {
    const body = featureAccess.slice(featureAccess.indexOf('listLeaseBuilderOrganisationIds'));

    expect(body).toMatch(/canAccessLeaseBuilder/);
  });

  it('scopes it to organisations the user is a member of', () => {
    const body = featureAccess.slice(featureAccess.indexOf('listLeaseBuilderOrganisationIds'));

    expect(body, 'a user-scoped grant returns true for ANY organisationId — see the router doctrine').toMatch(
      /members:\s*\{\s*some:\s*\{\s*userId\s*\}/,
    );
  });
});
