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
    // v2: the effective date moved out — see the note on the body.
    version: 2,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'parties',
    sortKey: 10,
    heading: 'Parties',
    /*
      v2: the date came out.

      Two always-on clauses were fixing the effective date two different ways.
      This one said "made on {{effectiveDate}}"; general.execution says "The
      effective date is the date of the last signature". On any lease not
      counter-signed on the stated day the document contradicted itself about
      when it took effect — which is the trigger for the term, the proration,
      and the §83.49(2) and §83.49(3) clocks.

      And nothing ever produced {{effectiveDate}}. It sat in DERIVED_VALUES,
      so no step asked for it, and the only assignment anywhere was a
      checked-in fixture. Every real lease rendered the raw token, `missing`
      was never empty, and the Send button could not be reached by any lease
      built through the product.

      One statement of the effective date, in the clause that already made it,
      resolves both.
    */
    body: 'This Residential Lease is made between {{landlordNames}} ("Landlord") and {{tenantNames}} ("Tenant"). Where more than one person signs as Landlord or as Tenant, each is jointly and severally liable for every obligation of that party under this Lease. The effective date is stated in the Execution clause.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [
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
    slug: 'term.non-renewal-notice',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'term',
    sortKey: 33,
    heading: 'Notice Before the Term Ends',
    /*
      Fla. Stat. §83.575(1) lets a lease require the tenant to give notice
      before vacating at the end of the term — but ONLY if the same provision
      obliges the landlord to say, within the same window, that the lease will
      not be renewed. A one-sided version is not what the statute permits.

      The bounds are also fixed: not less than 30 days and not more than 60,
      from either party. Enforced numerically by the rule pack.
    */
    body: 'Tenant shall give Landlord at least {{nonRenewalNoticeDays}} days\u2019 written notice before vacating the Premises at the end of the term. Within that same period Landlord shall notify Tenant, in the manner required by Fla. Stat. \u00a783.56(4), if this Lease will not be renewed. Neither party may be required to give less than 30 nor more than 60 days\u2019 notice.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.575',
    includeWhen: (facts) => facts.nonRenewalNoticeRequired,
    variables: [
      { name: 'nonRenewalNoticeDays', type: 'number', label: 'Days of notice before the term ends', required: true },
    ],
    supersedes: [],
    asserts: ['non-renewal-notice'],
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
    body: "If rent is not paid in full by the end of day {{graceDays}} after it falls due, Tenant shall pay a late fee of {{lateFeeUsd}} as an Other Charge. Acceptance of a late payment does not waive Landlord's right to require payment on the due date.",
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
    body: "If rent is not paid in full by the end of day {{graceDays}} after it falls due, Tenant shall pay a late fee of {{lateFeeUsd}} as an Other Charge. If rent remains unpaid after day {{secondTierDay}} of the month, Tenant shall pay a further {{secondTierFeeUsd}}, and Landlord may require that the outstanding amount be paid by certified funds. Acceptance of a late payment does not waive Landlord's right to require payment on the due date.",
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
    body: 'If any payment is returned unpaid, Tenant shall pay a handling charge of {{returnedPaymentFeeUsd}} as an Other Charge, together with any bank charge Landlord actually incurs. Landlord may require that the replacement payment, and any subsequent payment, be made by certified funds.',
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
    body: "Advance rent of {{advanceRentUsd}} is payable by Tenant on execution of this Lease in respect of the last month of Tenant's occupancy of the Premises. Advance rent is not a security deposit and may not be applied to any other month without Landlord's written agreement. If this Lease ends without Tenant occupying a final month to which the advance rent can be applied, Landlord shall return it to Tenant in full within 15 days after Tenant vacates. The advance rent is not subject to any claim against the security deposit.",
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
    body: "Advance rent of {{advanceRentUsd}} is held in respect of the last month of Tenant's occupancy of the Premises. Of that amount, {{advanceRentCarriedInUsd}} was received under a prior tenancy and is carried forward to this Lease, and {{advanceRentTrueUpUsd}} is payable by Tenant on execution as a top-up to the current monthly rent. Advance rent is not a security deposit and may not be applied to any other month without Landlord's written agreement. If this Lease ends without Tenant occupying a final month to which the advance rent can be applied, Landlord shall return it to Tenant in full within 15 days after Tenant vacates. The advance rent is not subject to any claim against the security deposit.",
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
    // v2: forwarding reworded, and the cure moved to its own clause.
    version: 2,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'rules',
    sortKey: 60,
    heading: 'Association Rules',
    /*
      "any notice received from the association" became "received at or posted
      on the Premises".

      Association post is addressed to the OWNER and delivered to the property
      the tenant is living in. An obligation to forward whatever the
      association sends invites the tenant to open mail that is not theirs,
      which is 18 U.S.C. §1702 territory. What the clause actually needs is
      what ARRIVES there — an envelope they can pass on unopened, or a notice
      taped to the door.
    */
    body: 'The Premises are subject to the governing documents of {{hoaName}}. Tenant, and anyone Tenant permits at the Premises, shall comply with them, and Tenant shall be bound by and subject to all of the obligations of the Owner under those governing documents. Tenant shall reimburse Landlord as an Other Charge for any fine or charge levied by the association arising from an act or omission of Tenant, and shall forward to Landlord, within {{hoaNoticeHours}} hours and by email or any other means permitted by this Lease, any association notice received at or posted on the Premises.',
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

  /*
    Ninth Amendment to the Amended and Restated Master Declaration for Estancia
    at Wiregrass, Instr# 2021271188, OR BK 10509 PG 675, recorded 16 Dec 2021,
    rewriting Article XI Section 36 (Leases). Read 2026-09-04.

    §36(b) says every lease SHALL contain these. That is a different category
    from the drafting choices elsewhere in this library: a recorded covenant
    runs with the land, and a lease that omits what it requires is
    non-compliant on its face.

    The parking cap is the one a tenant will actually feel. Two spaces INCLUDING
    the garage means a two-car garage is the entire allowance — nothing on the
    driveway. Better said in the lease than discovered by a towing notice.
  */
  {
    slug: 'hoa.lease-scope',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'rules',
    sortKey: 62,
    heading: 'Association Requirements for This Lease',
    body: 'The governing documents require that this Lease be only for the entire Lot and the associated garage, and it is. No more than two parking spaces, including the garage, may be used by Tenant, occupants and guests at any time.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'Ninth Amendment, Instr# 2021271188 (OR 10509/675), Art. XI §36(b)',
    includeWhen: (facts) => facts.hasHoa,
    variables: [],
    supersedes: [],
    asserts: ['hoa-lease-scope'],
  },

  /*
    Two gates stand between a tenant and the pool, and neither is the
    landlord's to open:

      Declaration §36(d) — no tenant may use the Common Areas or recreational
        facilities until the Owner has complied with §36, i.e. filed the
        tenant's name, address, telephone number and a copy of the signed
        lease no later than the date of occupancy.
      Community Amenity Guidelines — the renter must be approved by the Board
        or Manager, through a tenant profile form and an application fee.

    NOTHING OPERATIONAL IS NAMED HERE ON PURPOSE. The Guidelines are dated
    January 2020 and route everything through Evergreen Lifestyles Management
    with a $25 fee; the association is now managed by CMG. The RULE survived the
    change of agent — the form's name, the fee and the address did not. Writing
    them into a lease would make it wrong on the day it was signed, and wrong
    again at the next change of manager.

    §36(e) also deactivates the OWNER'S access for the term. Stated so the
    landlord is not surprised by their own card failing.
  */
  {
    slug: 'hoa.amenity-access',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'rules',
    sortKey: 64,
    heading: 'Association Amenities',
    body: "Use of the association's common areas and recreational facilities by Tenant is subject to the association's approval and to whatever registration process and fees the association requires from time to time. It is not guaranteed by this Lease. Landlord shall give the association Tenant's name, address and telephone number and a copy of this Lease no later than the date Tenant takes occupancy, and shall submit whatever the association requires for Tenant to be registered. Any application, access card or gate device fees charged by the association are payable by {{amenityFeesPaidBy}}. While Tenant is registered, Landlord's own right to use those facilities is suspended.",
    source: drafted(),
    status: 'draft',
    requiredBy: 'Ninth Amendment, Instr# 2021271188 (OR 10509/675), Art. XI §36(d); Community Amenity Guidelines',
    includeWhen: (facts) => facts.hasHoa,
    variables: [
      { name: 'amenityFeesPaidBy', type: 'string', label: 'Who pays the association amenity fees', required: true },
    ],
    supersedes: [],
    asserts: ['hoa-amenity-access'],
  },

  {
    slug: 'hoa.cure',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'rules',
    sortKey: 61,
    heading: 'Curing an Association Violation',
    /*
      hoa.compliance made the tenant forward the notice and reimburse the fine.
      It never said who CURES, or by when — so the real sequence ran: notice
      arrives naming dead palm fronds with a fourteen-day cure, tenant forwards
      it inside 48 hours exactly as required, nothing is trimmed, fine lands.
      The lease worked as written.

      THE DEADLINE IS THE ASSOCIATION'S, NOT THE TENANT'S. Keying it to the
      moment the tenant forwards would let a tenant who binned the letter move
      the date. The landlord is on the association's own distribution list and
      learns of these independently, which is exactly why the deadline can be
      the one the notice states.

      AND THE LANDLORD OWES THE SAME DUTY BACK. He receives these by email
      directly. Charging a tenant for failing to cure something the landlord
      knew about and never passed on is not a provision worth drafting.

      THE LAST SENTENCE IS THE ONE THAT MATTERS. Fla. Stat. §720.305(1) gives
      the association its remedy against the parcel OWNER. Allocating palm
      trimming to a tenant is an arrangement between landlord and tenant: it
      gives the tenant no standing with the association and moves nothing off
      the owner. A landlord reading "the tenant handles the yard" will assume
      the opposite unless the document says so.
    */
    body: 'Where the association gives notice of a violation arising from work this Lease allocates to Tenant, Tenant shall cure it by the date stated in the notice, or within {{hoaCureDays}} days of receiving it if the notice states no date. Landlord shall notify Tenant of any such notice Landlord receives directly from the association. If Tenant has not cured by that date, Landlord may cure and Tenant shall reimburse the reasonable cost as an Other Charge. This clause allocates work between Landlord and Tenant only; it does not make Tenant a party to the governing documents, and it does not limit the association’s remedies against the owner of the Premises.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §720.305(1)',
    includeWhen: (facts) => facts.hasHoa && facts.hasTenantYardDuty,
    variables: [
      { name: 'hoaCureDays', type: 'number', label: 'Days to cure where the notice sets no date', required: true },
    ],
    supersedes: [],
    asserts: ['hoa-cure'],
  },
];
