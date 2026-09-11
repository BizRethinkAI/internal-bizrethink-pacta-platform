import { describe, expect, it } from 'vitest';

import { LOMBARD_FACTS } from '../facts';
import { ALL_MCA_CLAUSES, libraryFor } from '../library';
import { applyTwinVocabulary, EQUIPMENT_TWIN, twinDivergence } from '../twins';
import type { McaClause } from '../types';

/**
 * THE SAME PERSON, THE SAME ENVELOPE, AND THE DOCUMENT THAT TAKES BACK WHAT THE
 * FRPA GAVE.
 *
 * `instrumentsFor(LOMBARD_FACTS)` returns six instruments, because
 * `LOMBARD_FACTS.equipment` is `merchant-elects` and `select-clauses.ts` returns
 * both twins whenever it is not `'none'`. So a merchant signs the rewritten FRPA
 * and then, in the same envelope, a natural person signs an Equipment Lease or a
 * Subscription guaranty that — before this change — said:
 *
 *   > *"I understand that the cost of litigating in Florida may be in excess of
 *   > the amount at stake in the litigation. Nonetheless, I waive any objection
 *   > that such courts are an inconvenient forum … upon such mailing, service
 *   > shall be effective irrespective of whether a signed certified mail return
 *   > receipt is returned."*
 *
 * That is the FRPA's §7.12 defect, given by a human being rather than a company,
 * in a document §7.8 correctly calls a **different contract** — which is exactly
 * why the FRPA's protections do not reach it and why the fix has to be made
 * here.
 *
 * WHY THE PROPERTY IS STATED OVER THE SET OF BOTH DOCUMENTS, NOT PER CLAUSE.
 * Two reasons, and the second is the one that made this work necessary at all.
 *
 * The Equipment Lease and the Subscription are one document published twice —
 * `twins.ts`, REVIEW-02: *"a fix applied to one and not the other is a
 * divergence nothing checks for."* A per-clause assertion written against
 * `equipment-lease.*` would pass while the Subscription still shipped the
 * defect.
 *
 * And the defect is never in one clause. Venue is fixed in §3.15, recited again
 * in §4.3, and the waiver of the objection to it is in a third sentence of §4.3
 * that reads as an aside. The one-year period is in §3.15C **and** §4.4. The
 * jury waiver is in §3.15A **and** §4.4. A reviewer reading §4.4 alone sees a
 * short paragraph; the corpus holds the same rule twice in each of two live
 * templates, four copies, and the reviews that found them scoped them to one
 * document at a time.
 *
 * WHAT THIS DOES NOT PROVE. That any of this is lawful in any state. That a
 * customer-state forum clause binds. That a jury waiver limited to forums which
 * give effect to one behaves as drafted. Nothing here is approved: every record
 * is `attorney-drafted` with `author: null`, and `assertPublishable` refuses all
 * of them.
 *
 * VERIFIED / UNVERIFIED, kept apart on purpose.
 *
 *   - VERIFIED, `mca/sources/CT-CGS-36a-861-872.txt`: Conn. Gen. Stat.
 *     §36a-861(6)(E) excludes from "Provider" a *"person or provider who extends
 *     or brokers a lease, as defined in section 42a-2A-102"*, and §36a-868 bites
 *     only on a "commercial financing contract". REVIEW-02's finding
 *     `el-4-3-makes-service-effective-on-mailing-where-the-frpa-requires-receipt`
 *     relies on that exclusion to say Connecticut is not engaged here.
 *   - UNVERIFIED, AND IT CUTS THE OTHER WAY FOR ONE TWIN ONLY. Conn. Gen. Stat.
 *     §42a-2A-102 is not vendored in this repository and nobody on this project
 *     has read it. Article 2A's definition of "lease" excludes a transaction
 *     that creates a security interest, and the **Equipment Lease's own §3.6**
 *     says in terms that it *"creates a security interest in the Equipment in
 *     our favour rather than a true lease"*. The Subscription's §3.6 says the
 *     opposite — treated as a lease, with a security interest claimed only if a
 *     court finds Article 2A does not govern. So the exclusion REVIEW-02 relies
 *     on may reach one twin and not the other. Recorded in a comment, never in a
 *     clause body, and answered by drafting: neither document gives up notice, a
 *     hearing or a prior court order, so the question does not have to be
 *     resolved before either can be read.
 */
