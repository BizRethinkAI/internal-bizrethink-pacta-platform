import { assertPublishable } from '../../provenance/types';
import type { ContentStatute } from '../content/types';
import { coverageForContents, type EnvelopeContents } from '../instance/check';
import { JURISDICTION_NAMES, MCA_JURISDICTIONS, type McaJurisdiction } from '../jurisdictions';
import { coverage } from '../prescribed/conformity';
import type { PrescribedForm } from '../prescribed/types';
import { normalisedDigest, readSourceText, type SourceSection, sourceExists } from '../provenance/source-text';
import {
  type McaDisclosure,
  type ProvenanceProblem,
  unverifiableSentences,
  verifyProvenance,
} from '../provenance/verify';
import { disclosuresFor } from '../registry';

/**
 * The view model behind `/admin/mca`.
 *
 * READ-ONLY, AND THAT IS THE LOAD-BEARING PART (ADR 0008). The lease library's
 * page records an attorney's approval of the exact words of a clause we wrote.
 * There is nothing here for anyone to approve: 10 CCR §914 is California's
 * text, closed with "shall include only", and an approval recorded against it
 * would put a lawyer's name and bar number behind a regulator's sentence. So
 * this module produces a report and exposes no mutation of any kind — no
 * status, no approval, no date that a page could stamp.
 *
 * IT LIVES IN THE PACKAGE, NOT IN THE ROUTE, for the reason every checker here
 * lives in the package: a view model in a `.tsx` file is a view model no test
 * runs. Everything on this page that could be wrong is computed here and
 * asserted in `__tests__/surface.test.ts`; the route arranges the result on a
 * screen and decides nothing.
 *
 * THE FAILURE MODE THIS IS WRITTEN AGAINST is a page that looks reassuring. A
 * state with a green verification date and four rows whose contents no check
 * can read is not verified — it is partly verified, and `assurance` says so in
 * a word rather than leaving a reader to infer it from a number they will not
 * read. There is deliberately no tick.
 */

/**
 * Which library an entry belongs to.
 *
 * A single-member union today, and it earns its place anyway. The owner asked,
 * looking at `/admin/lease-library` growing from 65 clauses to 81 with new
 * jurisdiction sections, whether the MCA and lease libraries had been mixed
 * together. They had not — but the only thing keeping them apart was that
 * nothing could import `mca/`, and this page ends that. Separation by
 * unreachability is not separation by design.
 *
 * The risk is concrete rather than theoretical: `US-FL` is a jurisdiction in
 * BOTH libraries, so a list keyed on jurisdiction would merge Florida's lease
 * clauses into Florida's disclosure statute with no type error at all.
 */
export const MCA_LIBRARY = 'mca-conformity';

export type LibraryTag = typeof MCA_LIBRARY;

declare const checked: unique symbol;

/**
 * A library tag that has been through `assertSingleLibrary`.
 *
 * The brand exists because no test can catch a deleted guard. `entryFor` only
 * ever stamps `MCA_LIBRARY`, so the check passes vacuously today and removing
 * the call would change nothing observable — the exact shape of the two
 * assertions in this package that filtered on `Divergence` kinds that do not
 * exist and were green for a day.
 *
 * So it is enforced by the type rather than by an assertion: `ConformitySurface.library`
 * is a `CheckedLibrary`, the only cast to one is inside the guard, and a
 * surface assembled without calling it does not compile.
 */
export type CheckedLibrary = LibraryTag & { readonly [checked]: true };

/**
 * Refuse a list that draws from more than one library.
 *
 * Called by the surface builder on its own output, which sounds circular and is
 * not: the value is that it is also callable on anything a page is about to
 * render, so the guard sits between "these rows arrived from somewhere" and
 * "these rows are drawn on a screen". Throws rather than filters — silently
 * dropping the foreign entry would leave the page looking correct while the
 * mistake that produced it stayed in the code.
 */
export const assertSingleLibrary = (
  entries: readonly { library: string; slug: string }[],
  expected: LibraryTag,
): CheckedLibrary => {
  const foreign = entries.filter((e) => e.library !== expected);

  if (foreign.length > 0) {
    throw new Error(
      `${expected} list carries ${foreign.length} entr${foreign.length === 1 ? 'y' : 'ies'} from another library: ` +
        foreign.map((e) => `${e.slug} (${e.library})`).join(', '),
    );
  }

  // The only cast to CheckedLibrary in the package. See the type's comment.
  return expected as CheckedLibrary;
};

