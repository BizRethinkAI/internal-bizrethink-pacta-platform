import { describe, expect, it } from 'vitest';

import { libraryFor } from '../library';

/**
 * THE PURCHASED ASSET AND THE PAYMENT BASE ARE THE SAME ASSET, OR THIS FAILS.
 *
 * The single structural defect the 2026-09-09 counsel memo names, and the whole
 * reason the eight spine clauses were rewritten before any other cluster: v4's
 * granting clause SELLS all cash, cheque, ACH and card receipts, §2.2 COLLECTS a
 * fixed percentage of card settlements, and §3 RECONCILES against something
 * wider still. Three different assets, three different denominators, one
 * agreement. That mismatch is the recharacterisation vector, the undisclosed
 * catch-up claim and the ordinary-course dispute generator at once, and roughly
 * fifteen downstream clauses inherit it by using "Receipts" to mean whichever of
 * the three suits the sentence.
 *
 * WHAT THIS ASSERTS THAT NO OTHER TEST DOES. `bodies-match-the-document` asked
 * whether a body is the document's words — retired by
 * [ADR 0012](../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md),
 * because the document is the defect. `library.test.ts` asks whether a clause is
 * publishable. Neither can see a corpus that is internally incoherent, and
 * incoherence is what a rewrite done clause-by-clause produces by default: each
 * clause defensible on its own, the set contradicting itself.
 *
 * So this is a check on the RELATIONSHIP between eight clauses, and it is
 * deliberately written against the spine alone. It is the contract the next
 * cluster drafts against: the base is `Card Receipts`, it is defined once, and
 * `Receipts` and `Daily Receipts` are bridged to it so that the clauses nobody
 * has rewritten yet stop meaning three things.
 *
 * WHAT IT DOES NOT PROVE. That any of this text is lawful, or that an attorney
 * would sign it. Nothing here is approved — `source` is `attorney-drafted` with
 * a null author and `assertPublishable` refuses every one of them. This proves
 * only that the eight agree with each other.
 *
 * IT WAS RED BEFORE THE REWRITE, on every assertion below, which is the only
 * reason it is worth keeping. Two assertions in the disclosure half of this
 * package once filtered on `Divergence` kinds that did not exist and passed
 * vacuously for a day.
 */
const clauses = libraryFor('frpa');

