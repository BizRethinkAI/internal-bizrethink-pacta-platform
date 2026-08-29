import type { Clause } from '../types';

/**
 * Tier 3 of the Florida clause library: the operative body of the lease.
 *
 * IMPORTANT — provenance. Every clause here is marked `attorney-drafted` with
 * `author: null`, which means *not yet reviewed*. The publish guard in
 * `types.ts` refuses to let any of them render for an organisation that is not
 * BizRethink-internal, so this text can be used to dogfood the tool and cannot
 * reach a third party.
 *
 * At verification time, most of this substance should be replaced by, or
 * checked against, the Florida Supreme Court approved form *Residential Lease
 * for Single Family Home or Duplex* (RLHD-3x), approved 15 Apr 2010 for use
 * under Rule 10-2.1(a) of the Rules Regulating The Florida Bar. That form is
 * the tier-2 source and carries far more weight than anything drafted here.
 * The `// RLHD-3x:` notes below mark where to look.
 *
 * None of this text is taken from the executed Zillow or First In leases. The
 * terms those documents contain told us what needs to exist; the words are new.
 */

const drafted = () => ({ kind: 'attorney-drafted' as const, author: null });

export const FL_LEASE_BODY: Clause[] = [
  {
    slug: 'parties.recital',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'parties',
    sortKey: 10,
    heading: 'Parties',
    body: 'This Residential Lease is made on {{effectiveDate}} between {{landlordNames}} ("Landlord") and {{tenantNames}} ("Tenant"). Where more than one person signs as Landlord or as Tenant, each is jointly and severally liable for every obligation of that party under this Lease.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [
      { name: 'effectiveDate', type: 'date', label: 'Effective date', required: true },
      { name: 'landlordNames', type: 'string', label: 'Landlord name(s)', required: true },
      { name: 'tenantNames', type: 'string', label: 'Tenant name(s)', required: true },
    ],
    supersedes: [],
    // Tagged so a later custom clause repeating this is caught as a duplicate.
    // In the 2026 lease, joint-and-several liability was stated twice.
    asserts: ['joint-and-several-liability', 'parties-identified'],
  },

  {
    slug: 'premises.description',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'premises',
    sortKey: 20,
    heading: 'Premises',
    body: 'Landlord leases to Tenant the residential property at {{propertyAddress}} (the "Premises"), together with the appliances and equipment installed at the Premises on the start date, being: {{includedAppliances}}.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [
      { name: 'propertyAddress', type: 'string', label: 'Property address', required: true },
      { name: 'includedAppliances', type: 'string', label: 'Included appliances', required: true },
    ],
    supersedes: [],
    asserts: ['premises-identified'],
  },

  {
    slug: 'term.fixed',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'term',
    sortKey: 30,
    heading: 'Term',
    // RLHD-3x: check against its term and non-renewal language.
    body: 'The term of this Lease begins on {{startDate}} and ends on {{endDate}}. Neither party has the right to extend or renew the term unilaterally. Landlord is not obliged to renew, and Tenant is not obliged to remain, beyond the end date.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [
      { name: 'startDate', type: 'date', label: 'Start date', required: true },
      { name: 'endDate', type: 'date', label: 'End date', required: true },
    ],
    supersedes: [],
    asserts: ['term-defined'],
  },

  {
    slug: 'term.holdover',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'term',
    sortKey: 35,
    heading: 'Holdover',
    body: "If Tenant remains in possession of the Premises after the end of the term without Landlord's written consent, Tenant shall pay for the holdover period at {{holdoverRatePercent}}% of the monthly rent then in effect, prorated daily. Acceptance of any such payment does not renew or extend the term.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.holdoverPenalty,
    variables: [{ name: 'holdoverRatePercent', type: 'number', label: 'Holdover rate (% of rent)', required: true }],
    supersedes: [],
    asserts: ['holdover-addressed'],
  },

  {
    slug: 'term.termination-on-sale',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'term',
    sortKey: 38,
    heading: 'Termination on Sale',
    body: "If Landlord enters into a contract to sell the Premises, Landlord may terminate this Lease by giving Tenant at least {{saleNoticeDays}} days' written notice. Rent is prorated to the termination date and any prepaid rent or deposit held is dealt with under the sections of this Lease governing them.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.terminationOnSale,
    variables: [{ name: 'saleNoticeDays', type: 'number', label: 'Notice days on sale', required: true }],
    supersedes: [],
    asserts: ['termination-on-sale'],
  },

  {
    slug: 'rent.base',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'rent',
    sortKey: 40,
    heading: 'Rent',
    body: 'Tenant shall pay rent of {{monthlyRentUsd}} per month, in advance, on day {{rentDueDay}} of each month.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [
      { name: 'monthlyRentUsd', type: 'usd', label: 'Monthly rent', required: true },
      { name: 'rentDueDay', type: 'number', label: 'Rent due day', required: true },
    ],
    supersedes: [],
    asserts: ['rent-amount'],
  },

  {
    slug: 'rent.proration',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'rent',
    sortKey: 42,
    heading: 'Partial First Month',
    // Both prior leases for this property stated a proration convention and one
    // of them then used a different one in its own arithmetic. Naming the
    // method in the clause, and deriving the figure from it, keeps them aligned.
    body: 'Because the term begins on a day other than the rent due day, rent for the partial first month is {{proratedFirstPeriodUsd}}, being {{proratedDays}} days apportioned on the basis of {{prorationMethodLabel}}. That amount is due on the start date.',
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.prorationApplies,
    variables: [
      { name: 'proratedFirstPeriodUsd', type: 'usd', label: 'Prorated first period', required: true },
      { name: 'proratedDays', type: 'number', label: 'Prorated days', required: true },
      { name: 'prorationMethodLabel', type: 'string', label: 'Proration basis', required: true },
    ],
    supersedes: [],
    asserts: ['proration-method'],
  },

  {
    slug: 'rent.late-fee-flat',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'rent',
    sortKey: 44,
    heading: 'Late Payment',
    body: "If rent is not paid in full by the end of day {{graceDays}} after it falls due, Tenant shall pay a late fee of {{lateFeeUsd}} as additional rent. Acceptance of a late payment does not waive Landlord's right to require payment on the due date.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.lateFeePolicy === 'flat',
    variables: [
      { name: 'graceDays', type: 'number', label: 'Grace days', required: true },
      { name: 'lateFeeUsd', type: 'usd', label: 'Late fee', required: true },
    ],
    supersedes: [],
    asserts: ['late-fee'],
  },

  {
    slug: 'rent.late-fee-tiered',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'rent',
    sortKey: 44,
    heading: 'Late Payment',
    body: "If rent is not paid in full by the end of day {{graceDays}} after it falls due, Tenant shall pay a late fee of {{lateFeeUsd}} as additional rent. If rent remains unpaid after day {{secondTierDay}} of the month, Tenant shall pay a further {{secondTierFeeUsd}}, and Landlord may require that the outstanding amount be paid by certified funds. Acceptance of a late payment does not waive Landlord's right to require payment on the due date.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.lateFeePolicy === 'tiered',
    variables: [
      { name: 'graceDays', type: 'number', label: 'Grace days', required: true },
      { name: 'lateFeeUsd', type: 'usd', label: 'First-tier late fee', required: true },
      { name: 'secondTierDay', type: 'number', label: 'Second-tier day of month', required: true },
      { name: 'secondTierFeeUsd', type: 'usd', label: 'Second-tier fee', required: true },
    ],
    // Only one late-fee clause may survive selection.
    supersedes: ['rent.late-fee-flat'],
    asserts: ['late-fee'],
  },

  {
    slug: 'rent.returned-payment',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'rent',
    sortKey: 46,
    heading: 'Returned Payments',
    body: 'If any payment is returned unpaid, Tenant shall pay a handling charge of {{returnedPaymentFeeUsd}} as additional rent, together with any bank charge Landlord actually incurs. Landlord may require that the replacement payment, and any subsequent payment, be made by certified funds.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [{ name: 'returnedPaymentFeeUsd', type: 'usd', label: 'Returned payment fee', required: true }],
    supersedes: [],
    asserts: ['returned-payment-fee'],
  },

  {
    slug: 'deposit.held',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 50,
    heading: 'Security Deposit',
    /*
      The clause that the 2026 Zillow lease could not express. It states what is
      HELD and what is DUE as two separate figures, both derived, so the lease
      can say "$6,300 is held" and "$0 is payable at signing" without
      contradiction — and without billing a tenant twice for a deposit they
      already paid.
    */
    body: 'A security deposit of {{depositHeldUsd}} is payable by Tenant on execution of this Lease. The deposit is held at {{depositInstitution}}, {{depositInstitutionAddress}}, in an account that {{depositInterestLabel}}.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.49(2)',
    includeWhen: (facts) => facts.depositHeldUsd > 0,
    variables: [
      { name: 'depositHeldUsd', type: 'usd', label: 'Deposit held', required: true },
      { name: 'depositInstitution', type: 'string', label: 'Institution holding the deposit', required: true },
      { name: 'depositInstitutionAddress', type: 'string', label: 'Institution address', required: true },
      { name: 'depositInterestLabel', type: 'string', label: 'Interest-bearing?', required: true },
    ],
    supersedes: [],
    asserts: ['deposit-held', 'deposit-location-disclosed'],
  },

  {
    slug: 'deposit.held-carried',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 50,
    heading: 'Security Deposit',
    /*
      The clause the 2026 Zillow lease could not express. It states the amount
      HELD and the amount DUE as separate figures, so the lease can say
      "$6,300 is held" and "$0.00 is payable at signing" without contradiction,
      and without billing a tenant twice for money they already paid.

      Separate from `deposit.held` rather than a conditional sentence inside it:
      a new tenancy should not have to read past "$0.00 was carried forward" to
      find the sentence that applies to it.
    */
    body: 'A security deposit of {{depositHeldUsd}} is held under this Lease. Of that amount, {{depositCarriedInUsd}} was received under a prior tenancy of the Premises and is carried forward to this Lease, and {{depositDueAtExecutionUsd}} is payable by Tenant on execution. The deposit is held at {{depositInstitution}}, {{depositInstitutionAddress}}, in an account that {{depositInterestLabel}}.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.49(2)',
    includeWhen: (facts) => facts.depositCarriedInUsd > 0,
    variables: [
      { name: 'depositHeldUsd', type: 'usd', label: 'Deposit held', required: true },
      { name: 'depositCarriedInUsd', type: 'usd', label: 'Deposit carried from a prior tenancy', required: true },
      { name: 'depositDueAtExecutionUsd', type: 'usd', label: 'Deposit due at execution', required: true },
      { name: 'depositInstitution', type: 'string', label: 'Institution holding the deposit', required: true },
      { name: 'depositInstitutionAddress', type: 'string', label: 'Institution address', required: true },
      { name: 'depositInterestLabel', type: 'string', label: 'Interest-bearing?', required: true },
    ],
    supersedes: ['deposit.held'],
    asserts: ['deposit-held', 'deposit-location-disclosed'],
  },

  {
    slug: 'deposit.advance-rent',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 52,
    heading: 'Advance Rent',
    body: "Advance rent of {{advanceRentUsd}} is payable by Tenant on execution of this Lease in respect of the final month of the term. Advance rent is not a security deposit and may not be applied to any other month without Landlord's written agreement.",
    source: drafted(),
    status: 'draft',
    // Selected whenever advance rent is held. Where some of it was carried in
    // from a prior tenancy, `deposit.advance-rent-carried` supersedes this and
    // the removal is reported, rather than the two silently never meeting.
    includeWhen: (facts) => facts.advanceRentHeldUsd > 0,
    variables: [{ name: 'advanceRentUsd', type: 'usd', label: 'Advance rent held', required: true }],
    supersedes: [],
    asserts: ['advance-rent-held'],
  },

  {
    slug: 'deposit.advance-rent-carried',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 52,
    heading: 'Advance Rent',
    // Advance rent semantically IS one month's rent, so when rent rises the
    // carried amount falls short and the balance is a top-up rather than a new
    // figure. That distinction is the reason this variant exists.
    body: "Advance rent of {{advanceRentUsd}} is held in respect of the final month of the term. Of that amount, {{advanceRentCarriedInUsd}} was received under a prior tenancy and is carried forward to this Lease, and {{advanceRentTrueUpUsd}} is payable by Tenant on execution as a top-up to the current monthly rent. Advance rent is not a security deposit and may not be applied to any other month without Landlord's written agreement.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.advanceRentCarriedInUsd > 0,
    variables: [
      { name: 'advanceRentUsd', type: 'usd', label: 'Advance rent held', required: true },
      { name: 'advanceRentCarriedInUsd', type: 'usd', label: 'Advance rent carried in', required: true },
      { name: 'advanceRentTrueUpUsd', type: 'usd', label: 'Advance rent due at execution', required: true },
    ],
    supersedes: ['deposit.advance-rent'],
    asserts: ['advance-rent-held'],
  },

  {
    slug: 'deposit.return',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 54,
    heading: 'Return of the Deposit',
    // Timings track Fla. Stat. §83.49(3)(a). The rule pack enforces the maxima
    // separately, so an answer outside them is caught before rendering.
    body: 'If Landlord makes no claim against the deposit, Landlord shall return it within {{depositReturnDays}} days after Tenant vacates. If Landlord intends to make a claim, Landlord shall give Tenant written notice of the claim within {{depositClaimNoticeDays}} days after Tenant vacates. Tenant shall give Landlord a forwarding address on vacating.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.49(3)(a)',
    includeWhen: (facts) => facts.depositHeldUsd > 0,
    variables: [
      { name: 'depositReturnDays', type: 'number', label: 'Days to return with no claim', required: true },
      { name: 'depositClaimNoticeDays', type: 'number', label: 'Days to give notice of a claim', required: true },
    ],
    supersedes: [],
    asserts: ['deposit-return-terms'],
  },

  {
    slug: 'hoa.compliance',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'rules',
    sortKey: 60,
    heading: 'Association Rules',
    body: 'The Premises are subject to the governing documents of {{hoaName}}. Tenant, and anyone Tenant permits at the Premises, shall comply with them. Tenant shall reimburse Landlord as additional rent for any fine or charge levied by the association arising from an act or omission of Tenant, and shall forward any notice received from the association to Landlord within {{hoaNoticeHours}} hours.',
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.hasHoa,
    variables: [
      { name: 'hoaName', type: 'string', label: 'Association name', required: true },
      { name: 'hoaNoticeHours', type: 'number', label: 'Hours to forward association notices', required: true },
    ],
    supersedes: [],
    asserts: ['hoa-compliance', 'hoa-fines-passed-through'],
  },
];
