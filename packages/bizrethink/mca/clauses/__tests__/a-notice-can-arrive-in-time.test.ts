import { describe, expect, it } from 'vitest';
import { selectClauses } from '../../engine/select-clauses';
import { containsPrescribedText, readSourceText } from '../../provenance/source-text';
import { documentLines } from '../documents';
import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { libraryFor } from '../library';
import { LOMBARD } from '../parties';

/**
 * A DEADLINE IS WRITTEN IN ONE CLAUSE AND THE CHANNEL IS WRITTEN IN ANOTHER.
 *
 * §7.3 required certified mail, return receipt requested, and made every
 * communication "effective only upon receipt". Read alone it is a boring
 * boilerplate paragraph. Read against the rest of the Agreement it is the
 * clause that switches other clauses off, and the corpus found that out three
 * times, separately, by three agents who were not looking for it:
 *
 *   - `reconciliation-right-conditioned-into-near-nullity` (REVIEW-01) — §3's
 *     timetable cannot start from a letter in transit. §3.2 carved out.
 *   - `frpa-6-4-24-hour-notice-cannot-be-given-under-7-3` (REVIEW-02) — a
 *     notice due within a day. §6.4 carved out.
 *   - §4.14's three-CALENDAR-day cancellation right, found by `fees-and-money`
 *     and by no review at all. §4.14 carved out.
 *
 * And a fourth nobody counted: §7.18's consent revocation, which v4 sent to
 * "the address in Section 7.3" while promising revocation "by any reasonable
 * means". `data-and-channel` carved that out too.
 *
 * FOUR CARVE-OUTS IS NOT FOUR DEFECTS, IT IS ONE. Each was found by reading a
 * clause and then remembering §7.3; each fix was local; and the next clause
 * with a deadline in it would have been the fifth. **The sweep in this file
 * says there were at least four more already** — §2.4, §4.13, §5.18 and §8.3 —
 * none of which any review, memo or brief names. That is why the fix is at the
 * channel and why the property is stated over the SET.
 *
 * WHAT IS ASSERTED. That no clause of this Agreement grants a right or imposes
 * a duty on a clock the Agreement's own notice provision cannot serve. It is
 * checkable because the two halves are separate objects: the clause with the
 * clock, and §7.3 with the channel.
 *
 * THE FOUR CARVE-OUTS STAY, and are asserted to stay. Under the rewritten §7.3
 * they are redundant — an administrative notice is effective when sent
 * whatever clause it is given under — but they remain TRUE, their authors
 * depended on them, and a redundant sentence that is correct is not a defect.
 * Deleting them would also silently re-couple those four clauses to whatever
 * §7.3 becomes next.
 *
 * EVERY ASSERTION BELOW WAS RED BEFORE THE REWRITE; the counts are in the
 * cluster report. The controls at the bottom run the same detectors over v4's
 * own sentences, because a detector that has only ever been run against a
 * corpus edited to satisfy it is not evidence of anything — the failure this
 * package shipped once, in two assertions that filtered on `Divergence` kinds
 * that do not exist.
 *
 * WHAT IT DOES NOT PROVE. That any of this is lawful, that a processor will
 * honour a split, or that Pacta can evidence what §7.17 assumes. Nothing here
 * is approved: `source` is `attorney-drafted` with a null author on every
 * record, and `assertPublishable` refuses all of them.
 */
const clauses = libraryFor('frpa');

const NOTICES = 'frpa.notices-7-3';
const MODIFICATIONS = 'frpa.modifications-amendments-7-1';
const ASSIGNMENT = 'frpa.assignment-7-2';
const WAIVER = 'frpa.waiver-of-remedies-7-4';
const SURVIVAL = 'frpa.survival-of-representations-7-6';
const ENTIRE = 'frpa.entire-agreement-7-8';
const RETURN = 'frpa.return-of-buyer-proceeds-7-16';
const COUNSEL = 'frpa.attorney-review-7-22';
const RIDERS = 'frpa.state-law-riders-7-24';
const TEXAS = 'frpa.texas-occc-notice-7-25';
const EXECUTION = 'frpa.execution';
const EXHIBIT_A = 'frpa.exhibit-a-split-funding';

const COMPLETION = 'frpa.completion-threshold-2-6';
const SPLIT = 'frpa.primary-collection-split-funding-via-approved-processor-2-3';
const FORUM = 'frpa.binding-effect-governing-law-venue-and-jurisdiction-7-5';
const PROCESS = 'frpa.service-of-process-7-12';

/** The four clauses that already say "notwithstanding Section 7.3", and why each does. */
const CARVE_OUTS: { slug: string; why: string }[] = [
  { slug: 'frpa.request-for-reconciliation-procedure-3-2', why: 'the §3 reconciliation timetable' },
  { slug: 'frpa.right-to-cancel-4-14', why: 'the three-calendar-day cancellation right' },
  { slug: 'frpa.required-notifications-6-4', why: 'a notice due within three Workdays of a bankruptcy filing' },
  { slug: 'frpa.communications-recording-and-premises-access-7-18', why: 'revocation of communications consent' },
];

