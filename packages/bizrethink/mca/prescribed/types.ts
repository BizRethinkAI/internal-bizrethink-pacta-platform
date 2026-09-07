import type { ClauseSource } from '../../provenance/types';
import type { ClauseStatus } from '../../server-only/feature-access';
import type { McaJurisdiction } from '../jurisdictions';
import type { SourceSection } from '../provenance/source-text';
import type { McaTransactionType } from '../transactions';

/**
 * A regulator-prescribed form.
 *
 * This is what MCA has and residential leases do not. The lease library's
 * `statute` provenance covers text that must be reproduced word for word;
 * California 10 CCR §914 and New York 23 NYCRR §600.6 go further and fix the
 * STRUCTURE — nine rows in that order, these labels, and for several rows the
 * regulation says the cell "shall include only" what it lists, which makes a
 * true and helpful extra sentence a defect rather than a bonus.
 *
 * `verbatimRequired` on the lease's `statute` variant cannot express that, so
 * this is a separate shape rather than a flag on the existing one. The
 * obligations differ in kind and so do their failure modes: wrong words is a
 * wrong disclosure, wrong ROWS is not the prescribed form at all. One is a
 * string assertion, the other is a schema.
 */
export type PrescribedRow = {
  /** First-column text, reproduced exactly. */
  label: string;
  /**
   * Text the regulation dictates word for word, usually the third column. Null
   * where the regulation prescribes the label and leaves the content to the
   * provider.
   */
  verbatim: string | null;
  /**
   * True where the regulation says the row "shall include only" the content it
   * lists. Anything beyond it is a defect — see REVIEW-01
   * `ca-extra-text-in-only-rows`, where three sentences that were each true and
   * helpful had to come out of a California form.
   */
  onlyPrescribedContent: boolean;
  /**
   * Sentences the regulation expressly PERMITS but does not require, in a row
   * it otherwise closes. §914(a)(4)(C)(ii) is the clean example: the provider
   * "may include" the statement that the finance charge will not increase if
   * repayment takes longer. Present in our form, permitted, and not an
   * addition.
   *
   * Without this the checker flags a permitted sentence as a defect, which is
   * worse than useless: a checker that cries wolf gets its findings ignored,
   * and the findings are the whole point.
   */
  alsoPermitted?: string[];
  /**
   * Content the regulation REQUIRES the row to carry but does not word.
   *
   * A third category, and it had been folded into `alsoPermitted` where it did
   * not belong. Both New York §600.6(b)(iii) and California §914(a)(2)(C)(iii)
   * say the provider "shall include a short explanation that the amount paid
   * directly to the recipient may change" — an obligation with no prescribed
   * sentence to satisfy it. The words that end up in the row are therefore
   * OURS, in a row the regulation otherwise closes with "shall include only".
   *
   * Keeping them under `alsoPermitted` made two different claims look alike:
   * "the regulator supplies this wording" and "the regulator requires this
   * subject and we chose the wording". The first is verifiable against the
   * source and the second is not verifiable at all — so filing ours under the
   * first meant the checker either had to fail on text that is perfectly
   * lawful, or stop checking the field, and it had quietly done the latter for
   * every sentence in it.
   *
   * `citation` names the clause that compels the explanation, so the claim
   * remains traceable even though the wording cannot be matched. These are
   * counted by `unverifiableSentences` and the count is pinned by a test:
   * unverifiable surface is allowed to exist, but not to grow unnoticed.
   */
  providerDrafted?: { citation: string; text: string }[];
  /**
   * True where the regulation says the row shall include NO information in the
   * third column.
   *
   * A third kind of row, and neither of the other two can express it. A row is
   * otherwise either worded by the regulation (`verbatim`) or left to the
   * provider (`verbatim: null`), and `checkFormConformity` returns early on the
   * second — it checks the label and never looks at the cell. A row that must
   * be EMPTY is neither: the regulation says exactly what belongs there, and
   * what belongs there is nothing.
   *
   * 10 CCR §915(a)(7) and 23 NYCRR §600.14(g), both on the Term row: "The sixth
   * row of the table shall include no information in the third column, and the
   * remaining columns shall include only the following information". This is
   * the only content rule in either lease table a machine can decide —
   * everything else those sections leave to the provider they describe rather
   * than word.
   */
  thirdColumnEmpty?: boolean;
};

