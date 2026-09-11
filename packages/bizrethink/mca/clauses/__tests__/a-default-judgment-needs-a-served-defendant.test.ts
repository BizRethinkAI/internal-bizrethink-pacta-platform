import { describe, expect, it } from 'vitest';

import { selectClauses } from '../../engine/select-clauses';
import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { ALL_MCA_CLAUSES, libraryFor } from '../library';
import type { McaClause } from '../types';

/**
 * A JUDGMENT AGAINST SOMEBODY WHO NEVER HEARD ABOUT THE CASE.
 *
 * This is the `disputes-service` cluster's property, and it is stated over the
 * SET because every single one of its parts is written in one clause and undone
 * in another:
 *
 *   - §7.12 made service COMPLETE when a letter came back undeliverable, and
 *     gave the merchant thirty days from that moment to respond.
 *   - §7.5, in the governing-law clause where nobody looks for a service rule,
 *     turned a certified mailing into "valid and lawful service of process".
 *   - §10.1 waived personal service and then waived the OBJECTION to its
 *     absence, which is the sentence that closes the door on the way back.
 *   - §10.6 made all of that supersede every notice provision in the Agreement.
 *
 * No one of those four is a default judgment. Together they are a procedure for
 * obtaining one: mail to an address the merchant has moved away from, wait for
 * the return, file, and the merchant's own contract says the service was good
 * and that it cannot say otherwise. REVIEW-01 reached the same place from the
 * other direction — `service-without-notice-vs-commitment-9` — and observed
 * that Pass 1 scored the published "no confession of judgment" commitment
 * *Honored* **without examining Section 10 at all.**
 *
 * WHAT IS ASSERTED, AND WHY IT IS A CORPUS PROPERTY RATHER THAN A CLAUSE ONE.
 * The three statutes in `mca/sources/` that bear on this are written as rules
 * about what a contract may CONTAIN, not about what any particular section may
 * say:
 *
 *   - **Conn. Gen. Stat. §36a-868** (VERIFIED, `CT-CGS-36a-861-872.txt`): *"No
 *     commercial financing contract ... shall contain any provision waiving a
 *     recipient's right to notice, judicial hearing or prior court order under
 *     chapter 903a in connection with the provider obtaining any prejudgment
 *     remedy."*
 *   - **Va. Code §6.2-2234(C)** (VERIFIED, `VA-Code-6.2-2228-2238.txt`): *"No
 *     sales-based financing contract shall contain any confession by judgment
 *     provision or any similar provision."*
 *   - **Tex. Fin. Code §398.055** (VERIFIED, `TX-Fin-Code-Ch-398.txt`): *"A
 *     commercial sales-based financing contract that contains a confession of
 *     judgment provision or any similar provision is void and unenforceable."*
 *
 * A per-clause review answers "is §10.1 lawful"; these statutes ask "does the
 * contract contain one anywhere", and that question can only be asked of the
 * whole set. So the sweeps below run over `ALL_MCA_CLAUSES` — every instrument,
 * not only the FRPA — and that is how they found the thing no brief names.
 *
 * THE DETECTORS ARE DELIBERATELY NOT NEGATION-AWARE. `fees-and-money` shipped
 * an assertion that passed because a negation-aware detector excused the exact
 * text it was written to catch. Every detector here matches an AFFIRMATIVE
 * construction only — a party waiving, an act being made into service — and the
 * denials this corpus is full of ("No party waives", "contains no confession of
 * judgment") are proved not to fire by the negative controls at the bottom,
 * rather than by a rule that strips them out before matching.
 *
 * WHAT IT DOES NOT PROVE. That any of this is lawful in any state, that a
 * merchant-state forum clause is enforceable, or that a jury waiver limited to
 * forums that give effect to one behaves as drafted. Nothing here is approved:
 * `source` is `attorney-drafted` with a null author on every record, and
 * `assertPublishable` refuses all of them.
 */
const FRPA = libraryFor('frpa');

const FORUM = 'frpa.binding-effect-governing-law-venue-and-jurisdiction-7-5';
const SEVERABILITY = 'frpa.severability-7-7';
const JURY = 'frpa.jury-trial-waiver-7-10';
const CLASS = 'frpa.class-action-waiver-7-11';
const PROCESS = 'frpa.service-of-process-7-12';
const LIMITATIONS = 'frpa.contractual-statutes-of-limitations-7-19';
const COUNTERCLAIM = 'frpa.counterclaim-waiver-7-20';
const RIDERS = 'frpa.state-law-riders-7-24';
const NOTICES = 'frpa.notices-7-3';
const SERVICE = 'frpa.section-10-1';
const GUARANTOR_SERVICE = 'frpa.section-10-2';
const MERCHANT_ADDRESS = 'frpa.section-10-3';
const KEEP_CURRENT = 'frpa.section-10-5';
const SUPERSEDES = 'frpa.section-10-6';

