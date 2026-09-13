import type { McaInstrument } from './instruments';

/**
 * The Equipment Lease and the Subscription Agreement are one document
 * published twice, and this is what holds them together.
 *
 * REVIEW-02 found the pair and stated the risk exactly:
 *
 *   > Diffing the extracted text shows it and the Equipment Lease are the same
 *   > document with terminology swapped, clause numbering identical. **Every
 *   > Equipment Lease finding in this review therefore lands twice, in two live
 *   > templates, and a fix applied to one and not the other is a divergence
 *   > nothing checks for.**
 *
 * WHY THIS IS A CHECKING AID AND NOT A RENDERING ONE. The first design held one
 * body and derived the other through this table, so that divergence would be
 * impossible rather than merely detectable. The documents refuse it. Inside
 * §3.2, `leased` becomes `you subscribe for` in one sentence and `subscribed
 * for` in the next: the same source phrase, two different targets, one clause.
 * The relationship was made by hand and is not a function.
 *
 * A substitution table with per-clause exceptions is not a substitution table.
 * Generating the Subscription's words from the Lease's would mean the library
 * asserting sentences no document contains, which is the one thing this package
 * exists to prevent. So both documents' clauses are stored, and the
 * relationship between them is asserted by `__tests__/twins.test.ts`.
 *
 * Nothing that produces text for a reader may call `applyTwinVocabulary`.
 */

export type TwinCause = 'title' | 'collection';

export type TwinDivergence = {
  /** The Equipment Lease clause slug, used as the canonical pair identity. */
  slug: string;
  cause: TwinCause;
  reason: string;
};

/**
 * The vocabulary, longest first.
 *
 * DERIVED FROM THE DOCUMENTS, NOT GUESSED. Every entry below was produced by
 * aligning the two texts clause by clause and collecting the substitutions that
 * actually occur; the first attempt was written by hand from the headings and
 * was wrong in a way worth recording — a naive `lease` → `subscription` rewrote
 * `released` into `resubscriptiond`, because substring replacement does not
 * know where a word ends.
 *
 * Hence the ordering and the word boundaries. `Equipment Lease` must be tried
 * before `Lease`, and `lease payments` before `lease`, or the longer phrase is
 * eaten by the shorter rule and the result is text neither document contains.
 *
 * NOTE WHO IS ABSENT. There is no `Lessor` → `Provider`: the Equipment Lease
 * never defines a lessor and names Lombard Pay LLC outright, in both documents.
 * The asymmetry is real and the absence is the evidence for it.
 */
export const TWIN_VOCABULARY: readonly (readonly [string, string])[] = [
  ['lease payments', 'subscription charges'],
  ['lease payment', 'subscription charge'],
  ['Lease Guaranty', 'Subscription Guaranty'],
  ['Lease Term', 'Subscription Term'],
  ['LEASE', 'SUBSCRIPTION'],
  // The all-caps read-before-signing legend, which the numbered-heading import
  // never reached and the coverage check found.
  ['LESSEE', 'SUBSCRIBER'],
  ['Lease', 'Subscription'],
  ['Lessee', 'Subscriber'],
  ['lease', 'subscription'],
];

/**
 * Vocabulary exceptions still present in current draft bodies. Resolved wording
 * differences are removed; substantive differences stay in the divergence list.
 */
export type TwinVocabularyException = {
  /** Canonical Equipment Lease clause identity; independent of numbering. */
  slug: string;
  /** The Equipment Lease's words, after `TWIN_VOCABULARY` has been applied. */
  from: string;
  /** What the Subscription actually says. */
  to: string;
};

export const TWIN_VOCABULARY_EXCEPTIONS: readonly TwinVocabularyException[] = [
  {
    slug: 'equipment-lease.independent-decision-governing-law',
    from: 'reflected in this Subscription at Section',
    to: 'reflected in the Subscription at Section',
  },
  {
    slug: 'equipment-lease.acknowledgment',
    from: 'executed this Equipment Subscription Agreement',
    to: 'executed this Subscription Agreement',
  },
  {
    slug: 'equipment-lease.party-identification',
    from: 'This Equipment Subscription Agreement',
    to: 'This Subscription Agreement',
  },
];

