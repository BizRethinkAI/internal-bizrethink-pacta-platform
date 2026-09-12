import { describe, expect, it } from 'vitest';

import { documentLines, linesNotAccountedFor } from '../documents';

import { libraryFor } from '../library';
import { LOMBARD, resolveClauses } from '../parties';
import { PERMISSION_TO_RELEASE_NON_CLAUSE } from '../permission-to-release';
import { PAYZLI_NON_CLAUSE } from '../split-funding';

/**
 * The two letters, and the third correction to Phase 0's corpus.
 *
 * Neither is an agreement with numbered sections in the way the other four are,
 * and the census that built the corpus could not read either of them properly:
 *
 *   - **Payzli** has no numbering at all. Phase 0's appendix of unexamined
 *     clauses lists `3350 Buschwood Park Drive, Suite 150, Tampa, FL 33618` as
 *     this document's one clause. It is the second line of the letterhead.
 *     REVIEW-02: *"The extraction that built the appendix appears to have read a
 *     paragraph beginning `3350` the same way it read `3.15`."*
 *   - **Permission to Release** is recorded as having **zero** clauses. It has
 *     eight, and REVIEW-01 raised six findings against them.
 *
 * The pattern across all three corrections is one thing: **the census keyed on
 * `N.M` numbering**, so a document numbered `1.` came out empty and a document
 * numbered not at all came out with an address in it. Coverage is the check
 * that does not care how a document is numbered.
 */
describe.each([
  ['split-funding' as const, PAYZLI_NON_CLAUSE, 7],
  ['permission-to-release' as const, PERMISSION_TO_RELEASE_NON_CLAUSE, 8],
])('%s accounts for its whole document', (instrument, nonClause, expected) => {
  const file = LOMBARD.documents[instrument].file;

  it('leaves no line unaccounted for', () => {
    expect(linesNotAccountedFor(file, resolveClauses(libraryFor(instrument), LOMBARD), nonClause)).toEqual([]);
  });

  it('holds every clause the document has', () => {
    expect(libraryFor(instrument)).toHaveLength(expected);
  });

  it('has no non-clause declaration that never matches', () => {
    const lines = documentLines(file);

    for (const { anchor, reason } of nonClause) {
      expect(
        lines.some((line) => line.startsWith(anchor)),
        `never appears: ${anchor}`,
      ).toBe(true);
      expect(reason.length).toBeGreaterThan(0);
    }
  });
});

describe('what the letters actually contain', () => {
  /**
   * The Payzli letter's second paragraph carries more findings than any other
   * clause in the corpus, and it is the operative instruction — what the
   * processor withholds, from what, and until when. Three of REVIEW-02's fixes
   * land on it.
   */
  it('keeps the six findings on the Payzli split-funding instruction', () => {
    const clause = libraryFor('split-funding').find((c) => c.slug === 'split-funding.split-funding-instruction');

    expect(clause?.examinedBy.flatMap((e) => e.findings)).toHaveLength(6);
  });

  /**
   * §3 and §4 are the credit-bureau and FCRA authorisations that FRPA §4.3
   * depends on. REVIEW-02's
   * `frpa-4-3-consumer-report-authority-depends-on-a-separate-instrument` is
   * the point: the FRPA's authority to pull a consumer report rests on an
   * instrument Phase 0 had recorded as empty.
   */
  it('carries the credit-bureau authorisations the FRPA depends on', () => {
    // ADR 0011: identify the authorizations, not their historical print positions.
    const slugs = libraryFor('permission-to-release').map((clause) => clause.slug);

    expect(slugs).toContain('permission-to-release.credit-bureau-authorization');
    expect(slugs).toContain('permission-to-release.fair-credit-reporting-act-acknowledgment');
  });
});
