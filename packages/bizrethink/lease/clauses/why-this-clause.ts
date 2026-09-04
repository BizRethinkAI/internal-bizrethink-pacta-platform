import type { Clause } from './types';

/**
 * Why a clause is in the library at all.
 *
 * The first question a reviewer asks, and the one the library page could not
 * answer. It showed `parties.recital · v2 · parties · Unapproved` — true, and
 * useless. Nothing on the page distinguished a disclosure Florida compels from
 * a house rule somebody invented on a Tuesday.
 *
 * Three honest answers, and the difference between them is where a reviewer
 * should spend their hour.
 */
export type WhyThisClause =
  | {
      kind: 'compelled';
      /** The provision that requires this text to appear in a lease. */
      citation: string;
      /** When the requirement bites, in words a landlord can check. */
      appliesWhen: string;
    }
  | {
      kind: 'implements';
      /** The provision this gives effect to. It did not dictate these words. */
      citation: string;
    }
  | { kind: 'discretionary' };

type Compelled = {
  slug: string;
  citation: string;
  appliesWhen: string;
};

/**
 * What Florida and the federal government actually require to appear in a
 * residential lease.
 *
 * THE OUTPUT OF A STATUTORY WALK, 2026-09-03. Every section of Fla. Stat.
 * ch. 83 pt. II was read end to end, plus §404.056, §68.065, §553.885,
 * §689.01, ch. 515, ch. 720, ch. 501 pt. II, and the federal set — asking of
 * each: does this require text in a LEASE, or does it only regulate conduct?
 *
 * The list is deliberately short, and that is the finding. Most of a lease is
 * not statute. Before the walk this repo carried a list assembled from
 * recollection, which had a wrong subsection in it and was missing §83.67(5)
 * entirely.
 *
 * Two entries are here because of what the walk RULED OUT, and they are worth
 * naming: chapter 515 (swimming pools) and chapter 720 (HOA) impose NO lease
 * disclosure duty. §515.33 runs to buyers from contractors; the words "lease",
 * "tenant" and "rent" appear nowhere in it. Both were previously reported as
 * compliance obligations. They are not, and a test asserts they never creep
 * back in.
 */
export const FL_COMPELLED: Compelled[] = [
  {
    slug: 'disclosure.radon',
    citation: 'Fla. Stat. §404.056(5)',
    appliesWhen: 'Every lease of any building, unless the occupancy is transient and 45 days or less.',
  },
  {
    slug: 'disclosure.landlord-identity',
    citation: 'Fla. Stat. §83.50',
    appliesWhen: 'Every tenancy. The name and address must be given in writing at or before commencement.',
  },
  {
    slug: 'disclosure.flood',
    citation: 'Fla. Stat. §83.512',
    appliesWhen: 'Any residential term of one year or longer. Must be a separate document, not a lease clause.',
  },
  {
    slug: 'deposit.statutory-notice',
    citation: 'Fla. Stat. §83.49(2)(d)',
    appliesWhen:
      'A deposit or advance rent is held AND the landlord rents five or more dwelling units. §83.49(2) does not apply below five.',
  },
  {
    slug: 'deposit.escrow-notice',
    citation: 'Fla. Stat. §83.49(2)',
    appliesWhen:
      'A deposit or advance rent is held AND the landlord rents five or more dwelling units. May be given in the lease or within 30 days of receipt.',
  },
  {
    slug: 'disclosure.lead-paint',
    citation: '40 C.F.R. §745.113(b); 24 C.F.R. §35.92(b)',
    appliesWhen:
      'Target housing — built before 1978, or where the build year is unknown. Six elements are required, not just the warning statement.',
  },
];

const compelledBySlug = new Map(FL_COMPELLED.map((entry) => [entry.slug, entry]));

/**
 * Classify one clause.
 *
 * `requiredBy` is the clause's own claim that it gives effect to a statute. It
 * is weaker than being compelled: §83.53 regulates entry without dictating a
 * word of lease text, so an access clause implements it rather than being
 * required by it. Keeping the two apart is the point — collapsing them would
 * let drafting present itself as law, which is exactly the confusion the page
 * needs to remove.
 */
export const whyThisClause = (clause: Clause): WhyThisClause => {
  const compelled = compelledBySlug.get(clause.slug);

  if (compelled) {
    return { kind: 'compelled', citation: compelled.citation, appliesWhen: compelled.appliesWhen };
  }

  if (clause.requiredBy) {
    return { kind: 'implements', citation: clause.requiredBy };
  }

  return { kind: 'discretionary' };
};
