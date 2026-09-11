import { describe, expect, it } from 'vitest';

import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { libraryFor } from '../library';

/**
 * NOTHING IN SECTION 4 GRANTS BUYER MORE THAN THE SPECIFIED PERCENTAGE OF CARD
 * RECEIPTS, AND NO POWER IN IT SURVIVES WITHOUT NOTICE.
 *
 * The property the enrollment cluster is responsible for, and the third
 * cross-clause check in this library. `one-settlement-base.test.ts` asserts the
 * corpus measures ONE asset. `remedies-reach-no-further.test.ts` asserts that no
 * REMEDY reaches past it. Section 4 is where the third route runs: not a remedy
 * and not a definition, but a **grant** — a security interest, a negative
 * pledge, a power of attorney, a funding discretion — each of which can hand
 * Buyer property or authority the granting clause never sold it, and each of
 * which sits in a different clause from the limit it is supposed to respect.
 *
 * WHY IT HAS TO BE CROSS-CLAUSE, twice over.
 *
 * **The grant is now narrower than §4.10 reads.** `frpa.granting-clause` sells
 * the Specified Percentage of Card Receipts and says Buyer "owns nothing else".
 * v4's §4.10 took a security interest in "the Receipts purchased under this
 * Agreement **and the accounts and other receivables from which those Receipts
 * arise**" — which, against the new grant, resolves to a share of an account
 * rather than the account. A reader of §4.10 alone cannot see that, and neither
 * can a per-clause assertion. Nor can either see the second half of the same
 * defect: **a Guarantor who owns no Collateral cannot grant Merchant's assets**,
 * and v4 had Guarantor granting, authorising filings and covenanting a negative
 * pledge in three separate clauses.
 *
 * **And §4.6 contradicted §6.2 across a twenty-page gap.** §6.2, rewritten this
 * session, says in terms that Buyer "holds no power of attorney for the purposes
 * of this Section" and may take "no self-help remedy". v4's §4.6 appointed Buyer
 * attorney-in-fact **irrevocably**, on "a violation by Merchant of any term",
 * with authority to adjust insurance and to institute proceedings. Two clauses
 * disagreeing about whether a power exists is worse paper than either of them
 * alone, and only a check that reads both can say so.
 *
 * WHAT THIS DOES NOT PROVE. That any of it is lawful, that a court would enforce
 * it, that the collateral description on a live UCC-1 matches what §4.10 now
 * authorises — nobody has pulled those filings, and `lombard-contracts` records
 * no d/b/a and no financing statement — or that an attorney would sign any of
 * it. Every clause below is `attorney-drafted` with `author: null` and
 * `assertPublishable` refuses all of them.
 *
 * IT WAS RED BEFORE THE REWRITE, on every describe below, which is the only
 * reason it is worth keeping. Two assertions in the disclosure half of this
 * package once filtered on `Divergence` kinds that did not exist and passed
 * vacuously for a day.
 */
const clauses = libraryFor('frpa');

