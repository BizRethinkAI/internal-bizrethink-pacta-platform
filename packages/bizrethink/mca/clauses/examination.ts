import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * The two adversarial reviews, and how a clause says which of them read it.
 *
 * WHAT PROBLEM THIS SOLVES. `MCA-CLAUSE-LIBRARY-PHASE0.md` measured the corpus
 * and found that a third of it — 47 of 140 clauses — had never been examined by
 * anyone, and drew the conclusion this module exists to enforce:
 *
 *   > They are not obviously dangerous [...] but "not obviously dangerous" is
 *   > exactly what the inherited documents looked like before the review found
 *   > 207 defects in them. **A clause library seeded from unexamined text
 *   > launders that text into apparent authority.**
 *
 * That is the whole risk. A clause sitting on a library page under a heading, a
 * citation and a version number reads as considered, whoever typed it and
 * however little anybody looked. REVIEW-02 has since read the 46 real clauses
 * of the 47 — the 47th was Payzli's addressee line, which the extraction that
 * built the appendix read as a clause because it began `3350` — so the corpus
 * is now examined end to end. The guard is for what comes next, not for what
 * came before.
 *
 * WHAT IT PROVES, EXACTLY. That a finding id a clause names is a finding that
 * was really raised, in a review that really ran, against a document, and
 * whether it survived refutation. It does not prove the finding says what the
 * clause claims it says: the argument — `evidence`, `consequence`, `fix` — lives
 * in `lombard-contracts` and is deliberately not reproduced here, because two
 * copies of a finding drift and the copy in the clause file is the one nobody
 * re-reads.
 *
 * WHAT IT CANNOT PROVE, AND WHY THERE IS NO STRING MATCH. REVIEW-01's loci name
 * the clause numbers of the document AS IT STOOD THEN. Its
 * `iso-a5-clawback-window-and-tiers` is against "§A.5 Clawback Provision"; the
 * shipped v2 numbers that clause **A.4**, because the fixes that review
 * produced removed a section above it. So a finding attaches to a clause by
 * human judgement, recorded in `examinedBy` where a reviewer can disagree with
 * it, rather than by a match that would be wrong exactly when the review had
 * done its job.
 */

export type ReviewId = 'REVIEW-01' | 'REVIEW-02';

export type FindingStatus = 'survived' | 'refuted';

/**
 * What was DONE about a finding, which is a different question from whether it
 * was right.
 *
 * `status` answers the second: did it survive refutation. `disposition` answers
 * the first, and the library shipped without it — reporting every surviving
 * finding as outstanding, including the 166 REVIEW-01 had already fixed.
 *
 * `unrecorded` is load-bearing and is not a default. REVIEW-01 keeps a manifest
 * and REVIEW-02 does not: that review's dispositions live in the prose of
 * `change-notes/16-review-02-document-defects.md`, which says 23 of its 48
 * findings were fixed without saying which in a form anything can read. So
 * every REVIEW-02 finding is unknown rather than open, and unknown is treated as
 * still outstanding — the safe reading, and the one that keeps the asymmetry
 * visible instead of quietly resolving it.
 */
export type FindingDisposition = 'implemented' | 'open' | 'handoff' | 'rejected' | 'wont-fix' | 'unrecorded';

export const DISPOSITIONS: readonly FindingDisposition[] = [
  'implemented',
  'open',
  'handoff',
  'rejected',
  'wont-fix',
  'unrecorded',
];

export type ReviewFinding = {
  id: string;
  review: ReviewId;
  status: FindingStatus;
  /** The finding itself, one statement. Present on both shapes. */
  finding: string;
  /** What was done about it. See `FindingDisposition`. */
  disposition: FindingDisposition;

  /*
    A SURVIVED FINDING AND A REFUTED ONE ARE DIFFERENT SHAPES, AND PADDING THEM
    INTO ONE WOULD BE A LIE.

    The reviews record a refuted finding as `id`, `finding` and `why` — nothing
    else — because a withdrawn finding genuinely has no severity and no route to
    anybody. Filling those in with empty strings would let a surface print
    "severity: " beside a finding that was refuted, which reads as missing data
    rather than as the correct absence.
  */

  /** Survived findings only. */
  severity?: string;
  category?: string;
  /** The document the finding is against, in the review's own words. */
  document?: string;
  /** Where in it — and see the note above about numbering that has moved. */
  locus?: string;
  /** Who the review said should decide it: `me`, `owner` or `counsel`. */
  decides?: string;

  /** Refuted findings only: why it did not survive. */
  why?: string;
};

export type ReviewRecord = {
  review: ReviewId;
  /** The file in `lombard-contracts` this was derived from. */
  file: string;
  /** That file's sha256 at derivation time. */
  sha256: string;
  /** The manifest the dispositions came from, or null where there is none. */
  manifest: string | null;
  manifestSha256: string | null;
  survived: number;
  refuted: number;
  /**
   * What the review said it could not reach.
   *
   * Carried because a coverage gap is the opposite of a finding and the more
   * dangerous of the two: a finding is something somebody looked at, and a gap
   * is something nobody did. REVIEW-02's include the one that produced this
   * module's instrument list — `phase0-corpus-omits-the-subscription-agreement-entirely`.
   */
  coverageGaps: string[];
  findings: ReviewFinding[];
};

