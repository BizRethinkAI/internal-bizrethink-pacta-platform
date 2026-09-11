import { describe, expect, it } from 'vitest';

import { libraryFor } from '../library';

/**
 * RECONCILIATION IS A RIGHT OF VERIFICATION AND CORRECTION, OR THIS FAILS.
 *
 * §§3.1–3.4 are the four clauses that decide whether the percentage this
 * agreement promises is the percentage that actually operated. Every other
 * merchant protection in the document is worth what this one is worth: if the
 * merchant cannot check the arithmetic and get the difference back, the split
 * is whatever the processor happened to withhold.
 *
 * WHAT WAS WRONG, AND WHY IT NEEDED ITS OWN TEST. v4 did not deny the right —
 * it conditioned it. An unforeseen-change gate, a one-calendar-month window,
 * merchant-only initiation, a documentary precondition, a five-Workday
 * withdrawal, a "deemed a default" for not answering, a bar on requests after
 * payoff, and an automatic post-completion extension of the term. Each reads as
 * housekeeping; together they are the *Richmond Capital* fact pattern, because
 * the merchant most likely to need reconciliation — the one whose receipts fell
 * and who is therefore late with paperwork — is the one every condition
 * disqualifies. `reconciliation-right-conditioned-into-near-nullity` and
 * `reconciliation-switched-off-by-any-breach` are REVIEW-01 saying exactly that.
 *
 * A clause-by-clause review cannot see this. Each condition is defensible on its
 * own; the defect is their conjunction. So the property here is stated over the
 * SET: **there is no state of the world in which reconciliation is unavailable,
 * and no route by which correcting an estimate becomes a collection.**
 *
 * IT ALSO PINS THE CROSS-REFERENCE THE SPINE HANDED OVER. §§3.1–3.4 reconciled
 * against a base that moved under them: `frpa.definitions` now makes `Receipts`
 * and `Daily Receipts` mean `Card Receipts`, which is net of refunds,
 * chargebacks, taxes, gratuities, processor charges and reserves. A clause that
 * still says "the Receipts that Merchant collected" is now reconciling against
 * a different, larger number than the one Buyer collects on, and the bridge
 * sentence hides that rather than fixing it. These clauses must name the base
 * they mean.
 *
 * WHAT IT DOES NOT PROVE. That any of this text is lawful, that a court would
 * find the transaction is a purchase, or that an attorney would sign it. Nothing
 * here is approved: `source` is `attorney-drafted` with a null author and
 * `assertPublishable` refuses every one of these four.
 *
 * IT WAS RED BEFORE THE REWRITE. Written first, against v4's bodies; the run is
 * recorded in the cluster report. Two assertions in the disclosure half of this
 * package once filtered on `Divergence` kinds that did not exist and passed
 * vacuously for a day, so "it is green" is only evidence if it could have been
 * red.
 */
const clauses = libraryFor('frpa');

