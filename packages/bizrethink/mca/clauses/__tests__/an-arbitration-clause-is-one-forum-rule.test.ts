// ADR 0011: citation assertions name semantic targets. Historical numbers in test titles identify the drafting regression.
import { describe, expect, it } from 'vitest';

import { selectClauses } from '../../engine/select-clauses';
import { containsPrescribedText, readSourceText } from '../../provenance/source-text';
import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { libraryFor } from '../library';
import type { McaClause } from '../types';

/**
 * ONE RULE PER SUBJECT, WHICHEVER FORUM THE FUNDER PICKS.
 *
 * `disputeResolution: 'arbitration'` selected **no merchant-facing clause at
 * all** until 2026-09-11. It dropped §§7.10, 7.11, 7.19 and 7.20 and put nothing
 * in their place, which `facts.ts` calls *"the weakest of the three available
 * positions"*: all three MCA forms filed as SEC exhibits in 2024-2026 pair
 * arbitration WITH a class waiver, and this corpus held the waiver and no
 * arbitration.
 *
 * WHY THE PROPERTY IS STATED OVER THE SET. An arbitration clause is the single
 * easiest place in a contract to create a second rule about where a dispute is
 * decided, because saying *how* a dispute is resolved is one sentence away from
 * saying *where*. This document has already paid for that: §7.5 fixed New York
 * law with New York and Pasco County forums while §7.24 claimed priority *"over
 * any different forum provision of this Agreement, including Section 7.5"*, and
 * REVIEW-01's `counterclaim-waiver-flips-by-forum` is the cost — the same
 * counterclaim sentence meant opposite things in the two forums Buyer could
 * choose between.
 *
 * So the assertions below are counts over the ASSEMBLED document, not
 * assertions about §7.26: *exactly one clause decides the forum, exactly one
 * decides class proceedings, exactly one decides counterclaims, exactly one
 * states a limitation period* — under **both** values of the fact. A
 * clause-by-clause reading of a well-drafted arbitration clause cannot see that
 * it is the second one.
 *
 * WHAT IT DOES NOT PROVE. That the arbitration agreement is enforceable, that a
 * class limb survives in any state, or that counsel would sign it. Every record
 * is `attorney-drafted` with a null author and `assertPublishable` refuses it.
 *
 * IT WAS RED BEFORE THE BODY EXISTED: **23 of its 31 assertions** — all four
 * count assertions under `arbitration`, each finding zero where it demanded one;
 * every §7.26 assertion; §7.19's gate and its period; and both Virginia
 * conformity assertions.
 *
 * EIGHT WERE GREEN ON THE FIRST RUN AND EACH IS EVIDENCE. Two read the vendored
 * Virginia bytes rather than our text and are the control that makes the
 * conformity pair mean anything — including a negative control on the summary a
 * reader would write from memory, which is the failure that put §6.2-2236(A)
 * into four places in this repository. One fires the detectors on v4 and market
 * sentences. Two assert nothing ungated reaches for an arbitration clause, which
 * an ungated §7.26 would break immediately. Three assert §§7.10, 7.11 and 7.20
 * stay courts clauses, which is what a careless partition would undo.
 *
 * Every assertion was additionally checked by mutation — ungating §7.26, letting
 * it name its own governing law, dropping the individual-basis limb, dropping
 * the arbitrator's fees, letting a hearing sit anywhere, regating §7.19 and
 * deleting its period — and each mutation turned this file red.
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

const ARBITRATION = 'frpa.arbitration-7-26';
const FORUM = 'frpa.binding-effect-governing-law-venue-and-jurisdiction-7-5';
const RIDERS = 'frpa.state-law-riders-7-24';
const JURY = 'frpa.jury-trial-waiver-7-10';
const CLASS = 'frpa.class-action-waiver-7-11';
const LIMITATIONS = 'frpa.contractual-statutes-of-limitations-7-19';
const COUNTERCLAIM = 'frpa.counterclaim-waiver-7-20';

const under = (disputeResolution: McaFacts['disputeResolution']): McaClause[] =>
  selectClauses({ facts: { ...LOMBARD_FACTS, disputeResolution }, instrument: 'frpa' }).selected;

const slugsUnder = (disputeResolution: McaFacts['disputeResolution']): string[] =>
  under(disputeResolution).map((entry) => entry.slug);

/*
  ─── the detectors ───────────────────────────────────────────────────────────

  Every one is proved able to fire on the v4 or market sentence it was written
  to catch, and proved NOT to fire on a denial. Both directions, because the
  failure this package shipped was not a detector that could not fire — it was
  a detector that excused the text it was written for.
*/

