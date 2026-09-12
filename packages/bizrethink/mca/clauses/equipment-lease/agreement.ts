import type { McaClause } from '../types';

/**
 * The Equipment Lease Agreement — section 3.
 *
 * Bodies are the words the shipped document prints. Both
 * `__tests__/bodies-match-the-document.test.ts` and
 * `__tests__/twins.test.ts` re-check them on every run — the first against
 * this document, the second against the twin.
 */
export const EQUIPMENT_LEASE_AGREEMENT: McaClause[] = [
  {
    slug: 'equipment-lease.parties',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    unnumberedReason: 'Parties preamble introducing the agreement and its signatories.',
    includeWhen: null,
    section: 'agreement',
    sortKey: 1,
    heading: 'Parties',
    body: 'This Equipment Lease Agreement (this “Agreement”) is entered into and effective as of ____«20»_____ between ________«37»________, a Florida limited liability company, with its principal office at _______________«41»_______________ (“we,” “us,” or “our”), and the Lessee identified in the Lessee and Equipment Information grid above (“Lessee,” “you,” or “your”).',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.total-payments-estimate',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 2,
    heading: 'Estimated Total Payments',
    body: 'Total payments are estimated to be the number of months in the Lease Term stated above multiplied by the monthly lease payment stated above. See Sections [[clause:equipment-lease.effective-date-term-and-interim-rent]](b) and [[clause:equipment-lease.payment-of-amounts-due]] for further details. Lessee will pay all applicable taxes as set out in Section [[clause:equipment-lease.payment-of-amounts-due]](c); such taxes may be collected prior to payment to the taxing authority.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.charges-billed',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 3,
    heading: 'Billing',
    body: 'Lease charges and applicable taxes are billed as set out in this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.read-before-signing',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 4,
    heading: 'Acknowledgment Before Signing',
    body: 'DO NOT SIGN UNTIL YOU HAVE READ, UNDERSTOOD, AND AGREED TO THE TERMS AND CONDITIONS ON ALL PAGES OF THIS AGREEMENT. NO ATTEMPT AT ORAL MODIFICATION OR RESCISSION OF THIS AGREEMENT OR ANY TERM THEREOF WILL BE BINDING UPON THE PARTIES. SEE SECTION [[clause:equipment-lease.entire-agreement]] OF THE TERMS AND CONDITIONS. BY SIGNING THIS AGREEMENT, THE UNDERSIGNED LESSEE ACKNOWLEDGES READING ALL PAGES OF THIS AGREEMENT, THAT ALL BLANK TERMS IN THE LESSEE AND EQUIPMENT INFORMATION GRID WERE FILLED IN AT THE TIME OF SIGNING, AND THAT LESSEE AGREES TO BE BOUND BY ALL THE TERMS OF THIS AGREEMENT.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.equipment',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 10,
    heading: 'Equipment',
    body: 'We agree to provide to you and you agree to lease from us the equipment identified in the Lessee and Equipment Information grid of this Agreement or such other comparable equipment we provide you (the “Equipment”), according to the terms and conditions of this Agreement. We are providing the Equipment to you “as is” and make no representations or warranties of any kind as to the suitability of the Equipment for any particular purpose.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-9-sole-and-exclusive-remedies-points-at-an-empty-set'] }],
  },
  {
    slug: 'equipment-lease.effective-date-term-and-interim-rent',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 20,
    heading: 'Effective Date, Term, and Interim Rent',
    body: '(a) This Agreement becomes effective on the earlier of the date we deliver any piece of Equipment to you (the “Delivery Date”) or acceptance by us. This Agreement remains in effect until all of your obligations and all of our obligations under it have been satisfied. We will deliver the Equipment to the site designated by you. (b) The term of this Agreement begins on a date designated by us after receipt of all required documentation and acceptance by us (the “Commencement Date”), and continues for the number of months stated as the Lease Term in the Lessee and Equipment Information grid. You agree this Agreement is a non-cancelable commitment by you to lease the Equipment identified for the entire Lease Term. You agree to pay all amounts due during the Lease Term and confirm by executing this Agreement that the Lease Term is specifically defined as written in the Lessee and Equipment Information grid. (c) You agree to pay an Interim Lease Payment in the amount of one-thirtieth (1/30th) of the monthly lease payment for each day from and including the Delivery Date until the date preceding the Commencement Date. The Interim Lease Payment shall never exceed one monthly lease payment in total, and if we have not designated a Commencement Date within thirty (30) days after the Delivery Date the Commencement Date is the thirtieth day after the Delivery Date. (d) You acknowledge that the Equipment and software leased under this Agreement may not be compatible with another processor’s systems and that we do not have any obligation to make such software or equipment compatible if you elect to use another service provider. Upon termination of your merchant processing agreement, you acknowledge that you may not be able to use the Equipment or software leased under this Agreement with any other service provider.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.site-preparation',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 30,
    heading: 'Site Preparation',
    body: 'You will prepare the installation site(s) for the Equipment, including without limitation the power supply circuits and phone lines, in conformance with the manufacturer’s and our specifications, and will make the site(s) available to us by the confirmed shipping date.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.payment-of-amounts-due',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 40,
    heading: 'Payment of Amounts Due',
    body: "(a) Schedule of Fees. This is every charge payable under this Agreement. Monthly lease charge: as stated in the Lessee and Equipment Information grid. Interim Lease Payment: as calculated under Section [[clause:equipment-lease.effective-date-term-and-interim-rent]](c), capped at one monthly lease payment. Delivery and installation: as assessed, stated to you before delivery. Taxes and assessments: as levied, under Section [[clause:equipment-lease.payment-of-amounts-due]](c). Late Fee: ten percent (10%) of the past-due instalment, minimum $5.00, for each month it remains unpaid, prorated for a partial month, and never more than the law allows — the same charge stated in Section [[clause:equipment-lease.payment-of-amounts-due]](e). Collection expense fee: $25 per aggregate payment requiring a collection effort, under Section [[clause:equipment-lease.payment-of-amounts-due]](f). Upgrade Fee: $50. Assumption Fee: $250. Collection costs: actual costs of collection plus reasonable attorneys’ fees, capped at 25% of the amount in collection. Fair market value of Equipment not returned when required, under Sections [[clause:equipment-lease.purchase-return-or-continuation-of-equipment-at-end-of-lease-term]] and [[clause:equipment-lease.default-remedies]](b). No other periodic or transactional charge is payable, and we will not introduce one during the Lease Term. Amounts recoverable under Sections [[clause:equipment-lease.use-return-of-equipment-and-insurance]](g), [[clause:equipment-lease.indemnification]] and [[clause:equipment-lease.default-remedies]](b) are not charges under this Schedule and are recoverable only as those Sections provide. (b) The first monthly lease payment is due on the Commencement Date, and each subsequent payment is due on the same day of each successive month of the Lease Term for each piece of Equipment. We collect each payment by billing it, as a fixed amount, to your merchant processing account with your card processor. We do not debit your bank account for these payments, and nothing in this Agreement authorises us to. Where you also have a future receivables purchase agreement with an affiliate of ours, that agreement takes its specified percentage of each day's card settlement first, and our billing under this Agreement is taken only from what remains. Our claim is expressly subordinate to it, and we will not reduce, delay or dilute what that agreement collects. If an Event of Default occurs under that purchase agreement and the specified percentage rises to one hundred percent of card settlement, billing under this Agreement suspends for as long as that continues. Payments that fall due while billing is suspended are not cancelled; they accrue without late fee or interest and become payable when the default is cured or the purchase agreement completes, whichever happens first. You agree to pay all assessed costs for delivery and installation of Equipment. (c) In addition to the monthly lease payment, you shall pay, or reimburse us for, amounts equal to any taxes or assessments on or arising out of this Agreement or the Equipment, and related supplies or any services, use, or activities hereunder, including without limitation state and local sales, use, property, privilege, and excise tax, exclusive of taxes based on our net income. Reimbursement of property tax calculation is based on an average tax rate. (d) Your lease payments will be due despite dissatisfaction for any reason with the Equipment or related processing services. (e) Whenever any payment is not made by you in full when due, you shall pay us as a late charge an amount equal to ten percent (10%) of the amount due but no less than $5.00 for each month during which it remains unpaid (prorated for any partial month), but in no event more than the maximum amount permitted by law. (f) In the event your account is placed into collections for past-due lease amounts, you agree that we can recover a collection expense fee of $25 for each aggregate payment requiring a collection effort, but in no event more than the maximum amount permitted by law.",
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-4a-declares-itself-exhaustive-and-is-not'] }],
  },
  {
    slug: 'equipment-lease.use-return-of-equipment-and-insurance',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 50,
    heading: 'Use, Return of Equipment, and Insurance',
    body: '(a) You shall cause the Equipment to be operated by competent and qualified personnel in accordance with any operating instructions furnished by us or the manufacturer. You shall maintain the Equipment in good operating condition and protect it from deterioration, normal wear and tear excepted. (b) You shall not permit any physical alteration or modification of the Equipment, or change the installation site of the Equipment, without our prior written consent. (c) Until title passes to you under Section [[clause:equipment-lease.purchase-return-or-continuation-of-equipment-at-end-of-lease-term]], you shall not create, incur, assume, or allow to exist any consensually or judicially imposed liens or encumbrances on, or part with possession of, or sublease the Equipment without our prior written consent. (d) You shall comply with all governmental laws, rules, and regulations relating to the use of the Equipment. You are also responsible for obtaining all permits required to operate the Equipment at your facility. (e) We or our representatives may, at any time, enter your premises for purposes of inspecting, examining, or repairing the Equipment. (f) The Equipment shall remain our personal property and shall not under any circumstances be considered a fixture affixed to your real estate. You shall permit us to affix suitable labels or stencils to the Equipment evidencing our ownership. (g) You agree that all Equipment returns shall be made to us at _______________«42»_______________ or as may be directed by subsequent assignee, be done in a manner that can be tracked, and shall have this Lease number referenced on the return packaging. You understand and agree that your failure to return the Equipment in the manner noted above will delay our receipt of the return and possibly result in you being charged $100. If returned Equipment shows excessive wear and tear or is not in good operating condition (in each case, as determined by us in our reasonable discretion), you will be charged our cost to restore such Equipment to normal or good operating condition, as applicable. (h) You shall keep the Equipment adequately insured against loss by fire, theft, and all other hazards. (i) You shall provide proof of insurance as evidenced by a certificate naming ________«45»________ as a loss payee under your insurance policy. The loss, destruction, theft, or damage of or to the Equipment shall not relieve you from your obligation to pay total monthly lease payments hereunder.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-4a-declares-itself-exhaustive-and-is-not'] }],
  },
  {
    slug: 'equipment-lease.title-to-equipment',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 60,
    heading: 'Title to Equipment',
    body: 'We at all times retain title to the Equipment unless we agree otherwise in writing. You agree to execute and deliver to us any statement or instrument that we may request to confirm or evidence our ownership of the Equipment, and you irrevocably appoint us as your attorney-in-fact to execute and file the same in your name and on your behalf. Because this Agreement gives you the option to acquire the Equipment for nominal consideration at the end of the Lease Term, it creates a security interest in the Equipment in our favour rather than a true lease, and we may file a financing statement to perfect it. We hold that security interest, and title, from the date of this Agreement until title passes to you under Section [[clause:equipment-lease.purchase-return-or-continuation-of-equipment-at-end-of-lease-term]], and you will execute such documentation as we may request to evidence such security interest.\nEquipment Charged Only Once. This Lease covers equipment for which no cost has been deferred into, or deducted at funding under, any future receivables purchase agreement between you and any of our affiliates. If the cost of the same equipment has been charged that way, the Monthly Lease Amount for that equipment is $0.00 and this Lease is not executed for it. You will never pay for the same equipment twice.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.purchase-return-or-continuation-of-equipment-at-end-of-lease-term',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 70,
    heading: 'Purchase, Return or Continuation of Equipment at End of Lease Term',
    body: 'Upon the completion of your Lease Term or any extension thereof, and provided you have paid all amounts then due, you will have the option to (a) purchase the Equipment from us for one dollar ($1.00), whereupon title passes to you free of any interest of ours; (b) return the Equipment to us; or (c) after the final lease payment has been received by us, continue month-to-month at the existing monthly lease payment. If you do not tell us which you have chosen, and do not return the Equipment, option (a) applies: we will treat the purchase option as exercised, apply the one dollar ($1.00) to your account, and title passes to you. We will not continue billing you for Equipment you have finished paying for. If you want to purchase the Equipment, or do not want to continue the lease, you must give us written notice at least thirty (30) days before the end of the Lease Term, or at least thirty (30) days before the end of any subsequent monthly period, and return the Equipment. Notice given later takes effect at the end of the following monthly period. If we terminate the lease pursuant to Section [[clause:equipment-lease.default-remedies]](b) due to a default by you, you shall immediately return the Equipment no later than the tenth business day after termination, or remit to us the fair market value of the Equipment as determined in good faith by us. You agree to pay any amounts due to us under this Section promptly upon our request.\nEarly buyout. You may buy the Equipment before the end of the Lease Term. On your written request we will quote you a buyout figure, being the lease payments remaining for the balance of the Lease Term plus the one dollar ($1.00) purchase price, less a discount reflecting our early receipt of those payments. The quote is valid for ten (10) business days and states the discount applied. On payment of the quoted figure this Agreement ends, title to the Equipment passes to you, and no further lease payment is due. Buying early never costs more than continuing to pay through the end of the Lease Term.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.software-license',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 80,
    heading: 'Software License',
    body: 'We retain all ownership and copyright interest in and to all computer software, related documentation, technology, know-how, and processes embodied in or provided in connection with the Equipment other than those owned or licensed by the manufacturer of the Equipment (collectively, “Software”), and you shall have only a nonexclusive license to use the Software in your operation of the Equipment. The licence granted by this Section is perpetual as to any Equipment to which title passes to you, and survives the expiry or termination of this Agreement for so long as you own that Equipment. Use of software owned or licensed by the manufacturer of the Equipment is governed by the manufacturer’s own licence terms, which we will make available to you on request, and we grant no rights in it.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-8-grants-no-licence-to-manufacturer-owned-software',
          'el-3-8-software-licence-has-no-survival-and-the-document-has-no-survival-clause',
        ],
      },
    ],
  },
  {
    slug: 'equipment-lease.limitation-on-liability',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 90,
    heading: 'Limitation on Liability',
    body: 'We are not liable for any loss, damage, or expense of any kind or nature caused directly or indirectly by the Equipment, including any damage or injury to persons or property caused by the Equipment. We are not liable for the use or maintenance of the Equipment, its failure to operate, any repairs or service to it, or by any interruption of service or loss of use of the Equipment or resulting loss of business. Our liability arising out of or in any way connected with this Agreement shall not exceed the aggregate lease amount paid to us for the particular Equipment involved. In no event shall we be liable for any indirect, incidental, special, or consequential damages. The remedies available to you under this Agreement are your sole and exclusive remedies.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-9-excludes-personal-injury-and-omits-the-carve-out-3-11-has',
          'el-3-9-sole-and-exclusive-remedies-points-at-an-empty-set',
        ],
      },
    ],
  },
  {
    slug: 'equipment-lease.warranties',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 100,
    heading: 'Warranties',
    body: '(a) All warranties express or implied, made to you or any other person, are hereby disclaimed, including without limitation any warranties regarding quality, suitability, merchantability, fitness for a particular use, quiet enjoyment, or infringement. (b) You warrant that you will only use the Equipment for commercial purposes and will not use the Equipment for any household or personal purposes.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-9-sole-and-exclusive-remedies-points-at-an-empty-set'] }],
  },
  {
    slug: 'equipment-lease.indemnification',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 110,
    heading: 'Indemnification',
    body: 'You shall indemnify and hold us harmless from and against any and all losses, liabilities, damages, and expenses (including attorneys’ fees) resulting from (a) the operation, use, condition, liens against, or return of the Equipment, or (b) any breach by you of any of your obligations hereunder, except to the extent any losses, liabilities, damages, or expenses result from our gross negligence or willful misconduct. Your aggregate liability under this Section shall not exceed the total of the Monthly Lease Amounts payable over the Lease Term.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-9-excludes-personal-injury-and-omits-the-carve-out-3-11-has',
          'el-3-4a-declares-itself-exhaustive-and-is-not',
        ],
      },
    ],
  },
  {
    slug: 'equipment-lease.default-remedies',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 120,
    heading: 'Default; Remedies',
    body: '(a) If you fail to pay us any amounts due hereunder when due, or if you default in any material respect in the performance or observance of any obligation or provision of this Agreement, any such event shall be a default hereunder. A default by you under a Merchant Processing Agreement (“MPA”) with us or with an alliance or joint venture to which we are a party, including a default resulting from early termination of the MPA, is a default under this Agreement for the purposes of clause (b)(i) only; it does not permit acceleration under clause (b)(ii) and creates no liability under the Guaranty in Section [[clause:equipment-lease.guaranty-of-payment]]. No default under any other agreement — including any agreement for the purchase of future receipts with any of our affiliates, alliances, or joint ventures — is a default under this Agreement. (b) Upon the occurrence of any default, we may at our option, effective immediately without notice, either (i) terminate this Lease and our future obligations under this Agreement, repossess the Equipment, and proceed in any lawful manner against you for collection of all charges that have accrued and are due and payable, or (ii) accelerate and declare immediately due and payable the monthly lease payments for the remainder of the applicable Lease Term, discounted to present value at the rate of five percent (5%) per annum, as reasonable damages for our loss of the bargain. If you return the Equipment we take it in satisfaction of our interest in it; if you do not, we may instead recover its fair market value, determined in good faith and evidenced on request. Return and fair market value are alternatives, not both, and any amount we realise on disposing of the Equipment is credited against what you owe. Upon any such termination for default, we may proceed in any lawful manner to obtain satisfaction of the amounts owed to us and, if applicable, our recovery of the Equipment, including entering onto your premises to recover the Equipment. In any case, you shall also be responsible for our costs of collection, court costs, and reasonable attorneys’ fees, as well as applicable shipping, repair, and refurbishing costs of recovered Equipment. We may set off amounts you owe us under this Agreement against amounts we owe you, provided we first give you written notice identifying the amount and what it is for, and provided the amount is actually due. We will not set off any amount that is due only because we have accelerated it under clause (b)(ii) unless a court has entered judgment for it.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-4a-declares-itself-exhaustive-and-is-not'] }],
  },
  {
    slug: 'equipment-lease.assignment',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 130,
    heading: 'Assignment',
    body: 'You may not assign or transfer this Agreement, by operation of law or otherwise, without our prior written consent. For purposes of this Agreement, any transfer of voting control of you or your parent shall be considered an assignment or transfer hereof. We may assign or transfer this Agreement and our rights and obligations hereunder, in whole or in part, to any third party without the necessity of obtaining your consent.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    THE GUARANTY LIMIT IN §4.2, UNDONE TWENTY CLAUSES EARLIER.

    WHAT WAS WRONG. "No guarantor shall have any right of subrogation to any of
    our rights in the Equipment or this Agreement or against you, and any such
    right of subrogation is hereby waived and released. All indebtedness ... is
    hereby subordinated to all of your present and future obligations ... until
    the obligations due to us are paid and satisfied in full."

    REVIEW-01 narrowed §4.2 to three items and said in terms that the Guarantor
    is not liable for a monthly payment, for an amount accelerated under
    §3.12(b)(ii), or for the business failing. This Section was never conformed:
    it subordinates insider debt until the WHOLE agreement is paid, including the
    payments §4.2 says the Guarantor does not owe, and it releases subrogation to
    the very Equipment §4.2(a) may make the Guarantor pay the fair market value
    of. REVIEW-02 raised it as
    `el-3-14-was-not-conformed-when-4-2-was-narrowed`, HIGH, and the
    `lombard-contracts` manifest still records it `open` with "Routed to counsel
    by REVIEW-02 and not yet put to one. No document change made."

    THE SAME SHAPE AS FRPA §7.21 AND §9.1, AND FOUND THE SAME WAY. The FRPA
    rewrite found four routes to guarantor liability and every one was found by
    an assertion stated over the SET rather than by reading a clause — §7.21 made
    a guarantor indemnify Buyer for "any act or omission by any ISO", which the
    2026-09-09 memo does not raise. This is the twins' version of that, and it
    was found by the same method.

    WHAT CHANGED. Both limbs are tied to the obligations §4.2 guarantees.
    Subordination ends when those obligations are satisfied, whatever else
    remains payable under the agreement. Subrogation is DEFERRED rather than
    released, and a guarantor who has paid the fair market value of Equipment
    under §4.2(a) is subrogated to our interest in that Equipment on payment —
    which is the interest §4.2(a) makes them buy.

    DEPARTURE FROM REVIEW-02's FIX. It also says "Move 3.14 into Section 4 where
    the rest of the guaranty lives, so the next person narrowing the guaranty
    sees it." Not done. A move renumbers two live documents, and `number` is what
    a reader sees on the page of a document that still prints 3.14. What replaces
    it is the first sentence, which sends a reader from here to §4.2, and the
    assertion in `__tests__/the-twins-cannot-undo-the-frpa.test.ts` that EVERY
    clause outside Section 4 binding a guarantor must cite §4.2 — which a move
    would not have given, because a move fixes one clause and an assertion covers
    the next one. Recorded for whoever renumbers: this is the clause to move
    first.
  */
  {
    slug: 'equipment-lease.lease-guaranty',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 140,
    heading: 'Lease Guaranty',
    body: 'Section [[clause:equipment-lease.guaranty-of-payment]] states the whole of what a guarantor guarantees under this Agreement, and this Section adds nothing to it. A guarantor is not liable under this Section for an obligation that Section [[clause:equipment-lease.guaranty-of-payment]] says the guarantor does not owe.\nNo guarantor has a right of subrogation to our rights against you, or to our interest in the Equipment, until the obligations guaranteed by Section [[clause:equipment-lease.guaranty-of-payment]] have been satisfied. A guarantor who has paid us the fair market value of Equipment under Section [[clause:equipment-lease.guaranty-of-payment]](a) is subrogated on that payment to our interest in that Equipment, and we will do what the guarantor reasonably asks to evidence it.\nIndebtedness owed by you to a guarantor is subordinated to the obligations guaranteed by Section [[clause:equipment-lease.guaranty-of-payment]], and no payment may be made or accepted on that indebtedness while any of those obligations is due and unpaid. When those obligations are satisfied this subordination ends, whether or not another amount remains payable to us under this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'debt-vocabulary-the-language-guard-would-not-catch',
          'el-3-14-subordination-runs-in-the-wrong-direction',
          'el-3-14-was-not-conformed-when-4-2-was-narrowed',
        ],
      },
    ],
  },
  /*
    FOUR PROVISIONS UNDER ONE CAPTION, AND THE CAPTION IS THE LEAST OF IT.

    WHAT WAS WRONG. Florida law, and "The exclusive venue for any actions or
    claims arising under or related to this Lease shall be the appropriate state
    or federal court located in Pasco County, Florida" — in a form signed by a
    merchant and personally guaranteed by a natural person who may be in any of
    eleven states. Then three more provisions under the same caption: a jury
    waiver running only against "YOU", a class-action waiver running only against
    "YOU", and a one-year limitation period running only against "YOU". Those are
    the four defects FRPA §§7.5, 7.10, 7.11 and 7.19 were rewritten to remove,
    sitting in the document the same person signs next.

    REVIEW-02 RAISED TWO OF THEM AND NEITHER REVIEW ASKED ABOUT THE VENUE.
    `el-3-15-hides-three-waivers-under-a-miscellaneous-caption` is recorded
    implemented — the three got the sub-headings 3.15A, 3.15B and 3.15C this body
    still prints — and `el-3-15-jury-waiver-is-one-sided-where-the-frpas-is-
    mutual` is recorded open, "not yet put to" counsel. Neither review read this
    document as part of Lombard's merchant package, because it only became part
    of one when `instrumentsFor` began returning both twins on
    `equipment !== 'none'`.

    WHAT CHANGED, IN FOUR PARTS.

    (1) LAW AND FORUM BOTH MOVE TO THE CUSTOMER'S OWN STATE, matching FRPA §7.5
        and `LOMBARD_FACTS.venueRule`, which is `merchant-state`. "Exclusive"
        goes with them: the rule is symmetrical, neither party may require the
        other to litigate elsewhere, and it yields where a state fixes its own
        forum for an agreement of this kind.
    (2) THE JURY WAIVER BECOMES MUTUAL AND LIMITS ITSELF, in FRPA §7.10's shape.
        It operates only so far as the law of the forum gives effect to a
        predispute waiver; where that law does not, the Section has no effect and
        each party keeps the right. The owner's instruction against deleting a
        jury waiver nationally to answer one state's rule is honoured — the
        answer a jury waiver needs is per-FORUM at the time of suit, not
        per-template at the time of drafting, and a customer in one state can be
        sued in another.
    (3) THE CLASS WAIVER GOES, in FRPA §7.11's shape, and its sub-heading changes
        for FRPA §7.13's reason: a reader who finds "Class Action Waiver" and
        reads a clause that waives nothing has been told the opposite of the
        truth twice.
    (4) THE ONE-YEAR PERIOD GOES AND NO PERIOD REPLACES IT. FRPA §7.19 was
        redrafted mutual with no shortening because the two-year figure
        attributed to the 2026-09-09 memo exists nowhere but one orchestrator
        note — checked again here, in `lombard-contracts` and in both review
        registers, with the same result. A day count written into a form a
        natural person signs, on an unconfirmed premise, is what the standing
        rule against inventing commercial values exists to stop, and shortening a
        limitation period is the direction that costs the signer.

    ARTICLE 9 IS ADDED, AND IT IS NOT COSMETIC. §3.6 claims a security interest
    in the Equipment and, in the Equipment Lease, the right to file a financing
    statement to perfect it. A choice-of-law sentence cannot displace the UCC's
    mandatory perfection and priority rules, and once the governing law follows
    the customer around the country the point stops being theoretical. FRPA §7.5
    carries the same sentence; this is the document that actually takes the
    interest.

    WHY THE JUSTIFICATION IS NOT THE FRPA'S, WHICH MATTERS IF ANYONE REOPENS IT.
    VERIFIED, `mca/sources/VA-Code-6.2-2228-2238.txt`: Va. Code §6.2-2234(A),
    "Place for bringing action", makes a provision mandating a forum outside the
    Commonwealth unenforceable for a covered transaction, and §6.2-2228 defines
    "Recipient" as a person whose principal place of business is in the
    Commonwealth — so merchant-state satisfies Virginia by construction for the
    FRPA. **That statute governs sales-based financing, and an equipment lease is
    not sales-based financing.** It compels nothing here, and saying it did would
    be the fifth misattributed citation this vertical has had to correct. The
    reason here is the narrower one: one envelope should not send one signer to
    two courts under two laws, and an exclusive out-of-state forum against a
    natural person decides whether that person appears at all — which is what
    §4.3's own recital about the cost of litigating conceded before it waived the
    objection.

    THE GATE WAS REFUSED, ON ADR 0013's TEST AND NOT AS A SHORTCUT. The obvious
    candidate is `disputeResolution`, which gates FRPA §§7.10, 7.11, 7.19 and
    7.20 as one bundle. Refused, on three grounds, in the order ADR 0013 asks
    them.

      - **The fact decides a limb, not the clause.** This Section answers four
        questions: which law governs, where an action is brought, how perfection
        and priority are decided, and what happens to a jury, a class and a
        limitation period. `disputeResolution` answers the last. Gating the whole
        record on it would take governing law, venue and the Article 9 sentence
        away from an arbitration template — which is exactly why FRPA §7.5's gate
        was refused.
      - **The fact is misattributed here in a way it is not in the FRPA.** ADR
        0013's diagnostic: *if two limbs bind different parties or answer
        different questions, the fact is misattributed.* `disputeResolution`
        describes how disputes under the FUNDER's financing agreement are
        resolved. This is a different contract with a different entity —
        {{equipmentAffiliate}}, not {{funder}} — which FRPA §7.8's precedence
        order states in terms. `instrumentsFor` puts both twins in the envelope
        on `equipment` alone and reads `disputeResolution` for neither.
      - **The arbitration arm cannot be drafted.** There is no arbitration clause
        anywhere in the merchant-facing library. Gating §3.15 or §4.4 out under
        `arbitration` would leave a guaranty with no dispute-resolution provision
        and nothing to replace it: a hole, not an alternative. `facts.ts` states
        the standard for that case.

    So `includeWhen` stays `null` in both twins, and cross-reference does the work
    a gate would not: §4.3 points here, and §4.4 says neither it nor this Section
    shortens a period anywhere.

    CAPITALS ARE NOT USED, AND IT IS THE SAME OPEN QUESTION FRPA §7.10 RECORDS.
    Both baselines set these provisions in capitals; the rewritten FRPA does not,
    on the rule that capitals are for a disclosure a regulator requires to be
    conspicuous (7 TAC §86.310(d)) and that spending them elsewhere devalues the
    one that needs them. A jury waiver is nevertheless the classic place a court
    asks whether a term was conspicuous, and no vendored authority in this
    repository fixes what is required. Reported as an open question for counsel,
    now on three documents rather than one.

    THE FORM CHANGES, AND THE CHANGE IS HANDED BACK. The `.docx` in
    `lombard-contracts` still prints Florida law, Pasco County, the sub-heading
    "3.15B Class Action Waiver" and the three all-caps paragraphs. Conforming it
    is a change in that repository, made there and not here.
  */
  {
    slug: 'equipment-lease.governing-law-and-venue',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 150,
    heading: 'Governing Law and Venue',
    body: 'This Agreement is governed by the substantive law of the state of your principal place of business stated in the Lessee and Equipment Information grid, subject to mandatory federal law and to applicable conflict-of-laws rules. An action arising out of or relating to this Agreement shall be brought in a state court of competent jurisdiction in that state, or in a federal court of competent jurisdiction sitting in that state. Neither you nor we may require the other to bring or defend such an action anywhere else, and nothing in this Section selects a court that lacks subject-matter jurisdiction. Where the law of a state fixes where an action under an agreement of this kind must be brought, that rule governs and this Section yields to it.\nPerfection, the effect of perfection or non-perfection, and the priority of a security interest described in Section [[clause:equipment-lease.title-to-equipment]] are governed by the mandatory rules of the Uniform Commercial Code that apply to them. This Section does not vary those rules and does not choose the law that decides them.\nIf any part of this Agreement is not enforceable, the remaining provisions will remain valid and enforceable.\nService of a summons, a complaint or other legal process is governed by Section [[clause:equipment-lease.independent-decision-governing-law]] and by the procedural law of the court in which the proceeding is brought. Nothing in this Section makes a mailing, an email or any other communication into service of legal process.\n3.15A Jury Trial Waiver\nYou and we each waive trial by jury in an action arising out of or relating to this Agreement, to the extent the law of the forum gives effect to a waiver of that right made before a dispute has arisen. Where the law of the forum does not give effect to such a waiver, this Section has no effect and each of us retains the right to trial by jury. This waiver is mutual, it binds nobody who has not signed this Agreement, and it does not reach a claim applicable law requires to be tried to a jury.\n3.15B Class and Representative Proceedings\nNo party waives a right to bring, to defend, or to take part in a class, collective, representative or public-enforcement proceeding that applicable law permits. Whether such a proceeding is available, and in what form, is for the court to determine under applicable law and its own rules. A party that takes part in one keeps whatever share of a recovery it is awarded and any right to costs or to a fee award that applicable law gives it.\n3.15C Limitation of Actions\nThe limitation period, the accrual rule, and any tolling or discovery rule that applicable law supplies apply to a claim by each party to this Agreement alike, whoever brings it and whoever it is brought against. This Agreement does not shorten any of them, and no other provision of this Agreement shortens one. A claim that applicable law does not permit to be shortened or given up is unaffected by this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-15-hides-three-waivers-under-a-miscellaneous-caption',
          'el-3-15-jury-waiver-is-one-sided-where-the-frpas-is-mutual',
        ],
      },
    ],
  },
  /*
    THE QUIET HALF OF THE SAME MACHINE, AND NO REVIEW NAMED IT.

    WHAT WAS WRONG. "Notices sent to the Lessee's last known address, as
    indicated in our records, shall constitute effective notice to the Lessee
    under this Agreement." Once §4.3 stops making a mailing into service, this
    sentence is still making a mailing into notice — at an address the customer
    may have left, held in our own records, with nothing requiring us to check
    it. Notice matters here: §3.12 turns on a default, and §3.7 turns on a
    thirty-day notice before the end of the term.

    THE FRPA CARRIED THE IDENTICAL PRESUMPTION AND DROPPED IT. §10.5's "presumed
    to be accurate" is the same rule in the same words, and
    `a-default-judgment-needs-a-served-defendant.test.ts` now asserts it never
    returns. This clause is the twins' copy of it, and it was found by sweeping
    the property over both documents rather than by reading the clause — no
    review, no memo and no brief names it.

    WHAT CHANGED. A notice goes to the address the customer gives in Section 1 or
    to a later one given in writing, and each party tells the other promptly of a
    change. The deemed-receipt rules for mail, courier and email are kept exactly
    as they were: they are ordinary, nothing raised them, and rewriting them
    would be inventing terms. What goes is the consequence. Sending to an address
    a party has said it no longer uses does not make the notice good, and failing
    to give a change of address does not make an otherwise ineffective notice
    effective — the two-sentence shape FRPA §7.12 uses for the same duty.

    AND THE TWO SUBJECTS ARE SEPARATED BY NAME. This Section governs notices;
    §4.3 governs legal process; neither is evidence of the other. FRPA §10.6 was
    rewritten for exactly this reason, having previously made Section 10
    supersede every notice provision in the Agreement.

    «43» STAYS, CHECKED AGAINST THE VENDORED BODY RATHER THAN ASSUMED. It is the
    AcroForm anchor the Lombard pipeline injects for our notice address (README
    rule 2), and a body that stops claiming it is a body the injector fills into
    nothing.
  */
  {
    slug: 'equipment-lease.notices',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 160,
    heading: 'Notices',
    body: 'All notices under this Agreement must be in writing, if to you at the address you give in the Lessee and Equipment Information grid or at a later address you give us in writing, and if to us at _______________«43»_______________, Attn: Equipment Lease Department, or at a later address we or a subsequent assignee give you in writing. Each of us will tell the other promptly in writing of a change of address.\nA notice is given (i) if sent by mail or courier, on the earlier of five (5) days after mailing or actual receipt or, in the case of courier, when delivered, and (ii) if sent by email, on transmission, provided no bounce-back or other non-delivery report is received. A notice given in any other manner is effective when actually received.\nSending a notice to an address a party has told the other it no longer uses does not make that notice effective, and a failure to give a change of address does not make an otherwise ineffective notice effective. A notice given under this Section is not service of legal process and is not evidence that service was made; service of a summons, a complaint or other legal process is governed by Section [[clause:equipment-lease.independent-decision-governing-law]] and by the procedural law of the court.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.electronic-signatures',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 170,
    heading: 'Electronic Signatures',
    body: 'The parties agree that electronic signatures (including those executed via any commercially recognized electronic-signature platform) shall have the same force and effect as original ink signatures. Electronic copies of this Agreement shall be treated as originals for all purposes.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.entire-agreement',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 180,
    heading: 'Entire Agreement',
    body: 'This Agreement constitutes the entire agreement between the parties with respect to its subject matter, supersedes any previous agreements and understandings, and can be changed only by a written agreement signed by all parties. This Agreement may be executed in any number of counterparts and all of such counterparts taken together shall be deemed to constitute one and the same instrument.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.survival',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 190,
    heading: 'Survival',
    body: 'Sections [[clause:equipment-lease.software-license]] (Software License), [[clause:equipment-lease.limitation-on-liability]] (Limitation on Liability), [[clause:equipment-lease.indemnification]] (Indemnification) and [[clause:equipment-lease.lease-guaranty]] (Lease Guaranty) survive the expiry or termination of this Agreement.\nSection [[section:guaranty]]: Personal Guaranty',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
