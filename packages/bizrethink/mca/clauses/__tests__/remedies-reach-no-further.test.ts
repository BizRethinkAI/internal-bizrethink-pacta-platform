// ADR 0011: citation assertions name semantic targets. Historical numbers in test titles identify the drafting regression.
import { describe, expect, it } from 'vitest';

import { libraryFor } from '../library';

/**
 * NO REMEDY REACHES BEYOND THE PURCHASED RECEIPTS ACTUALLY GENERATED, AND
 * BUSINESS FAILURE IS NOT A DEFAULT.
 *
 * The property the Section 6 cluster is responsible for, and the second
 * cross-clause check in this library after `one-settlement-base.test.ts`. That
 * one asserts the corpus measures ONE asset; this one asserts that no remedy
 * reaches past it.
 *
 * WHY IT HAS TO BE CROSS-CLAUSE. The 2026-09-09 counsel memo's central finding
 * on this cluster is not about a clause, it is about a pair: **§6.2.1 accelerates
 * and takes 100% of card settlement proceeds for specified triggers, while
 * §6.2.5 separately lets Buyer instruct the processor to remit "all or any
 * portion" with no notice at all.** Fixing the visible acceleration limb and
 * leaving the parallel sweep produces a document that reads reformed and
 * collects identically. A per-clause assertion cannot see that; this can.
 *
 * The same is true of the definitions. `frpa.definitions` says the Specified
 * Percentage does not increase on an Event of Default and §6.2.1 raised it to
 * 100%. Both cannot stand, and which one survives is invisible to any test that
 * reads one clause at a time.
 *
 * WHAT IT DOES NOT PROVE. That any of this is lawful, that a court would enforce
 * it, or that an attorney would sign it. Every clause below is
 * `attorney-drafted` with `author: null` and `assertPublishable` refuses all of
 * them. This proves the five clauses agree with each other and with the spine,
 * and nothing more.
 *
 * IT WAS RED BEFORE THE REWRITE — on every assertion in the first three
 * describes and most of the rest — which is the only reason it is worth
 * keeping. Two assertions in the disclosure half of this package once filtered
 * on `Divergence` kinds that did not exist and passed vacuously for a day.
 */
const clauses = libraryFor('frpa');

