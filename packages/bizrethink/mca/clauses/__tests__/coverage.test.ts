import { describe, expect, it } from 'vitest';

import { documentLines, linesNotAccountedFor } from '../documents';
import { EQUIPMENT_NON_CLAUSE } from '../equipment-lease';
import { MCA_INSTRUMENTS, type McaInstrument } from '../instruments';
import { ISO_PRA_NON_CLAUSE } from '../iso-pra';
import { libraryFor } from '../library';
import { LOMBARD, resolveClauses } from '../parties';
import { SUBSCRIPTION_NON_CLAUSE } from '../subscription';

/**
 * Coverage, for the three instruments that did not have it — and the reason
 * they needed it.
 *
 * `bodies-match-the-document` asks whether OUR text is in the document. It
 * cannot catch the document saying MORE than we hold, because containment
 * succeeds either way: append a sentence to a clause in the `.docx` and the
 * shorter stored body is still contained in the longer one.
 *
 * That is not hypothetical. `lombard-contracts` #10 appended an indemnity cap to
 * §3.11 of both twins, and **not one assertion in this package noticed** — the
 * body check passed, the twin check passed because both sides gained the same
 * sentence in their own vocabulary, and only the source digest moved. The FRPA
 * had a coverage test and would have caught it; the twins and the ISO PRA did
 * not, because that test was written where the problem was first found rather
 * than everywhere it could occur.
 *
 * Running it here immediately found more: **eleven clauses across three
 * documents that were never imported at all** — the parties paragraph of each,
 * the total-payments estimate, the billing sentence, the read-before-signing
 * legend, and the ISO PRA's two WHEREAS recitals. One of those recitals carries
 * a REVIEW-01 finding.
 *
 * Same fault as the FRPA's granting clause and the same cause: the import keyed
 * on numbered headings, so text the document does not number came out as
 * nothing.
 */
const COVERED: [McaInstrument, { anchor: string; reason: string }[]][] = [
  ['equipment-lease', EQUIPMENT_NON_CLAUSE],
  ['subscription', SUBSCRIPTION_NON_CLAUSE],
  ['iso-pra', ISO_PRA_NON_CLAUSE],
];

/**
 * THE LINE-ACCOUNTING RUNS ONLY WHERE THE LIBRARY IS STILL A COPY.
 *
 * `linesNotAccountedFor` asks whether the DOCUMENT holds text the library does
 * not. That is a transcription guard, and it is worth having for exactly as long
 * as the clauses are a transcription. The ISO PRA's are; the twins' were until
 * `feat/mca-rewrite-twins`.
 *
 * RETIRED FOR THE TWO TWINS ON ADR 0012's AUTHORITY, which is the same
 * authority and the same shape as `frpa-coverage.test.ts`'s retirement on
 * 2026-09-10: *"Once clauses are authored it asserts that we have PRESERVED
 * v4, which is exactly what ADR 0012 decided not to care about."* Ten clause
 * records were rewritten because a natural-person guarantor was signing a
 * service-on-mailing provision, an inconvenient-forum waiver, a one-sided
 * one-year limitation and a class waiver. Requiring those lines to stay
 * accounted for is requiring the defect.
 *
 * NOT SILENCED THE TWO CHEAP WAYS, both of which are worse and both of which
 * `frpa-coverage.test.ts` names. Declaring the eleven lines in
 * `EQUIPMENT_NON_CLAUSE` / `SUBSCRIPTION_NON_CLAUSE` would leave an assertion
 * that passes by construction and can never again be red — and would claim
 * those lines are "not a clause", which is false: they are the clause.
 * Nulling `bodiesVerifiedAt` would hide the digest guard with them.
 *
 * WHAT WENT UNACCOUNTED, AND IT IS ALSO THE HANDOFF LIST. Exactly eleven lines
 * in each document, the same eleven in both, and nothing else — which is itself
 * evidence that the rewrite touched what it meant to:
 *
 *   §3.14's subrogation and subordination paragraph; §3.15's Florida-law and
 *   Pasco-County-venue paragraph; §3.15A's one-sided jury waiver; the heading
 *   "3.15B Class Action Waiver"; §3.15B's class waiver; §3.15C's one-year
 *   period; §3.16's notice paragraph; the heading "4.3 Independent Decision;
 *   Governing Law"; §4.3's nonreliance, inconvenient-forum and
 *   service-on-mailing paragraph; the heading "4.4 Jury Trial and Class Action
 *   Waiver"; and §4.4 itself.
 *
 * **The `.docx` in `lombard-contracts` still prints all twenty-two of them.**
 * Changing that is a form change and is handed back, not made here.
 *
 * WHAT STILL RUNS FOR ALL THREE. The non-clause declarations, below: a
 * declaration that never matches is a claim about the document that has stopped
 * being true, and that check has nothing to do with whether a clause body is a
 * transcription. The digest in `bodies-match-the-document.test.ts` also still
 * runs, and still catches the `.docx` being edited underneath us.
 */
const STILL_A_TRANSCRIPTION = COVERED.filter(([instrument]) => instrument === 'iso-pra');

describe.each(STILL_A_TRANSCRIPTION)('%s holds every line of its document', (instrument, nonClause) => {
  // ADR 0011: coverage follows words and fields, independent of source or
  // selected numbering. It must still catch the originally missed ISO clause.
  it('detects the originally omitted commercial disclosure clause', () => {
    const withoutDisclosure = libraryFor(instrument).filter(
      (clause) => clause.slug !== 'iso-pra.commercial-financing-disclosures-california-and-new-york',
    );
    const missing = linesNotAccountedFor(
      LOMBARD.documents[instrument].file,
      resolveClauses(withoutDisclosure, LOMBARD),
      nonClause,
    );
    expect(missing.some((line) => line.includes('delivering a merchant’s application documentation'))).toBe(true);
  });

  it('leaves no line unaccounted for', () => {
    const file = LOMBARD.documents[instrument].file;

    expect(linesNotAccountedFor(file, resolveClauses(libraryFor(instrument), LOMBARD), nonClause)).toEqual([]);
  });
});

describe.each(COVERED)('%s declares what is not a clause of it', (instrument, nonClause) => {
  const file = LOMBARD.documents[instrument].file;

  it('has no non-clause declaration that never matches, and gives each a reason', () => {
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

/**
 * EVERY INSTRUMENT IS COVERED NOW, AND THIS IS WHAT KEEPS IT THAT WAY.
 *
 * The gap above existed because coverage was added per-instrument as each
 * problem was found. A seventh instrument would arrive with no coverage and
 * nothing would say so, which is the same shape of silence again.
 */
describe('coverage is not optional', () => {
  it('covers all six instruments', () => {
    const covered = new Set([...COVERED.map(([id]) => id), 'frpa', 'split-funding', 'permission-to-release']);

    expect([...covered].sort()).toEqual([...MCA_INSTRUMENTS].sort());
  });
});
