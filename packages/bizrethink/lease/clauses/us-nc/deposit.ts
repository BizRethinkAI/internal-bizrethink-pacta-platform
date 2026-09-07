import type { Clause } from '../types';

/**
 * North Carolina's deposit clauses — Article 6 of Chapter 42, the Tenant
 * Security Deposit Act.
 *
 * THIS IS WHERE THE TWO STATES DIVERGE MOST, and where they look most alike.
 * Florida and North Carolina both say "thirty days" about a deposit, twice
 * each, and not one of the four means the same thing:
 *
 *   Fla. §83.49(2)     notify the tenant where the money sits, within 30 days
 *                      of RECEIVING it
 *   N.C. §42-50        the same notice, within 30 days after THE BEGINNING OF
 *                      THE LEASE TERM
 *   Fla. §83.49(3)(a)  15 days to return with no claim, 30 to notice one, from
 *                      the tenant VACATING
 *   N.C. §42-52        30 days to itemise and refund, from TERMINATION OF THE
 *                      TENANCY AND DELIVERY OF POSSESSION — and, where the
 *                      claim cannot be determined in that window, an interim
 *                      accounting at 30 days and a final one at 60
 *
 * `north-carolina.test.ts` pins the pairs apart, because the obvious
 * maintenance move on meeting them is to fold each into one clause with a
 * number for a variable, and every one of those merges loses the clock the
 * statute actually keys on.
 *
 * Read off ncleg.gov on 2026-09-06:
 *   §42-50  https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-50.html
 *   §42-51  https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-51.html
 *   §42-52  https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-52.html
 *
 * NOT DRAFTED HERE, and each is a question in the PR rather than a silent
 * omission: whether §42-51(b)'s deposit ceiling (two months' rent for a term
 * longer than month to month) counts advance rent toward it, and whether
 * §42-50's trust-account duty reaches advance rent at all. Chapter 42 has no
 * advance-rent concept, unlike Fla. Stat. §83.49(1), which names it expressly.
 * The advance-rent clauses below therefore state what the PARTIES agree — the
 * money is held alongside the deposit — and assert nothing about what the Act
 * requires of it.
 */

const drafted = () => ({ kind: 'attorney-drafted' as const, author: null });

/*
  §42-50's two ways of securing the money, as a phrase the landlord picks. A
  select rather than two clause variants because the sentence around it is
  identical either way — which is the opposite situation to the Florida/North
  Carolina pairs above, where the sentences differ and the clauses must too.
*/
const SECURITY_VARIABLE = {
  name: 'ncDepositSecurity',
  type: 'string' as const,
  label: 'How the deposit is secured',
  required: true,
};

const INSTITUTION_VARIABLES = [
  { name: 'ncDepositInstitution', type: 'string' as const, label: 'Institution or insurance company', required: true },
  { name: 'ncDepositInstitutionAddress', type: 'string' as const, label: 'Its address', required: true },
];

