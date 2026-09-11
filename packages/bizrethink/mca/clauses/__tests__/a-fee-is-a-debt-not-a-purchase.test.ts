import { describe, expect, it } from 'vitest';
import { selectClauses } from '../../engine/select-clauses';
import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { libraryFor } from '../library';

/**
 * A FEE IS A DEBT. A DEBT IS COLLECTED BY ASKING, NOT BY A SPLIT INSTRUCTION.
 *
 * The defining conflict the spine cluster handed to `fees-and-money`, and the
 * one the 2026-09-09 memo rates Critical twice — once at §4.1 and once at
 * Appendix A. §2.6 now says the Remaining Balance *"never includes a fee, an
 * equipment charge, a cost of enforcement, or an amount owed under any other
 * agreement, and no amount charged after the Purchase Date increases it"*.
 * §4.1 and Appendix A both said the opposite, in terms.
 *
 * WHY IT IS NOT A TIDINESS PROBLEM. Adding a fee to the Remaining Balance
 * extends the purchased pool, and the purchased pool is swept out of card
 * settlements automatically by a processor that adjudicates nothing. So a
 * **disputed** charge is collected before anybody decides whether it was owed:
 * the merchant pays first and argues afterwards, through a mechanism built to
 * collect a purchase price. It also makes the delivery cap a figure Buyer can
 * raise after signature, which is every state disclosure's "total cost of
 * financing" exceeded by the agreement's own terms.
 *
 * WHAT THIS ASSERTS THAT NO OTHER TEST DOES. `one-settlement-base` asserts the
 * corpus measures one ASSET; `no-grant-beyond-the-purchased-share` asserts no
 * GRANT reaches past it; `remedies-reach-no-further` asserts no REMEDY does.
 * None of them can see a CHARGE riding into the same sweep, because a fee is
 * neither an asset, a grant nor a remedy — it is a separate debt that v4
 * quietly routed down the collection channel built for the purchase.
 *
 * THE ENTITLEMENT IS NOT NARROWED, AND THAT IS DELIBERATE. §6.3's 25% aggregate
 * ceiling on enforcement costs is untouched and stays the single home of that
 * right; `disputes-service` owns it. What moved is the ROUTE — collection
 * through the sweep — not the right to be paid.
 *
 * EVERY ASSERTION BELOW WAS RED BEFORE THE REWRITE, and the counts are in the
 * cluster report. The last `it` is a positive control over a synthetic body, so
 * that a green here is evidence the detectors fire rather than evidence they
 * match nothing. Two assertions in the disclosure half of this package once
 * filtered on `Divergence` kinds that did not exist and passed vacuously for a
 * day; that is what the control is for.
 *
 * WHAT IT DOES NOT PROVE. That any of this is lawful, or that a fee schedule
 * nobody has priced is a fee schedule a merchant can read. Nothing here is
 * approved: `source` is `attorney-drafted` with a null author on every record.
 */
const clauses = libraryFor('frpa');

const DEPOSIT = 'frpa.merchant-deposit-agreement-4-1';
const CANCEL = 'frpa.right-to-cancel-4-14';
const EARLY = 'frpa.voluntary-prepayment-8-3';
const SCHEDULE = 'frpa.appendix-a-fees-collectible';
const ORIGINATION = 'frpa.appendix-a-origination-fee-to-iso';
const ENFORCEMENT_COSTS = 'frpa.appendix-a-attorneys-fees';

const COMPLETION = 'frpa.completion-threshold-2-6';
const COSTS_OF_COLLECTION = 'frpa.costs-of-collection-6-3';
const ISO = 'frpa.independent-sales-organizations-and-brokers-7-21';

