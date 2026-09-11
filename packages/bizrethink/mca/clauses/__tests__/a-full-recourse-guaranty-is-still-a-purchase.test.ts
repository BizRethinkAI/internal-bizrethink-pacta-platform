import { describe, expect, it } from 'vitest';

import { selectClauses } from '../../engine/select-clauses';
import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { libraryFor } from '../library';
import type { McaClause } from '../types';

/**
 * THE WIDE GUARANTY IS A PRODUCT DECISION. IT IS NOT A LICENCE TO MAKE THE DEAL
 * A LOAN.
 *
 * `guarantyScope: 'full-performance'` was a declared value with no clause behind
 * it until 2026-09-11. ADR 0013 named the gap, `every-fact-value-is-reachable`
 * measured it, and `personal-liability-is-section-9-only` pinned its visible
 * symptom: that profile assembled `frpa.guarantor-information-9-1` — a grid
 * asking a natural person for a Social Security number — plus §§10.2 and 10.4,
 * two service waivers, **with no guaranty between them.**
 *
 * The owner closed it on 2026-09-11: the guaranty covers every representation,
 * warranty and covenant, which is what all three MCA forms filed as SEC exhibits
 * in 2024-2026 do.
 *
 * WHY THIS FILE STATES ITS PROPERTY OVER THE SET. Because the thing that can go
 * wrong is not in any one clause. A guaranty of "every covenant" is one sentence
 * away from a guaranty of the money, and the money is what the whole document
 * says nobody owes: §2.1 says this is a purchase and not a loan, §6.1 says
 * Buyer bears the risk that Purchased Receipts may never arise, §6.2 says the
 * uncollected Purchased Amount is not automatically due. **Those three are
 * ungated and are in the full-performance document too.** A guaranty that
 * reaches the Purchased Amount, or that triggers on Merchant's insolvency,
 * contradicts all three and recharacterises the transaction — not in Section 9,
 * which is where a reader would look, but across the product.
 *
 * So the property is: *an assembled full-performance document contains a
 * guaranty, and still contains a purchase.* A clause-by-clause reading of §9.2
 * cannot see the second half.
 *
 * WHAT IT DOES NOT PROVE. That the wide guaranty is lawful, that a court would
 * decline to recharacterise anyway, or that counsel would sign it. Every record
 * named here is `attorney-drafted` with a null author and `assertPublishable`
 * refuses all of them.
 *
 * IT WAS RED BEFORE THE BODIES EXISTED: **51 of its 62 assertions**, including
 * every one that names a `full-performance` slug and all four halves of the
 * partition, which found zero clauses where each demanded one.
 *
 * THE ELEVEN THAT WERE GREEN ON THE FIRST RUN ARE KEPT AND EACH IS EVIDENCE.
 * Four are the detector controls, which fire on market and v4 sentences rather
 * than on ours. Four say the wide records must not leak into a `none` document —
 * true before the records existed and the first thing a wrong gate would break.
 * Three name what the change had to PRESERVE: §2.1's denial that Buyer holds an
 * arrangement paying it when receipts fall, §6.1's allocation of that risk, and
 * §6.2's refusal to make the uncollected Purchased Amount due. A careless wide
 * guaranty is exactly the change that would have edited one of those.
 *
 * Every assertion here was additionally checked by mutation — widening the gate,
 * guaranteeing the money, triggering on insolvency, reinstating after a
 * clawback, dropping the non-signatory limb, genericising the acknowledgement,
 * and fixing §6.1 — and each mutation turned this file red.
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

const LIMITED = {
  guaranty: 'frpa.guaranty-of-performance-9-2',
  waivers: 'frpa.guarantor-waivers-9-4',
  joint: 'frpa.joint-and-several-liability-9-5',
  acknowledgement: 'frpa.guarantor-acknowledgement-9-6',
};

const FULL = {
  guaranty: 'frpa.full-performance-guaranty-9-2',
  waivers: 'frpa.full-performance-guarantor-waivers-9-4',
  joint: 'frpa.full-performance-joint-and-several-liability-9-5',
  acknowledgement: 'frpa.full-performance-guarantor-acknowledgement-9-6',
};

/** The four pairs, each sharing a section number. */
const PAIRS = (['guaranty', 'waivers', 'joint', 'acknowledgement'] as const).map((key) => ({
  key,
  limited: LIMITED[key],
  full: FULL[key],
}));

const MINE = Object.values(FULL);

