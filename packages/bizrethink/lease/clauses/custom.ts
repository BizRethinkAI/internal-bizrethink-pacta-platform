import type { Clause } from './types';
import { FL_LIBRARY, FL_SECTION_ORDER } from './us-fl';

/**
 * Clauses a landlord writes themselves.
 *
 * This is the feature the whole project exists for. The 2026 Zillow lease
 * pushed six substantive lettered clauses into a free-text box labelled
 * "OTHERS", under two headings that read "N/A". They got no number, no
 * table-of-contents entry, and nothing else in the document could refer to
 * them — so the most heavily negotiated terms in a 26-page lease sat as
 * unnumbered prose on page 21.
 *
 * A custom clause here is an ordinary clause. It takes a position in a real
 * section, is numbered by the same derivation as everything else, appears in
 * the contents, and participates in duplicate detection. The only differences
 * are its provenance — `customer-authored`, which `assertPublishable` refuses
 * to publish to the shared library — and that it sorts after the reviewed
 * clauses in its section, so adding one never reorders text an attorney signed
 * off.
 */

/**
 * Ground a clause can claim, offered to the author as a checklist.
 *
 * Derived from the library rather than hand-listed, so it cannot drift: a tag
 * offered here always corresponds to something a real clause asserts, and
 * every assertion the library makes is detectable. Both directions are tested.
 *
 * Tagging is what makes duplicate detection exact instead of a guess at
 * similar wording. In the Keane lease, joint-and-several liability appeared in
 * §2.5.8 and again in custom clause F because nothing could see across the two.
 */
export const ASSERTION_TAGS: readonly string[] = [...new Set(FL_LIBRARY.flatMap((clause) => clause.asserts))].sort();

export type CustomClauseInput = {
  heading: string;
  body: string;
  /** Must be one of `FL_SECTION_ORDER`. */
  section: string;
  /** Optional; what this clause covers, for duplicate detection. */
  asserts: string[];
};

/**
 * Sorts every custom clause after the library's, which top out at 140.
 * A landlord's addition should never push itself between two reviewed clauses.
 */
const CUSTOM_SORT_BASE = 1_000;

export const toCustomClause = (input: CustomClauseInput, index: number): Clause => {
  if (!FL_SECTION_ORDER.includes(input.section as never)) {
    throw new Error(
      `Unknown section "${input.section}". A custom clause must name one of: ${FL_SECTION_ORDER.join(', ')}`,
    );
  }

  const unknownTags = input.asserts.filter((tag) => !ASSERTION_TAGS.includes(tag));

  if (unknownTags.length > 0) {
    throw new Error(
      `Unknown assertion tag(s): ${unknownTags.join(', ')}. Tagging only works against what the library asserts.`,
    );
  }

  return {
    slug: `custom.${index}`,
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: input.section,
    // Index keeps two custom clauses in the order the author added them.
    sortKey: CUSTOM_SORT_BASE + index,
    heading: input.heading,
    body: input.body,
    source: { kind: 'customer-authored' },
    // Never anything else. A landlord's own words are not reviewed text, and
    // `assertPublishable` rejects this provenance outright.
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: input.asserts,
  };
};