/** A sentence that sends a dispute to an arbitrator. */
const CHOOSES_ARBITRATION =
  /resolved by (?:final and )?binding arbitration|shall be arbitrated|submitted to arbitration/i;

/** A sentence that fixes which state's substantive law governs. */
const FIXES_GOVERNING_LAW =
  /law of the state of[^.]{0,90}governs this Agreement|governed by the laws? of the [Ss]tate/i;

/** A sentence that fixes the court an action is brought in. */
const FIXES_A_COURT = /(?:action|cause of action)[^.]{0,90}shall be brought in a[^.]{0,60}court/i;

/** A rule about class, collective or representative proceedings. */
const DECIDES_CLASS_PROCEEDINGS =
  /class, collective(?:,| or) representative[^.]{0,80}proceeding|as a class, a collective or a representative/i;

/** A rule about defences, setoff, recoupment and counterclaims. */
const DECIDES_COUNTERCLAIMS = /setoff, a recoupment and a counterclaim/i;

/** A rule that fixes how long there is to bring a claim. */
const STATES_A_LIMITATION_PERIOD =
  /shall be brought within[^.]{0,40}\byears?\b|must be commenced within[^.]{0,40}\byears?\b/i;

const countUnder = (disputeResolution: McaFacts['disputeResolution'], pattern: RegExp): string[] =>
  under(disputeResolution)
    .filter((entry) => pattern.test(entry.body))
    .map((entry) => entry.slug)
    .sort();

/**
 * The property, stated four times over the set.
 *
 * A document that answers one of these twice is the defect; a document that
 * answers one of them nought times is the hole arbitration used to be.
 */
describe('every assembled document answers each question exactly once', () => {
  it('decides the forum once — and only an arbitration document sends it to an arbitrator', () => {
    expect(countUnder('courts', CHOOSES_ARBITRATION)).toEqual([]);
    expect(countUnder('arbitration', CHOOSES_ARBITRATION)).toEqual([ARBITRATION]);
  });

  it('decides class proceedings once, under either value', () => {
    expect(countUnder('courts', DECIDES_CLASS_PROCEEDINGS)).toEqual([CLASS]);
    expect(countUnder('arbitration', DECIDES_CLASS_PROCEEDINGS)).toEqual([ARBITRATION]);
  });

  it('decides counterclaims and setoff once, under either value', () => {
    expect(countUnder('courts', DECIDES_COUNTERCLAIMS)).toEqual([COUNTERCLAIM]);
    expect(countUnder('arbitration', DECIDES_COUNTERCLAIMS)).toEqual([ARBITRATION]);
  });

  it('states a limitation period once, under either value', () => {
    expect(countUnder('courts', STATES_A_LIMITATION_PERIOD)).toEqual([LIMITATIONS]);
    expect(countUnder('arbitration', STATES_A_LIMITATION_PERIOD)).toEqual([LIMITATIONS]);
  });

  /**
   * AND THE ONE THE ARBITRATION CLAUSE MUST NOT TOUCH.
   *
   * §7.5 puts the governing law and the court in the merchant's state; §7.24
   * claims priority over any different forum provision "including Section 7.5".
   * An arbitration clause that also named a law or a court would be the third
   * rule on that subject — the defect §7.5 itself was carrying. Asserted as
   * *the set does not change*, so that a sentence sneaking into §7.26 is red
   * even if it agrees with §7.5 today.
   */
  it('adds no governing-law rule and no court-venue rule', () => {
    expect(countUnder('arbitration', FIXES_GOVERNING_LAW)).toEqual(countUnder('courts', FIXES_GOVERNING_LAW));
    expect(countUnder('arbitration', FIXES_A_COURT)).toEqual(countUnder('courts', FIXES_A_COURT));
    expect(FIXES_GOVERNING_LAW.test(body(ARBITRATION))).toBe(false);
    expect(FIXES_A_COURT.test(body(ARBITRATION))).toBe(false);
  });
});