const scope = (guarantyScope: McaFacts['guarantyScope']): McaFacts => ({ ...LOMBARD_FACTS, guarantyScope });

const selected = (guarantyScope: McaFacts['guarantyScope']): McaClause[] =>
  selectClauses({ facts: scope(guarantyScope), instrument: 'frpa' }).selected;

const slugsUnder = (guarantyScope: McaFacts['guarantyScope']): string[] =>
  selected(guarantyScope).map((entry) => entry.slug);

describe('the wide guaranty is four records, and they partition', () => {
  /**
   * ADR 0013's rule, stated as the assertion the ADR asks for: *"for every
   * value of the fact, exactly one clause of the group is selected."*
   *
   * `none` selects neither, which is the `renewalModel: 'none'` shape and is
   * what the value means — no guaranty, no guaranty clauses. It is asserted
   * separately rather than folded in, so that a record leaking into a
   * no-guaranty document is red rather than counted as "not exactly one".
   */
  it.each(PAIRS)('$key is one clause under limited-conduct and one under full-performance', ({ limited, full }) => {
    const underLimited = slugsUnder('limited-conduct');
    const underFull = slugsUnder('full-performance');

    expect(underLimited).toContain(limited);
    expect(underLimited).not.toContain(full);
    expect(underFull).toContain(full);
    expect(underFull).not.toContain(limited);
  });

  it.each(PAIRS)('$key selects neither record when the funder takes no guaranty', ({ limited, full }) => {
    const underNone = slugsUnder('none');

    expect(underNone).not.toContain(limited);
    expect(underNone).not.toContain(full);
  });

  /** Two records may share a number only while no document can hold both. */
  it.each(PAIRS)('$key shares one section number between the two records', ({ limited, full }) => {
    expect(clause(full).number).toBe(clause(limited).number);
    expect(clause(full).section).toBe('guaranty');
  });

  /**
   * The symptom ADR 0013 named, closed: Section 9 of a full-performance
   * document is no longer an identity grid and two service waivers.
   */
  it('gives a full-performance funder a Section 9 with a guaranty in it', () => {
    const section = selected('full-performance').filter((entry) => entry.section === 'guaranty');

    expect(section.map((entry) => entry.slug)).toContain('frpa.guarantor-information-9-1');
    expect(section.map((entry) => entry.slug)).toContain(FULL.guaranty);
    expect(section.filter((entry) => entry.kind === 'clause')).toHaveLength(4);
  });
});

/*
  ─── the detectors ───────────────────────────────────────────────────────────

  Each is proved able to fire, on the sentence of a market form or of v4 it was
  written to catch, in `the detectors fire on the words they were written for`.
  A detector that has only ever been run against text edited to satisfy it
  proves nothing — which is the failure this package shipped once, on two
  assertions that filtered on `Divergence` kinds that do not exist.
*/

/** A guaranty of the money, rather than of performance. */
const GUARANTEES_THE_MONEY =
  /guarantees?[^.]{0,120}(?:payment|repayment) (?:in full )?of[^.]{0,60}(?:Purchased Amount|Remaining Balance)|absolute[^.]{0,40}unconditional guarant\w+ of payment|guarant\w+[^.]{0,60}\bthat Buyer (?:will|shall) receive the Purchased Amount/i;

/** A guaranty triggered by the merchant's insolvency or bankruptcy. */
const TRIGGERS_ON_INSOLVENCY =
  /(?:upon|on|in the event of)[^.]{0,60}(?:bankruptcy|insolvency|assignment for the benefit of creditors)[^.]{0,80}Guarantor[^.]{0,60}(?:shall (?:be liable|pay)|becomes? liable|liability)|Guarantor[^.]{0,60}(?:shall (?:be liable|pay)|becomes? liable)[^.]{0,80}(?:bankruptcy|insolvency)/i;

/** The clawback reinstatement REVIEW-02 found in v4's §9.4. */
const REINSTATES_ON_CLAWBACK =
  /(?:obligations|liability)[^.]{0,80}(?:shall|will) (?:include that amount|be reinstated|revive)|guaranty[^.]{0,60}(?:is|shall be) reinstated/i;

/** A guaranty extended to a later deal the guarantor never signed for. */
const EXPANDS_WITHOUT_CONSENT =
  /without (?:releasing|notice to|the consent of)[^.]{0,40}Guarantor|Guarantor[^.]{0,60}(?:consents? to|shall be bound by)[^.]{0,60}(?:any|each) (?:future|subsequent|later) (?:renewal|amendment|modification|transaction)/i;