/**
 * The clauses `disputeResolution` decides as one bundle.
 *
 * **IT WAS FOUR AND IS NOW THREE, ON THE OWNER'S DECISION OF 2026-09-11**, and
 * this list moving is the signal it was written to give rather than a repair to
 * quiet a red. §7.19 left the bundle because the fact was misattributed to it:
 * `disputeResolution` answers WHERE a claim is heard, §7.19 answers HOW LONG
 * there is to bring it, and a limitation period applies in arbitration too. It
 * was defensible while the clause only disclaimed — its own note called its
 * absence under arbitration "a redundancy rather than a hole" — and stopped
 * being defensible when the owner put an operative two-year period in it, which
 * a gated §7.19 would have withheld from every arbitration template. ADR 0013's
 * answer to a misattributed fact is `includeWhen: null` plus a cross-reference,
 * and `frpa.arbitration-7-26` carries the cross-reference.
 *
 * `clauses/facts.ts` still describes this as four clauses. That file was not the
 * 2026-09-11 change's to edit; reported rather than corrected.
 */
const BUNDLE = [JURY, CLASS, COUNTERCLAIM];

/** The bundle plus §7.19, which is ungated but is still a clause about litigation. */
const ABOUT_LITIGATION = [...BUNDLE, LIMITATIONS];