const V4_SEVEN_FIVE_LAW =
  'This Agreement shall be governed by the laws of the State of New York, without regard to any applicable ' +
  'principles of conflicts of law.';

const V4_SEVEN_TWENTY_FOUR_VIRGINIA =
  'Where Merchant’s principal place of business is in Virginia, a cause of action arising under this Agreement ' +
  'shall be brought in a court in the Commonwealth of Virginia.';

const A_MARKET_ARBITRATION_CLAUSE =
  'Any dispute arising out of or relating to this Agreement shall be resolved by final and binding arbitration ' +
  'administered by the arbitration forum Buyer selects, and shall be arbitrated on an individual basis only.';

const V4_SEVEN_NINETEEN =
  'Each Merchant and Guarantor agrees that any claim that is not asserted against Buyer within one (1) year ' +
  'after its accrual will be time-barred and forever waived.';

describe('the detectors fire on the words they were written for', () => {
  it('catches a market arbitration clause, a governing-law sentence and a forum sentence', () => {
    expect(CHOOSES_ARBITRATION.test(A_MARKET_ARBITRATION_CLAUSE)).toBe(true);
    expect(FIXES_GOVERNING_LAW.test(V4_SEVEN_FIVE_LAW)).toBe(true);
    expect(FIXES_A_COURT.test(V4_SEVEN_TWENTY_FOUR_VIRGINIA)).toBe(true);
  });

  /**
   * The limitations detector is deliberately written against the words the
   * NEW §7.19 uses as well as v4's, because the change it guards is a period
   * being ADDED. v4's one-year clause used different vocabulary
   * — "not asserted … time-barred and forever waived" — and
   * `a-default-judgment-needs-a-served-defendant.test.ts` keeps the detector
   * for that vocabulary, which must stay absent.
   */
  it('catches a period however it is phrased, and v4’s one-sided one still reads as one-sided', () => {
    expect(STATES_A_LIMITATION_PERIOD.test(body(LIMITATIONS))).toBe(true);
    expect(/Merchant and Guarantor agrees/.test(V4_SEVEN_NINETEEN)).toBe(true);
    expect(/Merchant and Guarantor/.test(body(LIMITATIONS))).toBe(false);
  });

  it('does not fire on the clauses that deny what it looks for', () => {
    // §7.5 is the governing-law clause and must NOT read as an arbitration one.
    expect(CHOOSES_ARBITRATION.test(body(FORUM))).toBe(false);
    // §7.26 points at §7.5 for the law and the court, and a pointer is not a rule.
    expect(FIXES_GOVERNING_LAW.test(body(ARBITRATION))).toBe(false);
    // §7.11 decides class proceedings in a courts document and is not selected
    // in an arbitration one, so it cannot be a second rule there.
    expect(slugsUnder('arbitration')).not.toContain(CLASS);
  });
});

/**
 * Virginia is the only vendored statute in this repository that legislates
 * about arbitration, and it legislates about two things this clause has to get
 * right. Both are re-matched against the vendored bytes on every run, so a
 * re-vendoring that changes the Code breaks the test rather than the paper.
 */