/**
 * Whether the vendored source still hashes to what the verification dates were
 * earned against.
 *
 * `stale` is the interesting state and the reason the digest is on the page at
 * all. A verification date is a claim that a human read a regulation on a day;
 * the digest is what stops that claim outliving the regulation. When a
 * regulator amends a rule and the file is re-vendored, this breaks, and
 * everything else on the row becomes a statement about text that no longer
 * exists.
 */
export type DigestState = 'matches' | 'stale' | 'source-missing';

/**
 * How much of this spec a check can stand behind.
 *
 * Three levels rather than two, and `verified` is deliberately hard to reach.
 * A prescribed form whose regulation says "a short explanation" and supplies no
 * words has rows the checker can read the label of and not the contents; a
 * content-only statute prescribes no words at all, so almost everything in its
 * disclosure is ours. Calling either of those "verified" is the specific
 * dishonesty this page exists to avoid.
 */
export type Assurance = 'unverified' | 'partly-verified' | 'verified';

/** A row, or a statutory requirement, whose contents no check reads. */
export type Unreadable = {
  /** Row index on a prescribed form; null for a content statute's requirement. */
  row: number | null;
  label: string;
  why: string;
};

export type ConformityEntry = {
  library: LibraryTag;
  jurisdiction: McaJurisdiction;
  jurisdictionName: string;
  slug: string;
  /** The statute or regulation the spec was transcribed from. */
  citation: string;
  kind: 'prescribed-form' | 'content-statute';
  /** The vendored primary text in `mca/sources/`. Never a summary. */
  sourceFile: string;
  /** Which part of that file, where the file holds more than this instrument. */
  section: SourceSection | null;
  verbatimVerifiedAt: string | null;
  /**
   * Null on a content-only statute because there is no prescribed structure to
   * verify, which is not the same as an unverified one. `structureApplicable`
   * separates the two so the page does not render an absent obligation as a
   * missing date.
   */
  structureVerifiedAt: string | null;
  structureApplicable: boolean;
  structureEvidence: 'source-order' | 'prose-described' | null;
  digest: DigestState;
  recordedDigest: string;
  /** Null when the source is not in `mca/sources/` at all. */
  observedDigest: string | null;
  rowsTotal: number;
  unreadable: Unreadable[];
  /**
   * Sentences the regulation compels but does not word, so the words are ours
   * inside a row that is otherwise verified. Lawful, sometimes required, and
   * never matchable against the source.
   */
  providerDrafted: { citation: string; row: number }[];
  /** Live output of `verifyProvenance`, re-earned on every load. */
  problems: ProvenanceProblem[];
  /** Live output of `assertPublishable`. Reported, never acted on. */
  publishGate: string[];
  assurance: Assurance;
  /** Why it got that level. Never empty — a level with no reason is a tick. */
  assuranceReasons: string[];
};

export type ConformitySurface = {
  library: CheckedLibrary;
  jurisdictions: readonly McaJurisdiction[];
  entries: ConformityEntry[];
};

const isPrescribedForm = (spec: McaDisclosure): spec is PrescribedForm => 'rows' in spec;

const digestStateOf = (spec: McaDisclosure): { digest: DigestState; observed: string | null } => {
  if (!sourceExists(spec.sourceFile)) {
    return { digest: 'source-missing', observed: null };
  }

  const observed = normalisedDigest(readSourceText(spec.sourceFile));

  return { digest: observed === spec.sourceDigest ? 'matches' : 'stale', observed };
};

/*
  Rows a prescribed form's regulation leaves unworded.

  §600.6 and §914 do this five times and four times respectively: the row's
  label is dictated, the row's contents are "a short explanation" of something
  and no sentence is supplied. `checkFormConformity` checks the label and skips
  the contents, which is correct and is exactly the gap a reader must be told
  about rather than left to deduce from a passing suite.
*/
const unreadableRowsOf = (form: PrescribedForm): Unreadable[] =>
  form.rows.flatMap((row, i) =>
    row.verbatim === null
      ? [
          {
            row: i,
            label: row.label,
            why: `${form.citation} prescribes this label and supplies no wording for the row, so the label is checked and the contents are not`,
          },
        ]
      : [],
  );