const clause = (slug: string): McaClause => {
  const found = ALL_MCA_CLAUSES.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the MCA library`);
  }

  return found;
};

const sentences = (body: string): string[] =>
  body
    .split(/\n|(?<=[.;])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

/*
  ─── the detectors ───────────────────────────────────────────────────────────

  Each is proved able to fire, against the sentence of the real document it was
  written to catch, in `the detectors fire on the words they were written for`.
  Each is also proved NOT to fire on this corpus's denials. Both directions.
*/

/**
 * A sentence that turns an act of the sender into service of process.
 *
 * Two halves, both required: the sentence has to be ABOUT service, and it has
 * to make something into service or make service complete. "Shall be complete"
 * on its own catches a reconciliation deadline; "service of process" on its own
 * catches every sentence that says service is governed elsewhere.
 */
const ABOUT_SERVICE =
  /\bservice of (?:process|any summons|legal process)\b|\bservice hereunder\b|\bvalid and lawful service\b|\blegal process\b|\bserve me with\b|\bservice of process\b/i;
const MAKES_SERVICE =
  /(?:will|shall)\s+constitute\s+(?:valid and lawful\s+)?service|constitutes?\s+(?:valid and lawful\s+)?service|service[^.]{0,80}shall be (?:complete|effective|sufficient)|shall be effective irrespective|to the last known address shall be sufficient/i;

const deemsService = (body: string): boolean =>
  sentences(body).some((sentence) => ABOUT_SERVICE.test(sentence) && MAKES_SERVICE.test(sentence));

/**
 * A party waiving service, or the objection that there was none.
 *
 * The object list is the one the statutes and the reviews name: personal
 * service, the absence of formal service, and an objection to jurisdiction,
 * venue or the convenience of a forum.
 */
const WAIVES_SERVICE_OR_FORUM =
  /\b(?:waives?|waiving|agrees? to waive)\b[^.]{0,110}(?:personal service|absence of formal service|objection to (?:the )?(?:absence of formal service|service)|objections? to jurisdiction|objection[^.]{0,45}(?:forum|venue))/i;

const waivesServiceOrForum = (body: string): boolean =>
  sentences(body).some((sentence) => WAIVES_SERVICE_OR_FORUM.test(sentence));

/**
 * The Connecticut shape. §36a-868 names three things by name and this is them.
 */
const WAIVES_PREJUDGMENT_PROTECTION =
  /\b(?:waives?|waiving|agrees? to waive)\b[^.]{0,140}(?:judicial hearing|prior court order|right to notice)/i;

const waivesPrejudgmentProtection = (body: string): boolean =>
  sentences(body).some((sentence) => WAIVES_PREJUDGMENT_PROTECTION.test(sentence));

/**
 * The sentence REVIEW-01 said a court would quote, deleted from §10.1 and
 * §10.2 by the manifest and asserted here never to come back.
 */
const PROCEEDS_WITHOUT_NOTICE =
  /(?:taken up and considered by a court|may proceed|proceed to judgment)[^.]{0,80}without (?:any )?further notice/i;

/**
 * An affirmative confession of judgment. The corpus mentions the phrase four
 * times and every one of them is a denial, which is exactly why this matches a
 * VERB and a grant rather than the noun phrase.
 */
const CONFESSES_JUDGMENT =
  /\bconfesses? judgment\b|\bcognovit\b|\bwarrant of attorney\b|\bauthoriz\w+[^.]{0,70}\bto (?:enter|confess) judgment\b/i;

/**
 * A contractual limitations period, shortening whatever the law supplies.
 *
 * **WIDENED 2026-09-11 to catch "shall be brought within … years".** It was
 * written against v4's vocabulary alone, so the mutual two-year period the owner
 * adopted would have slipped past it and left the assertion below passing
 * `false` on a clause that shortens a period — a detector excusing the text it
 * was written for, which is the failure mode this file's controls exist for.
 */
const SHORTENS_LIMITATIONS =
  /\b(?:time-barred|forever waived)\b|(?:must be commenced|shall be brought) within[^.]{0,40}\byears?\b|not asserted[^.]{0,60}\byears?\b/i;

/** A clause that fixes a named forum, rather than describing one. */
const NAMES_A_FORUM = /\bNew York\b|\bPasco County\b|\bAcceptable Forums?\b/i;

/*
  ─── the register of what this cluster could not fix, now empty ──────────────

  IT HELD TWO ENTRIES AND THEY ARE FIXED. `equipment-lease.independent-decision-
  governing-law` and its Subscription twin were registered here on 2026-09-10
  with the note *"UNASSIGNED — reported by disputes-service. No cluster
  follows."* The register's own rule is what removed them: every entry was
  asserted to be STILL REACHABLE, *"so an entry that gets fixed elsewhere fails
  this file until it is deleted, rather than sitting as a line that can no longer
  be red."* The `feat/mca-rewrite-twins` change fixed both, that assertion went
  red, and deleting the entries is the protocol rather than an evasion of it.

  WHAT THEY SAID, KEPT BECAUSE THE FINDING IS WORTH MORE THAN THE REGISTER.
  *"{{equipmentAffiliate}} may properly serve me with legal process via certified
  mail to my address set forth herein or to my current or last known address, and
  upon such mailing, service shall be effective irrespective of whether a signed
  certified mail return receipt is returned"* — service effective on mailing,
  receipt expressly irrelevant, given by a NATURAL PERSON. The Subscription
  carried the same sentence in its own vocabulary, plus a waiver of any objection
  that a Florida court is an inconvenient forum.

  **NEITHER REVIEW NOR THE 2026-09-09 COUNSEL MEMO READ THEM IN THIS ROLE**, and
  the reason is structural: the Equipment Lease and the Subscription entered
  Lombard's product suite only when `instrumentsFor` began returning them
  whenever `equipment !== 'none'`, and §7.8's precedence order correctly calls
  them "different contracts" — which is precisely why the FRPA's protections do
  not reach them and why the fix had to be made in those documents.

  The sweeps below now run unfiltered over `ALL_MCA_CLAUSES`. The property they
  state is asserted for the twins in their own vocabulary, over the set of both
  documents, in `the-twins-cannot-undo-the-frpa.test.ts`.
*/

describe('no provision of any instrument manufactures service of process', () => {
  /**
   * The property, over every clause of every agreement in the suite.
   *
   * §7.12 and §7.5 were both offenders and both are this cluster's. What the
   * sweep adds is the two that are not.
   */
  it('has no clause that makes an act of the sender into service', () => {
    const offenders = ALL_MCA_CLAUSES.filter((entry) => deemsService(entry.body))
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });

  /**
   * §10.1's second sentence, and the twins' guaranty paragraph. A waiver of
   * personal service is survivable; a waiver of the OBJECTION to its absence is
   * the sentence that removes the remedy for getting it wrong.
   */
  it('has no clause in which a party waives service or an objection to a forum', () => {
    const offenders = ALL_MCA_CLAUSES.filter((entry) => waivesServiceOrForum(entry.body))
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });

  /** Conn. Gen. Stat. §36a-868, stated as a property of the corpus. */
  it('has no clause waiving notice, a judicial hearing or a prior court order', () => {
    const offenders = ALL_MCA_CLAUSES.filter((entry) => waivesPrejudgmentProtection(entry.body))
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });

  /**
   * Va. Code §6.2-2234(C) and Tex. Fin. Code §398.055, stated the same way —
   * and the two statutes do NOT produce the same consequence, which is §7.7's
   * whole subject. Virginia makes the PROVISION unenforceable; Texas makes the
   * CONTRACT void. A severability clause can survive the first and cannot
   * survive the second.
   */
  it('has no clause containing a confession of judgment or anything like one', () => {
    const offenders = ALL_MCA_CLAUSES.filter((entry) => CONFESSES_JUDGMENT.test(entry.body))
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });

  /** The sentence the manifest deleted from §10.1 and §10.2, kept out. */
  it('has no clause letting a court proceed without further notice', () => {
    const offenders = ALL_MCA_CLAUSES.filter((entry) => PROCEEDS_WITHOUT_NOTICE.test(entry.body))
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });

  /**
   * The register above is empty, and this is what would refill it honestly. The
   * two entries it held were the twins' guaranty paragraph; both are rewritten,
   * so the sweeps run unfiltered and this asserts that nothing has quietly
   * reintroduced a filter.
   */
  it('sweeps every clause, with nothing excused', () => {
    expect(ALL_MCA_CLAUSES.filter((entry) => deemsService(entry.body)).map((entry) => entry.slug)).toEqual([]);
    expect(ALL_MCA_CLAUSES.filter((entry) => waivesServiceOrForum(entry.body)).map((entry) => entry.slug)).toEqual([]);
    expect(ALL_MCA_CLAUSES.length).toBe(203);
  });
});

describe('judicial service is consolidated in Section 10.1 and answered where it is cited', () => {
  /**
   * §7.3 routes judicial process to "Section 7.12 and Section 10" by name, so
   * both must exist and both must answer it. That is the memo's consolidation
   * read from the outside rather than from inside Section 10.
   */
  it('leaves Section 7.12 pointing at Section 10.1 rather than stating its own rule', () => {
    const body = clause(PROCESS).body;

    expect(body).toContain('Section 10.1');
    expect(deemsService(body)).toBe(false);
    expect(body).toMatch(/undeliverable|returned/i);
  });

  /**
   * §10.2 says §10.1 "applies to each party to this Agreement, including each
   * Guarantor". That sentence was written against a §10.1 that says "Merchant",
   * and `guaranty.ts` recorded the risk in terms: *"if that rewrite lands and
   * narrows §10.1 to Merchant, this clause points at a waiver that does not
   * cover the person it names."*
   */
  it('gives Section 10.1 the reach Section 10.2 already claims for it', () => {
    const body = clause(SERVICE).body;

    expect(body).toMatch(/Guarantor/);
    expect(clause(GUARANTOR_SERVICE).body).toContain('Section 10.1');
  });

  it('makes Section 10.1 require lawful process rather than excuse it', () => {
    const body = clause(SERVICE).body;

    expect(body).toMatch(/procedural law|manner authorized/i);
    expect(waivesServiceOrForum(body)).toBe(false);
    expect(body).toMatch(/prejudgment/i);
  });

  /**
   * §10.3 loses the advance consent and keeps its two AcroForm anchors. The
   * pipeline injects «48» and «49» whether or not a clause claims them, so a
   * body that drops them is a body the injector fills into nothing — the
   * argument `guaranty.ts` already makes for §10.4's «50» and «51».
   */
  it('keeps Section 10.3’s widget anchors while dropping the advance consent', () => {
    const body = clause(MERCHANT_ADDRESS).body;

    expect(body).toContain('«48»');
    expect(body).toContain('«49»');
    expect(body).not.toMatch(/AGREES TO ACCEPT SERVICE/i);
    expect(body).toMatch(/Section 10\.1/);
  });

  /**
   * §10.5's presumption is the quiet half of the same machine: a stale address
   * is "presumed accurate", so the mailing that was never read is good service.
   */
  it('drops the presumption that an un-updated address establishes service', () => {
    const body = clause(KEEP_CURRENT).body;

    expect(body).not.toMatch(/presumed to be accurate/i);
    expect(body).toMatch(/does not (?:by itself|itself)/i);
  });

  /**
   * §10.6 said Section 10 "shall supersede any notice requirements in this
   * Agreement with respect to service of process" — which, read with §7.12's
   * thirty-day clock, superseded the merchant's own notice provisions. It now
   * separates the two subjects instead of subordinating one.
   */
  it('separates judicial process from ordinary notices instead of superseding them', () => {
    const body = clause(SUPERSEDES).body;

    expect(body).not.toMatch(/supersede/i);
    expect(body).toContain('Section 10.1');
    expect(body).toContain('Section 7.3');
  });

  /** And §7.3's route out is still intact, because both ends now exist. */
  it('keeps Section 7.3 sending judicial process to Section 7.12 and Section 10', () => {
    expect(clause(NOTICES).body).toContain('Section 7.12');
  });
});

describe('one forum rule, and it is the merchant’s own state', () => {
  /**
   * v4 chose New York law with New York and Pasco County, Florida forums, at
   * Buyer's election, in a form sold into eleven states. Va. Code §6.2-2234(A)
   * (VERIFIED, vendored) makes a provision mandating a forum outside the
   * Commonwealth unenforceable for a covered transaction, and "recipient" is
   * defined in §6.2-2228 as a person whose principal place of business is in the
   * Commonwealth — so a merchant-state rule satisfies Virginia by construction
   * rather than by a rider.
   */
  it('names no forum state anywhere in the FRPA except the Virginia rider', () => {
    const offenders = FRPA.filter((entry) => NAMES_A_FORUM.test(entry.body))
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });

  it('puts the forum in the state whose law the Agreement chooses', () => {
    const body = clause(FORUM).body;

    expect(body).toMatch(/principal place of business/i);
    expect(body).toMatch(/state court|federal court/i);
    expect(body).not.toMatch(/if Buyer so elects/i);
  });

  /**
   * §7.5 duplicated §7.2's assignment rule and contradicted it: §7.2 as
   * rewritten moved Merchant's transfer from Buyer's "sole discretion" to
   * consent not unreasonably withheld, and §7.5 still said sole discretion.
   * Two rules over one subject, and this one was already live.
   */
  it('states the assignment rule once, in Section 7.2', () => {
    const body = clause(FORUM).body;

    expect(body).toContain('Section 7.2');
    expect(body).not.toMatch(/sole discretion/i);
  });

  /**
   * §7.24 claims priority — *"This paragraph governs over any different forum
   * provision of this Agreement, including Section 7.5"* — deliberately, because
   * §7.5 required the opposite. Exactly one clause may claim it.
   */
  it('leaves the precedence claim with Section 7.24 alone', () => {
    expect(clause(RIDERS).body).toMatch(/governs over any different forum provision/i);
    expect(clause(FORUM).body).not.toMatch(/governs over|controls over|notwithstanding any other/i);
    expect(clause(FORUM).body).toContain('Section 7.24');
  });

  /** And §7.5 hands judicial process to Section 10.1 rather than supplying it. */
  it('sends judicial process out of the governing-law clause', () => {
    const body = clause(FORUM).body;

    expect(body).toContain('Section 10.1');
    expect(deemsService(body)).toBe(false);
  });

  /**
   * ADR 0013: *"a fact row and the clauses it gates move together."* `venueRule`
   * gates nothing — see the note on §7.5 for why it cannot — but the profile
   * still has to agree with the only clause on the subject, which is the exact
   * contradiction `renewal-positions` refused to create when it declined to flip
   * the row ahead of this rewrite.
   */
  it('makes the funder profile agree with the clause', () => {
    expect(LOMBARD_FACTS.venueRule).toBe('merchant-state');
  });
});

describe('severability stops promising what a statute can take away', () => {
  /**
   * Tex. Fin. Code §398.055 voids the CONTRACT; Va. Code §6.2-2234(C) and Conn.
   * Gen. Stat. §36a-868 make the PROVISION unenforceable. An unconditional
   * remainder-survives rule is true of the second pair and false of the first,
   * and a form that relies on it is a form that ships the prohibited term and
   * expects to be saved from it.
   */
  it('does not promise that the remainder always survives', () => {
    const body = clause(SEVERABILITY).body;

    expect(body).not.toMatch(/shall not in any way be affected or impaired/i);
    expect(body).toMatch(/entire (?:contract|agreement)|whole (?:contract|agreement)/i);
  });

  it('says the answer is to leave the provision out, not to sever it afterwards', () => {
    const body = clause(SEVERABILITY).body;

    expect(body).toMatch(/omit|before (?:it is )?present\w*|before signature/i);
    expect(body).toMatch(/no (?:severability|savings)/i);
  });

  /** §7.24 already points here for that rule; the two have to agree. */
  it('agrees with the rider clause that already cites it', () => {
    expect(clause(RIDERS).body).toContain('Section 7.7');
    expect(clause(SEVERABILITY).body).toMatch(/prohibited/i);
  });
});

describe('the dispute-resolution bundle is four clauses and one decision', () => {
  /**
   * `facts.ts` says `disputeResolution` *"decides four clauses as one bundle"*.
   * Asserted as an inventory, so a fifth clause quietly joining the bundle — or
   * one of the four quietly leaving it — is red rather than invisible.
   */
  it('is gated on disputeResolution and on nothing else', () => {
    const courts = new Set(
      selectClauses({ facts: LOMBARD_FACTS, instrument: 'frpa' }).selected.map((entry) => entry.slug),
    );
    const arbitration: McaFacts = { ...LOMBARD_FACTS, disputeResolution: 'arbitration' };
    const underArbitration = new Set(
      selectClauses({ facts: arbitration, instrument: 'frpa' }).selected.map((entry) => entry.slug),
    );

    const dropped = [...courts].filter((slug) => !underArbitration.has(slug)).sort();

    // `frpa.arbitration-7-26` is ADDED under arbitration rather than dropped, so
    // it does not appear here; `an-arbitration-clause-is-one-forum-rule.test.ts`
    // asserts the addition from the other side.
    expect(dropped).toEqual([...BUNDLE].sort());
  });

  /**
   * §7.10's recital — *"ONLY AFTER EXTENSIVE CONSIDERATION OF THE RAMIFICATIONS
   * OF THIS WAIVER WITH THEIR ATTORNEYS"* — is false whenever §7.22's
   * contemplated signer declines counsel, and §7.22 now says in terms that *"no
   * recital elsewhere in this Agreement is evidence that it did"*. §9.6 was
   * rewritten for the same reason. This is the third and last of them.
   */
  it('recites no attorney consultation in the jury waiver', () => {
    const body = clause(JURY).body;

    expect(body).not.toMatch(/EXTENSIVE CONSIDERATION/i);
    expect(body).not.toMatch(/with their attorneys/i);
  });

  /**
   * The owner's instruction against the memo's deletion: a predispute jury
   * waiver is not enforceable in California state court and that says nothing
   * about Florida, New York or Texas. The waiver stays and limits itself to
   * forums that give it effect.
   */
  it('limits the jury waiver to a forum that gives effect to one', () => {
    const body = clause(JURY).body;

    expect(body).toMatch(/waives? (?:the right to )?trial by jury|waive trial by jury/i);
    expect(body).toMatch(/to the extent|where the law of the forum|does not give effect/i);
    expect(body).toMatch(/retains?|has no effect/i);
  });

  /**
   * A bare class waiver with no arbitration structure is the weakest of the
   * three positions all three market forms take, and the memo removes it. The
   * product question behind it is reported as a gap, not answered here.
   */
  it('waives no class or representative right', () => {
    const body = clause(CLASS).body;

    expect(body).not.toMatch(/WAIVE ANY RIGHT TO ASSERT/i);
    expect(body).toMatch(/No party waives|does not waive/i);
    expect(body).toMatch(/class|collective|representative/i);
  });

  /**
   * **THIS ASSERTION USED TO READ "shortens no limitation period", AND THE
   * OWNER REVERSED THE PREMISE IT ENCODED ON 2026-09-11.**
   *
   * It was written when the clause stated no period, because the two-year
   * figure attributed to the 2026-09-09 memo could not be confirmed — memo entry
   * 075 fixes no period, and "two-year" appears in exactly one place across the
   * nine cluster briefs: an owner's note. That check still holds and is recorded
   * above §7.19. What changed is that the owner has now adopted the figure **as
   * a commercial term of their own**, with no claim of authority behind it.
   *
   * The assertion is retargeted rather than deleted, and it is retargeted to a
   * STRICTER property than the one it replaces: the period exists, it is
   * symmetrical, and the carve-out for a claim the law does not permit to be
   * shortened is not narrowed by it. `SHORTENS_LIMITATIONS` is widened in the
   * same change so that it actually detects the new wording — left as it was, it
   * would have gone on passing `false` on a clause that does shorten a period,
   * which is the vacuous green this package exists to refuse. The v4 control
   * below still fires on the one-sided one-year clause.
   *
   * The one-year period ran only against Merchant and Guarantor and covered
   * every kind of claim. Mutuality is the fix REVIEW-01 proposed; the carve-out
   * for non-waivable statutory claims is the owner's.
   */
  it('states one mutual period and shortens nothing the law protects', () => {
    const body = clause(LIMITATIONS).body;

    expect(SHORTENS_LIMITATIONS.test(body)).toBe(true);
    expect(body).toMatch(/two \(2\) years/);
    expect(body).toMatch(/every party|either party|each party/i);
    expect(body).toMatch(/neither party has a longer or a shorter period than the other/);
    expect(body).toMatch(/non-waivable|may not be waived|does not permit to be/i);
    expect(body).toMatch(/does not apply to it/);
    // v4's vocabulary ran one way and stays gone whatever the period is.
    expect(body).not.toMatch(/time-barred|forever waived/i);
    expect(body).not.toMatch(/Merchant and Guarantor/);
  });

  /**
   * `counterclaim-waiver-flips-by-forum`: New York makes every counterclaim
   * permissive and Florida makes a transaction-related one compulsory, so the
   * same sentence was an absolute bar in one Acceptable Forum and a nullity in
   * the other — and §7.5 let Buyer choose. Removing the forum election removes
   * half the defect; letting procedural law govern removes the rest.
   */
  it('leaves counterclaims to the procedural law of the court', () => {
    const body = clause(COUNTERCLAIM).body;

    expect(body).not.toMatch(/must be brought as a separate proceeding/i);
    expect(body).toMatch(/setoff|recoupment/i);
    expect(body).toMatch(/procedural (?:law|rules)/i);
  });

  /**
   * §6.3 holds the only enforcement-cost entitlement and the only 25% ceiling,
   * and `a-fee-is-a-debt-not-a-purchase` pins that it is alone. Four clauses
   * about litigation are the obvious place for a second one to appear.
   */
  it.each(ABOUT_LITIGATION)('%s adds no second fee entitlement and no second ceiling', (slug) => {
    const body = clause(slug).body;

    expect(body).not.toMatch(/twenty-five percent|25%/);
    expect(body).not.toMatch(/attorneys[’']\s*fees/i);
  });
});

/*
  ─── the controls ────────────────────────────────────────────────────────────

  A detector that has only ever been run against a corpus edited to satisfy it
  proves nothing. Each of these runs the detector against the sentence of the
  real document it was written to catch, and then against this corpus's own
  denials — because the failure mode that shipped here was not a detector that
  could not fire, it was a detector that excused the text it was written for.
*/

const V4_SEVEN_FIVE_SERVICE =
  'Merchant and Guarantor(s) further agree that mailing by certified or registered mail, return receipt ' +
  'requested, of any process required by any such court will constitute valid and lawful service of process ' +
  'against them, without the necessity for service by any other means.';

const V4_SEVEN_TWELVE =
  'SERVICE HEREUNDER SHALL BE COMPLETE UPON MERCHANT’S ACTUAL RECEIPT OF PROCESS OR UPON BUYER’S RECEIPT OF THE ' +
  'RETURN THEREOF BY THE UNITED STATES POSTAL SERVICE AS REFUSED OR UNDELIVERABLE. SERVICE BY BUYER TO THE LAST ' +
  'KNOWN ADDRESS SHALL BE SUFFICIENT.';

const V4_TEN_ONE =
  'Merchant hereby irrevocably and unconditionally waives personal service of any summons, complaint, or other ' +
  'process, which may be made by any other means permitted by New York or Florida law. Merchant further agrees ' +
  'to waive any objection to the absence of formal service of process.';

/** REVIEW-01 quotes this from `Lombard_FRPA_v4.pdf`; the manifest records it deleted. */
const V4_TEN_ONE_DELETED_SENTENCE =
  'Merchant understands and agrees that an action, lawsuit, or controversy may be taken up and considered by a ' +
  'court without any further notice.';

const V4_SEVEN_FIVE_FORUM =
  'Any suit, action, or proceeding arising hereunder shall, if Buyer so elects, be instituted in any court ' +
  'sitting in New York State or in Pasco County, Florida (the “Acceptable Forums”). The parties agree that the ' +
  'Acceptable Forums are convenient and submit to the jurisdiction of the Acceptable Forums and waive any and ' +
  'all objections to jurisdiction or venue.';

const V4_SEVEN_SEVEN =
  'In case any of the provisions in this Agreement is found to be invalid, illegal, or unenforceable in any ' +
  'respect, the validity, legality, and enforceability of any other provision contained herein shall not in any ' +
  'way be affected or impaired.';

const V4_SEVEN_NINETEEN =
  'Each Merchant and Guarantor agrees that any claim, whether sounding in contract, tort, law, equity, or ' +
  'otherwise, that is not asserted against Buyer within one (1) year after its accrual will be time-barred and ' +
  'forever waived, except to the extent such limitation is prohibited by applicable law.';

/** Built from Tex. Fin. Code §398.055's own subject matter; no document says it. */
const A_CONFESSION_OF_JUDGMENT =
  'Merchant hereby confesses judgment in favor of Buyer for the full Purchased Amount and authorizes any ' +
  'attorney to enter judgment against it without process.';

/** A waiver in the Connecticut shape. §36a-868 names all three of these. */
const A_PREJUDGMENT_WAIVER =
  'Merchant waives any right to notice, judicial hearing or prior court order in connection with Buyer ' +
  'obtaining a prejudgment remedy.';

describe('the detectors fire on the words they were written for', () => {
  it('catches a mailing that is made into service', () => {
    expect(deemsService(V4_SEVEN_FIVE_SERVICE)).toBe(true);
    expect(deemsService(V4_SEVEN_TWELVE)).toBe(true);
  });

  it('catches a waiver of service and of an objection to a forum', () => {
    expect(waivesServiceOrForum(V4_TEN_ONE)).toBe(true);
    expect(waivesServiceOrForum(V4_SEVEN_FIVE_FORUM)).toBe(true);
  });

  it('catches the Connecticut waiver and the confession of judgment', () => {
    expect(waivesPrejudgmentProtection(A_PREJUDGMENT_WAIVER)).toBe(true);
    expect(CONFESSES_JUDGMENT.test(A_CONFESSION_OF_JUDGMENT)).toBe(true);
  });

  it('catches the sentence the manifest deleted from Section 10.1', () => {
    expect(PROCEEDS_WITHOUT_NOTICE.test(V4_TEN_ONE_DELETED_SENTENCE)).toBe(true);
  });

  it('catches an unconditional severability promise, a named forum and a shortened period', () => {
    expect(/shall not in any way be affected or impaired/i.test(V4_SEVEN_SEVEN)).toBe(true);
    expect(NAMES_A_FORUM.test(V4_SEVEN_FIVE_FORUM)).toBe(true);
    expect(SHORTENS_LIMITATIONS.test(V4_SEVEN_NINETEEN)).toBe(true);
  });
});

describe('and the detectors do not fire on a denial', () => {
  /**
   * The other direction, and the one this package has actually got wrong. Four
   * clauses deny in words what these detectors look for, and a detector that
   * counted a denial as an offence would report §6.2 and §7.24 — the two
   * clauses that close these doors — as the ones that open them.
   */
  const DENIALS: { what: string; text: string }[] = [
    {
      what: '§7.24’s confession-of-judgment denial',
      text:
        'This Agreement contains no confession of judgment or comparable provision, as Section 6.2 and Section ' +
        '4.6 state, and it contains no waiver of a right to notice, to a judicial hearing or to a prior court ' +
        'order in connection with a prejudgment remedy. Nothing in Section 7.12 or Section 10 is such a waiver.',
    },
    {
      what: '§7.3’s statement that a notice is not service',
      text:
        'It does not govern service of process or any other judicial process, which Section 7.12 and Section 10 ' +
        'govern. Nothing in this Section substitutes for valid service of process or is evidence that service ' +
        'has been made.',
    },
    {
      what: '§6.2’s list of what the Agreement does not authorize',
      text:
        'This Agreement authorizes no debit of any deposit account of Merchant, no collection of Merchant’s ' +
        'retained share of Card Receipts or of any non-card receipt, no confession of judgment, and no signing ' +
        'of process in Merchant’s name.',
    },
    {
      what: '§7.24’s statutory-right sentence',
      text: 'No party waives a statutory right, and this Section cures no prohibited term.',
    },
  ];

  it.each(DENIALS)('$what is not read as an offence', ({ text }) => {
    expect(deemsService(text)).toBe(false);
    expect(waivesServiceOrForum(text)).toBe(false);
    expect(waivesPrejudgmentProtection(text)).toBe(false);
    expect(CONFESSES_JUDGMENT.test(text)).toBe(false);
  });

  /**
   * And the sweep is not vacuous in the ordinary way either: the corpus really
   * does contain clauses about service, forums and waivers, so a green result
   * is a result about them rather than about an empty set.
   */
  it('runs over a corpus that really has these subjects in it', () => {
    const aboutService = ALL_MCA_CLAUSES.filter((entry) => ABOUT_SERVICE.test(entry.body));

    expect(aboutService.length).toBeGreaterThan(4);
    expect(ALL_MCA_CLAUSES.filter((entry) => /\bjury\b/i.test(entry.body)).length).toBeGreaterThan(2);
  });
});
