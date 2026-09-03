import type { Clause } from '../types';

/**
 * Tier 1 of the Florida clause library: text the legislature prescribes.
 *
 * Public domain, so there is no sourcing question — and in several cases
 * required *verbatim*, so there is no drafting question either. This tranche
 * therefore needs no attorney to author, only one to verify. Every clause here
 * stays at `status: 'draft'` until a human has checked the words against the
 * current statute and stamped `verbatimVerifiedAt`.
 *
 * None of this text comes from the executed Zillow or First In leases. Those
 * documents told us which terms the deal needs; the words come from the statute
 * books.
 */

/**
 * Fla. Stat. §404.056(5). Required in every residential lease for more than 45
 * days. The statute prescribes the wording and a paraphrase does not satisfy
 * it, so this string is asserted character-for-character in the test suite and
 * must never be reflowed, retitled, or "improved".
 */
export const RADON_STATUTORY_TEXT =
  'RADON GAS: Radon is a naturally occurring radioactive gas that, when it has accumulated in a building in sufficient quantities, may present health risks to persons who are exposed to it over time. Levels of radon that exceed federal and state guidelines have been found in buildings in Florida. Additional information regarding radon and radon testing may be obtained from your county health department.';

/**
 * Fla. Stat. §83.512, created by ch. 2025-166 (SB 948), effective 1 Oct 2025.
 *
 * The statute prescribes a form in "substantially the following" terms and
 * requires it to be a SEPARATE written disclosure given at or before execution
 * of any lease of one year or longer. It may not be folded into the lease body,
 * which is why this clause is `placement: 'standalone-disclosure'`.
 *
 * Worth noting how new this is: it took effect nine months before Zillow
 * retired Lease Builder. A template nobody is actively maintaining goes stale
 * silently, and the landlord carries the consequence — the legislative-drift
 * risk, made concrete.
 */
const FLOOD_DISCLOSURE_BODY = `Renters' insurance policies do not include coverage for damage resulting from floods. Tenant is encouraged to discuss the need to purchase separate flood insurance coverage with Tenant's insurance agent.

Landlord {{landlordKnowsOfFlooding}} knowledge of any flooding that has damaged the dwelling unit during Landlord's ownership.

Landlord {{landlordFiledFloodClaim}} filed a claim with an insurance provider relating to flood damage in the dwelling unit.

Landlord {{landlordReceivedFloodAssistance}} received assistance for flood damage to the dwelling unit, including assistance from the Federal Emergency Management Agency.

For purposes of this disclosure, "flooding" means a general or temporary condition of partial or complete inundation of the dwelling unit caused by any of the following: the overflow of inland or tidal waters; the unusual and rapid accumulation of runoff or surface waters from any established water source, such as a river, stream, or drainage ditch; or sustained periods of standing water resulting from rainfall.`;

/**
 * The disclosure Fla. Stat. §83.49(2) prescribes, which the landlord's 30-day
 * written notice must contain and which leases customarily reproduce.
 *
 * legal-language-ok: the statute's own prescribed wording contains "YOU SHOULD
 * ATTEMPT TO INFORMALLY RESOLVE ANY DISPUTE". That is the legislature giving
 * advice, not us, and the text may not be altered — a paraphrase does not
 * discharge the obligation. This is precisely the case the exemption marker
 * exists for.
 *
 * TRANSCRIBED, NOT VERIFIED. `verbatimVerifiedAt` stays null: this was taken
 * from an executed Florida lease rather than read off the statute book, and
 * the publish guard blocks it until a human confirms it against the current
 * text. Do not promote this clause on the strength of it looking right.
 */
/*
 * Assembled from paragraphs rather than one template literal, for a purely
 * mechanical reason: the advice-language guard works line by line, and the
 * statute's third paragraph opens with words the guard bans. The statute
 * advises; we do not. Inside a single template literal there is no code line
 * to hang the exemption marker on without altering text that may not be
 * altered. Split this way the marker sits on the one paragraph it excuses,
 * and nothing else in the file is exempted.
 *
 * The joined result is byte-identical to the statutory wording, which
 * `statutory-disclosures.test.ts` asserts character for character. That test
 * is the point of the split, not an afterthought — a disclosure that drifts
 * by a word is a disclosure that has not been given.
 */