const MARKET_GUARANTY_OF_PAYMENT =
  'Guarantor absolutely and unconditionally guarantees to Buyer the payment in full of the Purchased Amount and ' +
  'all other sums due under this Agreement.';

const MARKET_INSOLVENCY_TRIGGER =
  'Upon the bankruptcy or insolvency of Merchant, Guarantor shall be liable for the entire uncollected balance ' +
  'of the Purchased Amount without demand or notice.';

const V4_NINE_FOUR_CLAWBACK =
  'In the event that Buyer must return any amount paid by Merchant or any other guarantor because that person ' +
  'has become subject to a proceeding under the United States Bankruptcy Code or any similar law, Guarantor’s ' +
  'obligations under this Guaranty shall include that amount.';

const V4_NINE_FOUR_EXPANSION =
  'In addition, Buyer may take any of the following actions without releasing Guarantor: (i) renew, extend, or ' +
  'otherwise modify this Agreement.';

describe('the detectors fire on the words they were written for', () => {
  it('catches a guaranty of the money and an insolvency trigger', () => {
    expect(GUARANTEES_THE_MONEY.test(MARKET_GUARANTY_OF_PAYMENT)).toBe(true);
    expect(TRIGGERS_ON_INSOLVENCY.test(MARKET_INSOLVENCY_TRIGGER)).toBe(true);
  });

  it('catches the clawback reinstatement and the automatic expansion', () => {
    expect(REINSTATES_ON_CLAWBACK.test(V4_NINE_FOUR_CLAWBACK)).toBe(true);
    expect(EXPANDS_WITHOUT_CONSENT.test(V4_NINE_FOUR_EXPANSION)).toBe(true);
  });

  /**
   * And the other direction, which is the one this package has actually got
   * wrong. Four of the new sentences DENY what these detectors look for, and a
   * detector that counted a denial as an offence would report the clauses that
   * close these doors as the ones that open them.
   */
  it.each([
    ['the wide guaranty’s own denial of a money guaranty', FULL.guaranty, GUARANTEES_THE_MONEY],
    ['the wide guaranty’s insolvency carve-out', FULL.guaranty, TRIGGERS_ON_INSOLVENCY],
    ['the wide waivers clause’s no-reinstatement rule', FULL.waivers, REINSTATES_ON_CLAWBACK],
    ['the wide waivers clause’s consent requirement', FULL.waivers, EXPANDS_WITHOUT_CONSENT],
  ])('does not fire on %s', (_label, slug, pattern) => {
    expect(pattern.test(body(slug))).toBe(false);
  });
});

/**
 * The set-level property, and the reason this file exists.
 *
 * Stated over every clause of the ASSEMBLED full-performance document, not over
 * the four new ones, because the defect would be a guaranty that is wide in
 * Section 9 and a purchase everywhere else — the mirror image of the defect
 * `personal-liability-is-section-9-only` was written for, and equally invisible
 * to a per-clause reading.
 */
describe('a full-performance document is still a purchase', () => {
  it('contains no guaranty of the Purchased Amount and no insolvency trigger, anywhere', () => {
    const offenders = selected('full-performance')
      .filter((entry) => GUARANTEES_THE_MONEY.test(entry.body) || TRIGGERS_ON_INSOLVENCY.test(entry.body))
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });

  /**
   * The three ungated sentences the guaranty must not contradict. Each is in
   * the full-performance document, and each says the opposite of what a
   * recourse obligation would say.
   *
   * GREEN ON THE FIRST RUN, DELIBERATELY KEPT. They name what the change had to
   * preserve, so each could have gone red — a wide guaranty drafted carelessly
   * is exactly the change that would have edited one of them.
   *
   * **TWO OF THE THREE ARE STILL UNGATED AND ONE IS NOT.** §6.1 became an
   * exhaustive pair on 2026-09-11 — see the block at the end of this file — so
   * the clause carrying the risk allocation in a wide document is
   * `frpa.full-performance-events-of-default-6-1`. The row is retargeted at the
   * record that is actually assembled rather than left pointing at the one this
   * document no longer contains, and the assertion below it checks that BOTH
   * halves of the pair carry the sentence, which is more than this row asked
   * for when §6.1 was one record.
   */
  it.each([
    [
      'frpa.sales-of-receipts-not-a-loan-2-1',
      /holds no insurance, guaranty, indemnity or other arrangement that would pay Buyer/,
    ],
    ['frpa.full-performance-events-of-default-6-1', /Buyer bears the risk that Purchased Receipts may never arise/],
    ['frpa.remedies-6-2', /uncollected Purchased Amount is not automatically due/],
  ])('%s still says so, and is in the document', (slug, pattern) => {
    expect(slugsUnder('full-performance')).toContain(slug);
    expect(body(slug)).toMatch(pattern);
  });

  /** And the other half of the pair says it too, so a narrow document is no worse. */
  it('allocates the same risk in the limited-conduct document', () => {
    expect(slugsUnder('limited-conduct')).toContain('frpa.events-of-default-6-1');
    expect(body('frpa.events-of-default-6-1')).toMatch(/Buyer bears the risk that Purchased Receipts may never arise/);
  });

  /**
   * §9.2 is the only guaranty under either value, and the wide one says so in
   * the same words as the narrow one. An indemnity, a cost clause or a
   * signature recital that expands it is how four routes around the narrow
   * guaranty came to exist in the first place.
   */
  it.each([LIMITED.guaranty, FULL.guaranty])('%s shuts the door on every other clause', (slug) => {
    expect(body(slug)).toMatch(/No other clause or incorporated document expands this Guaranty/);
  });
});