export type PrescribedForm = {
  /** e.g. 'ca-offer-summary'. */
  slug: string;
  /** e.g. '10 CCR §914'. */
  citation: string;
  /**
   * Which state's law this is a creature of. The filter in `registry.ts` is the
   * only way to reach a spec, so that California's words cannot reach a New
   * York document — which they once did, in production.
   */
  jurisdiction: McaJurisdiction;
  /**
   * Which KIND of financing this table is prescribed for.
   *
   * A second axis, added when the lease-financing forms landed. Until then
   * every spec in the library was a sales-based financing disclosure and
   * `disclosuresFor('US-CA')` returned exactly one thing; it returns three now,
   * and §915's lease table describes a transaction §914's does not. See
   * `mca/transactions.ts` — and note that this is emphatically NOT a tenant or
   * product axis, which belong on the document rather than on the spec.
   */
  transaction: McaTransactionType;
  /**
   * Where these words came from, and whether they may be published.
   *
   * Always the `regulator-prescribed-form` variant here, enforced by
   * `verifyProvenance`. It is the variant that carries TWO dates, because a
   * regulator can amend prescribed wording while leaving the table alone, or
   * reorder the table while leaving the wording alone.
   */
  source: ClauseSource;
  status: ClauseStatus;
  /**
   * `normalisedDigest` of `sourceFile` when the dates on `source` were last
   * earned. This is what stops a verification date being merely typed: amend
   * the regulation and re-vendor it, and the digest no longer matches.
   */
  sourceDigest: string;
  /**
   * The part of `sourceFile` this form was transcribed from, or null when the
   * whole file is this one form.
   *
   * California's regulation prescribes at least six different tables in one
   * file and only the sales-based one is ours; New York's file contains
   * California's phrasing of a prescribed sentence in a section governing a
   * different transaction type. Checking against the whole file accepts both.
   */
  section: SourceSection | null;
  /**
   * How the ROW ORDER can be re-checked against the source.
   *
   * 'source-order' — the source is the form itself, printed in table order, so
   * the labels appear in it in the order the spec puts them in. Connecticut's
   * Appendix A and Virginia's disclosure are PDFs of the actual form.
   *
   * 'prose-described' — the source is a regulation that DESCRIBES the rows, and
   * its prose order is not the table's. California's §914 introduces the
   * Estimated Monthly Cost row last ("insert one additional row below the
   * fourth row") though the row is fifth, and numbers Payment Terms "the sixth
   * row" under a count taken before that insertion. Checking source order there
   * reports a defect in a table that is correct, and a checker that cries wolf
   * gets its findings ignored. For these forms the order was verified by a
   * human; what the machine re-checks is the digest and the section.
   *
   * REQUIRED, WITH NO DEFAULT, deliberately. The weaker treatment has to be
   * chosen and justified per form. A default would let a new form get it by
   * saying nothing, which is how the strict reading quietly stops applying.
   */
  structureEvidence: 'source-order' | 'prose-described';
  /**
   * The vendored primary file this form was read out of. Never a summary: see
   * MCA-CLAUSE-LIBRARY-PHASE0.md, where the Georgia and Texas forms were both
   * built from secondary summaries that were broadly right and wrong in exactly
   * the particulars that mattered.
   */
  sourceFile: string;
  rows: PrescribedRow[];
  /**
   * How the first column is compared.
   *
   * 'exact' for California and New York, whose regulations say "in the first
   * column: 'Funding Provided'" — the label IS the whole cell, so anything else
   * in it is an addition.
   *
   * 'contains' for Virginia, whose first column holds the label AND tick-boxes
   * the provider completes ("Payment Schedule ☐ Fixed ☐ Variable") AND the
   * bracketed formulae the form prints under several labels. Demanding an exact
   * match there would mean writing our own answers into the spec, which would
   * make the spec a record of what we did rather than of what Virginia requires.
   *
   * Defaults to 'exact': the stricter reading should be the one you get by
   * saying nothing.
   */
  labelMatch?: 'exact' | 'contains';
};

/** One divergence between what a form says and what the regulation prescribes. */
export type Divergence = {
  kind: 'row-count' | 'label' | 'verbatim' | 'unauthorised-addition' | 'not-in-source';
  /** Index into `rows`, or null for a whole-form problem. */
  row: number | null;
  detail: string;
};

/** A rendered form, as read back out of the built PDF. */
export type RenderedRow = {
  label: string;
  /**
   * The second column, where the regulation gives the row three columns and
   * does not combine them — the dollar amount, rate or count.
   *
   * Kept apart from `content` because merging them made every figure in the
   * form look like unauthorised prose in a row closed by "shall include only".
   * Null where the regulation says the second and third columns "shall be
   * combined", which several rows do.
   */
  value?: string | null;
  content: string;
};
