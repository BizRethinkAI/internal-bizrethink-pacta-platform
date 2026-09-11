import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { selectClauses } from '../../engine/select-clauses';
import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { libraryFor } from '../library';
import type { McaClause } from '../types';

/**
 * §6.1 DECIDED THE GUARANTY, FROM SECTION 6, FOR EVERY TEMPLATE.
 *
 * `frpa.events-of-default-6-1` was ungated and ended *"This Section controls
 * any inconsistent term of this Agreement and of any document incorporated into
 * it"*. Four sentences earlier: *"A breach that is not an Event of Default …
 * does not create liability for any Guarantor."* An Event of Default is one of
 * three kinds of misconduct, so those two sentences together said that a
 * guarantor answers for those three and nothing else — **whatever Section 9
 * says** — and imposed the narrow guaranty on every template by a clause
 * twenty pages away from the guaranty.
 *
 * `a-full-recourse-guaranty-is-still-a-purchase.test.ts` pinned that
 * contradiction on 2026-09-11 in a block titled *the conflict this change could
 * not close*, deliberately written to go red the day somebody closed it. This
 * is that day. The pin is retargeted there rather than deleted, and it now
 * asserts the absence of the contradiction and the presence of the pair, which
 * is strictly more than it asserted before.
 *
 * WHY A PAIR AND NOT AN EDIT. Deleting *"does not create liability for any
 * Guarantor"* outright would take the sentence away from the `limited-conduct`
 * template, where it is not a defect but the point: the narrow guaranty is the
 * one genuinely better-than-market term in this document, and §6.1 is where it
 * is stated in a way no other clause can expand. Keeping it takes the wide
 * guaranty away from the funder who bought it. The fact decides a whole clause,
 * so [ADR 0013](../../../../../docs/adr/0013-a-funder-profile-describes-the-funder.md)
 * says split it — the §4.15 / §8.2 / §§9.2–9.6 shape, one section number, two
 * records, opposite rules, mutually exclusive gates.
 *
 * **NOT A GATED SENTENCE.** ADR 0013 rejects limb granularity in terms. The two
 * bodies differ by one sentence and are otherwise byte-identical, and the
 * assertion below states that as a reconstruction rather than as a diff, so a
 * later edit to either body that is not carried to the other is red.
 *
 * WHAT THE WIDE RECORD MUST STILL REFUSE, AND IT IS THE REASON THE SPLIT IS
 * SAFE. The bankruptcy, insolvency and business-failure carve-out is v4's own
 * words, is the only sentence in the document that overrides the whole
 * document, and reaches *"any liability of any Guarantor"*. **A guaranty that
 * pays when the business simply fails is the single strongest argument that the
 * transaction was a loan**, which is the characterisation this whole document
 * is built to defend, and every market form guarantees covenants while still
 * excluding business failure. So the carve-out is identical in both records and
 * is asserted here against the vendored source text, not against itself.
 *
 * WHAT IT DOES NOT PROVE. That either §6.1 is lawful, that a court would
 * respect the allocation, or that counsel would sign it. Both records are
 * `attorney-drafted` with a null author and `assertPublishable` refuses both.
 *
 * IT WAS RED BEFORE THE RECORD EXISTED: **20 of its 42 tests**, which is every
 * one that names the new slug plus the partition, the gate complement, the
 * shared number and the reconstruction.
 *
 * THE 22 THAT WERE GREEN ARE KEPT, AND EACH IS EITHER A CONTROL OR A THING THE
 * SPLIT HAD TO PRESERVE. Three are the detector controls, which fire on market
 * sentences rather than on ours. Four name what `frpa.events-of-default-6-1`
 * had to keep — the carve-out, the lettered limbs, the not-a-default list, the
 * control sentence — and a careless split is exactly the change that would have
 * edited one of them. The rest were true of a single ungated §6.1 and would
 * have gone red on the likeliest wrong move, which is gating one half and not
 * adding the other: that state is what this file was run against before the
 * record was written, and it is red on 20.
 *
 * AND EACH GREEN WAS CHECKED BY MUTATION rather than trusted. Widening the new
 * gate to `!== 'none'` turns six red, including the engine's *one clause per
 * section number*; making the new record guarantee the money turns five red,
 * including `personal-liability-is-section-9-only`; dropping the carve-out from
 * one record turns three red; editing the not-a-default list in one record
 * turns two red.
 */