describe('the wide guaranty guarantees performance, and says what it does not', () => {
  it('reaches every representation, warranty and covenant', () => {
    const text = body(FULL.guaranty);

    expect(text).toMatch(/every representation, warranty and covenant/);
    expect(text).toMatch(/Guaranteed Obligations/);
  });

  /**
   * The distinguishing sentence. The narrow guaranty requires conduct the
   * Guarantor "personally committed or knowingly directed"; the wide one does
   * not, and a reader has to be able to see that it does not.
   */
  it('does not require the guarantor’s own conduct, and says so', () => {
    const text = body(FULL.guaranty);

    expect(text).toMatch(/is not limited to conduct the Guarantor personally committed or directed/i);
    expect(body(LIMITED.guaranty)).toMatch(/personally committed or knowingly directed/);
  });

  /**
   * What survives from the narrow guaranty, and it is what keeps the deal a
   * purchase: the money, the receipts and the business are not guaranteed, and
   * insolvency, a bankruptcy filing, a good-faith failure and a clawback create
   * no liability. That is not a softening of the owner's decision — it is what
   * the market forms themselves do, and what §6.1 requires of every template.
   */
  it.each([
    ['the Purchased Amount', /not a guaranty of the Purchased Amount/],
    ['future receipts', /future receipts/],
    ['business performance', /business performance/],
    ['insufficient receipts', /[Ii]nsufficient receipts/],
    ['a good-faith failure', /good-faith closure or failure/],
    ['insolvency', /insolvency/],
    ['a bankruptcy filing', /bankruptcy filing by or against Merchant/],
    ['avoidance or clawback', /avoidance or clawback/],
  ])('says %s is outside it', (_label, pattern) => {
    expect(body(FULL.guaranty)).toMatch(pattern);
  });

  it('still puts the burden of proving loss on Buyer', () => {
    const text = body(FULL.guaranty);

    expect(text).toMatch(/Buyer bears the burden/);
    expect(text).toMatch(/causation/);
    expect(text).toMatch(/credit every recovery/);
  });
});

describe('the wide waivers clause keeps the fixes that are not about scope', () => {
  const text = () => body(FULL.waivers);

  it('does not reinstate the guaranty after a clawback', () => {
    expect(text()).toMatch(/does not enlarge or reinstate/);
  });

  it('binds no guarantor to a deal that guarantor did not consent to', () => {
    expect(text()).toMatch(/separate written consent/);
    expect(text()).toMatch(/No future transaction is covered without a fresh signed consent/);
  });

  it('postpones subrogation rather than abolishing it', () => {
    expect(text()).toMatch(/postponed/);
    expect(text()).toMatch(/they are not waived/);
  });

  it('keeps the defences a guarantor may not be asked to give up', () => {
    expect(text()).toMatch(/retains its defences/);
    expect(text()).toMatch(/all rights that may not be waived/);
  });
});