/**
 * Apply the vocabulary, on word boundaries, then the clause's exceptions.
 *
 * FOR TESTS ONLY. It answers "do these two clauses say the same thing in their
 * two vocabularies?" and nothing else. It is not how the Subscription's text is
 * produced — that text is stored, because it was written by hand and cannot be
 * computed.
 */
export const applyTwinVocabulary = (text: string, slug: string): string => {
  const swapped = TWIN_VOCABULARY.reduce(
    (out, [from, to]) => out.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), to),
    text.replace(
      /\[\[clause:equipment-lease\.([^\]]+)\]\]/g,
      (_token, suffix: string) => `[[clause:subscription.${TWIN_SUFFIXES[suffix] ?? suffix}]]`,
    ),
  );

  return TWIN_VOCABULARY_EXCEPTIONS.filter((exception) => exception.slug === slug).reduce(
    (out, exception) => out.replace(exception.from, exception.to),
    swapped,
  );
};

/**
 * The five clauses that are genuinely different documents, and why.
 *
 * FOUR OF THE FIVE ARE ONE FACT. Title can pass to the customer under the
 * Equipment Lease and cannot under the Subscription, and §§3.5, 3.6, 3.7 and
 * 3.8 all follow from it. Recording the CAUSE rather than five unrelated
 * reasons is what makes a sixth divergence something to justify rather than
 * something to add to a list.
 *
 * The fifth is not about title at all and is the one to read first: the two
 * documents collect money by different mechanisms.
 */
export const EQUIPMENT_TWIN: {
  lease: McaInstrument;
  subscription: McaInstrument;
  divergent: readonly TwinDivergence[];
} = {
  lease: 'equipment-lease',
  subscription: 'subscription',
  divergent: [
    {
      slug: 'equipment-lease.payment-of-amounts-due',
      cause: 'collection',
      reason:
        'The Lease allows separately authorized processor billing only from the share remaining after the receivables purchase. The Subscription requires an independently agreed payment method and a separate revocable authorization for any automatic debit. Both require invoices, prohibit default sweeps and keep equipment outside purchased receipts.',
    },
    {
      slug: 'equipment-lease.use-return-of-equipment-and-insurance',
      cause: 'title',
      reason:
        'The Lease limits restrictions, labels and insurance to an unsatisfied security interest. The Subscription retains ownership. Both require agreed access and documented return costs without automatic penalties.',
    },
    {
      slug: 'equipment-lease.title-to-equipment',
      cause: 'title',
      reason:
        'The fixed-term $1 Lease identifies security-interest economics. The Subscription has no purchase option and preserves classification based on its actual term and residual. Neither invents attachment, perfection or priority, and neither claims a disclosure exemption by label.',
    },
    {
      slug: 'equipment-lease.purchase-return-or-continuation-of-equipment-at-end-of-lease-term',
      cause: 'title',
      reason:
        'The Lease makes the $1 purchase an express election at signing, charges it with the final scheduled payment, and stops periodic billing without renewal. The Subscription retains a monthly continuation and states a definite termination, return and billing-stop mechanism without a purchase option.',
    },
    {
      slug: 'equipment-lease.software-license',
      cause: 'title',
      reason:
        'For identified provider-owned software, the Lease license survives ownership transfer while the Subscription license ends with its valid term. Both require third-party terms and actual licensing authority before signing and promise no rights in third-party software.',
    },
  ],
};

/** The declared divergence for a clause slug, or null when the twins agree. */
export const twinDivergence = (slug: string): TwinDivergence | null =>
  EQUIPMENT_TWIN.divergent.find((entry) => entry.slug === slug) ?? null;

// These two obligations have different names in the two instruments. All
// others share their suffix. Used to check identities and reference targets,
// never to generate contract text.
const TWIN_SUFFIXES: Record<string, string> = {
  'purchase-return-or-continuation-of-equipment-at-end-of-lease-term':
    'return-or-continuation-of-equipment-at-end-of-subscription-term',
  'lease-guaranty': 'subscription-guaranty',
};

export const equipmentTwinKey = (slug: string): string => {
  const suffix = slug.split('.').slice(1).join('.');
  const leaseSuffix = Object.entries(TWIN_SUFFIXES).find(([, subscription]) => subscription === suffix)?.[0] ?? suffix;
  return `equipment-lease.${leaseSuffix}`;
};