const clause = (slug: string) => {
  const found = clauses.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the FRPA library`);
  }

  return found;
};

/**
 * A clause is read a sentence at a time, and so is this.
 *
 * THE FIRST DRAFT OF THESE DETECTORS COULD NOT TELL THE FIX FROM THE DEFECT.
 * It matched the phrase alone, so *"No fee is added to the Purchased Amount or
 * the Remaining Balance"* — the sentence this whole cluster exists to write —
 * flagged as an offence, exactly like v4's *"such fees are added to the
 * Remaining Balance"*. Caught by the control at the bottom of this file on the
 * first red run, which is the one thing the control is there to catch.
 *
 * A pattern plus a negator in the SAME sentence is a prohibition. That is not a
 * clever heuristic, it is how the sentences are actually written, and the
 * control asserts both directions rather than trusting it.
 *
 * `without` IS NOT IN THE LIST, and the control is why. v4's *"Bank may rely
 * upon the instructions of Buyer without independent verification"* is an
 * affirmative grant whose only negative word qualifies something else entirely.
 * A negator list wide enough to catch every English negation is wide enough to
 * excuse the defect.
 *
 * `nothing` IS, and it was added after a red run named
 * `frpa.rollover-method-election`, whose *"Nothing is added to the Purchased
 * Amount in Section 1.3 except as Section 8.2 expressly provides"* is the
 * prohibition written with a different subject. That clause is
 * `renewal-positions`' and needed no change; the detector did.
 */
const NEGATED = /\b(?:no|not|never|nor|neither|nothing)\b/i;

const sentences = (body: string): string[] =>
  body
    .split(/\n|(?<=[.;])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

const affirms = (body: string, pattern: RegExp): boolean =>
  sentences(body).some((sentence) => pattern.test(sentence) && !NEGATED.test(sentence));

/**
 * The four ways v4 routed a charge into the purchase, as they are actually
 * written. Affirmative forms only: §2.6's *"It never includes a fee"* and
 * §6.3's *"do not increase the Purchased Amount or the Remaining Balance"* are
 * the prohibitions this test exists to protect, and a detector that flagged
 * them would be measuring the fix as the defect.
 */
const RIDES_ON_THE_PURCHASE: { pattern: RegExp; what: string }[] = [
  {
    pattern: /(?:are|is|shall be|may be|will be|being)\s+added to the (?:Remaining Balance|Purchased Amount)/i,
    what: 'adds a charge to the purchase ledger',
  },
  {
    pattern: /collect(?:ed|ible)\s+(?:via|through|by)\s+the same (?:methods?|settlement remittance|means)/i,
    what: 'collects a charge the way the purchase is collected',
  },
  {
    pattern:
      /(?:fee|charge|cost|expense)s?[^.]{0,80}collected through the (?:same )?(?:settlement remittance|split|processor split)/i,
    what: 'sweeps a charge out of settlement',
  },
  /*
    v4's §2.6, in the words that made the whole conflict: *"the Purchased Amount
    PLUS ANY FEES CHARGED under Section 4.1 and Appendix A, less all amounts
    collected by Buyer."* This is the definition form of the defect, and the
    place it would come back if anyone re-derived the ledger from scratch.

    ITS FIRST DRAFT WAS `increases? the (Remaining Balance|Purchased Amount)`,
    which flagged `frpa.merchant-s-right-to-reconciliation-3-1` — *"A correction
    under this Section reduces or increases the Remaining Balance under Section
    2.6 accordingly"* — and that sentence is not a defect, it is `reconciliation`
    discharging §2.6's *"after any correction made under Section 3"*. A
    CORRECTION is not a CHARGE. A detector whose only catch is a legitimate
    sentence in someone else's clause is worse than no detector, because the
    cheapest way to make it green is to edit their clause.
  */
  {
    pattern: /(?:Remaining Balance|Purchased Amount)\s+plus\s+[^.]{0,60}(?:fee|charge|cost|expense)/i,
    what: 'defines the ledger as the purchase plus a charge',
  },
];

/**
 * Completion is defined once, in §2.6, and §2.6 says so: *"That is the only
 * test of completion, and it governs wherever another provision of this
 * Agreement describes completion differently."*
 *
 * A provision that ends a right on "receipt of the full Purchased Amount" is
 * describing completion differently even though it never uses the defined term
 * — and the two that did are exactly the two fee clauses, because under v4 the
 * Purchased Amount they ran to was the Purchased Amount PLUS the fee stack.
 * That is `completion-threshold-two-conflicting-tests` in its second location.
 */
const DESCRIBES_COMPLETION =
  /(?:until|upon|on)\s+(?:Buyer\s+)?(?:receipt|receives|receiving)[^.]{0,60}(?:full|entire)\s+Purchased Amount/i;

const offenders = (test: (body: string) => boolean, except: string[] = []) =>
  clauses
    .filter((entry) => !except.includes(entry.slug))
    .filter((entry) => test(entry.body))
    .map((entry) => entry.slug)
    .sort();

describe('a fee never rides on the purchase', () => {
  /**
   * The Critical, stated over the whole corpus rather than over the two clauses
   * that carried it. A per-clause reading found this defect twice; a set-level
   * one is what stops a third copy of it landing in a clause nobody re-reads.
   */
  it.each(RIDES_ON_THE_PURCHASE)('has no clause that $what', ({ pattern }) => {
    expect(offenders((body) => affirms(body, pattern))).toEqual([]);
  });

  /**
   * Absence is not the same as refusal. §4.1 and Appendix A are the two places
   * this Agreement charges a fee, so each has to SAY that the fee stays out of
   * the ledger and out of the split — otherwise the rule lives only in §2.6 and
   * a reader who starts at the fee schedule never meets it.
   */
  it.each([DEPOSIT, SCHEDULE])('%s refuses the sweep in its own words', (slug) => {
    const body = clause(slug).body;

    expect(body).toMatch(/No fee is added to the Purchased Amount or the Remaining Balance/);
    expect(body).toMatch(/collected through/);
  });

  /**
   * And each points at the one place the enforcement entitlement lives, rather
   * than restating it. `three-inconsistent-attorney-fee-formulas` is what
   * happens when three clauses each state their own.
   */
  it.each([DEPOSIT, SCHEDULE, ENFORCEMENT_COSTS])('%s sends enforcement expense to Section 6.3', (slug) => {
    expect(clause(slug).body).toContain('Section 6.3');
  });
});

describe('the enforcement entitlement is moved, not narrowed', () => {
  /**
   * §6.3 keeps the 25% ceiling and keeps it alone. This assertion is the guard
   * on the instruction that came with the cluster: *"Do not narrow §6.3."*
   */
  it('leaves the aggregate ceiling in Section 6.3 and nowhere else', () => {
    const stating = offenders((body) => /twenty-five percent|25%/.test(body));

    expect(stating).toEqual([COSTS_OF_COLLECTION]);
  });

  /**
   * Memo 098's whole disposition: *"Remove parallel operative wording so
   * adjudication, guarantor limits, and no-sweep treatment are identical
   * everywhere."* An Appendix A paragraph that GRANTS the recovery is a second
   * entitlement with none of §6.3's conditions on it — no adjudication
   * requirement, no itemized statement, no guarantor limit.
   */
  it('grants the recovery of attorneys’ fees in Section 6.3 and nowhere else', () => {
    const granting = offenders(
      (body) => /(?:may|shall be entitled to)\s+recover[^.]{0,60}attorneys[’']\s*fees/i.test(body),
      [COSTS_OF_COLLECTION],
    );

    expect(granting).toEqual([]);
  });
});

describe('completion is described where it is defined', () => {
  /**
   * §2.6 is the only test of completion. Two clauses stated a second one in
   * different words, and both are fee clauses — which is not a coincidence:
   * under v4 the "full Purchased Amount" they ran to included the fee stack, so
   * an unpaid fee kept the agreement alive after the purchase was delivered.
   */
  it('has no clause outside Section 2.6 that ends a right on payment of the Purchased Amount', () => {
    expect(offenders((body) => affirms(body, DESCRIBES_COMPLETION), [COMPLETION])).toEqual([]);
  });

  /**
   * And the clause about ending early has to point at it rather than restate
   * it. "Prepayment" is loan vocabulary; the substance is that §2.6 decides
   * when this stops, whatever route the money took.
   */
  it('sends early completion to Section 2.6', () => {
    expect(clause(EARLY).body).toContain('Section 2.6');
    expect(clause(EARLY).body).toContain('Remaining Balance');
  });
});

describe('this Agreement binds only the people who sign it', () => {
  /**
   * THE §7.21 DEFECT, IN THE DEPOSIT ACCOUNT.
   *
   * v4's §4.1 had Merchant waive damages against a Bank that is not a party,
   * for following instructions Buyer gave, and hold Buyer harmless for that
   * Bank's acts. The party with no control indemnifies the party with all of
   * it, and the release runs to a non-signatory whose duties this Agreement
   * cannot set in the first place. `personal-liability-is-section-9-only`
   * caught the ISO version of this; nothing caught the bank version.
   *
   * Owner's instruction, and a DEPARTURE from the memo, which would have
   * narrowed the language rather than removing it: narrowing leaves a clause
   * that reads as though it works.
   */
  it.each([
    { what: 'lets a non-party rely on Buyer’s instructions', pattern: /Bank may rely/i },
    { what: 'waives a claim against a non-party', pattern: /waives any claim[^.]{0,80}against Bank/i },
    { what: 'holds Buyer harmless for a non-party’s acts', pattern: /hold (?:Buyer|Bank) harmless/i },
    { what: 'has Merchant disclaim an interest in its own settlements', pattern: /disclaims any and all interest/i },
    /*
      RAW MATCH, NOT `affirms`, AND THE FIRST RED RUN IS WHY. v4 buries *"Merchant
      agrees to hold Buyer harmless"* in a sentence that opens *"Buyer is not
      responsible and shall not be liable for the actions of Bank"*, so the
      sentence carries a negator and the negation-aware detector let it through
      — one assertion in this block went green over the exact text it was
      written to catch.

      The negation rule earns its place on the ledger patterns, where *"is added
      to the Remaining Balance"* and *"No fee is added to the Remaining Balance"*
      are the same words meaning opposite things. It earns nothing here: there
      is no drafting in which a clause needs the phrase *"hold Buyer harmless"*
      to say that Merchant does not. §7.21 states that rule as *"Merchant and
      Guarantor do not indemnify Buyer"* and trips none of these.
    */
  ])('has no clause that $what', ({ pattern }) => {
    expect(offenders((body) => pattern.test(body))).toEqual([]);
  });

  /**
   * What survives is the half worth keeping, and the memo is right about it:
   * Buyer issues the instructions, so Buyer answers for them.
   */
  it('leaves Buyer responsible for the instructions it issues', () => {
    expect(clause(DEPOSIT).body).toMatch(/Buyer is responsible for the accuracy and scope of (?:the )?instructions/);
  });
});

describe('the fee schedule is closed', () => {
  /**
   * The generic discretionary fee power is the defect memo 096 names, and v4's
   * version of it is the shape that reads harmless: *"Fees may be voided by
   * Buyer in its discretion"* is a discretion to WAIVE, which implies a
   * discretion to charge — and the schedule it sat under is a table with no
   * closure rule at all.
   */
  it('charges only what the completed schedule itemizes', () => {
    const body = clause(SCHEDULE).body;

    expect(body).toMatch(/dollar amount or (?:a )?lawful calculation method/i);
    expect(body).toContain('$0.00');
    expect(body).not.toMatch(/in its (?:sole )?discretion/i);
  });

  /**
   * The four charges a fee schedule must not carry, because each of them prices
   * conduct another clause of this Agreement expressly permits. §3 gives
   * Merchant a reconciliation; §2.4 lets Merchant change an account; §6.1's
   * fourteen-item list says a decline in receipts and an outage are not
   * defaults. A fee for any of them collects on the permission.
   */
  it.each(['reconciliation', 'decline', 'business failure', 'legal right'])('charges no fee for %s', (occasion) => {
    expect(clause(SCHEDULE).body).toContain(occasion);
  });
});

describe('the ISO paragraph and the ISO clause travel together', () => {
  /**
   * THE GAP `data-and-channel` HANDED OVER, AND THE ADR 0013 PROPERTY IT IS AN
   * INSTANCE OF: *the values of a fact must partition the clauses it gates.*
   *
   * §7.21 is gated on `brokerChannel`; the Appendix A origination paragraph was
   * not. So a funder with no broker channel assembled a document containing an
   * Appendix A paragraph about ISO fees for a channel it does not have, while
   * the clause that actually governs ISOs was correctly absent — the fee
   * disclosure without the conduct rule, which is the worse half to keep.
   *
   * `select-clauses.test.ts` cannot see this: its cross-reference check reads
   * `Section N` tokens, and the two clauses are related by SUBJECT rather than
   * by citation. Stated here, over the fact rather than over the text.
   */
  it.each([true, false])('selects both or neither when brokerChannel is %s', (brokerChannel) => {
    const facts: McaFacts = { ...LOMBARD_FACTS, brokerChannel };
    const slugs = selectClauses({ facts, instrument: 'frpa' }).selected.map((entry) => entry.slug);

    expect(slugs.includes(ORIGINATION)).toBe(brokerChannel);
    expect(slugs.includes(ISO)).toBe(brokerChannel);
  });

  /**
   * And the disclosure a funder with no broker channel still owes — that the
   * Origination Fee is a dollar figure itemized before signature — survives in
   * an ungated clause, because it is not a broker question.
   *
   * This is the ADR 0013 diagnostic applied rather than the gate applied
   * blindly: *"if two limbs bind different parties or answer different
   * questions, the fact is wrong, not the granularity."* The itemization limb
   * answers "what is Merchant charged"; the ISO limb answers "who is paid out
   * of it". Only the second is a `brokerChannel` question, so the first moves
   * to §4.1 rather than the clause being split into a pair.
   */
  it('itemizes the Origination Fee in a clause every funder gets', () => {
    const facts: McaFacts = { ...LOMBARD_FACTS, brokerChannel: false };
    const selected = selectClauses({ facts, instrument: 'frpa' }).selected;
    const itemizing = selected.filter((entry) => /Origination Fee/.test(entry.body));

    expect(itemizing.map((entry) => entry.slug)).toContain(DEPOSIT);
  });
});

describe('cancellation unwinds rather than forfeits', () => {
  /**
   * REVIEW-01's `cancellation-forfeits-origination-fee`. The memo is careful
   * here and the care is the point: our prior note ASSUMED the merchant loses
   * every fee, and the definition supplied does not establish that. So the
   * answer is stated rather than implied, in the direction the merchant can
   * check — a fee withheld at funding is cancelled, a fee separately paid is
   * credited or refunded once.
   */
  it('says what happens to a fee when the merchant cancels', () => {
    const body = clause(CANCEL).body;

    expect(body).toMatch(/withheld at funding is cancell?ed/i);
    expect(body).toMatch(/refunded once|credited/i);
  });

  /**
   * `frpa-6-4-24-hour-notice-cannot-be-given-under-7-3` in a second location.
   * §7.3 makes a notice effective ON RECEIPT and only by certified mail, so a
   * right exercisable within three calendar days is not exercisable at all
   * through that channel. §3.2 and §6.4 both already carve out of §7.3 for
   * exactly this reason; §4.14 needs the same carve-out or the right is
   * decorative.
   */
  it('gives the three-day right a channel that can carry it', () => {
    const body = clause(CANCEL).body;

    expect(body).toMatch(/Notwithstanding Section 7\.3/);
    expect(body).toMatch(/when sent/i);
  });
});

/**
 * The control. Every detector above is a regular expression over a corpus that
 * has been edited to satisfy it, so a green tells you nothing unless the
 * detector can still go red — which is the failure this package has already
 * shipped once, in two assertions that filtered on `Divergence` kinds that do
 * not exist.
 *
 * The strings below are v4's own, quoted from `Lombard_FRPA_v4.docx` §4.1 and
 * Appendix A. If a rewrite of the detectors stops flagging the sentences the
 * detectors were written for, this fails.
 */
describe('the detectors fire on the text they were written for', () => {
  const V4_DEPOSIT_FEE_SENTENCE =
    'Buyer may charge fees as set forth on Appendix A (the “Fee Structure”); such fees are added to the ' +
    'Remaining Balance and collected through the same settlement remittance as the Purchased Amount.';
  const V4_APPENDIX_SENTENCE =
    'All fees are added to the Remaining Balance and are collectible via the same methods as the Purchased Amount.';
  const V4_COMPLETION_SENTENCE =
    'The foregoing authorizations shall continue in effect until Buyer receives final payment of the entire ' +
    'Purchased Amount and all other amounts due.';
  const V4_BANK_SENTENCE =
    'Bank may rely upon the instructions of Buyer without independent verification. Merchant waives any claim ' +
    'for damages against Bank in connection with actions taken based upon instructions from Buyer.';

  const fires = (body: string) => RIDES_ON_THE_PURCHASE.some(({ pattern }) => affirms(body, pattern));

  const V4_LEDGER_DEFINITION =
    '“Remaining Balance” means, at any time, the Purchased Amount plus any fees charged under Section 4.1 and ' +
    'Appendix A, less all amounts collected by Buyer.';

  it('flags all three sentences that put a fee in the purchase ledger', () => {
    expect(fires(V4_DEPOSIT_FEE_SENTENCE)).toBe(true);
    expect(fires(V4_APPENDIX_SENTENCE)).toBe(true);
    expect(fires(V4_LEDGER_DEFINITION)).toBe(true);
  });

  /**
   * And the sentence that is not a defect. A correction moves the ledger and is
   * supposed to; §2.6 defines the Remaining Balance *"after any correction made
   * under Section 3"* and would be incoherent without it.
   */
  it('does not flag a reconciliation correction', () => {
    expect(fires('A correction under this Section reduces or increases the Remaining Balance under Section 2.6.')).toBe(
      false,
    );
  });

  /**
   * The half the first draft got wrong. Same words, opposite meaning, and a
   * detector that cannot tell them apart would go green on a corpus that had
   * simply deleted the rule instead of stating it.
   */
  it('does not flag the prohibition that replaced them', () => {
    expect(fires('No fee is added to the Purchased Amount or the Remaining Balance.')).toBe(false);
    expect(fires('Costs and expenses under this Section do not increase the Remaining Balance.')).toBe(false);
    expect(fires(clause(COMPLETION).body)).toBe(false);
    expect(fires(clause(COSTS_OF_COLLECTION).body)).toBe(false);
  });

  it('flags the second completion test and leaves Section 2.6 alone', () => {
    expect(affirms(V4_COMPLETION_SENTENCE, DESCRIBES_COMPLETION)).toBe(true);
    expect(affirms(clause(COMPLETION).body, DESCRIBES_COMPLETION)).toBe(false);
  });

  it('flags the non-signatory bank language', () => {
    expect(affirms(V4_BANK_SENTENCE, /Bank may rely/i)).toBe(true);
    expect(affirms(V4_BANK_SENTENCE, /waives any claim[^.]{0,80}against Bank/i)).toBe(true);
  });
});