describe('Va. Code §6.2-2234(B), read rather than summarised', () => {
  const VA = () => readSourceText('VA-Code-6.2-2228-2238.txt');

  const FACE_TO_FACE =
    'such contract shall not require face-to-face arbitration proceedings outside the jurisdiction where the ' +
    "recipient's principal place of business is located";

  const WHO_PAYS =
    "The provider shall pay any arbitrators' expenses or fees or any other expenses or administrative fees " +
    'incurred in the conduct of the arbitration proceedings.';

  it('is vendored, and says both of the things this clause was drafted against', () => {
    const text = VA();

    expect(text).not.toBeNull();
    expect(containsPrescribedText(text, FACE_TO_FACE)).toBe(true);
    expect(containsPrescribedText(text, WHO_PAYS)).toBe(true);
  });

  /**
   * The negative control. A containment check that has never failed is not yet
   * a check — and the sentence below is the summary a reader would write from
   * memory, which is exactly the failure mode that put §6.2-2236(A) into four
   * places in this repository before somebody opened the Code.
   */
  it('does not contain the summary somebody would write from memory', () => {
    expect(containsPrescribedText(VA(), 'arbitration must take place in the recipient’s home state')).toBe(false);
  });

  /**
   * Drafted nationally so that Virginia is satisfied by construction rather
   * than by a rider — the device §7.5 already uses for §6.2-2234(A), and the
   * reason §7.24's Virginia paragraph is a restatement rather than an override.
   */
  it('the clause puts any in-person hearing where the merchant’s business is', () => {
    const text = body(ARBITRATION);

    expect(text).toMatch(/in person/i);
    expect(text).toMatch(/principal place of business/);
    expect(text).toMatch(/after the dispute has arisen/);
  });

  it('the clause puts the arbitrator’s and administrative fees on Buyer', () => {
    const text = body(ARBITRATION);

    expect(text).toMatch(/Buyer shall pay the arbitrator’s fees/);
    expect(text).toMatch(/administrative fees/);
    // §6.3 holds the only enforcement-cost entitlement and the only ceiling.
    expect(text).toContain('Section [[clause:frpa.costs-of-collection-6-3]]');
    expect(text).not.toMatch(/twenty-five percent|25%/);
  });
});

describe('the arbitration clause is bilateral, and takes nothing it may not take', () => {
  it('arbitrates on an individual basis, which is the market pairing the corpus lacked', () => {
    const text = body(ARBITRATION);

    expect(text).toMatch(/individual basis/i);
    expect(text).toMatch(/may not consolidate/i);
  });

  /**
   * `a-merchant-can-complain-to-a-regulator.test.ts` states the property over
   * the corpus; this states it for the one clause that could newly break it.
   * A class limb that reached a public-enforcement right, or that stopped a
   * merchant talking to a regulator, would be that break.
   */
  it('reaches no public-enforcement right and no complaint to a regulator', () => {
    const text = body(ARBITRATION);

    expect(text).toMatch(/public-enforcement/);
    expect(text).toMatch(/governmental or regulatory authority/);
    expect(text).toMatch(/does not (?:waive|prevent)/i);
  });

  /** A waiver that survives being held invalid is a waiver that takes the whole clause down with it. */
  it('sends a claim to a court if the individual-basis limb does not hold', () => {
    expect(body(ARBITRATION)).toMatch(/decided by a court/i);
  });

  it('binds nobody who has not signed', () => {
    expect(body(ARBITRATION)).toMatch(/who (?:is|are) not a party|has not signed/i);
  });

  /** Arbitration is chosen; the consequence is stated rather than buried. */
  it('says a dispute in arbitration is not decided by a judge or a jury', () => {
    expect(body(ARBITRATION)).toMatch(/not by a judge or a jury/);
  });
});

/**
 * §7.19's gate, and the reason it goes.
 *
 * ADR 0013's diagnostic: *"If the two limbs bind different parties or answer
 * different questions, the gate is misattributed rather than too coarse"*, and
 * the fix is `includeWhen: null` plus a cross-reference. `disputeResolution`
 * answers WHERE a claim is heard; §7.19 answers HOW LONG there is to bring it,
 * and that answer is the same in both forums.
 *
 * **It was defensible while §7.19 only disclaimed.** Its own comment recorded
 * that its absence under arbitration was *"a redundancy rather than a hole"*,
 * which was true of a clause that said the law's periods apply and this
 * Agreement shortens none. It stopped being true on 2026-09-11, when the owner
 * put an operative two-year period in it: a gated §7.19 would give the
 * arbitration template no period at all, and the alternative — restating the
 * period inside §7.26 — is two rules on one subject.
 */