/**
 * A clause's record of having been read.
 *
 * `findings: []` is meaningful and is not the same as being unexamined. REVIEW-02
 * says so in its own words: *"`—` means read and no finding. That is not the
 * same as clean; it means I could not demonstrate anything, which for a clause
 * like §5.4 is the honest answer."* An empty `examinedBy`, by contrast, means
 * nobody has read it — and the test refuses that.
 */
export type ClauseExamination = {
  review: ReviewId;
  findings: string[];
};

const REGISTER = 'review-register.json';

const candidates = (): string[] => {
  const out: string[] = [];

  if (typeof __dirname !== 'undefined') {
    out.push(join(__dirname, 'source-documents'));
  }

  let dir = process.cwd();

  for (let i = 0; i < 8 && dir !== dirname(dir); i += 1) {
    out.push(join(dir, 'packages', 'bizrethink', 'mca', 'clauses', 'source-documents'));
    dir = dirname(dir);
  }

  return out;
};

/**
 * Read at runtime rather than imported.
 *
 * `resolveJsonModule` is off in `packages/tsconfig/base.json`, which is an
 * upstream file this fork does not edit. Reading the file is also the same
 * shape as everything else that reads vendored evidence in this package, so
 * there is one story about where evidence lives and one way it goes missing.
 */
const load = (): ReviewRecord[] => {
  const path = candidates()
    .map((dir) => join(dir, REGISTER))
    .find((file) => existsSync(file));

  if (path === undefined) {
    return [];
  }

  return (JSON.parse(readFileSync(path, 'utf8')) as { reviews: ReviewRecord[] }).reviews;
};

export const REVIEWS: ReviewRecord[] = load();

/**
 * True when the register was found.
 *
 * DEGRADES RATHER THAN THROWS, for the reason `provenance/source-text.ts`
 * gives about the production image: `mca/sources/` is not copied into the
 * container, and nothing here has any reason to believe this directory will be
 * either. A surface that renders "the review register is not present in this
 * environment" is telling the truth; a route module that throws on import takes
 * the server with it.
 */
export const REGISTER_AVAILABLE = REVIEWS.length > 0;

/**
 * Findings by id — and an id can name more than one.
 *
 * FOUND BY THE TEST THAT ASSUMED OTHERWISE, WHICH IS WHY IT IS A LIST.
 * REVIEW-01 uses `frpa-cross-reference-titles-wrong` for two different
 * findings: one against the Florida, Georgia and Kansas disclosures, one
 * against Louisiana, Missouri, Texas and Utah. They are about the same defect
 * in different documents, and the review gave both the same name.
 *
 * A map to a single finding would have kept whichever came last and dropped the
 * other in silence, so a clause citing that id would show a reviewer one of the
 * two and give no sign there was another. `AMBIGUOUS_FINDING_IDS` names the
 * problem out loud instead, and a test pins the set so it cannot grow without
 * somebody noticing.
 */
export const FINDINGS_BY_ID: Map<string, ReviewFinding[]> = REVIEWS.flatMap((review) => review.findings).reduce(
  (map, finding) => map.set(finding.id, [...(map.get(finding.id) ?? []), finding]),
  new Map<string, ReviewFinding[]>(),
);

/** Ids the register resolves to more than one finding. */
export const AMBIGUOUS_FINDING_IDS: string[] = [...FINDINGS_BY_ID.entries()]
  .filter(([, findings]) => findings.length > 1)
  .map(([id]) => id);

/** Every finding either review raised against this clause, resolved through the register. */
export const findingsFor = (clause: { examinedBy: readonly ClauseExamination[] }): ReviewFinding[] =>
  clause.examinedBy.flatMap((examination) => examination.findings).flatMap((id) => FINDINGS_BY_ID.get(id) ?? []);

/**
 * The findings on this clause that nobody has disposed of yet.
 *
 * TWO FILTERS, AND THE SECOND ONE WAS MISSING UNTIL IT WAS MEASURED. A finding
 * is outstanding only if it survived refutation AND nobody has acted on it.
 * This function shipped with the first test alone, so it reported the 166
 * REVIEW-01 findings already marked `implemented` as live work — on the merged
 * clauses that was 23 of 44, more than half, all in the direction that makes a
 * corpus look worse than it is. A mechanism that overstates gets ignored.
 *
 * FRPA §6.5 is the sharpest case: eight findings name it, including
 * `liquidated-damages-plus-actual-costs`, and the section was DELETED by option
 * (a) of the review's own fix. Reporting them live points an attorney at text
 * that does not exist.
 *
 * `rejected` and `wont-fix` are dropped too — both are decisions, and a
 * decision is a disposition. `unrecorded` is KEPT, because unknown is not done.
 * A `survived`, `open` finding routed to counsel stays outstanding: that is the
 * backlog ADR 0009 says accumulates whether or not counsel is a gate.
 */
export const outstandingFindingsFor = (clause: { examinedBy: readonly ClauseExamination[] }): ReviewFinding[] =>
  findingsFor(clause).filter(
    (finding) => finding.status === 'survived' && ['open', 'handoff', 'unrecorded'].includes(finding.disposition),
  );
