import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The mechanism, asserted to be plugged in.
 *
 * THE LEASE SHIPPED THIS EXACT FEATURE UNPLUGGED. PR #103 built
 * `BizrethinkLibraryFinding`, `recordFinding`, `answerFinding`, `listFindings`,
 * `outstandingFindings`, `findingBlockers` and a textarea on the counsel page.
 * Every piece worked. Nothing called anything: `approve` never consulted a
 * finding, so a clause with an unanswered defect report could be approved with
 * no obstacle at all; `answerFinding` had no UI caller, so a finding landed in
 * a table nobody could answer; and counsel could not see the finding she had
 * just recorded, because it vanished on reload. CI was green throughout, since
 * every unit was tested in isolation and no test asked whether anything used
 * them. `lease/__tests__/findings-wiring.test.ts` was written afterwards, and
 * calls this the repo's characteristic failure — a change that fails by being
 * *absent* rather than wrong.
 *
 * This file is that test written BEFORE the same feature is built a second
 * time, rather than after it fails the same way. It reads source, which is
 * coarse; a mutation nobody can reach is exactly what a fine-grained unit test
 * cannot see.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const router = read('../../server-only/trpc/clause-library-router.ts');
const counselPage = read('../../../../../apps/remix/app/routes/_recipient+/mca-clause-review.$token.tsx');
const adminPage = read('../../../../../apps/remix/app/routes/_authenticated+/admin+/mca-library.tsx');

/** One procedure's source, to the start of the next one. */
const proc = (source: string, name: string) => {
  const start = source.indexOf(`${name}: `);

  if (start === -1) {
    return '';
  }

  const rest = source.slice(start + name.length);
  const next = rest.search(/\n {2}\w+: (?:adminProcedure|authenticatedProcedure|procedure)/);

  return name + (next === -1 ? rest : rest.slice(0, next));
};

