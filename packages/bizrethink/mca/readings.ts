import { UNRESOLVED_READINGS } from './instance/identities';
import type { McaJurisdiction } from './jurisdictions';

/**
 * The open questions, carried as READINGS rather than as approvals.
 *
 * The distinction is the whole of ADR 0008. The lease library records an
 * attorney's approval of the exact words of a clause we wrote. Nothing on this
 * surface is text we wrote: 10 CCR §914 is California's, and an approval
 * recorded against it would assert an authority counsel does not have. So what
 * accumulates here is not "unapproved clauses" but "checks running on an
 * assumption" — places where the regulation is silent, or says two things, and
 * somebody chose a reading so the checker could run at all.
 *
 * A reading is therefore never resolved by pressing anything. It is resolved by
 * a lawyer saying which way it goes, after which the code changes and the
 * reading leaves this list.
 *
 * WHY EACH ONE NAMES A FILE. A reading that exists only as a sentence decays
 * into decoration — it gets restated, softened and eventually dropped, and
 * nothing goes red. Each entry names the file and the literal text that PINS
 * the assumption in executable form, and a test reads that file and fails when
 * the pin is gone. Deleting the assertion therefore breaks the reading rather
 * than silently retiring it.
 */
export type OpenReading = {
  id: string;
  /** Which checker runs on the assumption. */
  surface: 'prescribed-form' | 'instance';
  /** The states whose documents the reading bears on. */
  jurisdictions: McaJurisdiction[];
  /** What is open, in the regulation's own terms. */
  question: string;
  /** What turns on the answer. */
  effect: string;
  /**
   * Whether answering it the other way would change a verdict the checker
   * currently gives, as opposed to widening what it can see.
   *
   * Two of the five instance readings do. Kept as a field rather than as
   * emphasis in the prose, because the page has to be able to sort by it: a
   * reading that changes a verdict is a different kind of debt from one that
   * only leaves a gap.
   */
  changesVerdicts: boolean;
  /** Where the assumption is pinned in executable form. */
  pinnedBy: { file: string; marker: string };
};

/**
 * The three from the #108 provenance review.
 *
 * All three are about the BLANK form and the spec behind it, which is why they
 * are not in `UNRESOLVED_READINGS` — that list belongs to `instance/`, where
 * the questions are about numbers on a filled document.
 */
export const PRESCRIBED_READINGS: readonly OpenReading[] = [
  {
    id: 'ca-short-explanation-asymmetry',
    surface: 'prescribed-form',
    jurisdictions: ['US-CA', 'US-NY'],
    question:
      '10 CCR §914(a)(2)(C)(iii) and 23 NYCRR §600.6(b)(3)(iii) impose the same obligation in the same words — the provider "shall include a short explanation that the amount paid directly to the recipient may change". Our New York form carries such an explanation and our California form carries none. Both clauses are conditional, so this is either New York saying more than it must or California saying less.',
    effect:
      'A question about the product rather than about the regulations. If California requires it, the California form omits a compelled sentence; if it does not, New York carries an addition in a row §600.6 otherwise closes.',
    changesVerdicts: false,
    pinnedBy: {
      file: '__tests__/provenance-honesty.test.ts',
      marker: 'California carries no counterpart, which is a question for a human',
    },
  },
  {
    id: 'prose-described-row-order',
    surface: 'prescribed-form',
    jurisdictions: ['US-CA', 'US-NY'],
    question:
      'California and New York describe their rows in a prose order that is not the table\'s: §914 introduces the Estimated Monthly Cost row last, as an instruction to "insert one additional row below the fourth row", though the row is fifth, and numbers Payment Terms "the sixth row" on a count taken before that insertion. Row order for those two forms is therefore not machine-checked; `structureEvidence: \'prose-described\'` records the weaker treatment.',
    effect:
      'The one place a weaker check was chosen on a legal reading. `structureVerifiedAt` for CA and NY rests on the source digest and a human reading, not on a re-executed order check — so a reordering of our own table would be caught by no assertion in this package.',
    changesVerdicts: false,
    pinnedBy: {
      file: '__tests__/provenance-honesty.test.ts',
      marker: "f.structureEvidence === 'source-order'",
    },
  },
  {
    id: 'ks-prescribed-label-tolerance',
    surface: 'prescribed-form',
    jurisdictions: ['US-KS'],
    question:
      'Kan. SB 345 §2(b)(5) prescribes the label "estimated payments". The vendored bill reads `shall label such disclosure as "estimated 14 payments."` — 14 being the printed line number, which survives extraction and lands inside the phrase. The label check therefore tolerates a bare one-to-three digit token between the words of any prescribed label, in every state, so that Kansas does not report a defect in a form that carries the label correctly.',
    effect:
      'A tolerance introduced for a page artefact and applied to all seven content states. It cannot make a wrong label pass — the words must still appear in order — but it is a loosening chosen by us on a reading of what the vendored text says, and it has never been checked against the enrolled bill rather than the extraction.',
    changesVerdicts: false,
    pinnedBy: {
      file: 'provenance/source-text.ts',
      marker: 'estimated 14 payments',
    },
  },
];

/**
 * Which instance readings change a verdict rather than widening a gap.
 *
 * ADR 0009: "the term unit and the direction of the (a)(3) relative test each
 * change verdicts". Listed by id rather than inferred, so that adding a reading
 * to `UNRESOLVED_READINGS` does not silently classify it as harmless.
 */
const CHANGES_VERDICTS = new Set(['term-unit', 'relative-tolerance-direction']);

/**
 * Where each instance reading is pinned.
 *
 * `identities.ts` holds the reading itself and the code that acts on it, so the
 * id is its own marker — a reading deleted from that array takes its pin with
 * it, and the test that reads this file goes red.
 */
const instanceReadings: readonly OpenReading[] = UNRESOLVED_READINGS.map((r) => ({
  id: r.id,
  surface: 'instance' as const,
  // Both `instance/` checkers are California and New York only: `Jurisdiction`
  // in `instance/types.ts` has exactly those two members, because those are the
  // two states that prescribe the sentences these numbers sit beside.
  jurisdictions: ['US-CA', 'US-NY'] as McaJurisdiction[],
  question: r.question,
  effect: r.effect,
  changesVerdicts: CHANGES_VERDICTS.has(r.id),
  pinnedBy: { file: 'instance/identities.ts', marker: `id: '${r.id}'` },
}));

/**
 * Every open reading, both surfaces.
 *
 * Counted by a test. Making counsel a parallel track (ADR 0009) does not shrink
 * this backlog; it stops the backlog from also holding up the build. What the
 * count is for is the other failure: a reading being quietly dropped by a sweep
 * before anyone answered it.
 */
export const OPEN_READINGS: readonly OpenReading[] = [...PRESCRIBED_READINGS, ...instanceReadings];