describe('the wide joint-liability clause cannot bind somebody who never signed', () => {
  it('makes each signer liable for the whole, and lets Buyer recover once', () => {
    const text = body(FULL.joint);

    expect(text).toMatch(/jointly and severally liable/);
    expect(text).toMatch(/only once/);
  });

  /**
   * REVIEW-02's `frpa-9-5-refers-to-guarantors-the-form-cannot-collect` is
   * carried on both records of this pair, and the half that is about the words
   * rather than the form is answered the same way under either scope: a person
   * the document never identified and who never signed is not a Guarantor.
   */
  it('reaches nobody who is not identified under Section 9.1 and has not signed', () => {
    const text = body(FULL.joint);

    expect(text).toContain('Section 9.1');
    expect(text).toMatch(/is not a Guarantor/);
  });
});

describe('the wide acknowledgement tells the signer which guaranty they signed', () => {
  /**
   * §9.6's whole value is that it names the liability. Under the narrow scope it
   * says "limited personal or entity liability for specified conduct"; under the
   * wide one that sentence would be false, which is the reason these four are a
   * pair rather than one widened gate.
   */
  it('describes the wide guaranty, not the narrow one', () => {
    const text = body(FULL.acknowledgement);

    expect(text).toContain('Section 9.2');
    expect(text).toMatch(/every representation, warranty and covenant/);
    expect(text).not.toMatch(/limited personal or entity liability/);
    expect(body(LIMITED.acknowledgement)).toMatch(/limited personal or entity liability/);
  });

  it('still permits a signer to decline counsel, and adds no estoppel', () => {
    const text = body(FULL.acknowledgement);

    expect(text).toMatch(/may choose not to consult/);
    expect(text).toMatch(/does not expand liability/);
  });
});

/**
 * THE ONE SENTENCE THAT NULLIFIED ALL FOUR — AND THIS BLOCK IS THE PIN
 * RETARGETED, NOT DELETED.
 *
 * WHAT IT SAID, AND WHY IT WAS WRITTEN TO FAIL. `frpa.events-of-default-6-1`
 * was ungated, so it was in the full-performance document, and it ended *"This
 * Section controls any inconsistent term of this Agreement and of any document
 * incorporated into it"*. Earlier in the same clause: *"A breach that is not an
 * Event of Default … does not create liability for any Guarantor."* An Event of
 * Default is one of three kinds of misconduct, so §6.1 said a guarantor answers
 * for nothing but those three, whatever Section 9 says — the narrow guaranty,
 * imposed on every template by a clause in Section 6, with the wide guaranty
 * reduced to text the document then overrode.
 *
 * §6.1 was not this change's clause, so the conflict was asserted with both
 * halves quoted **so that it would fail the day somebody closed it and forgot
 * to delete this** — the `KNOWN_GAPS` discipline, which exists because a
 * tolerated defect that has quietly been fixed is a line of a test that can no
 * longer be red.
 *
 * **CLOSED 2026-09-11.** §6.1 is now an exhaustive pair on the same fact these
 * four records gate on: `frpa.events-of-default-6-1` keeps the denial and is
 * selected when `guarantyScope !== 'full-performance'`;
 * `frpa.full-performance-events-of-default-6-1` replaces that one sentence with
 * a guarantor claim capped at §6.2's proportionate lawful relief for proven
 * direct loss, routed through §9.2, and expressly never the uncollected
 * Purchased Amount. The bankruptcy / insolvency / business-failure carve-out is
 * unchanged in both.
 *
 * WHY THE RETARGET IS STRICTER RATHER THAN WEAKER. The old block asserted a
 * defect in ONE named clause. This one asserts, over the whole assembled
 * document, that **no** clause of a full-performance template denies guarantor
 * liability for a covenant breach; that the pair partitions, so neither
 * document has two §6.1s or none; and that the `limited-conduct` document still
 * carries the denial, which the old block never checked and which is the thing
 * a careless fix would have destroyed. The full property over the set lives in
 * `one-section-6-1-per-document.test.ts`; what stays here is the half that is
 * about these four records.
 */
/**
 * The one clause that still carries the sentence, named with an owner and a
 * reason rather than filtered out silently.
 *
 * **FOUND BY THE SET-LEVEL ASSERTION BELOW, NOT BY READING ANYTHING.** The
 * retargeted pin was written to check §6.1 and reported §6.4 on its first run.
 *
 * It is not the same defect. §6.1's denial was joined to *"This Section
 * controls any inconsistent term of this Agreement"*, so it decided the whole
 * guaranty from Section 6; §6.4's applies to *"a notice under this Section"*
 * and to nothing else, and §9.2 forbids a clause that EXPANDS the Guaranty, not
 * one that narrows it. What it does mean is that a wide template guarantees
 * every covenant except §6.4's notice covenant, and nobody decided that.
 *
 * **Reported, not fixed: §6.4 is a different record answering a different
 * question, and editing it to quiet this check is how a change's blast radius
 * grows.** The entry stays reachable — the assertion fails if it stops matching
 * — for the reason `select-clauses.test.ts` gives about `KNOWN_GAPS`.
 */