const clause = (slug: string) => {
  const found = clauses.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the FRPA library`);
  }

  return found;
};

const DEFAULTS = 'frpa.events-of-default-6-1';
const REMEDIES = 'frpa.remedies-6-2';
const COSTS = 'frpa.costs-of-collection-6-3';
const NOTIFICATIONS = 'frpa.required-notifications-6-4';
const UCC_REMEDIES = 'frpa.remedies-4-12';
const DEFINITIONS = 'frpa.definitions';

const SECTION_6 = [DEFAULTS, REMEDIES, COSTS, NOTIFICATIONS, UCC_REMEDIES];

describe('an Event of Default is misconduct, and only misconduct', () => {
  /**
   * The closed list. v4 opened with *"Merchant shall violate any term or
   * covenant in this Agreement"* and ran to fifteen limbs, which is REVIEW-01's
   * `default-on-any-term-no-cure-no-materiality`: every covenant in Section 5
   * was a default, so a late financial statement and a fraud sat on the same
   * footing and both reached the Guaranty.
   */
  it('happens only on fraud, intentional diversion, or a conflicting sale', () => {
    const body = clause(DEFAULTS).body;

    expect(body).toContain('An Event of Default occurs only if Merchant');
    expect(body).toContain('fraud');
    expect(body).toContain('intentionally diverts');
    expect(body).toContain('conflicting interest');
    expect(body).toContain('Nothing else is an Event of Default');
  });

  it.each([
    ['a breach of any covenant', 'violate any term or covenant'],
    ['a stacking prohibition', 'known as “Stacking”'],
    ['a fall in collateral value', 'reduces the value of any Collateral'],
    ['a guarantor’s termination notice', 'The sending of notice of termination by Guarantor'],
    ['a default under another agreement', 'default under any of the terms, covenants, and conditions of any other'],
    ['a change of bank account', 'change the Approved Bank Account without the prior written consent'],
    ['a business interruption', 'transports, moves, interrupts, suspends, dissolves'],
  ])('no longer makes %s an Event of Default', (_label, text) => {
    expect(clause(DEFAULTS).body).not.toContain(text);
  });

  /**
   * THE BEST SENTENCE IN THIS CONTRACT, AND IT IS PRESERVED WORD FOR WORD.
   *
   * It is the only sentence in v4 that overrides the whole document, and it is
   * what keeps `guaranty-reaches-business-failure` and
   * `frpa-9-4-creates-guarantor-liability-on-merchant-bankruptcy` from being
   * true of Section 6. A redraft that improved its prose and lost its reach
   * would be a regression nothing else in this file could detect, so the
   * assertion is on the exact words.
   */
  it('keeps the overriding bankruptcy and business-failure exclusion intact', () => {
    expect(clause(DEFAULTS).body).toContain(
      'Notwithstanding anything in this Agreement to the contrary, neither the filing of a voluntary or involuntary ' +
        'petition under Title 11 of the United States Code, nor Merchant’s insolvency, nor the cessation of ' +
        'Merchant’s business for lack of revenue, shall constitute an Event of Default or give rise to any remedy ' +
        'under this Section [[section:default]] or to any liability of any Guarantor.',
    );
  });

  /**
   * The nonrecourse character stated as the thing it is: a decline in the
   * purchased asset is the risk Buyer bought, not a breach by Merchant. The
   * granting clause says the same in `frpa.granting-clause`; if these two ever
   * disagree, the document has a recourse loan inside it.
   */
  it.each([
    'decline',
    'good-faith closure',
    'insolvency',
    'bankruptcy',
    'Approved Processor',
    /*
      Lower case, and deliberately so. The reconciliation cluster dropped
      `Reconciliation` and `Adjustment` as DEFINED terms — nothing in any of the
      six instruments cited either, and `frpa.definitions` does not define them,
      so a capitalised term here would recreate `frpa-undefined-capitalised-terms`
      in the act of fixing something else. The property is unchanged: a
      reconciliation request is not an Event of Default. Only the string through
      which it is asserted moved.
    */
    'a reconciliation request under Section [[section:reconciliation]]',
    /*
      §3.3 WAS REWRITTEN TO DEPEND ON THIS CLAUSE, so this assertion is holding
      up somebody else's deletion. The reconciliation cluster removed §3.3's
      five-Workday withdrawal-and-default mechanism and replaced it with a single
      limit: Buyer may pursue a remedy in respect of Merchant's records only for
      conduct that independently satisfies §6.1. A §6.1 with any limb that a
      missing document or a slow answer could trip would undo that from this
      side, silently, and §3.3's own test could not see it.
    */
    'records or information',
  ])('says in terms that %s is not itself an Event of Default', (term) => {
    const body = clause(DEFAULTS).body;
    const at = body.indexOf('None of the following is itself an Event of Default');

    expect(at).toBeGreaterThan(-1);
    expect(body.slice(at)).toContain(term);
  });

  it('gives notice and a cure period before any Event of Default arises', () => {
    const body = clause(DEFAULTS).body;

    expect(body).toContain('written notice');
    expect(body).toContain('ten (10) Workdays');
    expect(body).toMatch(/capable of cure/);
  });
});

describe('the Specified Percentage does not increase on default', () => {
  /**
   * CROSS-REFERENCE 1, AND THE CONTRADICTION THE SPINE CREATED ON PURPOSE.
   * `frpa.definitions` says the percentage does not increase; v4's §6.2.1 raised
   * it to 100% of card settlement proceeds. This cluster resolves it in favour
   * of the definitions, and these two assertions are what make the resolution a
   * fact about the corpus rather than a sentence in a code comment.
   */
  it('says so in the definitions', () => {
    expect(clause(DEFINITIONS).body).toContain('It does not increase on an Event of Default.');
  });

  it('says so again where the temptation is, in the remedies clause', () => {
    expect(clause(REMEDIES).body).toContain('The Specified Percentage does not increase on an Event of Default');
  });

  /**
   * And nowhere in the FRPA does any clause raise it. Written over the whole
   * library rather than over §6.2 because the sweep this cluster is closing was
   * in a DIFFERENT limb from the acceleration it was written beside.
   */
  it('is raised by no clause anywhere in the FRPA', () => {
    const raisers = clauses.filter(
      (entry) =>
        entry.body.includes('Specified Percentage shall increase') ||
        entry.body.includes('one hundred percent (100%) of card settlement'),
    );

    expect(raisers.map((entry) => entry.slug)).toEqual([]);
  });
});

describe('no remedy reaches beyond the Purchased Receipts actually generated', () => {
  /**
   * Acceleration, in the words v4 used for it. `acceleration-defeats-indefinite-term`
   * is the finding: an agreement with no maturity date that a default converts
   * into a fixed sum due immediately has a maturity date after all, and that is
   * a loan hallmark rather than a drafting untidiness.
   */
  it('makes the uncollected Purchased Amount neither due nor liquidated damages', () => {
    const body = clause(REMEDIES).body;

    expect(body).not.toContain('due and payable in full immediately');
    expect(body).toContain('is not automatically due');
    expect(body).toContain('is not agreed liquidated damages');
  });

  it('limits recovery to receipts that arose and loss that is proved', () => {
    const body = clause(REMEDIES).body;

    expect(body).toContain('actually generated and wrongfully withheld');
    expect(body).toContain('proven direct damages');
    expect(body).toMatch(/must establish the conduct, causation and the amount/);
  });

  it('compensates Buyer for no receipt that was never generated', () => {
    expect(clause(REMEDIES).body).toContain('never generated');
  });

  /**
   * The double-recovery leg of `remedy-stack-exceeds-the-debt`. Money recovered
   * on account of the purchased pool is delivery of the purchase, so it has to
   * move the Remaining Balance §2.6 defines; a recovery that did not would let
   * Buyer collect the same dollar twice and end the agreement no sooner.
   */
  it('credits what it recovers against the Remaining Balance', () => {
    const body = clause(REMEDIES).body;

    expect(body).toContain('Remaining Balance');
    expect(body).toContain('dollar for dollar');
    expect(body).toMatch(/may not recover the same loss twice|no double recovery/);
  });
});

describe('the parallel sweep is closed, not just the visible one', () => {
  /**
   * v4's §6.2.5, which is the whole reason §6.1 and §6.2 had to move together.
   * It let Buyer tell the processor to remit *"all or any portion"* of
   * settlement, without notice to anyone, under an irrevocable power of attorney
   * — an acceleration by another route, one limb below the acceleration
   * everybody was looking at.
   */
  it.each([
    ['the all-or-any-portion instruction', 'all or any portion of the amounts received'],
    ['the irrevocable power of attorney', 'irrevocable power of attorney coupled with an interest'],
    ['the attorney-in-fact appointment', 'as Merchant’s attorney-in-fact'],
    ['collection without notice', 'without notice to Merchant or Guarantor'],
  ])('drops %s', (_label, text) => {
    expect(clause(REMEDIES).body).not.toContain(text);
  });

  it('leaves the agreed split as the only collection mechanism after a default', () => {
    const body = clause(REMEDIES).body;

    expect(body).toContain(
      'Sections [[clause:frpa.primary-collection-split-funding-via-approved-processor-2-3]] and [[clause:frpa.approved-bank-account-2-4]]',
    );
    expect(body).toContain('may not instruct an Approved Processor to remit all');
  });

  /**
   * A processor instruction Merchant does not see is a sweep Merchant cannot
   * dispute until the money is gone. The memo asks for the copy to be
   * contemporaneous, and so does §2.3's specification for Exhibit A.
   */
  it('copies Merchant on every instruction it sends a processor', () => {
    expect(clause(REMEDIES).body).toMatch(/copy of each such instruction at the same time/);
  });

  /**
   * `default-collection-reaches-cash-and-checks`. The granting clause sells the
   * Specified Percentage of Card Receipts and nothing else; a remedy that
   * reached the retained share or a non-card receipt would be collecting
   * property Buyer never bought.
   */
  it.each([
    ['a deposit-account debit', /no debit of any deposit account/],
    ['the retained share', /retained share/],
    ['a confession of judgment', /no confession of judgment/],
    ['signing process in Merchant’s name', /signing of process in Merchant’s name/],
    ['self-help', /no self-help/],
  ])('authorizes no %s', (_label, pattern) => {
    expect(clause(REMEDIES).body).toMatch(pattern);
  });

  it('confines collateral enforcement to Section 4.10 and judicial process', () => {
    const body = clause(REMEDIES).body;

    expect(body).toContain('Section [[clause:frpa.security-interest-4-10]]');
    expect(body).toMatch(/judicial process/);
  });

  /**
   * Reconciliation is the merchant's only protection against over-collection,
   * and `reconciliation-switched-off-by-any-breach` is REVIEW-01's finding that
   * v4 turned it off on any breach. §3.1 as rewritten lets a request be made
   * while an Event of Default is alleged; the remedies clause has to say the
   * same or the two disagree.
   */
  it('leaves reconciliation, refunds and the cap running during enforcement', () => {
    const body = clause(REMEDIES).body;

    expect(body).toContain('right to a reconciliation');
    expect(body).toContain('adjustment of the Estimated Daily Holdback');
    expect(body).toContain('Completion Threshold');
    expect(body).toMatch(/remain in effect/);
  });

  /**
   * EVERY BASE IS NAMED, AND NONE OF THEM IS THE BRIDGE.
   *
   * `frpa.definitions` bridges bare "Receipts" to Card Receipts so that the
   * clauses nobody has rewritten yet stop meaning three things. That bridge is a
   * repair, not a licence: a remedy that says "Receipts" and means the bridge is
   * a remedy whose reach cannot be read off the page.
   *
   * The reconciliation cluster found what that costs. §3.1 reconciled against
   * "the Receipts that Merchant collected" — a GROSS number, including refunded
   * and charged-back sales and the processor's own charges — while Buyer
   * collects on Card Receipts, net of all of them. **Reconciling a net
   * collection against a gross base manufactures a permanent apparent
   * under-collection in Buyer's favour, every month, on every deal**, and the
   * bridge would have hidden that rather than fixed it. The same mistake inside
   * a remedy is more expensive, not less.
   */
  it('names Card Receipts or Purchased Receipts, never bare Receipts', () => {
    for (const slug of SECTION_6) {
      const bare = clause(slug).body.replace(/(Card|Purchased) Receipts/g, '');

      expect(bare, slug).not.toContain('Receipts');
    }
  });
});

describe('costs of collection stay actual, capped and outside the sweep', () => {
  /**
   * The three things v4 got right here, and the memo agrees: actual and
   * reasonable, one aggregate ceiling, no contractual interest. A redraft that
   * lost any of them would be worse paper than the document it replaced.
   */
  it('keeps costs to what was actually incurred and is reasonable', () => {
    const body = clause(COSTS).body;

    expect(body).toContain('actually incurred');
    expect(body).toContain('reasonable');
  });

  it('keeps the single 25% aggregate ceiling', () => {
    const body = clause(COSTS).body;

    expect(body).toContain('twenty-five percent (25%)');
    expect(body).toMatch(/shall not exceed/);
    expect(body).toContain('Remaining Balance');
  });

  it('keeps the refusal of any contractual rate of interest', () => {
    // ADR 0011 separates the existing interest paragraph; its limits still hold.
    const body = clause('frpa.prejudgment-and-postjudgment-interest').body;

    expect(body).toContain('This Agreement is not a loan and Buyer does not charge interest on it.');
    expect(body).toMatch(/[Nn]o contractual/);
  });

  it.each([
    ['payment on demand', 'on demand'],
    ['internal administrative cost', 'administrative or filing fees'],
    ['the reach to every related agreement', 'or any related agreement'],
  ])('drops %s', (_label, text) => {
    expect(clause(COSTS).body).not.toContain(text);
  });

  /**
   * The link back to §2.6, and the reason the memo's cost clause and the spine's
   * Remaining Balance have to be read together: a cost collected through the
   * processor split is a cost the merchant pays out of the purchased pool, which
   * both lengthens the agreement and puts a fee inside a balance §2.6 says never
   * includes one.
   */
  it('cannot be collected through the split or added to the balance', () => {
    const body = clause(COSTS).body;

    expect(body).toMatch(/not.*collected through the processor split|may not be collected through the split/);
    expect(body).toMatch(/do not increase the Purchased Amount or the Remaining Balance/);
  });

  it('reaches a Guarantor only for a valid claim against that Guarantor', () => {
    expect(clause(COSTS).body).toContain('the separately signed Guaranty of Performance');
  });
});

describe('the notice obligations are performable', () => {
  /**
   * `frpa-6-4-24-hour-notice-cannot-be-given-under-7-3`. v4 demanded written
   * notice of a bankruptcy filing within 24 hours while §7.3 made notice
   * effective on RECEIPT by certified mail. The clause was not merely strict, it
   * was impossible, and an impossible obligation whose breach is a default is a
   * trap rather than a term.
   */
  it('no longer demands a 24-hour receipt', () => {
    const body = clause(NOTIFICATIONS).body;

    expect(body).not.toContain('twenty-four (24) hours');
    expect(body).toMatch(/promptly/);
  });

  it('gives a channel that can actually carry it', () => {
    expect(clause(NOTIFICATIONS).body).toMatch(/email/);
  });

  /**
   * And the bankruptcy leg of the same clause: a late notice must not become the
   * recourse against bankruptcy that §6.1's overriding sentence refuses.
   */
  it('makes late notice neither a default nor a guarantor liability', () => {
    const body = clause(NOTIFICATIONS).body;

    expect(body).toMatch(/not an Event of Default/);
    expect(body).toMatch(/does not accelerate/);
    expect(body).toMatch(/Guarantor/);
  });
});

describe('nothing outside Section 6 reopens what Section 6 closed', () => {
  /**
   * `frpa-4-12-reopens-the-acceleration-6-2-closed`. §4.12 sat in the security
   * section and granted *"any remedy available at law (including those available
   * under the UCC) or in equity"* — a general remedies grant twenty pages away
   * from the limits it was subject to. A reader who found §4.12 first found a
   * different agreement.
   */
  it('leaves §4.12 as a pointer to Section 6, not a second grant', () => {
    const body = clause(UCC_REMEDIES).body;

    expect(body).not.toContain('any remedy available at law');
    expect(body).toContain('Section [[clause:frpa.remedies-6-2]]');
    expect(body).toMatch(/only the rights and remedies/);
  });

  /**
   * A cross-reference to a subsection that no longer exists is how a rewrite
   * done clause by clause leaves the document broken in a way each clause looks
   * fine in. §6.2.1, §6.2.3 and §6.2.5 are all gone; nothing may still point at
   * them.
   */
  it('leaves no clause pointing at a deleted subsection of §6.2', () => {
    const danglers = clauses.filter((entry) => /Section 6\.2\.[0-9]/.test(entry.body));

    expect(danglers.map((entry) => entry.slug)).toEqual([]);
  });

  /**
   * The whole cluster, held to the rule the Guaranty is held to: nothing in
   * Section 6 may make a Guarantor liable for the business failing. §9.2 limits
   * the Guaranteed Obligations; a remedy clause that reached a guarantor
   * directly would go round it.
   */
  it('routes every guarantor claim through Section 9.2', () => {
    for (const slug of SECTION_6) {
      const body = clause(slug).body;

      if (body.includes('Guarant')) {
        expect(
          body.includes('the separately signed Guaranty of Performance') ||
            body.includes('liability of any Guarantor') ||
            body.includes('not create'),
          slug,
        ).toBe(true);
      }
    }
  });

  /**
   * Rule 1, restated for the clauses this cluster rewrote. Nothing here is
   * approved and nothing may reach a merchant: `source` stays `attorney-drafted`
   * with a null author until counsel signs, and `library.test.ts` asserts the
   * refusal one clause at a time.
   */
  it('claims no authority for any of it', () => {
    for (const slug of SECTION_6) {
      expect(clause(slug).source).toEqual({ kind: 'attorney-drafted', author: null });
      expect(clause(slug).examinedBy.length).toBeGreaterThan(0);
    }
  });
});