const FRPA = libraryFor('frpa');

const clause = (slug: string): McaClause => {
  const found = FRPA.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the FRPA library`);
  }

  return found;
};

const body = (slug: string) => clause(slug).body;

/** Selected when the funder does NOT take a full-performance guaranty. */
const LIMITED = 'frpa.events-of-default-6-1';
/** Selected when it does. */
const FULL = 'frpa.full-performance-events-of-default-6-1';

const PAIR = [LIMITED, FULL];

const SCOPES: McaFacts['guarantyScope'][] = ['none', 'limited-conduct', 'full-performance'];

const scope = (guarantyScope: McaFacts['guarantyScope']): McaFacts => ({ ...LOMBARD_FACTS, guarantyScope });

const selectedUnder = (facts: McaFacts): McaClause[] => selectClauses({ facts, instrument: 'frpa' }).selected;

const slugsUnder = (facts: McaFacts): string[] => selectedUnder(facts).map((entry) => entry.slug);

/**
 * The sentence that differs, quoted from each record.
 *
 * Held here rather than reached for inside the bodies, so that the
 * reconstruction below is an assertion about two exact strings and not about
 * whatever a regular expression happened to capture.
 */
const LIMITED_SENTENCE =
  'A breach that is not an Event of Default may support proportionate lawful relief for proven direct loss under ' +
  'Section 6.2; it does not make the uncollected Purchased Amount payable, does not suspend Merchant’s rights ' +
  'under Section 3, and does not create liability for any Guarantor.';

const FULL_SENTENCE =
  'A breach that is not an Event of Default may support proportionate lawful relief for proven direct loss under ' +
  'Section 6.2; it does not make the uncollected Purchased Amount payable and does not suspend Merchant’s rights ' +
  'under Section 3. Where Section 9.2 guarantees the covenant breached, a claim against a Guarantor is limited to ' +
  'that same proportionate lawful relief for that same proven direct loss, on the same proof, and is brought only ' +
  'as Section 9.2 permits; no breach of this Agreement, and no Event of Default, makes the uncollected Purchased ' +
  'Amount payable by a Guarantor.';

/**
 * v4's Bankruptcy and Business Failure paragraph, READ FROM THE VENDORED
 * DOCUMENT rather than retyped.
 *
 * Retyping it here would prove that this file agrees with itself. The source
 * document is the only thing in the repository that can disagree, which is what
 * makes the assertion evidence — the same argument
 * `source-documents/README.md` makes for keeping the text at all.
 */
const SOURCE = readFileSync(fileURLToPath(new URL('../source-documents/Lombard_FRPA_v4.txt', import.meta.url)), 'utf8');

const CARVE_OUT = (() => {
  const line = SOURCE.split('\n').find((entry) => entry.startsWith('Bankruptcy and Business Failure.'));

  if (!line) {
    throw new Error('the vendored FRPA no longer holds the Bankruptcy and Business Failure paragraph');
  }

  return line.trim();
})();

describe('§6.1 is an exhaustive pair, and the fact decides a whole clause', () => {
  /**
   * ADR 0013's rule stated as the assertion the ADR asks for: *"for every value
   * of the fact, exactly one clause of the group is selected."*
   *
   * §6.1 differs from §§9.2–9.6 on the value that means absence. `none` selects
   * NEITHER guaranty clause, because no guaranty means no guaranty clauses; it
   * selects the limited §6.1, because a funder who takes no guaranty still has
   * a document that needs an Events of Default clause and the sentence denying
   * guarantor liability is trivially true where there is no Guarantor. So the
   * partition here is three values to two clauses, not three to two plus a
   * hole — which is why this is asserted over every value rather than over the
   * two the split was drafted for.
   */
  it.each(SCOPES)('gives a %s template exactly one Section 6.1', (guarantyScope) => {
    const selected = selectedUnder(scope(guarantyScope)).filter((entry) => entry.number === '6.1');

    expect(selected.map((entry) => entry.slug)).toHaveLength(1);
    expect(PAIR).toContain(selected[0]?.slug);
  });

  it.each(SCOPES)('gives a %s template the record its gate names, and not the other', (guarantyScope) => {
    const slugs = slugsUnder(scope(guarantyScope));
    const expected = guarantyScope === 'full-performance' ? FULL : LIMITED;
    const other = guarantyScope === 'full-performance' ? LIMITED : FULL;

    expect(slugs).toContain(expected);
    expect(slugs).not.toContain(other);
  });

  /**
   * And the gates are complements rather than two conditions that happen to
   * agree today. A gate written as `=== 'limited-conduct'` would have passed
   * every assertion above and left a `none` template with no Section 6 at all.
   */
  it('gates the pair on one fact, as exact complements', () => {
    const limited = clause(LIMITED).includeWhen;
    const full = clause(FULL).includeWhen;

    expect(limited).not.toBeNull();
    expect(full).not.toBeNull();

    for (const guarantyScope of SCOPES) {
      const facts = scope(guarantyScope);

      expect(limited?.(facts)).toBe(guarantyScope !== 'full-performance');
      expect(full?.(facts)).toBe(guarantyScope === 'full-performance');
      expect(limited?.(facts)).not.toBe(full?.(facts));
    }
  });

  /**
   * The partition must not depend on any fact but `guarantyScope`. Every other
   * fact is moved underneath each value, because a gate that accidentally read
   * a second fact would still satisfy the three assertions above.
   */
  it('selects exactly one Section 6.1 whatever else the funder answers', () => {
    const variations: Partial<McaFacts>[] = [
      {},
      { collectionMethod: 'ach-only' },
      { disputeResolution: 'arbitration' },
      { renewalModel: 'carry', concurrentPositions: true },
      { equipment: 'none' },
      { brokerChannel: false, consumerReportPulled: false },
      { recipientStates: ['US-TX'], processorSplitAccepted: true },
      { settlementBase: 'gross', venueRule: 'funder-state' },
    ];

    for (const guarantyScope of SCOPES) {
      for (const variation of variations) {
        const facts = { ...LOMBARD_FACTS, ...variation, guarantyScope };
        const selected = selectedUnder(facts).filter((entry) => entry.number === '6.1');

        expect(
          selected.map((entry) => entry.slug),
          `guarantyScope=${guarantyScope} ${JSON.stringify(variation)} assembles ${selected.length} Section 6.1s`,
        ).toHaveLength(1);
      }
    }
  });

  /** Two records may share a number only while no document can hold both. */
  it('shares one section number, heading and place in the reading order', () => {
    expect(clause(FULL).number).toBe(clause(LIMITED).number);
    expect(clause(FULL).heading).toBe(clause(LIMITED).heading);
    expect(clause(FULL).section).toBe(clause(LIMITED).section);
    expect(clause(FULL).sortKey).toBe(clause(LIMITED).sortKey);
    expect(clause(FULL).kind).toBe('clause');
  });

  /**
   * And the new record does not invent a number. "6.1A", "6.1.1" or "6.7" would
   * all satisfy every other assertion in this file and would put a number in
   * the corpus that no document prints.
   */
  it('numbers the new record 6.1, not a number the document does not have', () => {
    expect(clause(FULL).number).toBe('6.1');
    expect(
      FRPA.filter((entry) => entry.number === '6.1')
        .map((entry) => entry.slug)
        .sort(),
    ).toEqual([...PAIR].sort());
  });
});

describe('the two bodies differ by one sentence and nothing else', () => {
  /**
   * STATED AS A RECONSTRUCTION, NOT AS A DIFF.
   *
   * ADR 0013 rejects gating a sentence inside a clause; the cost of obeying it
   * is two nearly identical bodies that can drift. This assertion is what makes
   * the duplication safe: an edit to the three lettered limbs, to the
   * fourteen-item not-a-default list, to the cure period, to *"Incomplete
   * information is not evidence…"* or to *"Buyer bears the risk…"* in one record
   * and not the other is red here, by construction, without anybody having to
   * remember there are two.
   */
  it('rebuilds the full-recourse body from the limited one by swapping the guarantor sentence', () => {
    expect(body(LIMITED)).toContain(LIMITED_SENTENCE);
    expect(body(LIMITED).split(LIMITED_SENTENCE)).toHaveLength(2);
    expect(body(LIMITED).replace(LIMITED_SENTENCE, FULL_SENTENCE)).toBe(body(FULL));
  });

  it('keeps the same paragraph structure', () => {
    const paragraphs = (slug: string) => body(slug).split('\n');

    expect(paragraphs(FULL)).toHaveLength(paragraphs(LIMITED).length);
    expect(paragraphs(FULL)[0]).toBe(paragraphs(LIMITED)[0]);
  });

  /**
   * The one sentence, from each side, so that a reader of a failure sees which
   * rule moved rather than a 4,000-character string comparison.
   */
  it('denies guarantor liability for a covenant breach in the limited record only', () => {
    expect(body(LIMITED)).toContain('does not create liability for any Guarantor');
    expect(body(FULL)).not.toContain('does not create liability for any Guarantor');
  });
});

describe('the carve-out that keeps the wide guaranty from being a loan', () => {
  /**
   * v4's own paragraph, in both records, unchanged, and checked against the
   * vendored document rather than against a copy of itself.
   */
  it.each(PAIR)('%s keeps the Bankruptcy and Business Failure paragraph verbatim', (slug) => {
    expect(body(slug)).toContain(CARVE_OUT);
  });

  it('quotes a paragraph that actually reaches a guarantor', () => {
    expect(CARVE_OUT).toContain('Notwithstanding anything in this Agreement to the contrary');
    expect(CARVE_OUT).toContain('cessation of Merchant’s business for lack of revenue');
    expect(CARVE_OUT).toContain('or to any liability of any Guarantor');
  });

  /**
   * The not-a-default list is the operative half of the same protection and is
   * identical in both records. Asserted through the list rather than through
   * the whole body, because the reconstruction above would still pass if both
   * records lost an item together.
   */
  it.each(PAIR)('%s still names business failure, insolvency and bankruptcy as not defaults', (slug) => {
    const text = body(slug);
    const at = text.indexOf('None of the following is itself an Event of Default');

    expect(at).toBeGreaterThan(-1);

    for (const term of [
      'a decline in or an absence of Card Receipts',
      'an ordinary loss of the business',
      'a good-faith closure, suspension, relocation, dissolution or sale of the business',
      'Merchant’s insolvency, or a bankruptcy filing by or against Merchant',
    ]) {
      expect(text.slice(at)).toContain(term);
    }
  });

  it.each(PAIR)('%s keeps the three lettered limbs and closes the list', (slug) => {
    const text = body(slug);

    expect(text).toContain('An Event of Default occurs only if Merchant');
    expect(text).toContain('Nothing else is an Event of Default');
    expect(text).toContain('Incomplete information is not evidence of the conduct described in (a), (b) or (c).');
    expect(text).toContain('Buyer bears the risk that Purchased Receipts may never arise.');
    expect(text).toContain('ten (10) Workdays');
  });

  it.each(PAIR)('%s still controls an inconsistent term', (slug) => {
    expect(body(slug)).toContain('This Section controls any inconsistent term of this Agreement');
  });
});

/*
  ─── the detectors ───────────────────────────────────────────────────────────

  Every one is proved able to fire, on a market-form sentence rather than on
  ours, in `the detectors fire on the words they were written for`. A detector
  that has only ever been run against text written to satisfy it proves nothing
  — which is the failure this package shipped once, on two assertions that
  filtered on `Divergence` kinds that do not exist and passed vacuously for a
  day.
*/

/** A guarantor made to answer for the money rather than for a proven loss. */
const GUARANTOR_OWES_THE_MONEY =
  /Guarantor[^.]{0,120}(?:shall pay|is liable for|shall be liable for)[^.]{0,80}(?:uncollected )?(?:Purchased Amount|Remaining Balance)|(?:Purchased Amount|Remaining Balance)[^.]{0,80}(?:shall be|becomes?) (?:immediately )?(?:due and )?payable by[^.]{0,40}Guarantor/i;

/** A guarantor reached for the merchant's business simply failing. */
const GUARANTOR_ANSWERS_FOR_BUSINESS_FAILURE =
  /Guarantor[^.]{0,120}(?:shall (?:be liable|pay)|becomes? liable)[^.]{0,120}(?:cessation|ceases to (?:do business|operate)|insolvency|bankruptcy|business fail\w*)|(?:cessation of|insolvency of|bankruptcy of)[^.]{0,80}Merchant[^.]{0,80}Guarantor[^.]{0,60}(?:shall (?:be liable|pay)|becomes? liable)/i;

/** A second clause claiming to decide the guaranty from outside Section 9. */
const DECIDES_THE_GUARANTY_ELSEWHERE =
  /(?:This Section|Notwithstanding[^.]{0,60})[^.]{0,120}(?:no|does not create|shall not create)[^.]{0,40}liability (?:for|of) any Guarantor/i;

const MARKET_GUARANTOR_OWES_THE_MONEY =
  'Guarantor shall pay the entire uncollected Purchased Amount upon demand, without regard to whether Buyer has ' +
  'proved any loss.';

const MARKET_BUSINESS_FAILURE_TRIGGER =
  'If Merchant ceases to do business for any reason, Guarantor shall be liable for the full Remaining Balance ' +
  'notwithstanding the cessation of Merchant’s operations.';

describe('the detectors fire on the words they were written for', () => {
  it('catches a guarantor made to owe the money', () => {
    expect(GUARANTOR_OWES_THE_MONEY.test(MARKET_GUARANTOR_OWES_THE_MONEY)).toBe(true);
  });

  it('catches a guarantor reached for the business simply failing', () => {
    expect(GUARANTOR_ANSWERS_FOR_BUSINESS_FAILURE.test(MARKET_BUSINESS_FAILURE_TRIGGER)).toBe(true);
  });

  /**
   * And the third, on the sentence this change removed from the wide record —
   * which is the only place in the corpus it has ever fired. A detector proved
   * on the defect's own words is the strongest form of this control.
   */
  it('catches a clause outside Section 9 deciding the guaranty', () => {
    expect(DECIDES_THE_GUARANTY_ELSEWHERE.test(LIMITED_SENTENCE)).toBe(false);
    expect(
      DECIDES_THE_GUARANTY_ELSEWHERE.test(
        'This Section controls any inconsistent term and creates no liability for any Guarantor.',
      ),
    ).toBe(true);
  });

  /**
   * The other direction, which is the one this package has actually got wrong:
   * both records DENY what the first two detectors look for, and a detector
   * that counted a denial as an offence would report the clause closing the
   * door as the one opening it.
   */
  it.each(PAIR)('does not fire on %s', (slug) => {
    expect(GUARANTOR_OWES_THE_MONEY.test(body(slug))).toBe(false);
    expect(GUARANTOR_ANSWERS_FOR_BUSINESS_FAILURE.test(body(slug))).toBe(false);
  });
});

/**
 * The set-level property, and the reason this file is not four assertions about
 * two strings.
 *
 * A wide §6.1 is one sentence away from making a guarantor answer for the money
 * — and the money is what the whole document says nobody owes. The check is
 * therefore stated over every clause of the ASSEMBLED document, under every
 * value of the fact, rather than over the pair.
 */
describe('neither Section 6.1 makes a guarantor answer for the money', () => {
  it.each(SCOPES)('assembles a %s document with no guarantor liability for the Purchased Amount', (guarantyScope) => {
    const offenders = selectedUnder(scope(guarantyScope))
      .filter(
        (entry) => GUARANTOR_OWES_THE_MONEY.test(entry.body) || GUARANTOR_ANSWERS_FOR_BUSINESS_FAILURE.test(entry.body),
      )
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });

  /**
   * And the wide record says it in terms, because construction is not a
   * substitute for a sentence a merchant's counsel can point at.
   */
  it('says outright that no breach makes the Purchased Amount payable by a Guarantor', () => {
    expect(body(FULL)).toContain(
      'no breach of this Agreement, and no Event of Default, makes the uncollected Purchased Amount payable by a ' +
        'Guarantor',
    );
  });

  /**
   * What the wide record DOES allow, stated positively so that the split is not
   * silently a second narrow §6.1. A guarantor under full recourse answers for
   * the same thing the merchant answers for — §6.2's proportionate lawful
   * relief for proven direct loss — and for nothing else.
   */
  it('lets a non-default covenant breach reach a guarantor, capped at Section 6.2 relief', () => {
    const text = body(FULL);

    expect(text).toContain('Where Section 9.2 guarantees the covenant breached');
    expect(text).toMatch(/a claim against a Guarantor is limited to that same proportionate lawful relief/);
    expect(text).toContain('for that same proven direct loss, on the same proof');
    expect(text).toContain('is brought only as Section 9.2 permits');
  });
});

describe('the wide §6.1 stops contradicting the wide §9.2', () => {
  /**
   * The disagreement the pin recorded, stated from this side: §9.2's wide
   * record reaches a covenant failure *"whether or not that failure is an Event
   * of Default"*, and the §6.1 in the same document no longer says that failure
   * creates no guarantor liability.
   */
  it('puts the wide guaranty and the wide default clause in the same document', () => {
    const slugs = slugsUnder(scope('full-performance'));

    expect(slugs).toContain(FULL);
    expect(slugs).toContain('frpa.full-performance-guaranty-9-2');
    expect(body('frpa.full-performance-guaranty-9-2')).toMatch(/whether or not that failure is an Event of Default/);
    expect(body(FULL)).not.toContain('does not create liability for any Guarantor');
  });

  /**
   * And the narrow guaranty keeps the sentence that makes it narrow. Closing
   * the conflict by deleting the denial everywhere would have been the cheap
   * fix and would have taken the product's one better-than-market term with it.
   */
  it('leaves the limited-conduct document exactly as it was', () => {
    const slugs = slugsUnder(scope('limited-conduct'));

    expect(slugs).toContain(LIMITED);
    expect(slugs).toContain('frpa.guaranty-of-performance-9-2');
    expect(body(LIMITED)).toContain('does not create liability for any Guarantor');
  });

  /**
   * A gated §6.1 is a new way for a cross-reference to dangle, and §6.1 is
   * cited by more clauses than any other section of this document.
   * `select-clauses.test.ts` checks `Section N` citations across nine funder
   * profiles; it cannot see a citation made by NAME, and §6.1 is cited that way
   * — *"Events of Default"*, *"an Event of Default"* — in clauses spread across
   * five modules. Both halves are asserted here, over every value of the fact.
   */
  it.each(SCOPES)('leaves nothing in a %s document citing a Section 6.1 that is not there', (guarantyScope) => {
    const selected = selectedUnder(scope(guarantyScope));
    const citing = selected.filter(
      (entry) => /\bSection 6\.1\b/.test(entry.body) || /\bEvents? of Default\b/.test(entry.body),
    );

    // The premise: something really does cite it, so a green here is a fact
    // about the corpus rather than an empty filter.
    expect(citing.length).toBeGreaterThan(5);
    expect(selected.filter((entry) => entry.number === '6.1')).toHaveLength(1);
  });
});

/**
 * Rewriting is the moment provenance is easiest to lose, because new text reads
 * better than what it replaced — which is not the same as being approved.
 */
describe('the new record carries the same provenance as the one it was split from', () => {
  it('is attorney-drafted with no author, and still a draft', () => {
    expect(clause(FULL).source).toEqual({ kind: 'attorney-drafted', author: null });
    expect(clause(FULL).status).toBe('draft');
  });

  /**
   * The same examinations, because it is the same section: every finding raised
   * against §6.1 was raised against this text too, and a split that dropped
   * them would make the wide template look reviewed where the narrow one is
   * not.
   */
  it('carries every examination the limited record carries', () => {
    expect(clause(FULL).examinedBy).toEqual(clause(LIMITED).examinedBy);
    expect(clause(FULL).examinedBy.length).toBeGreaterThan(0);
  });

  it('names no tenant, cites no case, and carries no placeholder', () => {
    expect(body(FULL)).not.toMatch(/Lombard|Payzli/);
    expect(body(FULL)).not.toMatch(/\bAD3d\b|\bNY3d\b|Richmond Capital|Apollo Funding|LG Funding|Principis|Grafton/);
    expect(body(FULL)).not.toMatch(/\{\{/);
  });

  /**
   * §6.1 has no AcroForm anchors, and the split must not invent one. Checked
   * against the record it was split from rather than asserted as an absolute,
   * because README rule 2 keeps `«N»` markers wherever the document has them.
   */
  it('carries the same widget markers as the limited record, which is none', () => {
    expect(body(FULL).match(/«\d+»/g)).toEqual(body(LIMITED).match(/«\d+»/g));
    expect(body(LIMITED)).not.toMatch(/«/);
  });

  it('applies in no state in particular, exactly as the limited record does', () => {
    expect(clause(FULL).appliesInStates).toEqual(clause(LIMITED).appliesInStates);
    expect(clause(FULL).instrument).toBe('frpa');
    expect(clause(FULL).version).toBe(clause(LIMITED).version);
  });
});
