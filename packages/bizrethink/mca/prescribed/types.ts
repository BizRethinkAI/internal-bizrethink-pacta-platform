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
 * this is a separate shape rather than a flag on the existing one.
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
};

export type PrescribedForm = {
  /** e.g. 'ca-offer-summary'. */
  slug: string;
  /** e.g. '10 CCR §914'. */
  citation: string;
  /**
   * The vendored primary file this form was read out of. Never a summary: see
   * MCA-CLAUSE-LIBRARY-PHASE0.md, where the Georgia and Texas forms were both
   * built from secondary summaries that were broadly right and wrong in exactly
   * the particulars that mattered.
   */
  sourceFile: string;
  rows: PrescribedRow[];
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
  content: string;
};