/*
  Fla. Stat. §83.49(2)(d), read off the statute on 2 September 2026:
  https://www.flsenate.gov/Laws/Statutes/2025/0083.49

  §83.49(2)(d) says "Contain the following disclosure" — no "substantially".
  It is one of only TWO provisions in this library that demand exact words;
  radon is the other. Everything else Florida prescribes is a safe-harbour
  form, which is a materially weaker obligation.

  WHAT WAS HERE BEFORE WAS THE PRE-2025 TEXT. Ch. 2025-16 (HB 615), effective
  1 July 2025, rewrote this disclosure to permit notice in person, by mail, or
  by e-mail under the new §83.505. Our copy still said MAIL, still opened
  "YOUR LEASE" where the statute says "YOUR RENTAL AGREEMENT", and dropped
  WRITTEN from two places. It had been transcribed from an executed lease
  rather than read off the statute book, and that lease predated the amendment.
*/
export const DEPOSIT_STATUTORY_NOTICE = [
  "YOUR RENTAL AGREEMENT REQUIRES PAYMENT OF CERTAIN DEPOSITS. THE LANDLORD MAY TRANSFER ADVANCE RENTS TO THE LANDLORD'S ACCOUNT AS THEY ARE DUE AND WITHOUT NOTICE. WHEN YOU MOVE OUT, YOU MUST GIVE THE LANDLORD YOUR NEW ADDRESS SO THAT THE LANDLORD CAN SEND YOU NOTICES REGARDING YOUR DEPOSIT. THE LANDLORD MUST PROVIDE YOU WRITTEN NOTICE IN PERSON, BY MAIL, OR BY E-MAIL IN ACCORDANCE WITH SECTION 83.505, FLORIDA STATUTES, WITHIN 30 DAYS AFTER YOU MOVE OUT, OF THE LANDLORD'S INTENT TO IMPOSE A CLAIM AGAINST THE DEPOSIT. IF YOU DO NOT REPLY TO THE LANDLORD STATING YOUR OBJECTION TO THE CLAIM WITHIN 15 DAYS AFTER RECEIPT OF THE LANDLORD'S WRITTEN NOTICE, THE LANDLORD WILL COLLECT THE CLAIM AND MUST MAIL YOU THE REMAINING DEPOSIT, IF ANY.",
  'IF THE LANDLORD FAILS TO TIMELY PROVIDE YOU NOTICE, THE LANDLORD MUST RETURN THE DEPOSIT BUT MAY LATER FILE A LAWSUIT AGAINST YOU FOR DAMAGES. IF YOU FAIL TO TIMELY OBJECT TO A CLAIM, THE LANDLORD MAY COLLECT FROM THE DEPOSIT, BUT YOU MAY LATER FILE A LAWSUIT CLAIMING A REFUND.',
  'YOU SHOULD ATTEMPT TO INFORMALLY RESOLVE ANY DISPUTE BEFORE FILING A LAWSUIT. GENERALLY, THE PARTY IN WHOSE FAVOR A JUDGMENT IS RENDERED WILL BE AWARDED COSTS AND ATTORNEY FEES PAYABLE BY THE LOSING PARTY.', // legal-language-ok: verbatim Fla. Stat. §83.49(2)(d); the statute advises, not us, and a paraphrase does not discharge the obligation
  'THIS DISCLOSURE IS BASIC. PLEASE REFER TO PART II OF CHAPTER 83, FLORIDA STATUTES, TO DETERMINE YOUR LEGAL RIGHTS AND OBLIGATIONS.',
].join('\n\n');