describe('counsel can record a finding, and it reaches something', () => {
  it('exposes a token-scoped mutation to record one', () => {
    expect(proc(router, 'recordFinding')).toMatch(/bizrethinkMcaLibraryFinding\.create/);
  });

  /**
   * UNAUTHENTICATED, because the whole point of a review link is that counsel
   * needs no account — but attribution never comes from the caller. A caller
   * who could name themselves could name somebody else.
   */
  it('takes the author from the review row and not from the caller', () => {
    const source = proc(router, 'recordFinding');

    expect(source).toMatch(/procedure\s*\n?\s*\.input/);
    expect(source).toMatch(/authorName:\s*(?:share|row|review)\.reviewerName/);
    expect(source).toMatch(/authorEmail:\s*(?:share|row|review)\.reviewerEmail/);
    expect(source).not.toMatch(/authorName:\s*input\./);
  });

  /**
   * A finding against a clause the reviewer was never shown is a finding nobody
   * can answer in context, and a typo becomes a blocker no page will ever
   * display. Scoped to the link's own agreement, not the whole library.
   */
  it('refuses a slug outside the agreement the link carries', () => {
    const source = proc(router, 'recordFinding');

    expect(source).toMatch(/libraryFor\(/);
    expect(source).toMatch(/NOT_FOUND/);
  });

  /**
   * THE ASSERTION THE LEASE WAS MISSING. Without it the textarea is decorative:
   * counsel writes "this indemnity is unenforceable in New York" and the clause
   * is approved that afternoon by somebody who never saw it.
   */
  it('makes approve consult the findings table', () => {
    expect(proc(router, 'approve')).toMatch(/bizrethinkMcaLibraryFinding\.count|bizrethinkMcaLibraryFinding\.findMany/);
  });

  it('passes what it found into the rule rather than deciding for itself', () => {
    expect(proc(router, 'approve')).toMatch(/unansweredCounselFindings/);
  });

  /**
   * COUNSEL MUST SEE WHAT SHE JUST WROTE. On the lease this was write-only: the
   * box cleared, the page said "Recorded", and a reload showed nothing — no
   * record it had saved, no answer, no way to tell a saved finding from a lost
   * one. An attorney billing by the hour responds to that by writing it twice,
   * and then by going back to email.
   */
  it('lets a token holder read back the findings on their own link', () => {
    const source = proc(router, 'openFindings');

    expect(source).toMatch(/bizrethinkMcaLibraryFinding\.findMany/);
    expect(source).toMatch(/reviewId/);
  });

  it('scopes that read to the token and takes no other input', () => {
    const source = proc(router, 'openFindings');

    expect(source).toMatch(/z\.object\(\{\s*token: z\.string\(\)/);
    expect(source).toMatch(/answeredAt|answer/);
  });

  /**
   * Staff have to be able to answer, and the answer has to be attributable.
   * MCA is admin-gated rather than organisation-scoped — see the router's own
   * note on why — so the cross-tenant hole `answerFinding` had on the lease
   * cannot be reproduced by naming an organisation. It must still not be
   * possible to clear a finding with a timestamp and no text.
   */
  it('lets staff answer one, under the admin gate', () => {
    const source = proc(router, 'answerFinding');

    expect(source).toMatch(/adminProcedure/);
    expect(source).toMatch(/answer: z\.string\(\)\.trim\(\)\.min\(1\)/);
    expect(source).toMatch(/answeredByUserId: ctx\.user\.id/);
  });

  it('has a staff page that can actually answer one', () => {
    expect(adminPage).toMatch(/answerFinding/);
  });

  it('has a counsel page that can record and read one', () => {
    expect(counselPage).toMatch(/recordFinding/);
    expect(counselPage).toMatch(/openFindings/);
  });

  /**
   * A failed save was invisible on the lease page once and cost a reviewer
   * their work. Not repeating it: the mutation's error has to reach the screen.
   */
  it('shows the reviewer when a save failed', () => {
    expect(counselPage).toMatch(/record\.error|\.error\?\.message|error\.message/);
  });
});

/**
 * The tab an attorney actually sees.
 *
 * The `_recipient+` layout titles everything beneath it "Sign Document —
 * Documenso" and renders its header only for a signed-in user. A reviewer is
 * never signed in, so without its own `meta` this route inherits a title naming
 * the wrong product and the wrong action: it is not a signing page, and the
 * product is not Documenso. That title is what a lawyer sees in their tab, in a
 * bookmark, and in any screenshot they forward to a colleague.
 *
 * The LEASE counsel route already fixed exactly this and left the reason in a
 * comment — "this is a link a landlord emails to a stranger". The MCA route
 * shipped without it. Asserted here rather than trusted, because nothing about
 * the page looks wrong from inside the app.
 */
describe('the counsel page names itself', () => {
  it('exports its own meta rather than inheriting the layout title', () => {
    expect(counselPage).toMatch(/export function meta\(\)/);
  });

  /*
    THE TITLE VALUE, NOT THE BLOCK AROUND IT. The first version of this test
    read the whole `meta` body and asserted it never says "Documenso" — which
    failed against the comment that explains the bug by quoting the wrong title.
    A test that cannot survive its own subject being explained is testing the
    prose, so this reads the string that actually reaches the browser tab.
  */
  const metaTitle = () => counselPage.match(/title: i18n\._\(msg`([^`]+)`\)/)?.[1] ?? '';

  it('names Pacta and not the upstream product or a signing action', () => {
    expect(metaTitle()).toMatch(/Pacta/);
    expect(metaTitle()).not.toMatch(/Documenso/);
    expect(metaTitle()).not.toMatch(/Sign Document/);
  });

  /**
   * An unauthenticated page holding unexecuted contract text. The app already
   * sets this globally, and this route sets it again — deliberately, because a
   * route that exports `meta` REPLACES what it inherits rather than merging
   * into it, so omitting it here would strip the directives from this page
   * alone.
   */
  it('keeps the crawler directives it would otherwise replace', () => {
    const meta = counselPage.slice(counselPage.indexOf('export function meta()'));

    expect(meta.slice(0, meta.indexOf('\n}'))).toMatch(/'robots'[\s\S]*noindex/);
  });
});
