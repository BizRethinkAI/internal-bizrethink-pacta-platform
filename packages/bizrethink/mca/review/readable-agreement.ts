import { inReviewOrder } from '../clauses/library';
import type { McaClause } from '../clauses/types';

/**
 * One negotiated agreement as something a lawyer can read in a web page.
 *
 * THE OTHER HALF OF WHAT ADR 0009 CALLED LEASE-BOUND. It named two things: the
 * `jurisdiction` field, handled in `link.ts`, and "the rendering lives in
 * `lease/review/readable-lease.ts`, which renders a lease". This is that hole
 * filled for the MCA side — the same job, on a corpus with a different shape.
 *
 * IT IS NOT A COPY OF THE LEASE'S, AND THE DIFFERENCE IS THE POINT.
 *
 * `toReadableSections` interpolates a lease's variables, derives clause numbers
 * from position, and STRIPS `{{SIGNATURE, r2, width=160}}` tokens, because a
 * signing token is furniture the envelope builder adds and to a reader it is
 * noise that looks like a defect.
 *
 * Two of those three are wrong here.
 *
 *   THE NUMBER IS THE DOCUMENT'S, never derived. Fourteen FRPA clauses carry
 *   no number at all — the granting clause among them, the sentence that makes
 *   the instrument a sale rather than a loan — and inventing one would put text
 *   on the page that is not in the contract. An em dash is the honest render of
 *   a clause the document does not number, and it belongs to the page rather
 *   than to this module, which returns the empty string it was given.
 *
 *   THE `«N»` MARKERS STAY. They are not signing furniture. They are the
 *   AcroForm anchors the Lombard pipeline injects, they are printed in the
 *   document a merchant signs, and this fork deliberately does not flatten them
 *   (overlays 018 and 040). An attorney reviewing a contract has to see WHERE a
 *   value is dropped into a sentence — "Merchant shall pay «7»% of daily
 *   receipts" is a different clause depending on where that marker sits.
 *   Cleaning them out would show counsel a document we do not publish, which is
 *   the same defect `bodies-match-the-document.test.ts` exists to prevent one
 *   layer down.
 *
 * So this module GROUPS and does not transform. That is a small function, and
 * saying out loud that it is small is better than growing it to justify itself.
 */

export type ReadableMcaClause = {
  slug: string;
  /** As the document prints it. Empty where the document prints none. */
  number: string;
  heading: string;
  /** Verbatim. See above. */
  text: string;
};

export type ReadableMcaSection = {
  /** The library's own section key — `commission`, `referral-duties`. */
  id: string;
  /** That key as a heading. */
  name: string;
  clauses: ReadableMcaClause[];
};

/**
 * The section key as a heading.
 *
 * TITLE-CASED FROM THE KEY RATHER THAN LOOKED UP IN A MAP OF NAMES. The lease
 * library has `FL_SECTION_NAMES` because a lease's sections are ours to name.
 * These agreements print their own headings on their own clauses, and a
 * hand-written map of six documents' section titles would be six documents'
 * worth of headings this repository invented — indistinguishable, on the page,
 * from headings the contract actually carries.
 */
const sectionName = (section: string): string =>
  section
    .split('-')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

/**
 * Grouped on the section, in the order a reviewer should read them.
 *
 * `inReviewOrder` already sorts by instrument, then that instrument's declared
 * section order, then `sortKey` — so this only has to split. Grouping on
 * CONSECUTIVE runs rather than collecting by key is deliberate: if a clause is
 * ever misfiled into a section out of order, this renders it where it sorts and
 * shows the section twice, which is visible. Collecting by key would silently
 * move it and the misfiling would never surface.
 */
export const toReadableAgreement = (clauses: McaClause[]): ReadableMcaSection[] =>
  inReviewOrder(clauses).reduce<ReadableMcaSection[]>((sections, clause) => {
    const readable: ReadableMcaClause = {
      slug: clause.slug,
      number: clause.number,
      heading: clause.heading,
      text: clause.body,
    };

    const last = sections[sections.length - 1];

    if (last !== undefined && last.id === clause.section) {
      last.clauses.push(readable);

      return sections;
    }

    return [...sections, { id: clause.section, name: sectionName(clause.section), clauses: [readable] }];
  }, []);

/** Every clause slug the reviewer was actually shown. */
export const readableSlugs = (sections: ReadableMcaSection[]): string[] =>
  sections.flatMap((section) => section.clauses.map((clause) => clause.slug));
