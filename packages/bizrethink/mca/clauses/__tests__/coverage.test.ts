import { describe, expect, it } from 'vitest';

import { documentLines, linesNotAccountedFor } from '../documents';
import { EQUIPMENT_NON_CLAUSE } from '../equipment-lease';
import { INSTRUMENTS, MCA_INSTRUMENTS, type McaInstrument } from '../instruments';
import { ISO_PRA_NON_CLAUSE } from '../iso-pra';
import { libraryFor } from '../library';
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

describe.each(COVERED)('%s accounts for its whole document', (instrument, nonClause) => {
  const file = INSTRUMENTS[instrument].sourceDocument;

  it('leaves no line unaccounted for', () => {
    expect(linesNotAccountedFor(file, libraryFor(instrument), nonClause)).toEqual([]);
  });

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
    const covered = new Set([...COVERED.map(([id]) => id), 'frpa', 'payzli-split-funding', 'permission-to-release']);

    expect([...covered].sort()).toEqual([...MCA_INSTRUMENTS].sort());
  });
});
