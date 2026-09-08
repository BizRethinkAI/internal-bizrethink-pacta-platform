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
  /** The clause number, identical in both documents. */
  number: string;
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
  ['Lease', 'Subscription'],
  ['Lessee', 'Subscriber'],
  ['lease', 'subscription'],
];

/**
 * Where the swap was applied INCONSISTENTLY, clause by clause.
 *
 * This list is not scaffolding around an imperfect table. It is the finding.
 *
 * Ten places across six clauses say the same thing in two documents using
 * words that do not correspond, and none of them is a difference of substance:
 *
 *   - §3.2 renders the same verb three ways in one clause — `to subscribe for`,
 *     `you subscribe for`, and `subscribed for` — where the Equipment Lease
 *     uses `lease` and `leased` throughout. §3.1 uses a fourth, `subscribe`
 *     with no preposition.
 *   - §4.2 and §4.3 turn `this Lease` into `the Subscription` four times, while
 *     §4.5 and everywhere else turn it into `this Subscription`. A guaranty
 *     that refers to *the* agreement rather than *this* one is a small thing to
 *     read past and not a small thing in a document whose whole subject is
 *     which obligations are guaranteed.
 *   - §3.12 loses the capital: `this Subscription` becomes `this subscription`,
 *     in the sentence that terminates the agreement.
 *   - §4.7 drops `Equipment` from the executed document's own name, where §3.16
 *     keeps it (`Equipment Subscription Department`).
 *
 * Each entry carries enough surrounding words to be unambiguous, which is also
 * what makes it readable as evidence rather than as configuration. They are
 * applied in order, each replacing the first remaining occurrence.
 *
 * ADDING TO THIS LIST IS A DECISION, NOT A FIX. An entry here says "the two
 * documents say the same thing in gratuitously different words". A real
 * difference of substance belongs in `divergent` below, with a cause.
 */
export type TwinVocabularyException = {
  number: string;
  /** The Equipment Lease's words, after `TWIN_VOCABULARY` has been applied. */
  from: string;
  /** What the Subscription actually says. */
  to: string;
};

export const TWIN_VOCABULARY_EXCEPTIONS: readonly TwinVocabularyException[] = [
  { number: '3.1', from: 'you agree to subscription from us', to: 'you agree to subscribe from us' },
  {
    number: '3.2',
    from: 'by you to subscription the Equipment identified',
    to: 'by you to subscribe for the Equipment identified',
  },
  {
    number: '3.2',
    from: 'Equipment and software leased under this Agreement',
    to: 'Equipment and software you subscribe for under this Agreement',
  },
  {
    number: '3.2',
    from: 'Equipment or software leased under this Agreement',
    to: 'Equipment or software subscribed for under this Agreement',
  },
  {
    number: '3.12',
    from: 'terminate this Subscription and our future',
    to: 'terminate this subscription and our future',
  },
  { number: '4.2', from: 'under this Subscription, and nothing', to: 'under the Subscription, and nothing' },
  { number: '4.2', from: 'in connection with this Subscription; and', to: 'in connection with the Subscription; and' },
  { number: '4.2', from: 'a defense to this Subscription and/or', to: 'a defense to the Subscription and/or' },
  { number: '4.3', from: 'reflected in this Subscription at Section', to: 'reflected in the Subscription at Section' },
  { number: '4.7', from: 'executed this Equipment Subscription Agreement', to: 'executed this Subscription Agreement' },
];

/**
 * Apply the vocabulary, on word boundaries, then the clause's exceptions.
 *
 * FOR TESTS ONLY. It answers "do these two clauses say the same thing in their
 * two vocabularies?" and nothing else. It is not how the Subscription's text is
 * produced — that text is stored, because it was written by hand and cannot be
 * computed.
 */
export const applyTwinVocabulary = (text: string, number: string): string => {
  const swapped = TWIN_VOCABULARY.reduce(
    (out, [from, to]) => out.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), to),
    text,
  );

  return TWIN_VOCABULARY_EXCEPTIONS.filter((exception) => exception.number === number).reduce(
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
      number: '3.4',
      cause: 'collection',
      reason:
        'Different collection mechanisms, not different words. The Equipment Lease bills a fixed amount to the ' +
        "customer's merchant processing account and subordinates that billing to an affiliate's future receivables " +
        'purchase agreement — including suspending it while the specified percentage stands at one hundred percent. ' +
        'The Subscription invoices by email ten days before each due date, takes no automatic debit without a ' +
        'separate written authorisation the customer may withdraw, and says nothing about the FRPA at all.',
    },
    {
      number: '3.5',
      cause: 'title',
      reason:
        'The Equipment Lease conditions the use and insurance obligations on "Until title passes to you under ' +
        'Section 3.7". The Subscription has no such section and states the obligation unconditionally.',
    },
    {
      number: '3.6',
      cause: 'title',
      reason:
        'The characterisation clause, and the sharpest of the five. The Equipment Lease says the option to acquire ' +
        'for nominal consideration creates a SECURITY INTEREST rather than a true lease, and reserves the right to ' +
        'file a financing statement. The Subscription says the transaction shall be treated as a lease, and claims a ' +
        'first-lien only conditionally, if a court finds Article 2A does not govern.',
    },
    {
      number: '3.7',
      cause: 'title',
      reason:
        'The purchase option itself. The Equipment Lease offers purchase for one dollar with title passing, makes ' +
        'that the default where the customer neither chooses nor returns, and adds a discounted early buyout. The ' +
        'Subscription has none of it and its heading drops the word "Purchase".',
    },
    {
      number: '3.8',
      cause: 'title',
      reason:
        'The Equipment Lease makes the software licence perpetual as to equipment whose title passes, surviving the ' +
        'agreement. The Subscription omits that sentence, because no title ever passes. REVIEW-02 narrowed ' +
        '`el-3-8-software-licence-has-no-survival-and-the-document-has-no-survival-clause` to the Equipment Lease ' +
        'alone for exactly this reason.',
    },
  ],
};

/** The declared divergence for a clause number, or null when the twins agree. */
export const twinDivergence = (number: string): TwinDivergence | null =>
  EQUIPMENT_TWIN.divergent.find((entry) => entry.number === number) ?? null;
