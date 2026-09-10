import { describe, expect, it } from 'vitest';

import { LOMBARD_FACTS } from '../facts';
import { libraryFor } from '../library';

/**
 * A REPRESENTATION IS A STATEMENT OF PRESENT FACT, OR THIS FAILS.
 *
 * Section 5 is where an agreement whose whole premise is that the FUNDER bears
 * the risk of non-generation quietly hands that risk back. Fourteen clauses,
 * one defect: each of them, read alone, is a plausible thing to ask a merchant
 * to say. Read together, and read through §6.1.1 — *"Merchant shall violate any
 * term or covenant"* — and §9.2(b), they make ordinary business deterioration a
 * breach, and then make a human being personally answerable for it.
 *
 * WHAT THIS ASSERTS THAT NO OTHER TEST DOES. `one-settlement-base` asks whether
 * the spine's eight clauses measure the same asset. `library.test.ts` asks
 * whether a clause is publishable. `every-clause-has-content` asks whether it
 * has words. None of them can see a clause that is coherent, populated,
 * unpublishable and still a promise about the future — and that is the only
 * defect this cluster exists to remove.
 *
 * THE SHAPE OF THE PROPERTY. Two halves, and both are needed.
 *
 *   1. **Nothing in the cluster carries continuing-promise vocabulary.** A
 *      denylist over the fourteen bodies. Necessary, and on its own worthless:
 *      it is satisfied by deleting Section 5 entirely.
 *   2. **Each clause that could still be READ as a promise says in terms that
 *      it is not.** A required sentence per clause. This is the half that
 *      cannot be satisfied by deletion, and the half that survives a later
 *      editor putting the words back in different vocabulary.
 *
 * WHAT IT DOES NOT PROVE. That any of this text is lawful, that counsel would
 * sign it, or that the risk allocation it states is the one a court would
 * enforce. Every clause here is `attorney-drafted` with a null author and
 * `assertPublishable` refuses all fourteen.
 *
 * IT WAS RED BEFORE THE REWRITE — on the denylist, on every required sentence,
 * on the §5.17/§2.4 reconciliation and on §5.10's gate. Two assertions in the
 * disclosure half of this package once filtered on `Divergence` kinds that did
 * not exist and passed vacuously for a day; the anti-vacuity block below is
 * that lesson written down.
 */
const clauses = libraryFor('frpa');

