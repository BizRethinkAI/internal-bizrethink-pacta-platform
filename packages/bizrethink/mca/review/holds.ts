import { ALL_MCA_CONTENT, contentFindingSlugs } from '../catalogue';
import type { McaContent } from '../clauses/types';

/** Only shared-library findings affect shared clause approval; provider findings belong to their revision. */
export const libraryFindingHoldTargets = (content: McaContent): string[] => {
  const slugs = contentFindingSlugs(content);
  const instruments = ALL_MCA_CONTENT.filter((candidate) => slugs.includes(candidate.slug)).map(
    (candidate) => candidate.instrument,
  );
  return [
    ...new Set([
      'package',
      ...slugs.map((slug) => `content:${slug}`),
      ...instruments.map((instrument) => `document:${instrument}`),
    ]),
  ];
};
