import { inReviewOrder } from '../clauses/library';
import type { McaContent } from '../clauses/types';
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

const sectionName = (section: string): string => {
  const names: Record<string, string> = {
    appendix: 'Fee Schedule',
    'split-funding-exhibit': 'Split Funding Authorization exhibit',
    'permission-to-release-exhibit': 'Permission to Release exhibit',
  };
  return (
    names[section] ??
    section
      .split('-')
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ')
  );
};

/** Only compiled review data enters this view. No source-number fallback. */
export const toReadableAgreement = (clauses: ReviewMcaContent[]): ReadableMcaSection[] =>
  inReviewOrder(clauses).reduce<ReadableMcaSection[]>((sections, clause) => {
    const readable: ReadableMcaClause = {
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
    };
    const last = sections[sections.length - 1];
    if (last !== undefined && last.id === clause.section) {
      last.clauses.push(readable);
      return sections;
    }
    return [...sections, { id: clause.section, name: sectionName(clause.section), clauses: [readable] }];
  }, []);

export const readableSlugs = (sections: ReadableMcaSection[]): string[] =>
  sections.flatMap((section) => section.clauses.map((clause) => clause.slug));