const STILL_DENIES: Record<string, string> = {
  'frpa.required-notifications-6-4':
    'DEFAULT CLUSTER. “A failure or delay in giving a notice under this Section … does not create liability for ' +
    'any Guarantor.” Ungated, so it is in the wide document, where it carves §6.4’s own notice covenant out of a ' +
    'guaranty of every covenant. Narrower than §6.1’s was and not joined to a control clause, so it is an ' +
    'unratified carve-out rather than a contradiction — but it is still an owner decision nobody has taken.',
};

describe('the conflict this change could not close, and the change that did', () => {
  it('lets no clause of a wide document deny guarantor liability for a covenant breach', () => {
    const deniers = selected('full-performance')
      .filter((entry) => entry.body.includes('does not create liability for any Guarantor'))
      .map((entry) => entry.slug)
      .filter((slug) => STILL_DENIES[slug] === undefined)
      .sort();

    expect(deniers).toEqual([]);
    expect(slugsUnder('full-performance')).not.toContain('frpa.events-of-default-6-1');
  });

  /** The concession cannot go write-only, and it cannot be a slug that does not exist. */
  it('concedes only clauses that are really in the wide document and really say it', () => {
    for (const [slug, reason] of Object.entries(STILL_DENIES)) {
      const entry = selected('full-performance').find((candidate) => candidate.slug === slug);

      expect(entry, `${slug} is not in the full-performance document; delete its concession`).toBeDefined();
      expect(entry?.body).toContain('does not create liability for any Guarantor');
      expect(reason.length).toBeGreaterThan(40);
    }
  });

  it('gives the wide document a §6.1 of its own, and only one', () => {
    const sixOne = selected('full-performance').filter((entry) => entry.number === '6.1');

    expect(sixOne.map((entry) => entry.slug)).toEqual(['frpa.full-performance-events-of-default-6-1']);
    expect(body('frpa.full-performance-events-of-default-6-1')).toContain(
      'This Section controls any inconsistent term of this Agreement',
    );
  });

  /** And the wide guaranty really does say the thing the old §6.1 contradicted. */
  it('§9.2’s wide record reaches a covenant breach that is not an Event of Default', () => {
    expect(body(FULL.guaranty)).toMatch(/whether or not that failure is an Event of Default/);
  });

  /**
   * The half the old pin did not have. Closing the conflict by deleting the
   * denial outright would have gone green here and taken the one genuinely
   * better-than-market term out of the narrow product.
   */
  it('leaves the narrow document’s §6.1 denying it, exactly as before', () => {
    expect(slugsUnder('limited-conduct')).toContain('frpa.events-of-default-6-1');
    expect(body('frpa.events-of-default-6-1')).toContain('does not create liability for any Guarantor');
    expect(slugsUnder('none')).toContain('frpa.events-of-default-6-1');
  });
});

/**
 * Rewriting is the moment provenance is easiest to lose, because new text reads
 * better than what it replaced — which is not the same as being approved.
 */
describe('the new records carry the same provenance as the old', () => {
  it.each(MINE)('%s is attorney-drafted with no author', (slug) => {
    expect(clause(slug).source).toEqual({ kind: 'attorney-drafted', author: null });
    expect(clause(slug).status).toBe('draft');
  });

  it.each(MINE)('%s names the review that read the section', (slug) => {
    expect(clause(slug).examinedBy.length).toBeGreaterThan(0);
  });

  it.each(MINE)('%s names no tenant and cites no case', (slug) => {
    expect(body(slug)).not.toMatch(/Lombard|Payzli/);
    expect(body(slug)).not.toMatch(/\bAD3d\b|\bNY3d\b|Richmond Capital|Apollo Funding|LG Funding|Principis|Grafton/);
  });

  /** Exactly three placeholders exist, and a guaranty needs none of them. */
  it.each(MINE)('%s uses no party placeholder', (slug) => {
    expect(body(slug)).not.toMatch(/\{\{/);
  });
});