export const NC_DEPOSIT: Clause[] = [
  {
    slug: 'deposit.held-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 50,
    heading: 'Security Deposit',
    /*
      §42-50 gives the landlord a choice — a trust account with a licensed and
      federally insured depository institution or trust institution authorized
      to do business in this State, OR a bond from an insurer licensed in North
      Carolina — and then closes the obvious workaround: a trust account outside
      the State is permitted "only if the landlord provides the tenant with an
      adequate bond in the amount of the deposits".

      NOTE WHAT IS ABSENT next to Florida's. Fla. Stat. §83.49(1)(a) requires
      the lease to say whether the account bears interest and forbids
      commingling. §42-50 requires neither, so North Carolina's clause says
      neither and the interview does not ask.
    */
    body: 'A security deposit of {{depositHeldUsd}} is payable by Tenant on execution of this Lease. Landlord {{ncDepositSecurity}}, as N.C. Gen. Stat. §42-50 provides. The name and address of that institution or insurance company is {{ncDepositInstitution}}, {{ncDepositInstitutionAddress}}. Where the deposit is held in a trust account outside North Carolina, Landlord shall provide Tenant with an adequate bond in the amount of the deposit.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-50',
    includeWhen: (facts) => facts.depositHeldUsd > 0,
    variables: [
      { name: 'depositHeldUsd', type: 'usd', label: 'Deposit held', required: true },
      SECURITY_VARIABLE,
      ...INSTITUTION_VARIABLES,
    ],
    supersedes: [],
    asserts: ['deposit-held', 'deposit-location-disclosed'],
  },

  {
    slug: 'deposit.held-carried-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 50,
    heading: 'Security Deposit',
    /*
      The renewal case, carried over from the Florida set because the defect it
      prevents is not a Florida defect. A tenancy that renews with the deposit
      already held would otherwise print "A security deposit of $6,300 is
      payable by Tenant on execution", billing a tenant a second time for money
      the landlord is already holding. That is the failure this product was
      built out of, and it is state-independent.
    */
    body: 'A security deposit of {{depositHeldUsd}} is held under this Lease. Of that amount, {{depositCarriedInUsd}} was received under a prior tenancy of the Premises and is carried forward to this Lease, and {{depositDueAtExecutionUsd}} is payable by Tenant on execution. Landlord {{ncDepositSecurity}}, as N.C. Gen. Stat. §42-50 provides. The name and address of that institution or insurance company is {{ncDepositInstitution}}, {{ncDepositInstitutionAddress}}.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-50',
    includeWhen: (facts) => facts.depositCarriedInUsd > 0,
    variables: [
      { name: 'depositHeldUsd', type: 'usd', label: 'Deposit held', required: true },
      { name: 'depositCarriedInUsd', type: 'usd', label: 'Deposit carried from a prior tenancy', required: true },
      { name: 'depositDueAtExecutionUsd', type: 'usd', label: 'Deposit due at execution', required: true },
      SECURITY_VARIABLE,
      ...INSTITUTION_VARIABLES,
    ],
    supersedes: ['deposit.held-nc'],
    asserts: ['deposit-held', 'deposit-location-disclosed'],
  },

  {
    slug: 'deposit.escrow-notice-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 52,
    heading: 'Notice of Where the Deposit Is Held',
    /*
      THIRTY DAYS FROM THE BEGINNING OF THE LEASE TERM. Florida's equivalent
      runs from the landlord receiving the money, and on a lease signed weeks
      before move-in the two dates are weeks apart.

      §42-55 is why the difference is worth a clause of its own: a WILFUL
      failure to comply with the notice requirements of the Article voids the
      landlord's right to retain any part of the deposit.

      Gated on the deposit alone, not on advance rent. §42-50 says "security
      deposits"; Fla. Stat. §83.49(1) expressly reaches advance rent and §42-50
      does not, and extending it would be our reading of the Act rather than the
      Act. Raised for counsel.
    */
    body: 'Within 30 days after the beginning of the lease term, Landlord shall notify Tenant of the name and address of the bank or institution where the deposit is currently located, or of the name of the insurance company providing the bond, as N.C. Gen. Stat. §42-50 requires. Landlord shall give Tenant further written notice if the deposit is later moved.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-50',
    includeWhen: (facts) => facts.depositHeldUsd > 0,
    variables: [],
    supersedes: [],
    asserts: ['deposit-escrow-notice'],
  },

  {
    slug: 'deposit.advance-rent-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 54,
    heading: 'Advance Rent',
    /*
      NO CITATION, DELIBERATELY. Chapter 42 has no advance-rent concept — the
      phrase appears nowhere in Article 5 or Article 6 — so every sentence here
      is what the parties agree rather than what the Act requires, and the
      clause carries no `requiredBy`. `whyThisClause` therefore reports it as
      our drafting, which is the honest label.

      Holding it alongside the deposit is the conservative arrangement, not a
      claim that §42-50 compels it. Whether the Act reaches this money, and
      whether it counts toward §42-51(b)'s ceiling, are questions for counsel
      recorded in the PR.
    */
    body: "Advance rent of {{advanceRentUsd}} is payable by Tenant on execution of this Lease in respect of the last month of Tenant's occupancy of the Premises. Advance rent is not a security deposit and may not be applied to any other month without Landlord's written agreement. Landlord shall hold the advance rent in the same manner as the security deposit until it becomes due as rent. If this Lease ends without Tenant occupying a final month to which the advance rent can be applied, Landlord shall return it to Tenant in full within 30 days after the tenancy terminates and Tenant delivers possession of the Premises to Landlord.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.advanceRentHeldUsd > 0,
    variables: [{ name: 'advanceRentUsd', type: 'usd', label: 'Advance rent held', required: true }],
    supersedes: [],
    asserts: ['advance-rent-held'],
  },

  {
    slug: 'deposit.advance-rent-carried-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 54,
    heading: 'Advance Rent',
    // Advance rent is one month's rent, so a rent rise makes the carried amount
    // fall short and the balance is a top-up rather than a new figure.
    body: "Advance rent of {{advanceRentUsd}} is held in respect of the last month of Tenant's occupancy of the Premises. Of that amount, {{advanceRentCarriedInUsd}} was received under a prior tenancy and is carried forward to this Lease, and {{advanceRentTrueUpUsd}} is payable by Tenant on execution as a top-up to the current monthly rent. Advance rent is not a security deposit and may not be applied to any other month without Landlord's written agreement. Landlord shall hold the advance rent in the same manner as the security deposit until it becomes due as rent.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.advanceRentCarriedInUsd > 0,
    variables: [
      { name: 'advanceRentUsd', type: 'usd', label: 'Advance rent held', required: true },
      { name: 'advanceRentCarriedInUsd', type: 'usd', label: 'Advance rent carried in', required: true },
      { name: 'advanceRentTrueUpUsd', type: 'usd', label: 'Advance rent due at execution', required: true },
    ],
    supersedes: ['deposit.advance-rent-nc'],
    asserts: ['advance-rent-held'],
  },

  {
    slug: 'deposit.accounting-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 56,
    heading: 'Return of the Deposit',
    /*
      §42-52, and three things in it that Florida has no equivalent of.

      THE CLOCK STARTS ON TWO EVENTS, not one: "termination of the tenancy AND
      delivery of possession of the premises to the landlord". A tenant who
      stops paying and leaves the keys in a drawer has not started it.

      THE TWO-STAGE ACCOUNTING is not in Chapter 83 at all. Where the extent of
      the claim cannot be determined inside thirty days, the landlord owes an
      interim accounting at thirty and a final one at sixty — both running from
      the same date, which is the part easiest to get wrong.

      AND THE TWO PROHIBITIONS at the end are the statute's own words on what
      may not be withheld. They are here because §42-55 makes a wilful breach of
      the Article cost the landlord the whole deposit, so a lease that leaves
      them out is not a shorter lease, it is a worse one.

      NO VARIABLES. Florida asks the landlord how many days they will take,
      because §83.49(3)(a) sets a maximum and anything under it is a choice.
      Every figure here is fixed by the statute, so North Carolina asks two
      fewer questions than Florida does — which is the only place in this
      library where a second state made the interview shorter.
    */
    body: 'Within 30 days after the tenancy terminates and Tenant delivers possession of the Premises to Landlord, Landlord shall apply the deposit as N.C. Gen. Stat. §42-51 permits or refund it, and shall in either case itemise any damage in writing and mail or deliver that itemisation to Tenant together with the balance of the deposit. Where the extent of Landlord’s claim against the deposit cannot be determined within that period, Landlord shall provide Tenant with an interim accounting within 30 days and a final accounting within 60 days, each running from the date the tenancy terminated and possession was delivered. Landlord shall not withhold any part of the deposit for conditions that are due to normal wear and tear, and shall not retain an amount that exceeds Landlord’s actual damages. Tenant shall give Landlord a forwarding address on vacating.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-52',
    includeWhen: (facts) => facts.depositHeldUsd > 0,
    variables: [],
    supersedes: [],
    asserts: ['deposit-return-terms'],
  },
];