/*
  The same gap on the other kind of statute, and it is wider, not narrower.

  A content-only act prescribes the INFORMATION a disclosure must convey and no
  sentence anywhere, so EVERY requirement is unreadable in this sense —
  including Kansas's and Missouri's. Those two dictate every LABEL, which is
  exact words and is genuinely checked against the statute, and the temptation
  is to score a fully-labelled state as fully verified. That is the tick this
  page must not show: a Kansas form can carry all six prescribed headings, pass
  every assertion in the package, and say the wrong thing under each one.

  What is re-checked is that each requirement has a row and that the evidence
  strings pinned in the spec appear in it — never that the row answers the
  requirement, which is a human judgement recorded in `requires`.
*/
const unreadableRequirementsOf = (statute: ContentStatute): Unreadable[] =>
  statute.requirements.map((req) => ({
    row: null,
    label: req.row ?? '(not placed in any row)',
    why:
      req.labelPrescribed === true
        ? `${req.citation} dictates this label, which is checked against the statute, and supplies no wording for the row — the sentences under it are ours`
        : `${req.citation} prescribes the information and not the words, so only the evidence pinned in the spec is re-checked`,
  }));

/**
 * Build one row of the surface.
 *
 * Exported so a synthetic spec can be pushed through the same code path the
 * eleven states take. A view model whose failure states are only reachable by
 * waiting for a regulator to amend something is a view model whose failure
 * states are never tested.
 */
export const entryFor = (spec: McaDisclosure): ConformityEntry => {
  const { digest, observed } = digestStateOf(spec);
  const problems = verifyProvenance(spec);
  const publishGate = assertPublishable(spec);
  const prescribed = isPrescribedForm(spec);

  const unreadable = prescribed ? unreadableRowsOf(spec) : unreadableRequirementsOf(spec);
  const providerDrafted = prescribed ? unverifiableSentences(spec) : [];
  const rows = prescribed ? coverage(spec) : { total: spec.requirements.length };

  const structureVerifiedAt = spec.source.kind === 'regulator-prescribed-form' ? spec.source.structureVerifiedAt : null;
  const verbatimVerifiedAt =
    spec.source.kind === 'regulator-prescribed-form' || spec.source.kind === 'statute'
      ? spec.source.verbatimVerifiedAt
      : null;

  /*
    A stale digest and a missing source are NOT restated here.

    `verifyProvenance` already reports both, with the recorded and observed
    hashes in the detail, and duplicating them would give the page two
    sentences for one fact — and, worse, a reason that stays correct if the
    real check is deleted. Everything in `blocking` below is something
    `problems` does not say.

    The dates are the case in point. `assertPublishable` only judges a spec
    whose status is already `published`, so a DRAFT spec with two null dates
    and an intact digest produces no problem and no gate entry. Without these
    two lines it would be reported as verified.
  */
  const blocking: string[] = [];

  if (verbatimVerifiedAt === null) {
    blocking.push('the words have never been checked against the source');
  }

  if (prescribed && structureVerifiedAt === null) {
    blocking.push('the rows, their labels and their order have never been checked');
  }

  for (const p of problems) {
    blocking.push(`${p.kind}: ${p.detail}`);
  }

  /*
    `publishGate` is NOT folded in here, though it is displayed.

    `verifyProvenance` already begins by running `assertPublishable` and
    reporting each problem under `kind: 'publishable'`, so adding it again
    would put every gate failure on the page twice and — worse — leave a reason
    that survives the deletion of the check that produced it. It is carried as
    its own field because the gate's verdict is the one thing a reader wants
    stated plainly rather than inferred from a list of provenance problems.
  */

  const partial: string[] = [];

  if (prescribed && unreadable.length > 0) {
    partial.push(
      `${unreadable.length} of ${rows.total} rows: the checker reads the label and cannot read the contents`,
    );
  }

  if (!prescribed && unreadable.length > 0) {
    const labelled = spec.requirements.filter((r) => r.labelPrescribed === true).length;

    partial.push(
      `${labelled} of ${rows.total} requirements have a label the statute dictates and this checker verifies; none ` +
        'has wording the statute supplies, so every sentence in this disclosure is ours',
    );
  }

  if (providerDrafted.length > 0) {
    partial.push(
      `${providerDrafted.length} sentence${providerDrafted.length === 1 ? ' is' : 's are'} our drafting, compelled by the regulation but not worded by it`,
    );
  }

  if (prescribed && spec.structureEvidence === 'prose-described') {
    partial.push(
      "the source describes the rows in prose whose order is not the table's, so row order was verified by a human and is not re-executed",
    );
  }

  const assurance: Assurance = blocking.length > 0 ? 'unverified' : partial.length > 0 ? 'partly-verified' : 'verified';

  return {
    library: MCA_LIBRARY,
    jurisdiction: spec.jurisdiction,
    jurisdictionName: JURISDICTION_NAMES[spec.jurisdiction],
    slug: spec.slug,
    citation: spec.citation,
    kind: prescribed ? 'prescribed-form' : 'content-statute',
    sourceFile: spec.sourceFile,
    section: spec.section,
    verbatimVerifiedAt,
    structureVerifiedAt,
    structureApplicable: prescribed,
    structureEvidence: prescribed ? spec.structureEvidence : null,
    digest,
    recordedDigest: spec.sourceDigest,
    observedDigest: observed,
    rowsTotal: rows.total,
    unreadable,
    providerDrafted,
    problems,
    publishGate,
    assurance,
    assuranceReasons:
      blocking.length > 0
        ? blocking
        : partial.length > 0
          ? partial
          : [
              'every label and every prescribed sentence is re-found in the vendored source, and no row is left unworded',
            ],
  };
};