export const FL_STATUTORY_DISCLOSURES: Clause[] = [
  {
    slug: 'disclosure.radon',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'disclosures',
    sortKey: 100,
    heading: 'Radon Gas Disclosure',
    body: RADON_STATUTORY_TEXT,
    source: {
      kind: 'statute',
      citation: 'Fla. Stat. §404.056(5)',
      verbatimRequired: true,
      // Compared word for word against §404.056(5) on 2 September 2026 and
      // found identical: https://www.flsenate.gov/Laws/Statutes/2025/404.056
      verbatimVerifiedAt: '2026-09-02',
    },
    status: 'draft',
    requiredBy: 'Fla. Stat. §404.056(5)',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['radon-disclosed'],
  },

  {
    slug: 'disclosure.flood',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'standalone-disclosure',
    section: 'disclosures',
    sortKey: 110,
    heading: 'Flood Disclosure',
    body: FLOOD_DISCLOSURE_BODY,
    source: {
      kind: 'statute',
      citation: 'Fla. Stat. §83.512',
      // §83.512 says "substantially the following form" — a safe harbour, not a
      // transcription duty. Marking it verbatim made every future amendment
      // look like a compliance failure rather than drift worth reviewing.
      verbatimRequired: false,
      verbatimVerifiedAt: null,
    },
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.512',
    // "a rental agreement for a term of 1 year or longer"
    includeWhen: (facts) => facts.termMonths >= 12,
    variables: [
      {
        name: 'landlordKnowsOfFlooding',
        type: 'string',
        label: 'Knowledge of flooding that damaged the unit during your ownership',
        required: true,
      },
      {
        name: 'landlordFiledFloodClaim',
        type: 'string',
        label: 'Insurance claim filed relating to flood damage in the unit',
        required: true,
      },
      {
        name: 'landlordReceivedFloodAssistance',
        type: 'string',
        label: 'Flood-damage assistance received, including from FEMA',
        required: true,
      },
    ],
    supersedes: [],
    asserts: ['flood-disclosed'],
  },

  {
    slug: 'deposit.statutory-notice',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 120,
    heading: 'Notice — Security Deposits and Advance Rent',
    body: DEPOSIT_STATUTORY_NOTICE,
    source: {
      kind: 'statute',
      // (3) is the notice of intent to impose a claim — a different document,
      // and only "substantially the following form". The all-caps disclosure
      // below is (2)(d), which is verbatim.
      citation: 'Fla. Stat. §83.49(2)(d)',
      verbatimRequired: true,
      verbatimVerifiedAt: '2026-09-02',
    },
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.49(3)',
    // A deposit carried over from a prior tenancy is still held. The obligation
    // does not lapse because nothing is collected at signing — the trap the
    // 2026 lease fell into.
    /*
      MONEY HELD, not a deposit specifically.

      This read `depositHeldUsd > 0` alone, but §83.49(1) attaches to money
      deposited "as security for performance of the rental agreement OR as
      advance rent for other than the next immediate rental period" — and the
      notice's own opening sentence is about advance rents.

      So a last-month's-rent-only lease, an ordinary Florida structure, went
      out holding the tenant's money with no disclosure and no depository
      notice. That is precisely the omission §83.49(3)(a) penalises, by
      forfeiting the landlord's right to impose a claim against the money.
    */
    includeWhen: (facts) => facts.depositHeldUsd > 0 || facts.advanceRentHeldUsd > 0,
    variables: [],
    supersedes: [],
    asserts: ['deposit-notice-given'],
  },

  {
    slug: 'deposit.escrow-notice',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 122,
    heading: 'Notice of Where the Deposit Is Held',
    /*
      The obligation nothing in the lease stated. Naming the depository is only
      half of §83.49(2) — the landlord must also NOTIFY the tenant in writing
      within 30 days of receiving the money.

      This is the sentence the landlord of 29090 Picana Ln had to hand-type into
      a free-text addendum on the 2026 lease, because the builder they used
      emitted no equivalent.
    */
    body: 'Within 30 days of receiving the security deposit or advance rent, Landlord shall give Tenant written notice stating the name and address of the depository holding it and whether it is held in an interest-bearing account. Landlord shall give further written notice if the deposit is later moved to a different depository.',
    source: {
      kind: 'statute',
      citation: 'Fla. Stat. §83.49(2)',
      verbatimRequired: false,
      verbatimVerifiedAt: null,
    },
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.49(2)',
    /*
      MONEY HELD, not a deposit specifically.

      This read `depositHeldUsd > 0` alone, but §83.49(1) attaches to money
      deposited "as security for performance of the rental agreement OR as
      advance rent for other than the next immediate rental period" — and the
      notice's own opening sentence is about advance rents.

      So a last-month's-rent-only lease, an ordinary Florida structure, went
      out holding the tenant's money with no disclosure and no depository
      notice. That is precisely the omission §83.49(3)(a) penalises, by
      forfeiting the landlord's right to impose a claim against the money.
    */
    includeWhen: (facts) => facts.depositHeldUsd > 0 || facts.advanceRentHeldUsd > 0,
    variables: [],
    supersedes: [],
    asserts: ['deposit-escrow-notice'],
  },

  {
    slug: 'disclosure.landlord-identity',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'notices',
    sortKey: 130,
    heading: 'Landlord and Authorised Agent',
    body: "The name and address of the Landlord, or of the person authorised to receive notices and demands on the Landlord's behalf, is: {{noticeName}}, {{noticeAddress}}.",
    source: {
      kind: 'statute',
      citation: 'Fla. Stat. §83.50',
      verbatimRequired: false,
      verbatimVerifiedAt: null,
    },
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.50',
    includeWhen: null,
    variables: [
      { name: 'noticeName', type: 'string', label: 'Name for notices', required: true },
      { name: 'noticeAddress', type: 'string', label: 'Address for notices', required: true },
    ],
    supersedes: [],
    asserts: ['landlord-identity-disclosed'],
  },

  {
    slug: 'disclosure.lead-paint',
    version: 1,
    jurisdiction: 'US',
    placement: 'standalone-disclosure',
    section: 'disclosures',
    sortKey: 140,
    heading: 'Disclosure of Information on Lead-Based Paint and Lead-Based Paint Hazards',
    body: `LEAD WARNING STATEMENT

Housing built before 1978 may contain lead-based paint. Lead from paint, paint chips, and dust can pose health hazards if not managed properly. Lead exposure is especially harmful to young children and pregnant women. Before renting pre-1978 housing, lessors must disclose the presence of known lead-based paint and/or lead-based paint hazards in the dwelling. Lessees must also receive a federally approved pamphlet on lead poisoning prevention.`,
    source: {
      kind: 'statute',
      citation: '42 U.S.C. §4852d; 24 C.F.R. pt. 35',
      verbatimRequired: true,
      verbatimVerifiedAt: null,
    },
    status: 'draft',
    requiredBy: '42 U.S.C. §4852d',
    // Unknown build year is not evidence of post-1978 construction — fail safe
    // and include the disclosure.
    includeWhen: (facts) => facts.propertyYearBuilt === null || facts.propertyYearBuilt < 1978,
    variables: [],
    supersedes: [],
    asserts: ['lead-paint-disclosed'],
  },
];