const clause = (slug: string) => {
  const found = clauses.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the FRPA library`);
  }

  return found;
};

const PARTIES = 'frpa.parties';
const EQUIPMENT_EXPLAINER = 'frpa.equipment-cost-explainer';
const EQUIPMENT_EXCLUSIVITY = 'frpa.equipment-cost-exclusivity';
const TERM = 'frpa.term-of-agreement-4-2';
const NO_LIABILITY = 'frpa.no-liability-4-5';
const POWER = 'frpa.power-of-attorney-4-6';
const DBA = 'frpa.d-b-a-names-4-9';
const SECURITY = 'frpa.security-interest-4-10';
const NEGATIVE_PLEDGE = 'frpa.negative-pledge-4-11';
const FUNDING = 'frpa.timing-and-method-of-funding-4-13';

/** The ten this cluster owns. Everything below is asserted over this set. */
const CLUSTER = [
  PARTIES,
  EQUIPMENT_EXPLAINER,
  EQUIPMENT_EXCLUSIVITY,
  TERM,
  NO_LIABILITY,
  POWER,
  DBA,
  SECURITY,
  NEGATIVE_PLEDGE,
  FUNDING,
];

/** Section 6, which this cluster must agree with rather than merely not mention. */
const REMEDIES = 'frpa.remedies-6-2';
const GRANT = 'frpa.granting-clause';
const COMPLETION = 'frpa.completion-threshold-2-6';

describe('the security interest is the share that was sold, and no more', () => {
  /**
   * "Precautionary" was doing the work of an analysis. Article 9 applies to a
   * sale of accounts by its own terms; a label on the interest replaces neither
   * attachment, nor filing, nor priority. The memo rates this High and the
   * cluster brief rates it Critical.
   */
  it('stops calling the interest precautionary and says Article 9 applies', () => {
    const body = clause(SECURITY).body;

    expect(body).not.toContain('This security interest is precautionary');
    expect(body).toContain('Article 9');
    expect(body).toMatch(/sale of accounts/);
  });

  /**
   * THE NARROWING THE SPINE CREATED, SAID OUT LOUD. v4 reached "the accounts and
   * other receivables from which those Receipts arise" — the whole account. The
   * granting clause sells a percentage of a settlement, so the interest can only
   * be that percentage. Left implicit, this is the exact gap a UCC-1 gets
   * over-filed into.
   */
  it('reaches only the Specified Percentage of each underlying card sale', () => {
    const body = clause(SECURITY).body;

    expect(body).not.toContain('the accounts and other receivables from which those Receipts arise');
    expect(body).toContain('Specified Percentage');
    expect(body).toMatch(/does not reach the whole of any account/);
  });

  /**
   * `all-assets-lien-vs-nonrecourse-recital`. The exclusions have to name the
   * deposit account as well as the goods: v4 excluded equipment and inventory
   * while taking "identifiable proceeds on deposit in the Approved Bank
   * Account", which is how an account-level sweep gets in through the collateral
   * description.
   */
  it.each([
    'retained share',
    'non-card receipt',
    'equipment',
    'inventory',
    'deposit accounts',
    'general intangibles',
  ])('grants no interest in %s, in the exclusion rather than merely nearby', (term) => {
    const body = clause(SECURITY).body;
    const at = body.indexOf('No interest is granted in');

    expect(at).toBeGreaterThan(-1);
    expect(body.slice(at)).toContain(term);
  });

  /**
   * A DRAFTING ERROR, NOT A POLICY CHOICE, and the memo says so. A Guarantor
   * owns none of the Collateral, so a Guarantor grant is either void or a grant
   * of the Guarantor's own property by surprise. v4 had it three times: granting
   * in §4.10, authorising filings in §4.10, covenanting in §4.11.
   */
  it('takes nothing from a Guarantor, and says why it cannot', () => {
    const body = clause(SECURITY).body;

    expect(body).not.toContain('Merchant and Guarantor each agree to execute');
    expect(body).not.toContain('Merchant and Guarantor authorize Buyer to file');
    expect(body).toMatch(/No Guarantor grants/);
    expect(body).toMatch(/owns none of the Collateral/);
  });

  /**
   * The filing authorisation is where a narrow grant becomes a wide lien.
   * `Merchant and Guarantor authorize Buyer to file any financing statements
   * deemed necessary by Buyer` authorises an all-assets filing in terms.
   */
  it('authorizes a filing that describes the Collateral and nothing wider', () => {
    const body = clause(SECURITY).body;

    expect(body).not.toContain('any financing statements deemed necessary by Buyer');
    expect(body).toMatch(/all assets/);
    expect(body).toMatch(/amend or terminate/);
  });

  /**
   * A covenant cannot eliminate a lien somebody else already has, and v4's
   * first-priority undertaking asked Merchant to promise exactly that. The duty
   * belongs to the party that can perform it: Buyer searches, Buyer obtains the
   * release or the subordination, and it does so before it funds.
   */
  it('puts priority diligence on Buyer instead of promising it away', () => {
    const body = clause(SECURITY).body;

    expect(body).not.toContain('first-priority security interest');
    expect(body).toMatch(/lien searches/);
    expect(body).toMatch(/subordination/);
    expect(body).toContain('before the Purchase Date');
    expect(body).toMatch(/does not represent, warrant or covenant that Buyer’s interest is or will be first/);
  });

  /**
   * The two things a covenant is powerless against, named rather than assumed:
   * an existing lender's lien and an Approved Processor's setoff. If Merchant is
   * in breach because one of them exists, the clause has manufactured a default
   * out of a fact that predates the deal.
   */
  it('does not pretend to displace an existing lien or a processor’s setoff', () => {
    const body = clause(SECURITY).body;

    expect(body).toMatch(/setoff/);
    expect(body).toMatch(/operation of law/);
    expect(body).toMatch(/not in breach/);
  });

  it('leaves perfection and priority to the mandatory rules of Article 9', () => {
    expect(clause(SECURITY).body).toMatch(/mandatory rules of Article 9/);
  });

  /**
   * v4 had Merchant agree to execute "any account control agreements" Buyer
   * deemed necessary, which is a deposit-account sweep obtained by covenant. A
   * control agreement is a real instrument and may be negotiated; what it may
   * not do is collect an amount this Agreement does not entitle Buyer to.
   */
  it('lets no control agreement collect what this Agreement does not', () => {
    const body = clause(SECURITY).body;

    expect(body).not.toContain('including the execution of any account control agreements');
    expect(body).toMatch(/may not authorize collection of any amount/);
    expect(body).toMatch(/does not enlarge the Collateral/);
  });

  it('releases on completion and keeps its costs inside Section 6.3', () => {
    const body = clause(SECURITY).body;

    expect(body).toContain('Section 2.6');
    expect(body).toContain('Section 6.3');
    expect(body).not.toContain('Buyer may use another legal name or D/B/A');
  });
});

describe('the negative pledge is a double-sale rule, not an all-assets covenant', () => {
  it('reaches a knowing second sale and a conflicting voluntary lien, and nothing else', () => {
    const body = clause(NEGATIVE_PLEDGE).body;

    expect(body).toMatch(/knowingly sell the same Purchased Receipts/);
    expect(body).toMatch(/voluntarily grant/);
    expect(body).toMatch(/This restriction reaches nothing else/);
  });

  it('binds no Guarantor', () => {
    const body = clause(NEGATIVE_PLEDGE).body;

    expect(body).not.toContain('Merchant and Guarantor each agrees not to create');
    expect(body).toMatch(/No Guarantor/);
  });

  /**
   * The confusion the memo names: "a permitted claim ranking after the Specified
   * Percentage" describes a lease payment as if it held a rank in a priority
   * scheme. It does not. Ownership of the purchased share and the order in which
   * a processor pays bills are different questions.
   */
  it('gives an equipment charge no rank and no lien', () => {
    const body = clause(NEGATIVE_PLEDGE).body;

    expect(body).not.toContain('permitted claim ranking after the Specified Percentage');
    expect(body).toMatch(/no rank or priority by reason of this Agreement/);
    expect(body).toMatch(/separate obligation/);
  });

  it('excludes a disclosed interest, a statutory lien and ordinary processor charges', () => {
    const body = clause(NEGATIVE_PLEDGE).body;

    expect(body).toMatch(/disclosed/);
    expect(body).toMatch(/operation of law/);
    expect(body).toMatch(/Approved Processor/);
  });
});

describe('the power of attorney is ministerial, noticed, and agrees with §6.2', () => {
  /**
   * Every limb v4 gave, that the purchased share cannot support.
   */
  it.each([
    ['the irrevocable appointment', 'irrevocably appoints Buyer as its agent and attorney-in-fact'],
    ['any-covenant triggering', 'in the case of a violation by Merchant of any term of this Agreement'],
    ['the insurance power', 'to obtain and adjust insurance'],
    [
      'signing Merchant’s name on an assignment',
      'to sign Merchant’s name on any invoice, bill of lading, or assignment',
    ],
    ['instituting proceedings', 'institute any proceeding which Buyer may deem necessary'],
  ])('drops %s', (_label, text) => {
    expect(clause(POWER).body).not.toContain(text);
  });

  /**
   * What is left is two ministerial acts, both inside the purchased share:
   * hand the processor the instruction Merchant already signed, and endorse a
   * joint instrument to the extent of the share sold.
   */
  it('keeps only the delivery of the split instruction and a limited endorsement', () => {
    const body = clause(POWER).body;

    expect(body).toMatch(/Split Funding Authorization/);
    expect(body).toMatch(/endorse/);
    expect(body).toContain('Specified Percentage');
    expect(body).toMatch(/ministerial/);
  });

  /**
   * THE HALF OF THIS FILE'S PROPERTY THAT IS ABOUT POWER RATHER THAN PROPERTY.
   * A power exercised without notice is a power the merchant learns about from
   * its bank balance. Notice is written as a CONDITION so that an unnoticed act
   * is unauthorised, rather than a breach of a side promise.
   */
  it('makes notice a condition of the authority rather than a courtesy', () => {
    const body = clause(POWER).body;

    expect(body).toMatch(/at the same time/);
    expect(body).toMatch(/not authorized by this Section/);
  });

  /**
   * THE CONTRADICTION WITH §6.2, RESOLVED IN §6.2'S FAVOUR. §6.2 disclaims any
   * power of attorney "for the purposes of this Section". §4.6 must therefore
   * say in terms that it confers nothing on an Event of Default, or the two
   * clauses disagree and the later reader picks.
   */
  it('confers nothing on an Event of Default and points at Section 6.2', () => {
    const body = clause(POWER).body;

    expect(body).toContain('Section 6.2');
    expect(body).toMatch(/Event of Default/);
    expect(body).toMatch(/is not a remedy/);
  });

  it('is still disclaimed by §6.2 from the other side', () => {
    expect(clause(REMEDIES).body).toContain('Buyer holds no power of attorney for the purposes of this Section');
    expect(clause(REMEDIES).body).toContain('no signing of process in Merchant’s name');
  });

  it('terminates when the Agreement completes', () => {
    expect(clause(POWER).body).toContain('Section 2.6');
  });
});

describe('funding is committed before the merchant is', () => {
  /**
   * `frpa-4-13-unlimited-right-to-refuse-vs-ct-offer-revocation-bar`. VERIFIED
   * against the vendored primary text: CT Gen. Stat. §36a-869(a) forbids a
   * provider revoking, withdrawing or modifying a specific offer until midnight
   * of the third calendar day, save on underwriting information or at the
   * recipient's request. "Any reason or no reason" is the opposite of that.
   */
  it('drops the unlimited right to refuse', () => {
    const body = clause(FUNDING).body;

    expect(body).not.toContain('may refuse to purchase the Receipts for any reason or no reason');
    expect(body).not.toContain('in its sole discretion');
  });

  it('honors a statutory offer period and names the one that exists', () => {
    const body = clause(FUNDING).body;

    expect(body).toMatch(/36a-869/);
    expect(body).toMatch(/specific offer/);
  });

  it('states conditions and a funding deadline instead of discretion', () => {
    const body = clause(FUNDING).body;

    expect(body).toMatch(/conditions/);
    expect(body).toMatch(/funding date/);
    expect(body).toMatch(/terminate/);
  });

  /**
   * NO TRANSFER BEFORE CONSIDERATION, which is what makes the sale a sale. The
   * granting clause is expressed to take effect on the Purchase Date; this is
   * the clause that says when that is, and the definitions clause sends the
   * reader here for it.
   */
  it('defines the Purchase Date as the day the money actually moves', () => {
    const body = clause(FUNDING).body;

    expect(body).toContain('“Purchase Date” means');
    expect(body).toContain('Net Amount Funded');
    expect(body).toMatch(/Section 1\.4/);
  });

  it('stops the split instructions and releases the filings if it never funds', () => {
    const body = clause(FUNDING).body;

    expect(body).toMatch(/release/);
    expect(body).toMatch(/without charge/);
  });
});

describe('the liability waiver is reciprocal and does not eat the refund', () => {
  it('runs both ways rather than only against Merchant', () => {
    const body = clause(NO_LIABILITY).body;

    expect(body).not.toContain('In no event will Buyer be liable');
    expect(body).toMatch(/[Nn]either party/);
  });

  it.each(['fraud', 'gross negligence', 'unauthorized collection', 'confidentiality'])('carves out %s', (term) => {
    expect(clause(NO_LIABILITY).body).toContain(term);
  });

  /**
   * The reason this clause is in this cluster rather than left alone: §2.6
   * promises a refund of anything collected above the Purchased Amount, and an
   * unqualified consequential-damages waiver two clauses later is the obvious
   * defence to a claim for it.
   */
  it('caps no refund and no reconciliation right', () => {
    const body = clause(NO_LIABILITY).body;

    expect(body).toContain('Section 2.6');
    expect(body).toContain('Section 3');
    expect(body).toMatch(/wrongfully collected/);
  });

  it('waives no remedy law does not permit to be waived', () => {
    expect(clause(NO_LIABILITY).body).toMatch(/does not permit to be waived|would be unenforceable/);
  });
});

describe('the trade-name clause names the legal owner', () => {
  it('identifies Buyer by its legal name in every filing', () => {
    const body = clause(DBA).body;

    expect(body).not.toContain('Merchant acknowledges that Buyer may use');
    expect(body).toMatch(/legal name/);
    expect(body).toMatch(/financing statement/);
  });

  /**
   * The memo REFUTES the finding here — a secured-party trade name is not
   * categorically invalid under Article 9 and nothing on this record shows the
   * d/b/a is unregistered. What the clause can still do is refuse to let an
   * affiliate be named as owner or secured party without having acquired the
   * interest.
   */
  it('does not let the equipment affiliate be substituted for Buyer', () => {
    const body = clause(DBA).body;

    expect(body).not.toContain('{{equipmentAffiliate}}');
    expect(body).toMatch(/lawfully acquired/);
    expect(body).toContain('Section 7.2');
  });
});

describe('the equipment clauses excuse no disclosure calculation', () => {
  /**
   * THE CRITICAL ONE. "Because that amount is the price of goods and not a cost
   * of the financing, it is excluded from the finance charge **and** from the
   * amount financed" excludes one charge from two different statutory
   * calculations by describing it. NY §803 and CA §22802 define those fields;
   * this Agreement does not.
   */
  it('deletes the categorical exclusion from both calculations', () => {
    const body = clause(EQUIPMENT_EXCLUSIVITY).body;

    expect(body).not.toContain('it is excluded from the finance charge and from the amount financed');
    expect(body).not.toMatch(/price of goods and not a cost of the financing/);
    expect(body).toMatch(/No description in this Agreement determines/);
  });

  it('leaves the calculation to the law that defines it', () => {
    const body = clause(EQUIPMENT_EXCLUSIVITY).body;

    expect(body).toMatch(/finance charge/);
    expect(body).toMatch(/amount financed/);
    expect(body).toMatch(/applicable law/);
  });

  /**
   * And the arithmetic has to agree with §2.6, which says the Remaining Balance
   * "never includes a fee, an equipment charge". A Purchased Amount that adds
   * Equipment Cost Deferred after the factor puts an equipment charge inside the
   * balance by construction.
   */
  it('adds no equipment charge on top of the factored Purchased Amount', () => {
    const body = clause(EQUIPMENT_EXCLUSIVITY).body;

    expect(body).not.toContain('(Purchase Price × Factor Rate) + Equipment Cost Deferred');
    expect(body).toMatch(/without.*equipment or fee addition/);
    expect(clause(COMPLETION).body).toContain('never includes a fee, an equipment charge');
  });

  it('keeps the no-double-charge safeguard the memo says is worth keeping', () => {
    expect(clause(EQUIPMENT_EXPLAINER).body).toMatch(/does not pay .*twice|pay for the same equipment twice/);
  });

  it('sends ownership and delivery to the separate written agreement', () => {
    const body = clause(EQUIPMENT_EXPLAINER).body;

    expect(body).toMatch(/separate written agreement/);
    expect(body).toMatch(/cash price/);
  });

  /**
   * Both are gated on the same fact, so a funder that sells no equipment gets
   * neither. `include-when` on §002 and `both` on §003 in the cluster brief.
   */
  it.each([EQUIPMENT_EXPLAINER, EQUIPMENT_EXCLUSIVITY])('%s is selected only where there is equipment', (slug) => {
    const gate = clause(slug).includeWhen;

    expect(gate).not.toBeNull();
    expect(gate?.({ ...LOMBARD_FACTS, equipment: 'none' } as McaFacts)).toBe(false);
    expect(gate?.(LOMBARD_FACTS)).toBe(true);
  });
});

describe('the parties clause identifies the parties and transfers nothing', () => {
  it('drops the Seller alias the rest of the corpus never uses', () => {
    expect(clause(PARTIES).body).not.toContain('Seller');
  });

  it('separates signing from transfer', () => {
    const body = clause(PARTIES).body;

    expect(body).toContain('Purchase Date');
    expect(body).toContain('Section 4.13');
  });

  it('makes nobody a party by being named', () => {
    const body = clause(PARTIES).body;

    expect(body).toMatch(/not part(y|ies) to this Agreement/);
    expect(body).toMatch(/separately signs/);
  });

  /**
   * The `«N»` AcroForm anchors are kept where the current body has them. The
   * memo moves all three into Section 1; dropping them would break injection and
   * README rule 2 keeps them.
   */
  it.each(['«31»', '«96»', '«32»'])('keeps the %s widget anchor', (widget) => {
    expect(clause(PARTIES).body).toContain(widget);
  });
});

describe('§4.2 still means what §2.6 now says', () => {
  /**
   * RETAINED, and the memo retains it — but only because §2.6 was replaced
   * first. The cross-reference is the whole clause, so it is worth exactly what
   * it points at.
   */
  it('points at the Completion Threshold Section 2.6 defines', () => {
    expect(clause(TERM).body).toContain('Completion Threshold');
    expect(clause(TERM).body).toContain('Section 2.6');
    expect(clause(COMPLETION).body).toContain('(the “Completion Threshold”)');
  });

  /**
   * `acceleration-defeats-indefinite-term` is what made an indefinite term a
   * fiction: a default converted the uncollected Purchased Amount into a sum due
   * immediately, so the agreement had a maturity date after all. §6.2 closed it,
   * and §4.2 is only honest while that stays closed.
   */
  it('is not undone by an acceleration somewhere else', () => {
    expect(clause(REMEDIES).body).toContain('is not automatically due');
    expect(clause(COMPLETION).body).toMatch(/never includes/);
  });
});

describe('nothing in the cluster reaches past the purchased share', () => {
  /**
   * Written over all ten rather than clause by clause, because the defect this
   * cluster exists to close was **distributed**: a grant in §4.10, an
   * authorisation in §4.10's second paragraph, a covenant in §4.11 and a power
   * in §4.6, each of which alone looks like housekeeping.
   */
  /**
   * Grant-SHAPED phrases only. An earlier draft of this assertion rejected
   * "chattel paper, documents, instruments" anywhere in a body, and §4.10 as
   * rewritten trips it — in its EXCLUSION list. A check that cannot tell a grant
   * from a carve-out fails on the fix, which is worse than not checking: the
   * words are the same and only the verb differs. So the verb is what is
   * matched, and the exclusion is asserted positively above.
   */
  it.each(CLUSTER)('%s grants no all-assets interest', (slug) => {
    const body = clause(slug).body;

    expect(body).not.toMatch(/all of Merchant’s (assets|accounts)/);
    expect(body).not.toMatch(/first-priority security interest/);
    expect(body).not.toMatch(/grants? Buyer a security interest in all/);
    expect(body).not.toMatch(/security interest in:? \(a\)/);
  });

  it.each(CLUSTER)('%s makes no Guarantor an owner or a grantor', (slug) => {
    const body = clause(slug).body;

    expect(body).not.toMatch(/Merchant and Guarantor each (agree|agrees) (to execute|not to create)/);
    expect(body).not.toMatch(/Guarantor authorize Buyer to file/);
  });

  /**
   * The same rule Section 6 is held to. `frpa.definitions` bridges bare
   * "Receipts" to Card Receipts so that unrewritten clauses stop meaning three
   * things; a clause that has been rewritten and still says "Receipts" is a
   * clause whose reach cannot be read off the page.
   */
  it.each(CLUSTER)('%s names Card Receipts or Purchased Receipts, never bare Receipts', (slug) => {
    const bare = clause(slug).body.replace(/(Card|Purchased) Receipts/g, '');

    expect(bare).not.toContain('Receipts');
  });

  /**
   * And the grant this whole file measures against. If the granting clause ever
   * stops saying it owns nothing else, every assertion above is measuring
   * against a moved ruler.
   */
  it('measures against a granting clause that still sells only the percentage', () => {
    const body = clause(GRANT).body;

    expect(body).toContain('Specified Percentage of the Card Receipts');
    expect(body).toContain('Buyer owns nothing else');
  });
});

/**
 * Rule 1, restated for the clauses this cluster rewrote. Rewriting is the moment
 * it is easiest to forget: the text now looks better than what it replaced,
 * which is not the same as being approved.
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
