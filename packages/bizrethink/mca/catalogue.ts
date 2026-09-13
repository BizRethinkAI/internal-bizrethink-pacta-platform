import type { McaInstrument } from './clauses/instruments';
import { ALL_MCA_CLAUSES, inReviewOrder } from './clauses/library';
import type { McaContent } from './clauses/types';
import { ALL_MCA_REUSABLE } from './reusable/library';

/** Shared review/assembly services only; clause APIs use clauses/library. */
export const ALL_MCA_CONTENT: McaContent[] = [...ALL_MCA_CLAUSES, ...ALL_MCA_REUSABLE];

export const contentFor = (instrument: McaInstrument): McaContent[] =>
  inReviewOrder(ALL_MCA_CONTENT.filter((entry) => entry.instrument === instrument));

/** Historical findings stay on their original identities and also hold extracted content. */
export const contentFindingSlugs = (entry: McaContent): string[] => {
  const found = new Set<string>();
  const visit = (slug: string) => {
    if (found.has(slug)) {
      return;
    }
    found.add(slug);
    const origin = slug === entry.slug ? entry : ALL_MCA_CONTENT.find((candidate) => candidate.slug === slug);
    for (const parent of origin?.derivedFrom ?? []) {
      visit(parent);
    }
  };
  visit(entry.slug);
  return [...found];
};
