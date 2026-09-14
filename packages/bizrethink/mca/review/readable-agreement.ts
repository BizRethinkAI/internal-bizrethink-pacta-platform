import { inReviewOrder } from '../clauses/library';
import type { McaContent } from '../clauses/types';
import { groupMcaSections } from '../engine/section-headings';
import type { ReviewMcaContent } from '../reusable/review';

export type ReadableMcaClause = {
  slug: string;
  /** Derived in the selection identified by `included` / `selectionNote`. */
  number: string | null;
  heading: string;
  /** References and parties resolved; widget anchors retained. */
  text: string;
  kind: McaContent['kind'];
  fields: McaContent['fields'];
  repeatFor: McaContent['repeatFor'];
  retiredFields: McaContent['retiredFields'];
  unnumberedReason: string | null;
  included: boolean;
  selectionNote: string | null;
};

export type ReadableMcaSection = {
  id: string;
  name: string;
  clauses: ReadableMcaClause[];
};

/** Only compiled review data enters this view. No source-number fallback. */
export const toReadableAgreement = (clauses: ReviewMcaContent[]): ReadableMcaSection[] =>
  groupMcaSections(inReviewOrder(clauses)).map((section) => ({
    id: section.section,
    name: section.heading,
    clauses: section.items.map((clause) => ({
      slug: clause.slug,
      number: clause.number,
      heading: clause.heading,
      text: clause.body,
      kind: clause.kind,
      fields: clause.fields,
      repeatFor: clause.repeatFor,
      retiredFields: clause.retiredFields,
      unnumberedReason: clause.unnumberedReason ?? null,
      included: clause.included,
      selectionNote: clause.selectionNote,
    })),
  }));

export const readableSlugs = (sections: ReadableMcaSection[]): string[] =>
  sections.flatMap((section) => section.clauses.map((clause) => clause.slug));