const clause = (slug: string) => {
  const found = clauses.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the FRPA library`);
  }

  return found;
};

const sentences = (body: string): string[] =>
  body
    .split(/\n|(?<=[.;])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

/**
 * A sentence that puts a communication on a clock.
 *
 * THREE PARTS, ALL REQUIRED, and the third is what keeps the sweep honest. A
 * sentence must name a communication, bound it in time, and actually impose or
 * grant something — otherwise a recital that merely mentions a past notice is
 * counted as a duty, and the sweep reports a number instead of a defect.
 *
 * `before` and `prior to` ARE in the clock list even though neither states a
 * period, because the failure mode is not only a short deadline: a notice that
 * must be given BEFORE an event is unperformable through a channel whose
 * transit time the giver does not control, and §2.4's *"shall notify Buyer
 * before a planned change"* is exactly that shape.
 */
const COMMUNICATION = /\b(?:notice|notif(?:y|ies|ied|ication)|request|consent|demand)\w*/i;
const CLOCK =
  /\b(?:promptly|immediately|at once|forthwith|before|prior to|within|no later than|advance notice|same time)\b/i;
const IMPOSES = /\b(?:shall|must|may)\b/;

const timeBound = (body: string): boolean =>
  sentences(body).some((sentence) => COMMUNICATION.test(sentence) && CLOCK.test(sentence) && IMPOSES.test(sentence));

/** A clause that supplies its own channel does not depend on §7.3's. */
const carvesOut = (body: string): boolean => /Section 7\.3 does not apply|Notwithstanding Section 7\.3/i.test(body);

/**
 * Can §7.3, as written, carry a clock at all?
 *
 * Three conditions, and each of them is one of v4's three failures. It has to
 * offer a channel that is not a letter; it has to give a notice effect without
 * waiting for the letter to land; and it must not make one method mandatory,
 * because a mandatory method is a nullification dressed as formality.
 */
const carriesAClock = (body: string): boolean =>
  /\bemail\b/i.test(body) && /effective when (?:it is )?sent/i.test(body) && !/only upon receipt/i.test(body);

/** Every clause whose clock runs through a channel nothing in the Agreement supplies. */
const stranded = (noticeClauseBody: string): string[] =>
  clauses
    .filter((entry) => entry.slug !== NOTICES)
    .filter((entry) => timeBound(entry.body))
    .filter((entry) => !carvesOut(entry.body))
    .filter(() => !carriesAClock(noticeClauseBody))
    .map((entry) => entry.slug)
    .sort();

describe('no clause runs on a clock the notice provision cannot serve', () => {
  /**
   * The property, over the corpus rather than over the clause.
   *
   * A per-clause reading found this three times and stopped three times,
   * because the second half of the defect is always in a different file.
   */
  it('leaves no time-bound notice depending on a channel the Agreement does not supply', () => {
    expect(stranded(clause(NOTICES).body)).toEqual([]);
  });

  /**
   * And §7.3 is the reason it is green, so §7.3 has to say the three things.
   * Asserted separately from the sweep: if the sweep were the only assertion, a
   * corpus with no deadlines in it would also be green.
   */
  it('gives Section 7.3 a channel a deadline can travel on', () => {
    const body = clause(NOTICES).body;

    expect(body).toMatch(/\bemail\b/i);
    expect(body).toMatch(/effective when (?:it is )?sent/i);
    expect(body).not.toMatch(/only upon receipt/i);
    expect(body).not.toMatch(/shall be delivered by certified mail/i);
  });

  /**
   * The sweep is not vacuous: there really are clauses with clocks on them, and
   * under v4's §7.3 at least eight of them were unserviceable. Four had been
   * found and carved out one at a time; the four named here had not been found
   * by any review, by the 2026-09-09 memo, or by any cluster brief.
   */
  it('finds the clauses v4’s notice provision switched off', () => {
    const under = stranded(V4_SEVEN_THREE);

    expect(under.length).toBeGreaterThanOrEqual(4);
    // A right the paper grants — replace a processor mid-interruption — on
    // notice that is not effective until a letter lands.
    expect(under).toContain('frpa.approved-bank-account-2-4');
    // Termination for a missed funding date, defeasible while the letter flies.
    expect(under).toContain('frpa.timing-and-method-of-funding-4-13');
    // "Reasonable advance notice" of a change of name, processor or location.
    expect(under).toContain('frpa.change-of-name-or-location-or-sale-or-closing-of-business-5-18');
    // A settlement quotation with a date through which it holds good.
    expect(under).toContain('frpa.voluntary-prepayment-8-3');
  });

  /**
   * Redundant and kept. Each of these four states its own channel because §7.3
   * used to deny it one; §7.3 now supplies one, and the sentence stays true.
   *
   * IT IS NOT TIDINESS TO DELETE THEM. Their authors wrote a clause that works
   * whatever §7.3 says, and this assertion is what stops a later reader
   * "simplifying" four clauses back into dependence on a paragraph twenty pages
   * away.
   */
  it.each(CARVE_OUTS)('$slug keeps its own channel for $why', ({ slug }) => {
    const body = clause(slug).body;

    expect(carvesOut(body)).toBe(true);
    expect(body).toMatch(/email|reasonable (?:means|method)/i);
  });
});

/**
 * Administrative notice and judicial process are different things, and v4
 * conflated them in both directions: §7.3 governed "all communications
 * hereunder" including process, and §7.5 made a certified letter into service.
 */
describe('an administrative notice is not service of process', () => {
  it('sends judicial process out of Section 7.3 to the sections that govern it', () => {
    const body = clause(NOTICES).body;

    expect(body).toMatch(/service of process/i);
    expect(body).toContain('Section 7.12');
  });

  /**
   * Clauses that still turn a mailing into service, outside the two provisions
   * whose subject that is.
   *
   * THE CONCESSION IS GONE, AND THAT IS THE POINT OF HAVING HAD ONE. This
   * assertion carried a `CONCEDED` register holding one entry — §7.5's last
   * sentence, *"mailing by certified or registered mail ... will constitute
   * valid and lawful service of process against them"* — owned by
   * `disputes-service` under memo 061, and skipped rather than pinned, because
   * an assertion about another agent's uncommitted draft is a tripwire on their
   * work rather than a check on ours. §7.5 was rewritten on 2026-09-10 and the
   * sentence is gone, so the register goes with it and the filter goes with the
   * register: what is left is the property, unfiltered.
   *
   * `a-default-judgment-needs-a-served-defendant.test.ts` states the wider form
   * of this over every instrument, and its own register names what it could not
   * fix — two clauses of the Equipment Lease and the Subscription, which nobody
   * owns.
   */
  it('leaves service to Sections 7.12 and 10', () => {
    const offenders = clauses
      .filter((entry) => entry.slug !== PROCESS && entry.section !== 'service')
      .filter((entry) => SERVICE_BY_MAIL.test(entry.body))
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });
});

const SERVICE_BY_MAIL = /constitute[s]? valid and lawful service of process/i;

describe('the amendment rule stops carving out a cascade that is gone', () => {
  /**
   * §7.1 opened "Except as expressly provided in Sections 3.3, 3.4 and 4.15".
   * The §4.15 limb existed for v4's automatic cascade. Under a single-position
   * funder there is no cascade, so the carve-out resolves to a clause that
   * modifies nothing — a reference that reads as a live exception and is not
   * one. `select-clauses.test.ts` cannot see this: the number resolves.
   */
  it('names no section as an exception to the writing requirement', () => {
    expect(clause(MODIFICATIONS).body).not.toMatch(/Except as expressly provided in Sections/i);
  });

  it('says what a reconciliation and a correction are instead', () => {
    const body = clause(MODIFICATIONS).body;

    expect(body).toMatch(/are not amendments|is not an amendment/i);
    expect(body).toContain('Section 3');
  });

  /**
   * An amendment that enlarges a guarantor's obligation needs that guarantor's
   * own signature — the memo's, and the one limb of §7.1 that is about a person
   * who is not a party to the amendment.
   */
  it('requires a guarantor’s separate consent to enlarge a guarantor’s obligation', () => {
    expect(clause(MODIFICATIONS).body).toMatch(/Guarantor.{0,80}(?:separate|own).{0,40}(?:consent|signature)/i);
  });
});

describe('what survives completion, and what stops', () => {
  /**
   * `frpa-7-6-and-4-2-contradict-the-2-6-completion-test`. §2.6 says it is
   * "the only test of completion, and it governs wherever another provision of
   * this Agreement describes completion differently"; §7.6 described one, by
   * running its survival to "the Completion Threshold ... and all amounts then
   * due have been paid". That second limb is a second test, and under v4 it was
   * a fee-shaped one.
   */
  it('describes no completion test of its own', () => {
    const body = clause(SURVIVAL).body;

    expect(body).not.toMatch(/all amounts then due/i);
    expect(body).toContain('Section 2.6');
  });

  it('keeps an accrued claim without making a funding-date fact a perpetual warranty', () => {
    const body = clause(SURVIVAL).body;

    expect(body).toMatch(/accrued claim/i);
    expect(body).toMatch(/limitation period/i);
  });

  it('does not let survival enlarge a guaranty', () => {
    expect(clause(SURVIVAL).body).toMatch(/enlarges? (?:no|neither|not)|No survival provision enlarges/i);
  });
});

describe('the merger clause names a package that exists', () => {
  /**
   * v4's §7.8 was eleven words wide and incorporated nothing, while two
   * exhibits incorporated forms "attached and incorporated by reference" that
   * no signer has seen, and the suite grew to six instruments with no hierarchy
   * anywhere in it. A merger clause with no list is also the clause a seller
   * reaches for to erase what was said before signature.
   */
  it('incorporates no document the signer has not been given', () => {
    const body = clause(ENTIRE).body;

    expect(body).toMatch(/No (?:unseen|later-added)|not incorporated/i);
    expect(body).toMatch(/rider/i);
  });

  it('states an order of precedence rather than leaving one to be argued', () => {
    expect(clause(ENTIRE).body).toMatch(/controls?/i);
  });

  /**
   * The two documents that entered this suite in this branch, and the reason
   * the sentence is needed: a separate agreement for equipment must not import
   * a cross-default, a lien or a guaranty into the purchase.
   */
  it('keeps the separate agreements separate', () => {
    const body = clause(ENTIRE).body;

    expect(body).toMatch(/equipment/i);
    expect(body).toMatch(/subscription/i);
    expect(body).toMatch(/cross-default/i);
  });

  it('does not let integration erase a required disclosure', () => {
    expect(clause(ENTIRE).body).toMatch(/disclosure/i);
  });
});

describe('the assignment survives with the merchant’s rights attached', () => {
  it('sends the assignee the defences and the reconciliation right', () => {
    const body = clause(ASSIGNMENT).body;

    expect(body).toMatch(/subject to this Agreement/i);
    expect(body).toMatch(/reconciliation/i);
  });

  /**
   * `frpa-7-2-permits-delegation-of-the-reconciliation-duty`. Delegation does
   * not discharge the delegating party, and a partial assignment must not turn
   * one servicing contact into three.
   */
  it('does not let delegation discharge the buyer', () => {
    expect(clause(ASSIGNMENT).body).toMatch(/remains responsible/i);
  });

  it('keeps one servicing interface across a partial assignment', () => {
    expect(clause(ASSIGNMENT).body).toMatch(/single servicing/i);
  });

  /**
   * The merchant's own transfer stops being refusable at whim. §5.18 is where a
   * permitted business transfer is described, and it is ungated.
   */
  it('stops the merchant’s consent being withheld in sole discretion', () => {
    const body = clause(ASSIGNMENT).body;

    expect(body).not.toMatch(/sole discretion/i);
    expect(body).toContain('Section 5.18');
  });
});

describe('the return duty reaches the purchased share and no further', () => {
  /**
   * `default-collection-reaches-cash-and-checks` in its second location. v4
   * called the thing "proceeds of the Purchased Amount" — a face amount has no
   * proceeds — put it in an "express trust" for receipts that do not exist yet,
   * and reached Merchant's directors, officers, agents and affiliates, none of
   * whom signed.
   *
   * §2.4 depends on this clause: while a settlement interruption continues,
   * Merchant "shall account for the Purchased Receipts it actually receives and
   * shall remit them under Section 7.16". Narrowing it would break that.
   */
  it('is the clause §2.4 and §3.1 send an actual failure to remit to', () => {
    const body = clause(RETURN).body;

    expect(body).toMatch(/Purchased Receipts/);
    expect(body).toMatch(/remit/i);
  });

  it('does not reach the retained share, a non-card receipt, or money never received', () => {
    const body = clause(RETURN).body;

    expect(body).toMatch(/retained share/i);
    expect(body).toMatch(/non-card receipts?/i);
    expect(body).not.toMatch(/express trust/i);
  });

  it('counts in Workdays, like every other period in this Agreement', () => {
    expect(clause(RETURN).body).not.toMatch(/business days?/i);
    expect(clause(RETURN).body).toMatch(/Workdays?/);
  });
});

describe('the counsel recital says only what is true', () => {
  /**
   * `frpa-7-10-jury-waiver-recites-what-7-22-contemplates-is-false`: §7.10
   * recites that the jury waiver was made "ONLY AFTER EXTENSIVE CONSIDERATION
   * ... WITH THEIR ATTORNEYS", while §7.22 contemplates a signer who chose not
   * to consult anybody. One of the two is false on every signing where nobody
   * called a lawyer, and the signature attests to it.
   */
  it('does not attest that counsel was consulted', () => {
    expect(clause(COUNSEL).body).toMatch(/No party represents that counsel was consulted unless that occurred/i);
  });

  /**
   * `frpa-4-8-conditions-the-counsel-review-7-22-promises`: §4.8 let a merchant
   * show the Agreement to an adviser only if the adviser first signed up to
   * Buyer's confidentiality terms, which is a condition on the very review
   * §7.22 recites as freely available. §4.8 now carries the exception; §7.22
   * points at it so the promise and its condition are read together.
   */
  it('points at the confidentiality clause that used to condition it', () => {
    expect(clause(COUNSEL).body).toContain('Section 4.8');
  });

  it('waives no fraud, misrepresentation or disclosure claim', () => {
    const body = clause(COUNSEL).body;

    expect(body).not.toMatch(/has not relied on any representation/i);
    expect(body).toMatch(/fraud/i);
  });
});

describe('the waiver clause is reciprocal and subordinate', () => {
  it('binds both parties rather than only the buyer', () => {
    expect(clause(WAIVER).body).not.toMatch(/No failure on the part of Buyer/i);
  });

  /**
   * "Cumulative and not exclusive of any remedies provided by law or equity"
   * is the sentence that quietly reopens everything §6.2 closes. §4.12 already
   * says Buyer's remedies are not cumulative of anything §6.2 does not give.
   */
  it('does not make remedies cumulative of anything Section 6 does not give', () => {
    const body = clause(WAIVER).body;

    expect(body).not.toMatch(/cumulative and not exclusive/i);
    expect(body).toContain('Section 6');
  });
});

/**
 * THE CRITICAL. A UCC §9-406 notification of a PARTIAL assignment does not
 * compel an acquirer to split settlement, so the exhibit that instructs the
 * split is the document the whole product rests on.
 */
describe('the exhibit that moves the money meets §2.3’s specification', () => {
  it.each([
    ['the settlement base', /Card Receipts/],
    ['the Specified Percentage', /Specified Percentage/],
    ['a transaction reference', /reference/i],
    ['a contact', /contact/i],
    ['how the instruction stops', /stop/i],
  ])('states %s', (_what, pattern) => {
    expect(clause(EXHIBIT_A).body).toMatch(pattern);
  });

  it('caps collection once across every processor', () => {
    const body = clause(EXHIBIT_A).body;

    expect(body).toMatch(/single aggregate|one aggregate/i);
    expect(body).toContain('Purchased Amount');
  });

  it.each([
    ['a fixed or minimum remittance', /minimum/i],
    ['an increase on default', /increase/i],
    ['a debit of a deposit account', /deposit account/i],
  ])('forbids %s', (_what, pattern) => {
    expect(clause(EXHIBIT_A).body).toMatch(pattern);
  });

  /**
   * `fees-and-money`'s requirement, and the one the vendored letter fails.
   * §4.1 says "no fee is collected through a Split Funding Authorization"; a
   * rule stated only in §4.1 has no counterpart on the paper that actually
   * moves the money, and the paper is where the processor reads its
   * instruction.
   */
  it('forbids the collection of a fee', () => {
    expect(clause(EXHIBIT_A).body).toMatch(/fee/i);
    expect(clause(EXHIBIT_A).body).toMatch(/no fee|not?[a-z ]{0,20}collect[^.]{0,60}fee/i);
  });

  /**
   * The acceptance is obtained, not assumed, and the executed pair is kept.
   * §2.3 carries the operative duty; the exhibit states what the document has
   * to contain for that duty to be checkable against paper.
   */
  it('requires the processor’s written acceptance and keeps it with the record', () => {
    const body = clause(EXHIBIT_A).body;

    expect(body).toMatch(/written acceptance/i);
    expect(body).toMatch(/transaction record/i);
  });

  it('incorporates no form by reference alone', () => {
    expect(clause(EXHIBIT_A).body).not.toMatch(/attached and incorporated by reference/i);
  });

  /**
   * NOT GATED ON `processorSplitAccepted`, AND THE ASSERTION IS THE POINT.
   *
   * The brief marks this `both` on that fact. It is refused, for the reason the
   * spine cluster refused it on §2.3 and one the spine cluster did not have:
   * §2.3 and `frpa.holdback-explainer` are both ungated and both name Exhibit A
   * BY NAME rather than by section number, so gating the exhibit out leaves a
   * dangling reference that `select-clauses.test.ts` cannot see — it reads
   * `Section N` tokens and "Exhibit A" is not one. Asserted here instead.
   */
  it('is in every funder’s document, including the one whose processor has not accepted', () => {
    for (const processorSplitAccepted of [true, false]) {
      const facts: McaFacts = { ...LOMBARD_FACTS, processorSplitAccepted };
      const slugs = selectClauses({ facts, instrument: 'frpa' }).selected.map((entry) => entry.slug);

      expect(slugs).toContain(EXHIBIT_A);
      expect(slugs).toContain(SPLIT);
    }
  });
});

/**
 * The vendored authorization does not meet the specification above, and this
 * says so rather than leaving it to a report nobody re-runs.
 *
 * A REGISTER, NOT A FILTER — `select-clauses.test.ts`'s KNOWN_GAPS rule. Each
 * entry has to stay reachable, so that the day somebody rewrites the Payzli
 * letter this test goes red and the entry is deleted rather than left standing
 * as a line that can no longer fail.
 *
 * NOBODY OWNS `split-funding.*`. No cluster in this wave has it, and it is
 * outside `miscellaneous`'s two files. Handed back in the cluster report.
 */
const AUTHORIZATION_DEFECTS: { slug: string; pattern: RegExp; what: string }[] = [
  {
    slug: 'split-funding.split-funding-instruction',
    pattern: /may include fees in addition to the Purchased Amount/i,
    what: 'sweeps a fee out of settlement, which §4.1 and Appendix A both forbid',
  },
  {
    slug: 'split-funding.split-funding-instruction',
    pattern: /is not the point at which withholding stops/i,
    what: 'has no aggregate cap: withholding runs past the Purchased Amount until Buyer says otherwise',
  },
  {
    slug: 'split-funding.indemnity',
    pattern: /agrees to indemnify/i,
    what: 'takes an indemnity §7.9 does not authorise, in favour of a processor',
  },
];

describe('the authorization on file does not yet meet it', () => {
  const letter = libraryFor('split-funding');

  it.each(AUTHORIZATION_DEFECTS)('$slug still $what', ({ slug, pattern }) => {
    const found = letter.find((entry) => entry.slug === slug);

    expect(found, `${slug} is not in the split-funding library`).toBeDefined();
    expect(pattern.test(found?.body ?? '')).toBe(true);
  });

  /**
   * And the defect that is an absence, which no pattern over the LIBRARY can
   * find: the vendored letter is signed by the Seller alone. There is no
   * acceptance block for the processor at all, so the duty §2.3 puts on Buyer —
   * "obtain each Approved Processor's written acceptance ... before the Purchase
   * Date" — has nowhere on the paper to be discharged, and Exhibit A now
   * requires that acceptance in writing.
   *
   * READ FROM THE DOCUMENT, NOT FROM THE CLAUSES, and the first red run is why:
   * a signature block is not a clause, so it is not in `libraryFor('split-
   * funding')` at all and an assertion over clause bodies could not see it.
   * That is the same reason `frpa-coverage.test.ts` reads the document — a
   * missing signature block is exactly the kind of absence a library cannot
   * report on itself.
   */
  it('has no processor acceptance block for §2.3’s duty to be discharged on', () => {
    const document = documentLines(LOMBARD.documents['split-funding'].file).join('\n');

    // The seller signs, with a signature widget and a date widget.
    expect(document).toMatch(/SELLER \(/);
    expect(document).toMatch(/\{\{SIGNATURE/);
    // Nobody at the processor does.
    expect(document).not.toMatch(/accepted and agreed|acknowledged and accepted|Processor Signature/i);
  });
});

/**
 * THE OTHER CRITICAL. Eleven states, one of which puts words inside the
 * contract, and the clause that decides whether this form may be offered
 * anywhere.
 */
describe('the state-law rider is a deployment surface, not a severance clause', () => {
  /**
   * `frpa-7-24-misstates-what-tex-fin-code-398-055-voids`, rated a blocker.
   * v4 said §398.055 "voids confession-of-judgment and similar provisions" and
   * then supplied severance — "that provision does not apply ... and the
   * remainder of the Agreement continues in effect". The statute voids the
   * CONTRACT, so severance is the one outcome it forecloses, and a clause that
   * promises it is worse than silence.
   */
  it('does not answer a whole-contract consequence with severance', () => {
    const body = clause(RIDERS).body;

    expect(body).not.toMatch(/does not apply to this Agreement and the remainder/i);
    expect(body).toMatch(/contains no confession of judgment/i);
  });

  /**
   * `frpa-7-24-answers-only-half-of-conn-gen-stat-36a-868`. The section has two
   * limbs: the contract may not CONTAIN the waiver, and any such provision is
   * unenforceable. Disapplying a provision answers the second only, and the
   * first carries a civil penalty. The answer to the first limb is that the
   * form does not contain one, stated as a fact about this Agreement.
   */
  it('answers the containment limb, not only the enforceability limb', () => {
    expect(clause(RIDERS).body).toMatch(/contains no[^.]{0,80}(?:waiver|prejudgment)/i);
  });

  /**
   * `frpa-7-24-does-not-name-the-statute-that-actually-bites`, whose locus is
   * "7.24 ... read against 7.5". §7.5 mandates New York or Pasco County,
   * Florida. For a Virginia recipient that is a provision "mandating that such
   * action be brought outside the Commonwealth".
   *
   * §7.5 IS NOT THIS CLUSTER'S. So §7.24 states the rule and gives itself
   * priority, and the conflict is handed to `disputes-service` rather than
   * resolved by editing their clause. It deliberately does not describe what
   * §7.5 says, because §7.5 is being rewritten in this checkout.
   */
  it('states the Virginia forum rule and gives it priority over the forum clause', () => {
    const body = clause(RIDERS).body;

    expect(body).toMatch(/Virginia/);
    expect(body).toContain('Section 7.5');
  });

  it('waives no statutory right and claims to cure no prohibited term', () => {
    const body = clause(RIDERS).body;

    expect(body).toMatch(/waives no statutory right|No party waives a statutory right/i);
    expect(body).toMatch(/cures? no prohibited term|does not cure/i);
  });

  it('puts the rider before the offer rather than after the signature', () => {
    expect(clause(RIDERS).body).toMatch(/before[^.]{0,60}(?:offer|execution)/i);
  });
});

describe('the Texas notice is the regulator’s words, unaltered', () => {
  /**
   * 7 TAC §86.310(d) requires the contract to CONTAIN the statement, "as a
   * separate section or otherwise conspicuously set out from surrounding
   * written material". A paraphrase does not contain it and a separate
   * disclosure document does not satisfy an in-contract requirement.
   *
   * ADR 0008's conformity surface, applied to a clause: the words are checked
   * against the vendored primary text on every run, so a tidy-up of the address
   * or a rewrite of the sentence is red rather than invisible.
   */
  it('appears verbatim in the vendored adopted rule', () => {
    const source = readSourceText('TX-7TAC-86-310-313.txt');
    const notice = clause(TEXAS).body.slice(clause(TEXAS).body.indexOf('The Office of Consumer Credit'));

    expect(notice.length).toBeGreaterThan(300);
    expect(containsPrescribedText(source, notice)).toBe(true);
  });

  it('names the rule that compels it', () => {
    expect(clause(TEXAS).requiredBy).toMatch(/86\.310/);
    expect(clause(TEXAS).appliesInStates).toEqual(['US-TX']);
  });

  /**
   * THE GATE, AND WHAT "PARTITION" MEANS FOR A `string[]`.
   *
   * `recipientStates` is a list, not an enum, so ADR 0013's "the values of a
   * fact must partition the clauses it gates" cannot mean one clause per value
   * — there are 2^11 values and a template may be offered in several states at
   * once. What partitions is the PREDICATE: `includes('US-TX')` is true or
   * false, and the two answers select this clause or do not.
   *
   * It is an ADDITION rather than an alternative, which is the §7.21 shape
   * (`brokerChannel`, no replacement clause) and not the §4.15 shape (an
   * exhaustive pair). That is right here because a non-Texas transaction has no
   * OCCC — the clause is genuinely absent, not differently worded — and because
   * §86.310(d) demands the notice be conspicuously SEPARATE from surrounding
   * material, which folding it into §7.24 would defeat.
   */
  it.each([
    { states: ['US-TX'] as const, present: true },
    { states: ['US-FL'] as const, present: false },
    { states: ['US-FL', 'US-TX'] as const, present: true },
    { states: [] as const, present: false },
  ])('is in the document when recipientStates is $states', ({ states, present }) => {
    const facts: McaFacts = { ...LOMBARD_FACTS, recipientStates: [...states] };
    const slugs = selectClauses({ facts, instrument: 'frpa' }).selected.map((entry) => entry.slug);

    expect(slugs.includes(TEXAS)).toBe(present);
    // The general rider is not a Texas question and travels with every profile.
    expect(slugs).toContain(RIDERS);
  });

  /**
   * Two §7.24s in one document would make every cross-reference to §7.24
   * ambiguous. The Texas notice is a section of its own, which is also what
   * §86.310(d) asks for.
   */
  it('is its own section rather than a second §7.24', () => {
    expect(clause(TEXAS).number).not.toBe(clause(RIDERS).number);
  });
});

describe('the signature block binds the signer to what the signer signed', () => {
  /**
   * The route to guarantor liability that `personal-liability-is-section-9-
   * only` conceded to this cluster: "legally binding Merchant and Guarantor to
   * comply with the terms of this Agreement" is a full-performance guaranty in
   * the signature block, twenty pages from §9.2's promise that the Guaranty
   * does not guarantee the performance of any other covenant.
   *
   * **The concession in that file is deleted in the same change**, exactly as
   * `data-and-channel` did for §7.21. A concession left standing after the
   * defect is fixed is a line of a test that can no longer be red.
   */
  it('does not bind a guarantor to the whole Agreement', () => {
    expect(clause(EXECUTION).body).not.toMatch(/binding Merchant and Guarantor to comply/i);
  });

  /**
   * And the second sentence. Calling any misstatement a "separate cause of
   * action for fraud" supplies neither scienter, reliance, causation nor
   * damage; what it does supply is a sentence a collector can quote at a
   * guarantor whose only error was a wrong figure on a form.
   */
  it('creates no standalone fraud cause of action', () => {
    const body = clause(EXECUTION).body;

    expect(body).not.toMatch(/may constitute a separate cause of action/i);
    expect(body).toMatch(/elements imposed by applicable law|requires proof/i);
  });

  /**
   * The certification stops sweeping in third-party summaries. "All of Buyer's
   * documents, forms, and recorded interviews" includes a broker's write-up and
   * a call-centre note, neither of which the signer wrote or has seen.
   */
  it('certifies identified written submissions, not every document in the file', () => {
    const body = clause(EXECUTION).body;

    expect(body).not.toMatch(/complete in all respects/i);
    expect(body).not.toMatch(/recorded interviews/i);
    expect(body).toMatch(/knowledge after reasonable inquiry/i);
  });

  it('keeps the two capacities apart and gives each signer the papers', () => {
    const body = clause(EXECUTION).body;

    expect(body).toMatch(/capacity/i);
    expect(body).toMatch(/complete signed documents/i);
  });
});

/**
 * The controls.
 *
 * Every detector above runs over a corpus that was edited to satisfy it, so a
 * green proves nothing unless the detector can still go red. These run the same
 * functions over v4's own sentences, quoted from
 * `clauses/source-documents/Lombard_FRPA_v4.txt`.
 */
const V4_SEVEN_THREE =
  'All notices, requests, consents, demands, and other communications hereunder shall be delivered by certified ' +
  'mail, return receipt requested, to the respective parties at the addresses set forth in this Agreement (or at ' +
  'such other address as the party shall specify in writing) and shall become effective only upon receipt.';

describe('the detectors fire on the text they were written for', () => {
  const V4_SEVEN_FIVE =
    'Merchant and Guarantor(s) further agree that mailing by certified or registered mail, return receipt ' +
    'requested, of any process required by any such court will constitute valid and lawful service of process ' +
    'against them, without the necessity for service by any other means.';

  const V4_EXECUTION =
    'Each of Merchant and Guarantor represents that he or she is authorized to sign this Agreement, legally ' +
    'binding Merchant and Guarantor to comply with the terms of this Agreement and that the information provided ' +
    'herein and in all of Buyer’s documents, forms, and recorded interviews is true, accurate, and complete in ' +
    'all respects.';

  const V4_SEVEN_ONE =
    'Except as expressly provided in Sections 3.3, 3.4 and 4.15, no modification, amendment, waiver, or consent ' +
    'of any provision of this Agreement shall be effective unless the same shall be in writing and signed by ' +
    'both parties.';

  it('sees that v4’s notice provision cannot carry a clock', () => {
    expect(carriesAClock(V4_SEVEN_THREE)).toBe(false);
    expect(carriesAClock(clause(NOTICES).body)).toBe(true);
  });

  it('finds a clock in a clause that has one, and none in a clause that has not', () => {
    expect(timeBound('Merchant shall notify Buyer before a planned change.')).toBe(true);
    expect(timeBound('Merchant was given notice of the transaction.')).toBe(false);
    // A period with no communication in it is not this defect.
    expect(timeBound('Buyer shall refund the amount within five (5) Workdays.')).toBe(false);
  });

  it('recognises a carve-out in both of the forms the corpus uses', () => {
    expect(carvesOut('Notwithstanding Section 7.3, the notice may be given by email.')).toBe(true);
    expect(carvesOut('Section 7.3 does not apply to a request under this Section.')).toBe(true);
    expect(carvesOut('A notice under this Section is given as Section 7.3 provides.')).toBe(false);
  });

  it('flags the sentence that turns a letter into service of process', () => {
    expect(SERVICE_BY_MAIL.test(V4_SEVEN_FIVE)).toBe(true);
    expect(SERVICE_BY_MAIL.test(clause(PROCESS).body)).toBe(false);
    // The clause this file conceded to `disputes-service` until 2026-09-10.
    expect(SERVICE_BY_MAIL.test(clause(FORUM).body)).toBe(false);
  });

  it('flags the signature block’s guaranty and its fraud sentence', () => {
    expect(/binding Merchant and Guarantor to comply/i.test(V4_EXECUTION)).toBe(true);
    expect(/complete in all respects/i.test(V4_EXECUTION)).toBe(true);
    expect(/binding Merchant and Guarantor to comply/i.test(clause(EXECUTION).body)).toBe(false);
  });

  it('flags the amendment carve-out that resolves to nothing', () => {
    expect(/Except as expressly provided in Sections/i.test(V4_SEVEN_ONE)).toBe(true);
  });

  /**
   * And the conformity check can fail. A paraphrase of the OCCC notice — one
   * word changed — is not the statement §86.310(d) requires the contract to
   * contain, and the checker has to say so or it is checking nothing.
   */
  it('refuses a paraphrase of the OCCC notice', () => {
    const source = readSourceText('TX-7TAC-86-310-313.txt');

    expect(
      containsPrescribedText(
        source,
        'The Office of Consumer Credit Commissioner (OCCC) is a state agency that enforces some laws that apply ' +
          'to this contract.',
      ),
    ).toBe(false);
  });

  /**
   * §2.6 is untouched by this cluster and is the completion test §7.6 stopped
   * describing, so a green above must not be a green over a §2.6 that also
   * lost it.
   */
  it('leaves the completion test where §2.6 states it', () => {
    expect(clause(COMPLETION).body).toContain('That is the only test of completion');
  });
});