const clause = (slug: string) => {
  const found = clauses.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the FRPA library`);
  }

  return found;
};

const RIGHT = 'frpa.merchant-s-right-to-reconciliation-3-1';
const PROCEDURE = 'frpa.request-for-reconciliation-procedure-3-2';
const INFORMATION = 'frpa.failure-to-provide-reconciliation-information-3-3';
const ADJUSTMENT = 'frpa.adjustment-of-the-estimated-daily-holdback-3-4';

const CLUSTER = [RIGHT, PROCEDURE, INFORMATION, ADJUSTMENT];

const COMPLETION = 'frpa.completion-threshold-2-6';

describe('reconciliation is verification and correction, not a payment holiday', () => {
  it('lets either party initiate it', () => {
    expect(clause(RIGHT).body).toMatch(/Either Merchant or Buyer may/);
    expect(clause(PROCEDURE).body).not.toMatch(/sole responsibility/);
  });

  /**
   * A right nobody exercises is not evidence the percentage operated. The
   * standing duty is what produces a record without a merchant having to know
   * the clause exists.
   */
  it('makes Buyer reconcile on its own initiative, whether or not asked', () => {
    const body = clause(RIGHT).body;

    expect(body).toMatch(/at least once each month/);
    expect(body).toMatch(/whether or not/);
  });

  /**
   * The gate, not the word. "Without showing an unforeseen or sustained change"
   * is the memo's own negation and has to survive; what may not survive is the
   * conditional that made a change in trading the trigger for the right.
   */
  it('gates the right on no change in the merchant’s trading', () => {
    for (const slug of CLUSTER) {
      expect(clause(slug).body, slug).not.toMatch(/Merchant experiences/);
    }

    expect(clause(RIGHT).body).toMatch(/without showing/);
  });

  it('caps the period at nothing', () => {
    expect(clause(RIGHT).body).toMatch(/for any period/);

    for (const slug of CLUSTER) {
      expect(clause(slug).body, slug).not.toMatch(/Reconciliation Month/);
      expect(clause(slug).body, slug).not.toMatch(/one \(1\) full calendar month/);
    }
  });

  it('compares what was collected against the Specified Percentage of Card Receipts', () => {
    expect(clause(RIGHT).body).toMatch(/Specified Percentage of the Card Receipts/);
    expect(clause(RIGHT).body).toMatch(/actually generated/);
  });

  /**
   * Missing information may delay the arithmetic; it may not delay the money
   * once the arithmetic is possible, and Buyer holding the processor ledger
   * means it usually already is.
   */
  it('refunds an over-collection on a clock that starts from what Buyer already holds', () => {
    const body = clause(RIGHT).body;

    expect(body).toMatch(/five \(5\) Workdays/);
    expect(body).toMatch(/already in Buyer’s possession/);
  });

  /**
   * The catch-up route is the whole defect restated: a reconciliation that
   * corrects an under-collection by raising the percentage has converted a
   * share of receipts into a schedule with a make-up payment.
   */
  it('forbids catch-up by percentage, by minimum, by debit or by deadline', () => {
    const body = clause(RIGHT).body;

    expect(body).toMatch(/shall not increase the Specified Percentage/);
    expect(body).toMatch(/minimum/);
    expect(body).toMatch(/deadline/);
    expect(body).not.toMatch(/correcting any under-collection prospectively/);
    expect(body).toMatch(/continued operation of the Specified Percentage/);
  });

  it('says a decline in Card Receipts creates no arrearage', () => {
    expect(clause(RIGHT).body).toMatch(/no arrearage/);
  });

  it('sends an actual failure to remit to the clause that deals with it', () => {
    expect(clause(RIGHT).body).toContain('Section 7.16');
  });

  /**
   * §2.6 defines the Remaining Balance as the Purchased Amount less every
   * amount credited to it, "after any correction made under Section 3". If
   * Section 3 produces no correction that reaches the ledger, that sentence
   * points at nothing.
   */
  it('feeds its correction into the Remaining Balance §2.6 measures', () => {
    expect(clause(COMPLETION).body).toContain('correction made under Section 3');
    expect(clause(RIGHT).body).toContain('Remaining Balance');
  });
});

describe('the request cannot be conditioned away', () => {
  it('takes a request by any reasonable route, and out of the certified-mail clause', () => {
    const body = clause(PROCEDURE).body;

    expect(body).toMatch(/email/);
    expect(body).toMatch(/portal/);
    expect(body).toMatch(/telephone/);
    expect(body).toContain('Section 7.3');
  });

  it('puts the first move on Buyer rather than on the merchant’s filing cabinet', () => {
    const body = clause(PROCEDURE).body;

    expect(body).toMatch(/one \(1\) Workday/);
    expect(body).toMatch(/information it already holds/);
  });

  it('limits what Buyer may ask for and makes it say what is missing', () => {
    const body = clause(PROCEDURE).body;

    expect(body).toMatch(/reasonably necessary/);
    expect(body).toMatch(/what is missing/);
    expect(body).toMatch(/equivalent records/);
  });

  /**
   * `reconciliation-right-conditioned-into-near-nullity`. v4 had already
   * softened the ten-Workday nullification into thirty non-forfeiting Workdays;
   * a deadline that does not forfeit is not a deadline, so it goes entirely.
   */
  it('forfeits no request for being late, informal, repeated or post-completion', () => {
    const body = clause(PROCEDURE).body;

    expect(body).toMatch(/No request is forfeited/);
    expect(body).not.toMatch(/nullified/);
    expect(body).not.toMatch(/thirty \(30\) Workdays/);
  });

  /**
   * The automatic extension is `acceleration-defeats-indefinite-term` pointed
   * the other way: asking for a reconciliation after completion revived the
   * agreement until the Purchased Amount was collected in full, which turns the
   * merchant's own request into a guarantee of the full sum.
   */
  it('does not revive the agreement because a late request was made', () => {
    const body = clause(PROCEDURE).body;

    expect(body).not.toMatch(/automatically be extended/);
    expect(body).toMatch(/does not extend this Agreement/);
  });

  it('pays the undisputed part while the disputed part is investigated', () => {
    const body = clause(PROCEDURE).body;

    expect(body).toMatch(/undisputed/);
    expect(body).toMatch(/investigat/);
  });

  it('makes a calculation dispute resolvable by naming a calculation and a person', () => {
    const body = clause(PROCEDURE).body;

    expect(body).toMatch(/written calculation/);
    expect(body).toMatch(/contact/);
    expect(body).toMatch(/limitation period/);
  });
});

describe('incomplete information is not a default and not a withdrawal', () => {
  it('leaves an incomplete request open', () => {
    expect(clause(INFORMATION).body).toMatch(/remains open/);
    expect(clause(INFORMATION).body).not.toMatch(/may consider the request withdrawn/);
  });

  it('gives real time to answer, and more where the cause is not the merchant’s', () => {
    const body = clause(INFORMATION).body;

    expect(body).toMatch(/ten \(10\) Workdays/);
    expect(body).toMatch(/outside Merchant’s reasonable control/);
    expect(body).not.toMatch(/within five \(5\) Workdays after the request/);
  });

  it('reconciles on the best reliable information rather than refusing to reconcile', () => {
    expect(clause(INFORMATION).body).toMatch(/best reliable information/);
  });

  /**
   * The clause a plaintiff's counsel reads aloud. v4 made a merchant's failure
   * to produce a statement "interference with Buyer's rights" and "deemed a
   * default" — under §6.1.1 an Event of Default with no cure anywhere in the
   * document, which then switches the reconciliation right off permanently.
   */
  it('makes missing records authorise nothing', () => {
    const body = clause(INFORMATION).body;

    expect(body).toMatch(/Missing records/);
    expect(body).toMatch(/declare an Event of Default/);
    expect(body).toMatch(/is not interference/);

    for (const slug of CLUSTER) {
      expect(clause(slug).body, slug).not.toMatch(/deemed a default/);
      expect(clause(slug).body, slug).not.toMatch(/may be considered interference/);
    }
  });

  it('keeps the right alive after the Purchased Amount has been delivered', () => {
    const body = clause(INFORMATION).body;

    expect(body).not.toMatch(/prior to the payoff/);
    expect(body).toMatch(/before or after the Purchased Amount has been delivered/);
  });

  it('leaves a remedy available only for conduct that stands on its own', () => {
    const body = clause(INFORMATION).body;

    expect(body).toMatch(/independently satisfies Section 6\.1/);
    expect(body).toMatch(/caused Buyer loss/);
    expect(body).toMatch(/shall not presume fraud/);
  });
});

describe('an adjustment moves an estimate, never the percentage', () => {
  it('needs no sustained decline and no discretion', () => {
    const body = clause(ADJUSTMENT).body;

    expect(body).toMatch(/at any time/);
    expect(body).not.toMatch(/steady decrease/);
    expect(body).toMatch(/five \(5\) Workdays/);
  });

  /**
   * `periodic-amount-undefined-fixed-draw-residue`. v4's "Adjusted Daily
   * Holdback" replaced and superseded the Estimated Daily Holdback, which only
   * means anything if a fixed amount is being drawn — the residue of the ACH
   * architecture the v3→v4 restructure was meant to remove. An estimate that
   * supersedes an estimate is still an estimate.
   */
  it('changes an illustration and nothing else', () => {
    const body = clause(ADJUSTMENT).body;

    expect(body).toMatch(/informational/);
    expect(body).toMatch(/does not alter the Specified Percentage/);
    expect(body).toMatch(/obligation on Merchant to deliver/);
    expect(body).not.toMatch(/replace and supersede/);
    expect(body).not.toMatch(/Adjusted Daily Holdback/);
    expect(body).not.toMatch(/substantially extend the term/);
  });

  it('survives an alleged default and outlives completion', () => {
    const body = clause(ADJUSTMENT).body;

    expect(body).toMatch(/Event of Default/);
    expect(body).toMatch(/Completion Threshold/);
  });
});

describe('the cluster reconciles against the base the spine defined', () => {
  /**
   * The bridge in `frpa.definitions` makes a bare "Receipts" mean Card
   * Receipts, which rescues the fifteen clauses nobody has rewritten. It is not
   * a licence for a rewritten clause to stay vague: these four are the clauses
   * where the base IS the subject matter, and a reader comparing a settlement
   * statement to this arithmetic must not have to follow a bridge to know which
   * number to use.
   */
  it.each(CLUSTER)('%s names no receipts but Card Receipts and Purchased Receipts', (slug) => {
    const stripped = clause(slug).body.replace(/Card Receipts|Purchased Receipts/g, '');

    expect(stripped).not.toMatch(/Receipts/);
    expect(stripped).not.toMatch(/Daily Receipts/);
  });

  it('measures the reconciliation and the estimate on Card Receipts', () => {
    expect(clause(RIGHT).body).toMatch(/Card Receipts/);
    expect(clause(ADJUSTMENT).body).toMatch(/Card Receipts/);
  });

  it.each(CLUSTER)('%s does not define the base a second time', (slug) => {
    expect(clause(slug).body).not.toContain('“Card Receipts” means');
  });
});

describe('reconciliation cannot be switched out of a template', () => {
  /**
   * The engine selects on facts. A conditional reconciliation clause is a
   * reconciliation right some templates do not have, which is the defect this
   * whole cluster exists to remove — arrived at by configuration rather than by
   * drafting, and therefore invisible on the page.
   */
  it.each(CLUSTER)('%s is in every FRPA, unconditionally', (slug) => {
    expect(clause(slug).includeWhen).toBeNull();
    expect(clause(slug).section).toBe('reconciliation');
  });

  it('has all four clauses and no others in the section', () => {
    const section = clauses.filter((entry) => entry.section === 'reconciliation');

    expect(section.map((entry) => entry.slug).sort()).toEqual([...CLUSTER].sort());
  });
});

/**
 * Rewriting is the moment this is easiest to forget: the text now reads better
 * than what it replaced, which is not the same as being approved by anybody.
 */
describe('rewriting changed nothing about provenance', () => {
  it.each(CLUSTER)('%s is still attorney-drafted with no author', (slug) => {
    expect(clause(slug).source).toEqual({ kind: 'attorney-drafted', author: null });
    expect(clause(slug).status).toBe('draft');
  });

  it.each(CLUSTER)('%s still names the review that read it', (slug) => {
    expect(clause(slug).examinedBy.length).toBeGreaterThan(0);
  });

  it.each(CLUSTER)('%s names no tenant', (slug) => {
    expect(clause(slug).body).not.toMatch(/Lombard|Payzli/);
  });
});