const clause = (slug: string) => {
  const found = clauses.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the FRPA library`);
  }

  return found;
};

const body = (slug: string) => clause(slug).body;

const NOT_A_LOAN = 'frpa.advances-are-not-loans-5-1';
const FINANCIALS = 'frpa.financial-condition-and-financial-information-5-2';
const APPROVALS = 'frpa.governmental-approvals-5-3';
const AUTHORITY = 'frpa.authorization-5-4';
const INSURANCE = 'frpa.insurance-5-5';
const ACCOUNT = 'frpa.the-account-5-6';
const ESTOPPEL = 'frpa.estoppel-certificate-5-8';
const BANKRUPTCY = 'frpa.no-bankruptcy-5-9';
const ENCUMBRANCE = 'frpa.no-encumbrance-of-receipts-5-10';
const PURPOSE = 'frpa.business-purpose-5-12';
const PROCEEDINGS = 'frpa.civil-criminal-regulatory-matters-5-14';
const CLOSURE = 'frpa.business-closure-5-15';
const DIVERSION = 'frpa.no-diversion-of-receipts-5-17';
const CHANGES = 'frpa.change-of-name-or-location-or-sale-or-closing-of-business-5-18';

/** The fourteen this cluster owns. */
const MINE = [
  NOT_A_LOAN,
  FINANCIALS,
  APPROVALS,
  AUTHORITY,
  INSURANCE,
  ACCOUNT,
  ESTOPPEL,
  BANKRUPTCY,
  ENCUMBRANCE,
  PURPOSE,
  PROCEEDINGS,
  CLOSURE,
  DIVERSION,
  CHANGES,
];

/**
 * The four clauses that sit in Section 5 and belong to somebody else.
 *
 * NAMED RATHER THAN SILENTLY SKIPPED. A denylist scoped to "the clauses I
 * happened to edit" is a denylist that passes by construction. These four are
 * excluded because another cluster is rewriting them, and each is listed with
 * where it went, so the exclusion can be removed when that cluster lands rather
 * than quietly outliving its reason.
 *
 *   - the lead-in, §5.11 and §5.13 are the GUARANTY cluster's, because what
 *     makes them dangerous is §9.2(b) rather than their own words;
 *   - §5.16 (stacking) is RENEWAL-POSITIONS', and §4.15 cites it by number.
 */
const OTHER_CLUSTERS = [
  'frpa.representations-lead-in',
  'frpa.unencumbered-receipts-5-11',
  'frpa.defaults-under-other-contracts-improper-transfers-5-13',
  'frpa.stacking-prohibited-5-16',
];

describe('the cluster is the whole of Section 5, minus what is named', () => {
  it('holds fourteen clauses, each in the library', () => {
    expect(MINE).toHaveLength(14);
    expect(new Set(MINE).size).toBe(14);

    for (const slug of MINE) {
      expect(clause(slug).section).toBe('representations');
    }
  });

  /**
   * The anti-vacuity assertion. If a Section 5 clause appears that is in
   * neither list, the denylist below stops being a statement about Section 5
   * and becomes a statement about whichever clauses somebody remembered.
   */
  it('accounts for every representation, so nothing escapes the denylist unnoticed', () => {
    const inSection = clauses
      .filter((entry) => entry.section === 'representations')
      .map((entry) => entry.slug)
      .sort();

    expect(inSection).toEqual([...MINE, ...OTHER_CLUSTERS].sort());
  });

  /**
   * §5.7 is `[Reserved]` in v4 and is deliberately not a clause — one of the
   * four records removed when `frpa-coverage` settled on 97. REVIEW-02's
   * `frpa-5-7-duplicates-5-18` names a §5.7 that no longer has any text, so
   * there is nothing in this cluster to deduplicate against.
   */
  it('has no §5.7 to retain, because the document reserves it', () => {
    expect(clauses.some((entry) => entry.number === '5.7')).toBe(false);
  });
});

/**
 * Half one. Vocabulary that makes a representation continue.
 *
 * Every entry below appears in v4 today, in a clause of this cluster, and every
 * one of them was red when this file was written.
 */
const CONTINUING_PROMISE: { pattern: RegExp; why: string }[] = [
  {
    pattern: /material adverse change/i,
    why: 'a no-material-adverse-change promise is a warranty that the business will not deteriorate',
  },
  {
    pattern: /continuing affirmative obligation/i,
    why: 'an open-ended duty to report deterioration is the same promise stated as a covenant',
  },
  {
    pattern: /shall comply with, all applicable/i,
    why: 'an absolute future compliance covenant makes an unknown technical lapse a breach',
  },
  {
    pattern: /must deposit all Receipts/i,
    why: 'a daily all-receipts deposit duty is unperformable, and an unperformable covenant is a trap',
  },
  {
    pattern: /add an additional Account/i,
    why: '§2.4 lets an account be added on notice; §5.17 may not forbid it',
  },
  /*
    `/one and only one/` was here and has been REMOVED. It is v4's §2.4
    vocabulary and has never appeared in a Section 5 body, so it passed on the
    first run — a green assertion that could not have been red, which is the
    exact defect two assertions in the disclosure half of this package carried
    for a day. The §2.4 contradiction it was meant to guard is caught by the
    entry above, which was genuinely red.
  */
  {
    pattern: /will not voluntarily close/i,
    why: 'a ban on voluntary closure reads as compelling a merchant to keep trading to fund repayment',
  },
  {
    pattern: /no current plans to close/i,
    why: 'a plans representation with no materiality gate captures a vacation',
  },
  {
    pattern: /At no time during the six \(6\) months/i,
    why: 'a six-month lookback over every temporary closure captures repairs and seasonal shutdowns',
  },
  {
    pattern: /does not contemplate/i,
    why: 'a representation about what a merchant contemplates chills lawful restructuring advice',
  },
  {
    pattern: /material breach of this Agreement/i,
    why: 'an immediate material-breach label conflicts with notice and cure',
  },
  {
    pattern: /prior written consent of Buyer/i,
    why: 'consent gates over ordinary operating decisions are how business risk returns to the merchant',
  },
];

describe('no representation is a continuing promise about future performance', () => {
  it.each(CONTINUING_PROMISE)('carries no clause saying $why', ({ pattern }) => {
    const offenders = MINE.filter((slug) => pattern.test(body(slug)));

    expect(offenders).toEqual([]);
  });

  /**
   * The lead-in scopes the whole Section and is the guaranty cluster's. This
   * cluster must not depend on that fix, so every clause below carries its own
   * temporal anchor rather than borrowing one.
   */
  it.each([
    FINANCIALS,
    APPROVALS,
    BANKRUPTCY,
    PROCEEDINGS,
    CLOSURE,
    PURPOSE,
  ])('%s anchors itself to a moment rather than to the term', (slug) => {
    expect(body(slug)).toMatch(/Purchase Date|stated dates|when furnished|before the Purchase Date/);
  });
});

/**
 * Half two. Deletion satisfies the denylist; it does not satisfy this.
 *
 * Each of these clauses can still be READ as a promise about the future by a
 * funder's counsel in a dispute, so each says in terms that it is not one.
 */
describe('each clause that could be read as a promise says it is not', () => {
  it('§5.2 makes a later decline in the business not a breach', () => {
    const text = body(FINANCIALS);

    expect(text).toMatch(/To Merchant’s knowledge after reasonable inquiry/);
    expect(text).toMatch(/A later adverse change/);
    expect(text).toMatch(/is not a breach/);
    expect(text).toContain('Event of Default');
  });

  it('§5.3 keeps a knowledge qualifier, a contest right and no future-solvency warranty', () => {
    const text = body(APPROVALS);

    expect(text).toMatch(/To Merchant’s knowledge after reasonable inquiry/);
    expect(text).toMatch(/contested in good faith/);
    expect(text).toMatch(/is not itself an Event of Default/);
  });

  it('§5.6 sends account changes to §2.4 and makes none of them a default', () => {
    const text = body(ACCOUNT);

    expect(text).toContain('Section 2.4');
    expect(text).toMatch(/No account change/);
    expect(text).toMatch(/Event of Default/);
  });

  it('§5.9 reaches only proceedings already filed, and never a later filing', () => {
    const text = body(BANKRUPTCY);

    expect(text).toMatch(/actual knowledge/);
    expect(text).toMatch(/pending on the Purchase Date/);
    expect(text).toMatch(/are not Events of Default/);
    expect(text).toMatch(/makes no representation about whether it may later seek/);
  });

  it('§5.14 warrants nothing about future litigation or its outcome', () => {
    const text = body(PROCEEDINGS);

    expect(text).toMatch(/actual knowledge/);
    expect(text).toMatch(/not a warranty against future litigation/);
  });

  it('§5.15 aims at concealed permanent closure and promises no minimum term', () => {
    const text = body(CLOSURE);

    expect(text).toMatch(/has disclosed/);
    expect(text).toMatch(/permanently discontinue/);
    expect(text).toMatch(/is not a breach/);
    expect(text).toMatch(/does not promise to operate for a minimum period/);
  });

  it('§5.18 lets the merchant close, move and renovate in good faith', () => {
    const text = body(CHANGES);

    expect(text).toMatch(/decide in good faith/);
    expect(text).toMatch(/whether to close temporarily/);
    expect(text).toMatch(/whether to close permanently/);
    expect(text).toMatch(/do not themselves create an Event of Default/);
    expect(text).toMatch(/liability for receipts never generated/);
  });

  /**
   * v4's §6.1.4 defaulted on a transfer of substantially all assets *"other than
   * in a transaction permitted by Section 5.18"*, while §5.18 permitted none —
   * REVIEW-02's `frpa-6-1-4-defaults-on-a-sale-5-18-expressly-permits`. Removing
   * §5.18's consent gate without saying what IS permitted makes that finding
   * worse, not better: every sale becomes a default because none is permitted by
   * a Section that permits nothing.
   *
   * ONLY §5.18 IS ASSERTED, DELIBERATELY. The obvious companion assertion — that
   * some clause outside Section 5 still cites §5.18 — is an assertion about the
   * default-remedies cluster's draft, which was being rewritten in this checkout
   * while this was written and which has since replaced §6.1's fifteen limbs
   * with a closed list of three. Pinning another cluster's cross-reference from
   * here would make this file a tripwire on their work. The coupling is reported
   * instead.
   */
  it('§5.18 permits a sale in terms rather than merely dropping the ban', () => {
    expect(body(CHANGES)).toMatch(/permitted by this Section/);
  });
});

/**
 * CROSS-REFERENCE 3, handed over by the spine. §5.17 forbade adding an account
 * and required every Receipt in the Approved Bank Account; §2.4 now lets an
 * account or a processor be added on notice and says an outage is not a
 * default. Both cannot stand.
 */
describe('§5.17 reconciles with §2.4 rather than contradicting it', () => {
  it('forbids no account and requires no daily deposit', () => {
    const text = body(DIVERSION);

    expect(text).not.toMatch(/Approved Bank Account on a daily basis/);
    expect(text).not.toMatch(/close the Approved Bank Account/);
    expect(text).toContain('Section 2.4');
  });

  it('leaves non-card receipts and the merchant’s own share alone', () => {
    const text = body(DIVERSION);

    expect(text).toMatch(/[Nn]on-card/);
    expect(text).toMatch(/retained (percentage|share)/);
  });

  it('says what is not diversion, so an ordinary settlement lag cannot be one', () => {
    const text = body(DIVERSION);

    for (const excuse of ['settlement', 'refund', 'chargeback', 'reserve', 'holiday', 'good-faith']) {
      expect(text.toLowerCase()).toContain(excuse);
    }
  });

  /**
   * §9.2(c) cites *"the conduct described in Section 5.17"* by number, and §9.2
   * is not this cluster's to edit. Narrowing §5.17 to a bare pointer at §2.4
   * would orphan the one limb of the guaranty that Lombard's published
   * commitment #3 expressly keeps — *"deliberately routing card volume away to
   * avoid remitting"*.
   *
   * v4's §6.2 cited §5.17 the same way. It no longer does: the default-remedies
   * cluster rewrote Section 6 in this checkout while this file was being
   * written, and its §6.1 now states intentional diversion as its own limb (b)
   * rather than by reference. That is their call and not a red here; §9.2 is
   * asserted because the guaranty brief keeps that citation, and the coupling to
   * Section 6 is reported rather than pinned.
   */
  it('keeps a describable intentional-diversion covenant for §9.2(c) to reach', () => {
    const text = body(DIVERSION);

    expect(text).toMatch(/intentionally (conceal|divert)/);

    const citing = clauses.filter((entry) => entry.body.includes('Section 5.17')).map((entry) => entry.number);

    expect(citing).toContain('9.2');
  });
});

describe('the collateral clauses stop pretending the collateral is property', () => {
  it('§5.5 requires no loss payee and assigns no policy', () => {
    const text = body(INSURANCE);

    expect(text).not.toMatch(/loss payee/);
    expect(text).toMatch(/does not require insurance/);
    expect(text).toMatch(/No insurance policy is assigned/);
    expect(text).toMatch(/equipment agreement/);
  });

  it('§5.10 states the negative pledge once, in §4.11', () => {
    const text = body(ENCUMBRANCE);

    expect(text).toContain('Section 4.11');
    expect(text).not.toMatch(/ranking after the Specified Percentage/);
    expect(text).toMatch(/obtains no security interest and no priority/);
  });

  /**
   * Both are about equipment that may not be in the deal at all, so both are
   * selected by the `equipment` fact. The gate has to be REAL — a predicate
   * that returns true for every value is a field with no user — and it has to
   * leave `LOMBARD_FACTS` selecting the whole FRPA, which
   * `engine/__tests__/select-clauses.test.ts` requires.
   */
  it.each([INSURANCE, ENCUMBRANCE])('%s is gated on the equipment fact, and Lombard still selects it', (slug) => {
    const gate = clause(slug).includeWhen;

    expect(gate).not.toBeNull();
    expect(gate?.(LOMBARD_FACTS)).toBe(true);
    expect(gate?.({ ...LOMBARD_FACTS, equipment: 'none' })).toBe(false);
  });
});

describe('the two clauses the memo does not replace', () => {
  /**
   * §5.1's substance is retained; what goes is the merchant CERTIFYING a legal
   * conclusion it is in no position to certify, and a heading that calls a
   * purchase an advance.
   */
  it('§5.1 states a mutual allocation instead of asking the merchant to certify one', () => {
    const text = body(NOT_A_LOAN);

    expect(clause(NOT_A_LOAN).heading).not.toMatch(/Advances/);
    expect(text).not.toMatch(/Merchant fully understands/);
    expect(text).toMatch(/The parties agree/);
    expect(text).toMatch(/Buyer assumes the risk/);
    expect(text).toMatch(/does not warrant/);
    expect(text).toMatch(/waives (no|any)|Nothing in this Section waives/);
  });

  /**
   * §5.4 is RETAINED, and pinning it is how the retention stays a decision. The
   * memo's dependency is diligence, not drafting: this clause does not verify
   * the signatory and does not stand in for a guarantor's own signature.
   */
  it('§5.4 is retained word for word', () => {
    expect(body(AUTHORITY)).toBe(
      'Merchant, and the person(s) signing this Agreement on behalf of Merchant, have full power and authority to incur and perform the obligations under this Agreement, all of which have been duly authorized.',
    );
  });
});

describe('§5.12 works for the merchants we will actually see', () => {
  it('identifies a sole proprietor rather than assuming an entity', () => {
    const text = body(PURPOSE);

    expect(text).toMatch(/sole proprietor/);
    expect(text).not.toMatch(/good standing/);
  });

  /**
   * REVIEW-02's `frpa-5-12-does-not-state-the-merchants-principal-place-of-business`:
   * a Business Address is not a principal place of business, and neither is the
   * location from which the business is directed. Which state's law applies
   * turns on the second.
   */
  it('states the place the business is directed from, not just an address', () => {
    const text = body(PURPOSE);

    expect(text).toMatch(/principally directed or managed/);
    expect(text).toMatch(/Buyer shall verify/);
    expect(text).toMatch(/personal, family, or household/);
  });
});

describe('§5.8 is a confirmation a merchant can actually give', () => {
  it('gives ten Workdays and a copy of what it is being asked to confirm', () => {
    const text = body(ESTOPPEL);

    expect(text).not.toMatch(/one \(1\) day/);
    expect(text).toMatch(/ten \(10\) Workdays/);
    expect(text).toMatch(/supporting ledger/);
  });

  it('lets the merchant disagree without that being a default or an admission', () => {
    const text = body(ESTOPPEL);

    expect(text).toMatch(/disput/);
    expect(text).toMatch(/is not an Event of Default/);
    expect(text).toMatch(/admission/);
  });
});

/**
 * Rewriting is the moment provenance is easiest to lose, because the text now
 * reads better than what it replaced — which is not the same as being approved.
 */
describe('rewriting changed nothing about provenance', () => {
  it.each(MINE)('%s is still attorney-drafted with no author', (slug) => {
    expect(clause(slug).source).toEqual({ kind: 'attorney-drafted', author: null });
    expect(clause(slug).status).toBe('draft');
  });

  it.each(MINE)('%s still names the review that read it', (slug) => {
    expect(clause(slug).examinedBy.length).toBeGreaterThan(0);
  });

  it.each(MINE)('%s names no tenant', (slug) => {
    expect(body(slug)).not.toMatch(/Lombard|Payzli/);
  });

  /**
   * The standing brief: cite authority in the code comment, marked UNVERIFIED,
   * never in a clause body. Nobody on this project has pulled one of these from
   * an official reporter.
   */
  it.each(MINE)('%s cites no case in its body', (slug) => {
    expect(body(slug)).not.toMatch(/\bAD3d\b|\bNY3d\b|Richmond Capital|Apollo Funding|LG Funding|Principis|Grafton/);
  });
});