describe('the limitation period is one rule, in both forums', () => {
  it('§7.19 is ungated', () => {
    expect(clause(LIMITATIONS).includeWhen).toBeNull();
  });

  it('states a mutual two-year period', () => {
    const text = body(LIMITATIONS);

    expect(text).toMatch(/two \(2\) years/);
    expect(text).toMatch(/every party alike/);
    expect(text).toMatch(/neither party has a longer or a shorter period than the other/);
  });

  /**
   * The carve-out survives the period and is NOT narrowed by it. This is the
   * half of the clause REVIEW-01's consequence paragraph is about: v4 saved a
   * claim only "to the extent such limitation is prohibited", which may not
   * reach a state commercial-financing statute whose period is not expressly
   * declared non-waivable.
   */
  it('does not shorten a claim the law does not permit to be shortened', () => {
    const text = body(LIMITATIONS);

    expect(text).toMatch(/does not permit to be shortened or given up/);
    expect(text).toMatch(/does not apply to it/);
  });

  /** The rule reaches both forums without citing a clause that is not always there. */
  it('reaches arbitration without citing a gated clause', () => {
    expect(body(LIMITATIONS)).not.toContain('Section [[clause:frpa.arbitration-7-26]]');
    expect(body(LIMITATIONS)).toMatch(/however it is heard/);
    expect(body(ARBITRATION)).toContain('Section [[clause:frpa.contractual-statutes-of-limitations-7-19]]');
  });
});

/**
 * A GATED CLAUSE MAY NOT BE CITED BY AN UNGATED ONE, AND A REFERENCE BY NAME IS
 * INVISIBLE TO THE CHECK THAT ENFORCES IT.
 *
 * `engine/__tests__/select-clauses.test.ts` reads `Section N` tokens. It cannot
 * see "the arbitration provision of this Agreement", and a sentence like that
 * in an ungated clause would dangle in every courts template with nothing red.
 */
describe('nothing ungated reaches for the arbitration clause', () => {
  it('no ungated clause cites §7.26 by number', () => {
    const offenders = FRPA.filter((entry) => entry.includeWhen === null)
      .filter((entry) => entry.body.includes('Section 7.26'))
      .map((entry) => entry.slug);

    expect(offenders).toEqual([]);
  });

  it('no ungated clause names arbitration at all', () => {
    const offenders = FRPA.filter((entry) => entry.includeWhen === null)
      .filter((entry) => /\barbitrat/i.test(entry.body))
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });

  /** And the converse: everything §7.26 cites is in an arbitration document. */
  it('§7.26 cites only clauses an arbitration document contains', () => {
    // ADR 0011: verify intended identities, including aliases for full recourse.
    const references = new Set(under('arbitration').map((entry) => entry.referenceId ?? entry.slug));
    const cited = [...body(ARBITRATION).matchAll(/\[\[clause:([^\]]+)\]\]/g)].map((match) => match[1]);
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.filter((reference) => !references.has(reference))).toEqual([]);
  });
});

describe('§7.26 exists only where the funder chose it, and carries the same provenance', () => {
  it('is selected under arbitration and not under courts', () => {
    expect(slugsUnder('arbitration')).toContain(ARBITRATION);
    expect(slugsUnder('courts')).not.toContain(ARBITRATION);
  });

  /** §7.10's jury waiver is meaningless once there is no judge; it still drops. */
  it.each([JURY, CLASS, COUNTERCLAIM])('%s is still a courts clause', (slug) => {
    expect(slugsUnder('courts')).toContain(slug);
    expect(slugsUnder('arbitration')).not.toContain(slug);
  });

  it('is attorney-drafted with no author and names the reviews that read the subject', () => {
    expect(clause(ARBITRATION).source).toEqual({ kind: 'attorney-drafted', author: null });
    expect(clause(ARBITRATION).status).toBe('draft');
    expect(clause(ARBITRATION).examinedBy.length).toBeGreaterThan(0);
  });

  it('names no tenant, cites no case, and uses no party placeholder', () => {
    const text = body(ARBITRATION);

    expect(text).not.toMatch(/Lombard|Payzli/);
    expect(text).not.toMatch(/\bAD3d\b|\bNY3d\b|Richmond Capital|Apollo Funding|LG Funding|Principis|Grafton/);
    expect(text).not.toMatch(/\{\{/);
  });

  /** Nobody has a second §7.26, and §7.25 keeps its own number. */
  it('takes a section number no other record holds', () => {
    expect(
      FRPA.filter((entry) => (entry.referenceId ?? entry.slug) === ARBITRATION).map((entry) => entry.slug),
    ).toEqual([ARBITRATION]);
  });
});