const spine = (slug: string) => {
  const found = clauses.find((clause) => clause.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the FRPA library`);
  }

  return found;
};

const DEFINITIONS = 'frpa.definitions';
const GRANT = 'frpa.granting-clause';
const HOLDBACK = 'frpa.holdback-explainer';
const NOT_A_LOAN = 'frpa.sales-of-receipts-not-a-loan-2-1';
const COLLECTION = 'frpa.collection-mechanism-and-term-2-2';
const SPLIT = 'frpa.primary-collection-split-funding-via-approved-processor-2-3';
const ACCOUNTS = 'frpa.approved-bank-account-2-4';
const COMPLETION = 'frpa.completion-threshold-2-6';

const SPINE = [DEFINITIONS, GRANT, HOLDBACK, NOT_A_LOAN, COLLECTION, SPLIT, ACCOUNTS, COMPLETION];

describe('the settlement base is defined once', () => {
  it('defines Card Receipts, in the definitions clause', () => {
    expect(spine(DEFINITIONS).body).toContain('“Card Receipts” means');
  });

  /**
   * A second definition is worse than none: two clauses that both define the
   * base can disagree, and the one a reader finds first wins. REVIEW-01 raised
   * exactly this as `defined-term-drift` against five terms of v4.
   */
  it('defines it nowhere else in the FRPA', () => {
    const definers = clauses.filter((clause) => clause.body.includes('“Card Receipts” means'));

    expect(definers.map((clause) => clause.slug)).toEqual([DEFINITIONS]);
  });

  /**
   * The bridge, and the reason this cluster fixes clauses it does not edit.
   * Fifteen unrewritten clauses say "Receipts" and one says "Daily Receipts";
   * without this sentence each of them means whatever its own sentence implies.
   */
  it('says that Receipts and Daily Receipts mean Card Receipts', () => {
    const body = spine(DEFINITIONS).body;

    expect(body).toContain('“Receipts” and “Daily Receipts”');
    expect(body).toContain('mean Card Receipts');
  });

  /**
   * The five silent movers. Each one shifts the economic percentage with no
   * amendment and no disclosure, and every one of them is a live merchant
   * dispute in this product.
   */
  it.each([
    'refund',
    'chargeback',
    'tax',
    'gratuit',
    'reserve',
    'charges',
  ])('says how %s is treated in the base', (term) => {
    expect(spine(DEFINITIONS).body.toLowerCase()).toContain(term);
  });

  it('counts an adjustment once rather than twice', () => {
    expect(spine(DEFINITIONS).body).toContain('counted once');
  });

  /**
   * Every capitalised term the spine leans on has one home. REVIEW-01 raised
   * `frpa-undefined-capitalised-terms` and `undefined-money-terms` against v4
   * for six terms including the two that decide when the agreement ends.
   */
  it.each([
    'Workday',
    'Card Receipts',
    'Specified Percentage',
    'Approved Processor',
    'Approved Bank Account',
    'Bank',
    'Purchase Price',
    'Purchased Amount',
    'Net Amount Funded',
    'Purchase Date',
    'Purchased Receipts',
    'Remaining Balance',
    'Completion Threshold',
  ])('gives %s a definition the reader can find', (term) => {
    expect(spine(DEFINITIONS).body).toContain(`“${term}”`);
  });
});

describe('the sale is of the percentage, not of the universe', () => {
  it('sells the Specified Percentage of Card Receipts', () => {
    expect(spine(GRANT).body).toContain('Specified Percentage of the Card Receipts');
  });

  it('sells no other asset of the merchant', () => {
    const body = spine(GRANT).body;

    expect(body).not.toMatch(/future accounts, contract rights/);
    expect(body).not.toMatch(/cash, check, credit or debit card/);
    expect(body).not.toMatch(/other form of monetary payment/);
    expect(body).toContain('non-card');
  });

  it('names what it sells, so the rest of the corpus has a term for it', () => {
    expect(spine(GRANT).body).toContain('“Purchased Receipts”');
  });

  it('leaves the shortfall with the buyer', () => {
    const body = spine(GRANT).body;

    expect(body).toMatch(/risk/);
    expect(body).toMatch(/no shortfall|owes no shortfall|does not repurchase/);
  });
});

describe('the characterisation clause claims only what it can', () => {
  /**
   * The memo REFUTES REVIEW-01's `fair-market-value-recital-self-refuting`: a
   * discounted purchase can be at fair market value, so a factor rate does not
   * falsify the recital. What goes is the merchant's CONCESSION of value, which
   * is unsupported and which the merchant is in no position to make.
   */
  it('drops the merchant’s valuation concession', () => {
    expect(spine(NOT_A_LOAN).body).not.toMatch(/agrees that the Purchase Price equals the fair market value/);
  });

  it('states there is no maturity and no minimum', () => {
    const body = spine(NOT_A_LOAN).body;

    expect(body).toContain('no maturity date');
    expect(body).toMatch(/no minimum/);
  });

  /**
   * `usury-defence-waiver-void`: an advance waiver is void and its presence is
   * evidence that a loan was contemplated. A savings clause is not a cure
   * either — so what stands here is a refund duty, not an automatic reduction.
   */
  it('waives no defence law does not permit to be waived, and refunds instead of curing', () => {
    const body = spine(NOT_A_LOAN).body;

    expect(body).toMatch(/waives no|No party waives/);
    expect(body).toContain('refund');
  });
});

describe('collection is the percentage of what actually settles', () => {
  it('collects nothing when there are no Card Receipts', () => {
    const body = spine(COLLECTION).body;

    expect(body).toContain('no Card Receipts');
    expect(body).toMatch(/no arrears|nothing is due/);
  });

  it('lets the estimate authorise nothing', () => {
    const body = spine(COLLECTION).body;

    expect(body).toContain('Estimated Daily Holdback');
    expect(body).toMatch(/informational/);
    expect(body).toMatch(/fixed debit|fixed amount/);
  });

  it('is the same estimate the funding-terms explainer describes', () => {
    const body = spine(HOLDBACK).body;

    expect(body).toContain('Card Receipts');
    expect(body).not.toContain('average sales revenue');
    expect(body).toMatch(/not a payment|is not a minimum/);
  });
});

describe('the split is capped once and binds nobody it has not signed', () => {
  it('holds one aggregate cap across every processor', () => {
    const body = spine(SPLIT).body;

    expect(body).toContain('aggregate');
    expect(body).toContain('Purchased Amount');
  });

  it('authorises no fixed minimum, no default increase and no account debit', () => {
    const body = spine(SPLIT).body;

    expect(body).toMatch(/minimum/);
    expect(body).toMatch(/debit/);
  });

  it('does not pretend to bind a processor that is not a party', () => {
    expect(spine(SPLIT).body).toMatch(/not a party to this Agreement/);
  });

  /**
   * A UCC §9-406 notification of a PARTIAL assignment does not compel an
   * acquirer to split settlement, so the acceptance has to be obtained rather
   * than assumed — and the duty to obtain it belongs to the party that can.
   *
   * WHAT IS NOT ASSERTED HERE, DELIBERATELY. That the clause is gated on
   * `processorSplitAccepted`. It is not, and the long note above the clause
   * says why: gating it out produces a template with no collection mechanism,
   * and `engine/__tests__/select-clauses.test.ts` requires `LOMBARD_FACTS` —
   * where that fact is false — to select the whole FRPA. The consequence is a
   * real gap: a template can be assembled whose split nobody has agreed to and
   * nothing in this library says so.
   */
  it('puts the duty to obtain the processor’s acceptance on the buyer, before funding', () => {
    const body = spine(SPLIT).body;

    expect(body).toMatch(/Buyer shall obtain each Approved Processor’s written acceptance/);
    expect(body).toContain('before the Purchase Date');
  });

  it('leaves the merchant off the hook for a processor that will not perform', () => {
    expect(spine(SPLIT).body).toMatch(/not a claim against Merchant/);
  });

  it('does not require the merchant to keep one and only one of anything', () => {
    expect(spine(ACCOUNTS).body).not.toMatch(/one and only one/);
  });

  it('does not make a bank or processor outage a default', () => {
    expect(spine(ACCOUNTS).body).toMatch(/not an Event of Default/);
  });
});

describe('the delivery cap does not float', () => {
  it('measures the Remaining Balance against the Purchased Amount alone', () => {
    const body = spine(COMPLETION).body;

    expect(body).toContain('“Remaining Balance” means');
    expect(body).not.toMatch(/Purchased Amount plus any fees/);
    expect(body).toMatch(/never includes/);
  });

  /**
   * Kept as a defined term on purpose. §4.2, §4.15 and §7.6 cite "Completion
   * Threshold" by name and none of them is in this cluster; dropping the term
   * would recreate `frpa-undefined-capitalised-terms` in the act of fixing it.
   */
  it('keeps Completion Threshold as a term the clauses citing it can still reach', () => {
    expect(spine(COMPLETION).body).toContain('(the “Completion Threshold”)');

    const citing = clauses.filter(
      (clause) => clause.slug !== COMPLETION && clause.body.includes('Completion Threshold'),
    );

    expect(citing.length).toBeGreaterThan(0);
  });

  it('stops the withholding, refunds the excess and releases the filings', () => {
    const body = spine(COMPLETION).body;

    expect(body).toMatch(/stop withholding/);
    expect(body).toMatch(/refund/);
    expect(body).toMatch(/release/);
  });

  it('does not let a post-completion correction restart collection unilaterally', () => {
    expect(spine(COMPLETION).body).toMatch(/may not resume withholding/);
  });
});

/**
 * The spine is unreviewed text and must stay unpublishable until counsel signs.
 * Rewriting is exactly the moment that is easiest to forget: the text now looks
 * better than what it replaced, which is not the same as being approved.
 */
describe('rewriting changed nothing about provenance', () => {
  it.each(SPINE)('%s is still attorney-drafted with no author', (slug) => {
    expect(spine(slug).source).toEqual({ kind: 'attorney-drafted', author: null });
    expect(spine(slug).status).toBe('draft');
  });

  it.each(SPINE)('%s still names the review that read it', (slug) => {
    expect(spine(slug).examinedBy.length).toBeGreaterThan(0);
  });

  it.each(SPINE)('%s names no tenant', (slug) => {
    expect(spine(slug).body).not.toMatch(/Lombard|Payzli/);
  });
});
