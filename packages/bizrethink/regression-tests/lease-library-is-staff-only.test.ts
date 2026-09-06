import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The clause library belongs to Pacta, not to a customer's team.
 *
 * It holds the instance's legal content — clause text and versions, statutory
 * citations, attorney approvals and bar jurisdictions, draft-vs-publishable
 * status. It is identical for every customer, because it IS the product. It
 * lived at `/t/:teamUrl/leases/library`, gated only by the per-ORGANISATION
 * `canAccessLeaseBuilder` feature flag, so anyone in an org with the lease
 * builder could read it — and the customer's own Leases home linked them
 * straight to it.
 *
 * A route nested under `/t/:teamUrl/` that ignores the team it is nested in is
 * a lie about who owns the thing. Correct while there is one org with the flag;
 * a disclosure once there are two.
 *
 * Static assertions rather than a rendered test because these are Remix route
 * modules: the file's location IS the URL, and the guard in its loader IS the
 * access control. Both are exactly what must not silently revert.
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

const ROUTES = join(__dirname, '../../../apps/remix/app/routes/_authenticated+');
const ADMIN_LIBRARY = join(ROUTES, 'admin+/lease-library.tsx');
const TEAM_LIBRARY = join(ROUTES, 't.$teamUrl+/leases.library.tsx');
const TEAM_INDEX = join(ROUTES, 't.$teamUrl+/leases._index.tsx');

describe('the clause library is staff-only', () => {
  it('lives under /admin, where the platform-admin gate already is', () => {
    expect(existsSync(ADMIN_LIBRARY), 'expected apps/remix/app/routes/_authenticated+/admin+/lease-library.tsx').toBe(
      true,
    );
  });

  it('no longer exists inside a team namespace', () => {
    expect(
      existsSync(TEAM_LIBRARY),
      'leases.library.tsx is back under t.$teamUrl+ — the library is not team-scoped content',
    ).toBe(false);
  });

  /*
    The admin route group's layout gates on isAdmin, but a loader that fetches
    before the layout resolves would still read. Assert the route guards itself.
  */
  it('guards itself rather than trusting the layout', () => {
    const source = code(ADMIN_LIBRARY);

    expect(source, 'the loader must check isAdmin itself').toMatch(/isAdmin/);
    expect(
      source,
      'the library must not be gated on canAccessLeaseBuilder — that is a per-organisation ' +
        'customer feature flag, not a staff check',
    ).not.toMatch(/canAccessLeaseBuilder/);
  });
});

describe("the landlord's Leases home shows only their tenancies", () => {
  const index = () => code(TEAM_INDEX);

  it('does not link a customer into the clause library', () => {
    expect(index()).not.toMatch(/leases\/library/);
  });

  /*
    The banner told customers, on their own home page, that the legal text they
    were about to send was unreviewed. The SAFEGUARD stays — assertPublishable
    and the draft-clause feature lock are untouched, and the lease still cannot
    reach a third party until counsel has reviewed the library. What goes is
    announcing our internal state to them.
  */
  it('does not announce our internal review state to a customer', () => {
    expect(index()).not.toMatch(/Internal preview/i);
  });
});
