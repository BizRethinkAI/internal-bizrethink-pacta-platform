import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const router = readFileSync(new URL('../../server-only/trpc/lease-builder-router.ts', import.meta.url), 'utf8');

const proc = (name: string) => {
  const i = router.indexOf(`${name}: `);

  return i === -1 ? '' : router.slice(i, i + 2200);
};

/*
  GETTING THE LIBRARY TO A LAWYER.

  The approval flow was built for an attorney — it asks for `approvedByName` and
  `approvedByBarNumber` — and then put the page behind `_authenticated+` with no
  way to send it. The only path was to add the lawyer to the organisation as a
  user. Meanwhile the product already had exactly this mechanism for tenants, in
  `review.create`.

  So this is the missing half of something already built, not a new idea. The
  design follows the lease-review link, including the lessons learned from it:
  a link must be revocable, and the page must say which link is current.
*/
describe('the library can be sent to counsel', () => {
  it('has a share mutation', () => {
    expect(proc('share')).toMatch(/share:\s*authenticatedProcedure/);
  });

  it('checks organisation access before minting a token', () => {
    expect(proc('share')).toMatch(/assertAccess/);
  });

  it('pins the library as it stood when the link was issued', () => {
    /*
      An approval recorded against text that has since moved is worthless. The
      lease-review link learned this the hard way with `answersHash`; the same
      reasoning applies to clause text.
    */
    expect(proc('share')).toMatch(/libraryFingerprint/);
  });

  it('can be revoked, because the tenant link could not be at first', () => {
    expect(proc('revokeShare')).toMatch(/revokeShare:\s*authenticatedProcedure/);
    expect(proc('revokeShare')).toMatch(/status:\s*'closed'/);
  });
});

describe('the counsel link opens without an account', () => {
  it('is a public procedure, not an authenticated one', () => {
    const open = proc('openLibrary');

    expect(open).toMatch(/openLibrary:\s*procedure/);
    expect(open).not.toMatch(/openLibrary:\s*authenticatedProcedure/);
  });

  it('refuses a closed or expired token in one message', () => {
    /*
      Same reasoning as the lease-review link: a reviewer cannot act on the
      difference between "no such token" and "revoked", and distinguishing them
      confirms to anyone holding a guessed token that it once existed.
    */
    const open = proc('openLibrary');

    expect(open).toMatch(/no longer active/i);
  });

  it('carries the provenance, which is the whole point of sending it', () => {
    expect(proc('openLibrary')).toMatch(/whyThisClause/);
  });

  it('does not leak the organisation it belongs to', () => {
    // The token holder is outside the org. They need clauses, not tenancy data.
    const open = proc('openLibrary');

    expect(open).not.toMatch(/BizrethinkLeaseMatter/);
  });
});

/*
  The page that sends it. A mutation nobody can reach is not a feature — the
  share procedure existed for a day with no button calling it.
*/
describe('the library page can actually send the link', () => {
  const page = readFileSync(
    new URL('../../../../apps/remix/app/routes/_authenticated+/t.$teamUrl+/leases.library.tsx', import.meta.url),
    'utf8',
  );

  it('offers a control that creates one', () => {
    expect(page).toMatch(/Send it to counsel/);
    expect(page).toMatch(/clauseLibrary\.share\.useMutation/);
  });

  it('collects the name and email the mutation requires', () => {
    expect(page).toMatch(/reviewerName:/);
    expect(page).toMatch(/reviewerEmail:/);
  });

  it('lists existing links and can revoke them', () => {
    expect(page).toMatch(/clauseLibrary\.listShares\.useQuery/);
    expect(page).toMatch(/revokeShare\.mutate/);
  });

  it('names the current link, because identical cards got copied wrong before', () => {
    expect(page).toMatch(/Current link — send this one/);
    expect(page).toMatch(/Superseded/);
  });

  it('builds the URL the public route actually serves', () => {
    expect(page).toMatch(/\/clause-review\/\$\{token\}/);
  });
});
