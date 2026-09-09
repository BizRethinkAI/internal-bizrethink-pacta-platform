import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * THE MECHANISM IS WIRED TO SOMETHING.
 *
 * `docs/STATE.md` names the pattern that cost this repo the most time:
 * *"shipping a mechanism with no caller, and describing it as working"* — three
 * times in one week, by three different sessions. The lease library's own
 * approval flow went months with nothing plugged into it, and `listFindings`
 * shipped with no UI caller at all, so a finding landed in a table no page
 * read.
 *
 * A unit test of a pure function cannot see that. These read the files.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const additions = read('../../../prisma-extensions/additions.prisma');
const router = read('../../server-only/trpc/clause-library-router.ts');
const rootRouter = read('../../../server-only/trpc/router.ts');
const approvals = read('../../server-only/clause-approvals.ts');
const adminPage = read('../../../../../apps/remix/app/routes/_authenticated+/admin+/mca-library.tsx');
const counselPage = read('../../../../../apps/remix/app/routes/_recipient+/mca-clause-review.$token.tsx');
const owned = read('../../../../../overlays/BIZRETHINK-OWNED.txt');

/** Code with its prose removed, for assertions about what the code DOES. */
const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** One Prisma model's block, from its `model X {` to the closing brace. */
const model = (name: string): string => {
  const start = additions.indexOf(`model ${name} {`);

  expect(start, `${name} is not declared in additions.prisma`).toBeGreaterThan(-1);

  return additions.slice(start, additions.indexOf('\n}', start));
};

describe('the schema', () => {
  it('declares an MCA approval and an MCA review link of its own', () => {
    expect(model('BizrethinkMcaClauseApproval')).toBeTruthy();
    expect(model('BizrethinkMcaLibraryReview')).toBeTruthy();
  });

  /*
    THE AXES STAY APART. `mca/jurisdictions.ts` argues at length that folding a
    second thing into `McaJurisdiction` destroys the property that makes adding
    a twelfth state safe. A column named `jurisdiction` holding an instrument
    would be that same defect one layer down, in the layer that outlives the
    code.
  */
  it('scopes an MCA review link by instrument, and never by a jurisdiction', () => {
    const review = model('BizrethinkMcaLibraryReview');

    expect(review).toMatch(/^\s*instrument\s+String/m);
    expect(review).not.toMatch(/^\s*jurisdiction\s/m);
  });

  it('records who typed the approval separately from whose authority it claims', () => {
    const approval = model('BizrethinkMcaClauseApproval');

    expect(approval).toMatch(/^\s*recordedByUserId\s+Int/m);
    expect(approval).toMatch(/^\s*approvedByName\s+String/m);
    expect(approval).toMatch(/^\s*approvedByBarNumber\s+String\?/m);
    expect(approval).toMatch(/^\s*barJurisdiction\s+String/m);
  });

  it('pins the approval to a fingerprint and lets a superseded one survive', () => {
    const approval = model('BizrethinkMcaClauseApproval');

    expect(approval).toMatch(/^\s*fingerprint\s+String/m);
    expect(approval).toMatch(/^\s*supersededAt\s+DateTime\?/m);
  });
});

describe('the approvals a page reads', () => {
  /*
    NOT THE LEASE'S TABLE. Approvals are keyed by slug, and the MCA library's
    own README rule 7 records why that matters: "the lease library learned this
    when one attorney approval hid another's". Two libraries sharing one
    slug-keyed table is that failure across verticals, where nothing would ever
    look for it.
  */
  it('comes from the MCA table and never from the lease one', () => {
    expect(approvals).toContain('bizrethinkMcaClauseApproval');
    expect(approvals).not.toMatch(/prisma\.bizrethinkClauseApproval\b/);
  });
});

describe('the router', () => {
  it('exists and is mounted under bizrethink.*', () => {
    expect(rootRouter).toContain('mcaClauseLibrary');
    expect(rootRouter).toContain('clause-library-router');
  });

  it('offers the four things the two pages need', () => {
    for (const procedure of ['approve:', 'share:', 'revokeShare:', 'openLibrary:']) {
      expect(router).toContain(procedure);
    }
  });

  /*
    Instance content, not a customer's. `/admin/mca-library` resolves no
    organisation and touches no tenancy, and the lease router's own `approve`
    comment names dropping `organisationId` as the durable fix it could not
    make. This model is new, so it is made at birth rather than migrated to.
  */
  it('is admin-gated rather than organisation-scoped', () => {
    expect(router).toContain('adminProcedure');
    /*
      COMMENTS STRIPPED FIRST. The file explains at length WHY there is no
      organisationId, and a naive substring match would be failed by its own
      rationale — which is how a guard gets weakened to keep it green.
    */
    expect(withoutComments(router)).not.toContain('organisationId');
    expect(withoutComments(router)).not.toContain('authenticatedProcedure');
  });

  it('refuses an approval whose fingerprint no longer matches the library', () => {
    expect(router).toContain('mcaClauseFingerprint');
    expect(router).toContain('approvalBlocks');
  });
});

describe('the two pages', () => {
  it('lets staff record an approval', () => {
    expect(adminPage).toContain('mcaClauseLibrary.approve');
    expect(adminPage).toContain('mcaClauseLibrary.share');
  });

  it('says what an approval is, and is not', () => {
    expect(adminPage).toMatch(/not a signature/i);
  });

  /*
    WHAT THE LINK MAY AND MAY NOT DO, ASSERTED RATHER THAN INTENDED.

    This used to assert the page contained no `useMutation` at all, which was a
    proxy for the real rule and stopped being one when the page started taking
    findings. The rule was never "counsel writes nothing" — it is that sending a
    link must not be the same act as granting the power to APPROVE. An approval
    carries a bar number and an admitting jurisdiction, is checked against the
    states whose law puts the clause in the agreement, and has to be
    attributable to somebody who signed in. A finding is the opposite direction:
    saying what is wrong, which needs no such ceremony and which the person we
    sent the link to is the only one able to do.

    So the assertion is now the specific one it should always have been.
  */
  it('lets counsel record a finding but never an approval', () => {
    expect(counselPage).toContain('openLibrary');
    expect(counselPage).toContain('recordFinding');
    expect(counselPage).not.toMatch(/mcaClauseLibrary\.approve/);
  });

  /*
    And the gate that makes the finding worth recording. Without it the textarea
    is decorative — the failure the lease shipped, green in CI, because every
    unit was tested in isolation and nothing asked whether anything called them.
  */
  it('makes an unanswered finding hold the clause against approval', () => {
    expect(router).toContain('unansweredCounselFindings');
    expect(router).toContain('bizrethinkMcaLibraryFinding');
  });

  /*
    THE SAME "EMPTY OR UNREADABLE" PROBLEM, ON THE PAGE A THIRD PARTY READS.
    The findings shown under each clause come from a register read off disk,
    and an absent file yields an empty list. Telling an attorney that nothing
    was found when we cannot tell is worse than saying nothing at all.
  */
  it('tells the reviewer when the earlier reviews could not be read', () => {
    expect(router).toContain('REGISTER_AVAILABLE');
    expect(counselPage).toContain('findingsReadable');
  });

  it('declares the counsel route as ours', () => {
    expect(owned).toContain('apps/remix/app/routes/_recipient+/mca-clause-review.$token.tsx');
  });
});