const LEASE = libraryFor('equipment-lease');
const SUBSCRIPTION = libraryFor('subscription');
const TWINS: McaClause[] = [...LEASE, ...SUBSCRIPTION];

/** The five section numbers this rewrite touches, in both documents. */
const REWRITTEN = ['3.14', '3.15', '3.16', '4.3', '4.4'];

const clause = (slug: string): McaClause => {
  const found = ALL_MCA_CLAUSES.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the MCA library`);
  }

  return found;
};

/** Both twins' record for a section number, so an assertion cannot name one. */
const both = (number: string): McaClause[] => {
  const pair = TWINS.filter((entry) => entry.number === number);

  if (pair.length !== 2) {
    throw new Error(`§${number} should exist in both twins; found ${pair.length}`);
  }

  return pair;
};

const sentences = (body: string): string[] =>
  body
    .split(/\n|(?<=[.;:])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

const offenders = (set: readonly McaClause[], detector: (body: string) => boolean): string[] =>
  set
    .filter((entry) => detector(entry.body))
    .map((entry) => entry.slug)
    .sort();

/*
  ─── the detectors ───────────────────────────────────────────────────────────

  RESTATED RATHER THAN IMPORTED FROM
  `a-default-judgment-needs-a-served-defendant.test.ts`, deliberately. A shared
  detector module would mean weakening one file's regex silently weakens the
  other's property, and each file's whole claim to be evidence is that its own
  detectors are proved to fire on the real words of the real document and proved
  not to fire on this corpus's denials. Two files, two proofs.

  EVERY DETECTOR MATCHES AN AFFIRMATIVE CONSTRUCTION ONLY. None of them strips a
  negation before matching. `fees-and-money` shipped an assertion that passed
  because a negation-aware detector excused the exact text it was written to
  catch, and the corpus this sweeps is full of denials — "contains no waiver",
  "No party waives", "is not service". Those are proved not to fire by the
  controls at the bottom of this file rather than by a rule that removes them.

  THE KNOWN LIMIT, STATED SO IT IS NOT DISCOVERED LATER. A verb-based detector
  cannot see a waiver written as a noun ("the parties' waiver of any objection to
  venue is irrevocable"). That is why the four sentences this change removes are
  ALSO banned by their exact words further down: a general detector that can be
  reworded around, plus a literal ban that cannot.
*/

/** A sentence that is about judicial process at all. */
const ABOUT_SERVICE =
  /\bservice of (?:process|legal process|any summons)\b|\blegal process\b|\bjudicial process\b|\bserve (?:me|you|us|it|them) with\b|\bservice hereunder\b/i;

/** …and that turns an act of the sender into service, or completes it. */
const MAKES_SERVICE =
  /service[^.]{0,90}(?:shall|will) be (?:effective|complete|sufficient)|(?:shall|will) be effective irrespective|(?:shall|will) constitute (?:valid and lawful )?service|upon such mailing|to the last known address (?:shall|will) be sufficient/i;

const deemsService = (body: string): boolean =>
  sentences(body).some((sentence) => ABOUT_SERVICE.test(sentence) && MAKES_SERVICE.test(sentence));

/**
 * A party giving up service, or the objection to its absence, or the objection
 * that a court is the wrong or an inconvenient place.
 */
const WAIVES_SERVICE_OR_FORUM =
  /\b(?:waives?|waiving|agrees? to waive|hereby waives?|relinquishes?)\b[^.]{0,150}(?:inconvenient forum|personal service|absence of formal service|objections? to (?:the )?(?:absence of formal service|service|jurisdiction|venue)|objection[^.]{0,60}(?:forum|venue|jurisdiction))/i;

const waivesServiceOrForum = (body: string): boolean =>
  sentences(body).some((sentence) => WAIVES_SERVICE_OR_FORUM.test(sentence));

/**
 * A sentence that fixes a named place as the law or the forum.
 *
 * Both halves are required. "Florida" alone catches the parties paragraph of
 * each twin, which says the counterparty is *"a Florida limited liability
 * company"* — an entity fact, not a forum rule. "Venue" alone catches every
 * sentence that says where venue is NOT fixed.
 */
const ABOUT_FORUM =
  /\bvenue\b|\bforum\b|\bgoverned by\b|\bjurisdiction\b|\blitigat\w+ in\b|\bbrought in\b|\bcourts?\b/i;
const NAMES_A_PLACE = /\bPasco County\b|\bState of Florida\b|\bFlorida\b|\bNew York\b/i;

const namesAForum = (body: string): boolean =>
  sentences(body).some((sentence) => ABOUT_FORUM.test(sentence) && NAMES_A_PLACE.test(sentence));

/** A contractual period shorter than the one the law supplies. */
const SHORTENS_LIMITATIONS =
  /must be commenced within[^.]{0,60}\b(?:year|years|month|months|day|days)\b|\bwithin one \(?1?\)? ?year\b|\btime-barred\b|\bforever waived\b|\bnot asserted[^.]{0,60}\byears?\b/i;

const shortensLimitations = (body: string): boolean => SHORTENS_LIMITATIONS.test(body);

/** A party giving up a class, collective or representative proceeding. */
const WAIVES_CLASS_RIGHT =
  /(?:\bwaives?\b|\bwaiving\b|\bnot to pursue\b|\bagrees? not to\b|\bwill not (?:submit|participate|pursue)\b|\bmay not (?:pursue|participate)\b)[^.]{0,180}(?:class action|class representative|lead plaintiff|representative action|collective action|class member)/i;

const waivesClassRight = (body: string): boolean => WAIVES_CLASS_RIGHT.test(body);

/** A jury waiver that binds only the customer's side of the paper. */
const MENTIONS_JURY = /\btrial by jury\b/i;
const NAMES_THE_OTHER_SIDE =
  /\bwe\b|\bus\b|\bour\b|\beach party\b|\bboth parties\b|\bthe parties\b|\{\{equipmentAffiliate\}\}/i;

const waivesJuryOneSidedly = (body: string): boolean =>
  sentences(body).some((sentence) => MENTIONS_JURY.test(sentence) && !NAMES_THE_OTHER_SIDE.test(sentence));

/** A communication made good by sending it to an address nobody is reading. */
const DEEMS_A_STALE_ADDRESS =
  /(?:last known|last)\s+address[^.]{0,140}(?:shall|will|is|are)\s+(?:constitute\s+|be\s+)?(?:effective|sufficient|good)/i;

const deemsAStaleAddress = (body: string): boolean => DEEMS_A_STALE_ADDRESS.test(body);

/**
 * A blanket assertion that the signer relied on nothing outside the paper.
 *
 * FRPA §7.22 deleted its equivalent rather than narrowing it — *"no recital
 * elsewhere in this Agreement is evidence that it did"* — because a blanket
 * nonreliance assertion obtained at signature should not waive a fraud claim or
 * a statutory disclosure claim. Swept over the WHOLE corpus, because the reason
 * for deleting it in the FRPA is not a reason that stops at the FRPA's covers.
 */
const DISCLAIMS_RELIANCE =
  /\b(?:is not based (?:on|upon) any (?:promise|representation|statement)|has not relied|have not relied|not relied (?:on|upon)|no reliance (?:on|upon))\b/i;

const disclaimsReliance = (body: string): boolean => DISCLAIMS_RELIANCE.test(body);

describe('neither twin manufactures service of process against a natural person', () => {
  /**
   * The sentence this whole change exists for, stated as a property rather than
   * as a fix to one clause.
   */
  it('has no clause that makes an act of the sender into service', () => {
    expect(offenders(TWINS, deemsService)).toEqual([]);
  });

  it('has no clause in which a party gives up service or an objection to a forum', () => {
    expect(offenders(TWINS, waivesServiceOrForum)).toEqual([]);
  });

  /**
   * The literal ban, beside the detector, because a detector can be reworded
   * around and an exact sentence cannot. These four strings are the words the
   * shipped documents print today.
   */
  it.each([
    'irrespective of whether a signed certified mail return receipt is returned',
    'upon such mailing, service shall be effective',
    'the cost of litigating in Florida may be in excess of the amount at stake',
    'inconvenient forum',
    'last known address',
  ])('prints "%s" nowhere in either document', (phrase) => {
    expect(TWINS.filter((entry) => entry.body.toLowerCase().includes(phrase.toLowerCase())).map((e) => e.slug)).toEqual(
      [],
    );
  });

  /**
   * And §4.3 says what DOES govern, rather than being silent. A clause that
   * merely stops deeming service leaves a guarantor with no statement at all
   * about how they will learn of a case — which is the shape §7.12 was rewritten
   * into and the shape this follows.
   */
  it.each(both('4.3'))('$slug sends legal process to the law of the court', (entry) => {
    expect(entry.body).toMatch(/procedural law|law (?:of|that governs) the court|manner (?:the law|that the law)/i);
    expect(entry.body).toMatch(/returned, refused or undeliverable|is not service/i);
    expect(entry.body).toMatch(/notice, (?:a )?(?:judicial )?hearing|prior court order/i);
  });

  /**
   * Conn. Gen. Stat. §36a-868's three objects, stated as a property of both
   * documents whether or not the chapter reaches them. See the header: whether
   * the Equipment Lease is a "lease" for §36a-861(6)(E) turns on its own §3.6
   * saying it is not a true lease, and that question is not settled here.
   */
  it('gives up no notice, no hearing and no prior court order anywhere in either document', () => {
    const waivesProtection = (body: string) =>
      sentences(body).some((sentence) =>
        /\b(?:waives?|waiving|agrees? to waive|relinquishes?)\b[^.]{0,150}(?:judicial hearing|prior court order|right to notice)/i.test(
          sentence,
        ),
      );

    expect(offenders(TWINS, waivesProtection)).toEqual([]);
  });
});

describe('one forum rule, and it is the customer’s own state', () => {
  /**
   * `LOMBARD_FACTS.venueRule` is `merchant-state` and FRPA §7.5 now puts both the
   * governing law and the forum in the state of Merchant's principal place of
   * business. These documents fixed Florida law and **exclusive** venue in Pasco
   * County against a natural-person guarantor who may be anywhere in eleven
   * states — and then, in §4.3, took the objection to it away.
   *
   * THE JUSTIFICATION IS NOT THE FRPA'S, AND THE DIFFERENCE IS RECORDED HERE
   * RATHER THAN GLOSSED. §7.5's merchant-state rule is compelled for a covered
   * transaction: VERIFIED, `mca/sources/VA-Code-6.2-2228-2238.txt`, Va. Code
   * §6.2-2234(A) — *"Any provision in the contract or agreement mandating that
   * such action be brought outside the Commonwealth shall be unenforceable"* —
   * read with §6.2-2228's definition of "Recipient" as a person whose principal
   * place of business is in the Commonwealth. **That statute is about
   * sales-based financing and an equipment lease is not sales-based financing**,
   * so it does not compel anything here. The reason here is the narrower one
   * this file is about: one envelope should not send the same signer to two
   * different courts under two different laws, and an exclusive out-of-state
   * forum against a natural person is the practical answer to whether they
   * defend at all.
   */
  it('names no state or county as the law or the forum, in either document', () => {
    expect(offenders(TWINS, namesAForum)).toEqual([]);
  });

  it.each(both('3.15'))('$slug puts law and forum in the customer’s own state', (entry) => {
    expect(entry.body).toMatch(/principal place of business/i);
    expect(entry.body).toMatch(/state court|federal court/i);
    expect(entry.body).not.toMatch(/exclusive venue/i);
  });

  /**
   * §3.6 of each twin claims a security interest and the right to file a
   * financing statement, and a choice-of-law sentence cannot displace Article
   * 9's mandatory perfection and priority rules. FRPA §7.5 says so; these say it
   * for the document that actually takes the interest.
   */
  it.each(both('3.15'))('$slug leaves perfection and priority to the mandatory UCC rules', (entry) => {
    expect(entry.body).toMatch(/perfection/i);
    expect(entry.body).toMatch(/Uniform Commercial Code/);
  });

  it('makes the funder profile agree with both clauses', () => {
    expect(LOMBARD_FACTS.venueRule).toBe('merchant-state');
  });
});

describe('what a natural person gives up is mutual, or is not given up', () => {
  /**
   * Four provisions, two documents, four copies of each pair: §3.15A and §4.4
   * both waive a jury, §3.15B and §4.4 both waive a class, §3.15C and §4.4 both
   * impose the same one-year period. Every one of them ran one way.
   */
  it('waives no jury right that binds only the customer’s side', () => {
    expect(offenders(TWINS, waivesJuryOneSidedly)).toEqual([]);
  });

  it.each([
    ...both('3.15'),
    ...both('4.4'),
  ])('$slug limits its jury waiver to a forum that gives it effect', (entry) => {
    expect(entry.body).toMatch(/trial by jury/i);
    expect(entry.body).toMatch(/to the extent|law of the forum|does not give effect/i);
    expect(entry.body).toMatch(/has no effect|retains?|keeps/i);
  });

  it('waives no class, collective or representative right in either document', () => {
    expect(offenders(TWINS, waivesClassRight)).toEqual([]);
  });

  /**
   * FRPA §7.19 was redrafted mutual **with no shortened period**, because the
   * two-year figure attributed to the 2026-09-09 memo could not be found in the
   * memo, in either review, or anywhere but one orchestrator note. No period is
   * invented here either: the rule is the law's periods, running against every
   * party alike.
   */
  it('shortens no limitation period in either document', () => {
    expect(offenders(TWINS, shortensLimitations)).toEqual([]);
  });

  it.each([...both('3.15'), ...both('4.4')])('$slug runs its limitation rule against every party alike', (entry) => {
    expect(entry.body).toMatch(/limitation period|period[^.]{0,40}applicable law|accrual/i);
    expect(entry.body).toMatch(/each party|every party|either party|both/i);
    expect(entry.body).toMatch(/does not shorten|shortens? (?:none|no)/i);
  });
});

describe('a notice is effective when it can arrive', () => {
  /**
   * The quiet half of the same machine, and the half no review named. §3.16
   * made a notice sent to a *"last known address, as indicated in our records"*
   * effective against the customer — so the address the customer moved away
   * from is good for a default notice even after §4.3 stops being good for
   * service. FRPA §10.5 dropped the identical presumption.
   */
  it('deems no communication effective at an address nobody is reading', () => {
    expect(offenders(TWINS, deemsAStaleAddress)).toEqual([]);
  });

  it.each(both('3.16'))('$slug separates a notice from legal process', (entry) => {
    expect(entry.body).toMatch(/Section 4\.3/);
    expect(entry.body).toMatch(/not service|is not legal process/i);
  });

  /**
   * `«43»` is the AcroForm anchor the Lombard pipeline injects for the notice
   * address. A body that stops claiming it is a body the injector fills into
   * nothing — README rule 2, and the argument FRPA §10.3 makes for «48»/«49».
   */
  it.each(both('3.16'))('$slug keeps its widget anchor', (entry) => {
    expect(entry.body).toContain('«43»');
  });
});

describe('nothing outside §4.2 enlarges the guaranty §4.2 narrows', () => {
  /**
   * §4.2 guarantees three things *"and nothing else"* and says in terms that the
   * Guarantor is not liable for a monthly charge, for an accelerated amount, or
   * for the business failing. §3.14 — in Section 3, twenty clauses away, and
   * unexamined by REVIEW-01 — subordinates insider debt until *"the obligations
   * due to us are paid and satisfied in full"* and waives subrogation to the
   * Equipment outright. That is the whole lease, including the payments §4.2
   * says the Guarantor does not owe.
   *
   * THE SAME SHAPE AS FRPA §7.21 AND §9.1, which is how it was looked for: the
   * FRPA rewrite found four routes to guarantor liability and every one was
   * found by an assertion stated over the set rather than by reading a clause.
   * This is that assertion, pointed at the twins.
   */
  it('cites §4.2 in every clause outside Section 4 that binds a guarantor', () => {
    const outside = TWINS.filter((entry) => /\bguarantor\b/i.test(entry.body) && !entry.number.startsWith('4.'));

    expect(outside.map((entry) => entry.slug).sort()).toEqual([
      'equipment-lease.lease-guaranty',
      'subscription.subscription-guaranty',
    ]);

    for (const entry of outside) {
      expect(entry.body, `${entry.slug} binds a guarantor without citing Section 4.2`).toContain('Section 4.2');
    }
  });

  it.each(both('3.14'))('$slug subordinates only so far as §4.2 reaches', (entry) => {
    expect(entry.body).not.toMatch(/paid and satisfied in full/i);
    expect(entry.body).toMatch(/subrogat/i);
  });

  /**
   * And §4.2's own limits are unchanged. A rewrite of the clauses around it that
   * quietly relaxed the clause itself would pass every assertion above.
   */
  it.each(both('4.2'))('$slug still guarantees three things and nothing else', (entry) => {
    expect(entry.body).toMatch(/and nothing else/);
    expect(entry.body).toMatch(/not personally liable/i);
    expect(entry.body).toMatch(/has slowed, ceased, or failed/);
  });
});

describe('no instrument in the suite takes a blanket nonreliance representation', () => {
  /**
   * Swept over all six instruments, not the two. FRPA §7.22 deleted its
   * nonreliance sentence rather than narrowing it, on a reason that is about
   * what a signature can honestly attest to rather than about the FRPA — so the
   * twins' §4.3, which carried the identical sentence in capitals, is the same
   * defect and the property belongs to the corpus.
   */
  it('has no clause asserting the signer relied on nothing outside the paper', () => {
    expect(offenders(ALL_MCA_CLAUSES, disclaimsReliance)).toEqual([]);
  });

  /** What replaces it: the acknowledgement waives nothing it must not. */
  it.each(both('4.3'))('$slug waives no fraud, disclosure or non-waivable claim', (entry) => {
    expect(entry.body).toMatch(/fraud/i);
    expect(entry.body).toMatch(/does not permit to be (?:waived|given up)|non-waivable/i);
  });
});

describe('the twins honour what the FRPA now promises about them', () => {
  /**
   * `frpa.equipment-cost-explainer`: equipment is bought or leased *"under a
   * separate written agreement, and that agreement — not this one — governs
   * it"*, with *"Merchant does not pay for the same equipment twice"*. These are
   * that separate agreement. Regression guards: each of these is true today and
   * each would go red if a rewrite of the clauses around them broke it.
   */
  it('promises in both documents that the same equipment is charged once', () => {
    for (const entry of both('3.6')) {
      expect(entry.body).toContain('You will never pay for the same equipment twice');
    }

    expect(clause('frpa.equipment-cost-explainer').body).toMatch(/Merchant does not pay for the same equipment twice/);
  });

  /**
   * FRPA §7.8: *"A separate equipment lease, a separate subscription agreement …
   * None of them creates an Event of Default under this Agreement."* The twins
   * must say the reciprocal, or the firewall runs one way only.
   */
  it('creates no cross-default with the purchase agreement, in either document', () => {
    for (const entry of both('3.12')) {
      expect(entry.body).toMatch(/No default under any other agreement/);
      expect(entry.body).toMatch(/purchase of future receipts/);
    }

    expect(clause('frpa.entire-agreement-7-8').body).toMatch(/creates no cross-default/);
  });
});

describe('the fix landed in both documents, and declared no new divergence', () => {
  /**
   * `twins.test.ts` asserts the general property. This names the five sections
   * this change touched, so a fix applied to the Equipment Lease and forgotten in
   * the Subscription fails with the section number in the message rather than as
   * one of thirty parameterised cases.
   */
  it.each(REWRITTEN)('§%s says the same thing in both documents', (number) => {
    const [lease, subscription] = both(number);

    expect(twinDivergence(number), `§${number} was declared divergent rather than fixed twice`).toBeNull();
    expect(applyTwinVocabulary(lease.heading, number)).toBe(subscription.heading);
    expect(applyTwinVocabulary(lease.body, number)).toBe(subscription.body);
  });

  /**
   * THE EASY WAY OUT, REFUSED AND ASSERTED. Declaring a rewritten clause
   * divergent would make `twins.test.ts` green with one document fixed. The
   * register stays at the five it had, all of which are about title or about the
   * collection mechanism and none of which is about a dispute.
   */
  it('leaves the divergence register at the five it had', () => {
    expect(EQUIPMENT_TWIN.divergent.map((entry) => entry.number)).toEqual(['3.4', '3.5', '3.6', '3.7', '3.8']);

    for (const number of REWRITTEN) {
      expect(EQUIPMENT_TWIN.divergent.map((entry) => entry.number)).not.toContain(number);
    }
  });

  /**
   * The whole envelope, read as one. `LOMBARD_FACTS.equipment` is what puts
   * these two documents in front of the same signer as the FRPA; if it ever
   * stops doing so, the reason this file exists changes and somebody should read
   * it again.
   */
  it('is about documents this funder actually sends', () => {
    expect(LOMBARD_FACTS.equipment).not.toBe('none');
  });
});

/*
  ─── the controls ────────────────────────────────────────────────────────────

  Every detector above is run against the real sentence of the real document it
  was written to catch, and then against this corpus's own denials. Both
  directions, because the failure this package has actually shipped was not a
  detector that could not fire — it was a detector that excused the text it was
  written for.
*/

/** `Lombard_Equipment_Lease_Agreement_v1.docx`, §4.3, as vendored. */
const V1_FOUR_THREE =
  'I understand that the cost of litigating in Florida may be in excess of the amount at stake in the ' +
  'litigation. Nonetheless, I waive any objection that such courts are an inconvenient forum or venue, ' +
  'irrespective of the actual amount at issue. Lombard Pay LLC may properly serve me with legal process via ' +
  'certified mail to my address set forth herein or to my current or last known address, and upon such ' +
  'mailing, service shall be effective irrespective of whether a signed certified mail return receipt is ' +
  'returned to Lombard Pay LLC.';

/** §4.3's first sentence, in capitals in the document. */
const V1_FOUR_THREE_NONRELIANCE =
  'I REPRESENT AND WARRANT THAT MY DECISION TO ENTER INTO THIS GUARANTY IS NOT BASED ON ANY PROMISE MADE BY ' +
  'ANYONE, WHETHER WRITTEN OR ORAL, THAT IS NOT SET FORTH IN THIS LEASE AND GUARANTY.';

/** §3.15 and its three lettered sub-provisions. */
const V1_THREE_FIFTEEN =
  'This Agreement shall be governed by and construed in accordance with the laws of the State of Florida ' +
  '(without applying its conflicts of laws principles). The exclusive venue for any actions or claims arising ' +
  'under or related to this Lease shall be the appropriate state or federal court located in Pasco County, ' +
  'Florida.';

const V1_THREE_FIFTEEN_A =
  'YOU IRREVOCABLY, VOLUNTARILY, AND FREELY WAIVE TRIAL BY JURY IN CONNECTION WITH ANY DISPUTE OVER THIS LEASE.';

const V1_THREE_FIFTEEN_B =
  'YOU AGREE NOT TO PURSUE A CLAIM AGAINST US AS A LEAD PLAINTIFF, CLASS REPRESENTATIVE, OR AS PART OF A CLASS ' +
  'ACTION OR OTHER REPRESENTATIVE ACTION.';

const V1_THREE_FIFTEEN_C =
  'ANY PERMITTED CAUSE OF ACTION YOU MAY HAVE IN CONNECTION WITH THIS LEASE AGAINST US, OUR ASSIGNEE, OUR ' +
  'SERVICING AGENT, OR OUR EMPLOYEES AND ATTORNEYS MUST BE COMMENCED WITHIN ONE YEAR FROM THE ACCRUAL OF THAT ' +
  'CAUSE OF ACTION.';

/** §3.16's last sentence. */
const V1_THREE_SIXTEEN =
  'Notices sent to the Lessee’s last known address, as indicated in our records, shall constitute effective ' +
  'notice to the Lessee under this Agreement.';

/** A waiver in the Connecticut shape. §36a-868 names all three of these. */
const A_PREJUDGMENT_WAIVER =
  'Guarantor waives any right to notice, judicial hearing or prior court order in connection with Lombard Pay ' +
  'LLC obtaining a prejudgment remedy.';

describe('the detectors fire on the words the documents actually print', () => {
  it('catches the guaranty’s service and forum sentences', () => {
    expect(deemsService(V1_FOUR_THREE)).toBe(true);
    expect(waivesServiceOrForum(V1_FOUR_THREE)).toBe(true);
    expect(namesAForum(V1_FOUR_THREE)).toBe(true);
  });

  it('catches the nonreliance representation', () => {
    expect(disclaimsReliance(V1_FOUR_THREE_NONRELIANCE)).toBe(true);
  });

  it('catches the Florida law and the Pasco County venue', () => {
    expect(namesAForum(V1_THREE_FIFTEEN)).toBe(true);
  });

  it('catches the one-sided jury waiver in both places it appears', () => {
    expect(waivesJuryOneSidedly(V1_THREE_FIFTEEN_A)).toBe(true);
    expect(
      waivesJuryOneSidedly(
        'I VOLUNTARILY AND FREELY WAIVE TRIAL BY JURY IN CONNECTION WITH ANY DISPUTE OVER THIS GUARANTY.',
      ),
    ).toBe(true);
  });

  it('catches the class waiver and the one-year period', () => {
    expect(waivesClassRight(V1_THREE_FIFTEEN_B)).toBe(true);
    expect(shortensLimitations(V1_THREE_FIFTEEN_C)).toBe(true);
  });

  it('catches the last-known-address notice rule', () => {
    expect(deemsAStaleAddress(V1_THREE_SIXTEEN)).toBe(true);
  });

  it('catches a Connecticut-shaped waiver', () => {
    expect(
      /\b(?:waives?|waiving|agrees? to waive|relinquishes?)\b[^.]{0,150}(?:judicial hearing|prior court order|right to notice)/i.test(
        A_PREJUDGMENT_WAIVER,
      ),
    ).toBe(true);
  });
});

describe('and the detectors do not fire on a denial', () => {
  /**
   * The direction this package has actually got wrong. These are real sentences
   * from the rewritten FRPA — the clauses that CLOSE these doors. A detector
   * that read a denial as an offence would report them as the clauses that open
   * them, and the sweep would be unfixable rather than green.
   */
  const DENIALS: { what: string; text: string }[] = [
    {
      what: '§10.1’s statement that nothing is waived in advance',
      text:
        'This Agreement contains no waiver by any party of valid service, of an available jurisdictional ' +
        'objection, of a notice or a hearing that applicable law requires, or of a prior court order that ' +
        'applicable law requires before a prejudgment remedy is obtained.',
    },
    {
      what: '§7.12’s statement that a returned mailing is not service',
      text:
        'An operational notice given under Section 7.3, an email that is not acknowledged, and a mailing that ' +
        'is returned, refused or undeliverable are not service of process under this Agreement and are not ' +
        'evidence that service was made. This Agreement contains no waiver of an objection to service.',
    },
    {
      what: '§7.11’s statement that no class right is waived',
      text:
        'No party waives a right to bring, to defend, or to take part in a class, collective, representative ' +
        'or public-enforcement proceeding that applicable law permits.',
    },
    {
      what: '§7.19’s mutual limitation rule',
      text:
        'The limitation period, the accrual rule, and any tolling or discovery rule that applicable law ' +
        'supplies apply to a claim by every party to this Agreement alike. This Agreement does not shorten ' +
        'any of them.',
    },
    {
      what: '§7.22’s replacement for the nonreliance recital',
      text:
        'This acknowledgement does not waive a claim for fraud or misrepresentation, a right applicable law ' +
        'does not permit to be waived, a required disclosure, or a statement legally attributable to Buyer.',
    },
    {
      what: '§7.5’s customer-state forum rule',
      text:
        'An action arising under this Agreement shall be brought in a state court of competent jurisdiction ' +
        'in the state of Merchant’s principal place of business, or in a federal court of competent ' +
        'jurisdiction sitting in that state.',
    },
  ];

  it.each(DENIALS)('$what is not read as an offence', ({ text }) => {
    expect(deemsService(text)).toBe(false);
    expect(waivesServiceOrForum(text)).toBe(false);
    expect(namesAForum(text)).toBe(false);
    expect(shortensLimitations(text)).toBe(false);
    expect(waivesClassRight(text)).toBe(false);
    expect(deemsAStaleAddress(text)).toBe(false);
    expect(disclaimsReliance(text)).toBe(false);
  });

  /**
   * A parties paragraph says the counterparty is *"a Florida limited liability
   * company"*. That is an entity fact, and a forum detector that reported it
   * would be a detector nobody could keep green without deleting a true
   * sentence.
   */
  it('does not read an entity’s state of organisation as a forum rule', () => {
    expect(
      namesAForum(
        'This Equipment Lease Agreement (this “Agreement”) is entered into and effective as of ____«20»_____ ' +
          'between ________«37»________, a Florida limited liability company, with its principal office at ' +
          '_______________«41»_______________ (“we,” “us,” or “our”), and the Lessee identified in Section 1 above.',
      ),
    ).toBe(false);
  });

  /**
   * And the sweeps are not vacuous in the ordinary way. Both documents really do
   * talk about juries, forums and legal process, so a green result is a result
   * about those sentences rather than about an empty set.
   */
  it('runs over two documents that really have these subjects in them', () => {
    expect(TWINS.filter((entry) => MENTIONS_JURY.test(entry.body)).length).toBe(4);
    expect(TWINS.filter((entry) => ABOUT_SERVICE.test(entry.body)).length).toBeGreaterThanOrEqual(2);
    expect(TWINS.filter((entry) => ABOUT_FORUM.test(entry.body)).length).toBeGreaterThan(4);
    expect(TWINS).toHaveLength(60);
  });
});