/**
 * The whole surface, assembled the only way a spec may be reached.
 *
 * Walks `MCA_JURISDICTIONS` and calls `disclosuresFor`, rather than mapping
 * `MCA_DISCLOSURES` directly. The result is the same list; the difference is
 * that the page is built by the filter that exists so California's words cannot
 * reach a New York document. A page that reached past it would be the first
 * caller in the package to do so, and README rule 5 exists because that is how
 * templates 104 and 105 shipped.
 */
export const conformitySurface = (): ConformitySurface => {
  const entries = MCA_JURISDICTIONS.flatMap((jurisdiction) => disclosuresFor(jurisdiction).map(entryFor));

  return { library: assertSingleLibrary(entries, MCA_LIBRARY), jurisdictions: MCA_JURISDICTIONS, entries };
};

/**
 * What a checker run could not have seen, by envelope shape.
 *
 * `instanceCoverage()` answers this for one filled envelope; this page has
 * none, and inventing figures so a number could be displayed would be exactly
 * the reassurance the rest of this module refuses. The shape is enough:
 * `skipped` turns on which DOCUMENTS travelled and on no figure at all.
 *
 * The first row is the one that matters. An offer summary sent on its own
 * cannot detect either of the two REVIEW-01 blockers that move the same $2,895
 * in opposite directions — `closure` cancels exactly — so an empty findings
 * list from a one-document envelope means almost nothing.
 */
export type EnvelopeShapeReport = {
  id: string;
  label: string;
  contents: EnvelopeContents;
  evaluable: number;
  total: number;
  skipped: { identity: string; statement: string; reason: string; wouldCatch: string[] }[];
  /** REVIEW-01 finding ids nothing in a run on this shape could detect. */
  undetectable: string[];
};

const SHAPES: { id: string; label: string; contents: EnvelopeContents }[] = [
  {
    id: 'offer-summary-only',
    label: 'Offer summary alone',
    contents: { contract: false, itemization: false },
  },
  {
    id: 'with-itemization',
    label: 'Offer summary + Itemization of Amount Financed',
    contents: { contract: false, itemization: true },
  },
  {
    id: 'with-agreement',
    label: 'Offer summary + agreement',
    contents: { contract: true, itemization: false },
  },
  {
    id: 'complete',
    label: 'Offer summary + Itemization + agreement',
    contents: { contract: true, itemization: true },
  },
];

export const envelopeShapes = (): EnvelopeShapeReport[] =>
  SHAPES.map((shape) => {
    const c = coverageForContents(shape.contents);

    return {
      ...shape,
      evaluable: c.evaluable,
      total: c.total,
      skipped: c.skipped,
      undetectable: c.undetectableInThisEnvelope,
    };
  });
