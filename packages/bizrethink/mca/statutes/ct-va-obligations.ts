import type { McaJurisdiction } from '../jurisdictions';

/**
 * Connecticut's Act and Virginia's Code, as text rather than as description.
 *
 * THIS FILE EXISTS TO CLOSE A NAMED GAP. Until 2026-09-07 the package README
 * ended with "Two states where we hold the form but not the statute", and every
 * claim made about §36a-863, §36a-868 and §36a-869 came from the Department of
 * Banking's guidance — the Department's characterisation of the Act, which is
 * not the Act. Virginia was worse: the prohibitions, the registration duties and
 * the penalties were asserted from a note in MCA-CLAUSE-LIBRARY-PHASE0.md with
 * no primary text behind them at all.
 *
 * Both statutes are now vendored from their official publishers and every claim
 * below is a verbatim quotation re-matched against those bytes on every run.
 * `__tests__/ct-va-statutes.test.ts` is what re-executes it.
 *
 * THREE THINGS THE FETCH CORRECTED, each of which had been wrong in a way no
 * amount of re-reading our own notes would have surfaced:
 *
 *   1. Connecticut's Act is in CHAPTER 669, not 668. Chapter 668 ends at
 *      §36a-644.
 *   2. Virginia's chapter runs §6.2-2228 to §6.2-2238 and stops. §6.2-2239 and
 *      §6.2-2240 exist, and belong to an unrelated chapter on virtual currency
 *      kiosk operators. A citation range that included them would have been
 *      citing the wrong law.
 *   3. §36a-869 is NOT the flat three-day irrevocability the guidance reads
 *      like. It carries two express carve-outs and §36a-869(b) permits the offer
 *      to say it is preliminary. Anything built on "the offer is locked for
 *      three days" would have been built on a stronger rule than the Act
 *      contains.
 *
 * WHAT THIS IS NOT. It is not a `ContentStatute` and does not pretend the form
 * has been verified against the Act row by row. `satisfiedBy` records which row
 * a human judged carries an item, exactly as `ContentStatute.requires` does, and
 * that judgement is a human's — what the machine checks is that the named row
 * exists and that the quotation is really in the statute.
 */
export type ObligationSurface =
  /** The disclosure document itself — a row, a label, a figure. */
  | 'the form'
  /** A term the commercial financing CONTRACT may not contain. */
  | 'the contract'
  /** When and how an offer may be sent, withdrawn or signed. */
  | 'the sending process'
  /** Registering as a provider or broker, and paying to stay registered. */
  | 'registration'
  /** Who may act on a violation, and what they may seek. */
  | 'enforcement';

export type StatutoryObligation = {
  id: string;
  /** e.g. 'Conn. Gen. Stat. §36a-863(5)'. */
  citation: string;
  jurisdiction: McaJurisdiction;
  /** The vendored primary file in `mca/sources/`. */
  sourceFile: string;
  /** Reproduced exactly, and asserted to appear in `sourceFile`. */
  text: string;
  bearsOn: ObligationSurface;
  /**
   * The label of the row on the prescribed form that carries this item, where
   * the obligation is about the form. Null for everything else — and the nulls
   * are the useful half: they are the obligations this package cannot check
   * because they do not live in a document it can see.
   */
  satisfiedBy: string | null;
  /** What follows for us, including where it differs from what we assumed. */
  note: string;
};

export const VENDORED_STATUTES = [
  {
    sourceFile: 'CT-CGS-36a-861-872.txt',
    citation: 'Conn. Gen. Stat. §§36a-861 to 36a-872 (P.A. 23-201)',
    sourceDigest: 'fe57e328f6d38cb6f0643e3d6238242cbe86b97d41ed51299eac4e709b8e2011',
    publisher: 'Connecticut General Assembly',
    /*
      The CGA publishes Title 36a section text at CHAPTER granularity only —
      there are no per-section URLs — so the whole of chapter 669 was fetched
      and Part V sliced out of it. Tag-stripped; the publisher's own "(Return
      to …)" navigation lines are the only thing removed.
    */
    retrievedFrom: 'https://www.cga.ct.gov/current/pub/chap_669.htm',
    retrievedOn: '2026-09-07',
  },
  {
    sourceFile: 'VA-Code-6.2-2228-2238.txt',
    citation: 'Va. Code Ann. §§6.2-2228 to 6.2-2238 (2022, c. 516)',
    sourceDigest: 'e490589b266298755757d400d5db5ddf51735c2102c7211d666610c9e1c652c1',
    publisher: 'Virginia Law Portal (Division of Legislative Automated Systems)',
    // Eleven per-section pages under this path, concatenated in order.
    retrievedFrom: 'https://law.lis.virginia.gov/vacode/title6.2/chapter22.1/',
    retrievedOn: '2026-09-07',
  },
] as const;

const CT = 'CT-CGS-36a-861-872.txt';
const VA = 'VA-Code-6.2-2228-2238.txt';

/**
 * Every claim this package makes about the two Acts, as the Acts make it.
 *
 * Ordered by section, and the ten §36a-863 items and nine §6.2-2231 items are
 * complete lists rather than a selection — a test asserts the counts, because a
 * partial list of a statute's requirements reads exactly like a complete one.
 */
export const CT_VA_OBLIGATIONS: StatutoryObligation[] = [
  /* ---------------------------------------------------------------- Connecticut */
  {
    id: 'ct-scope-sales-based-under-250k',
    citation: 'Conn. Gen. Stat. §36a-861(1)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: '"Commercial financing" means any extension of sales-based financing by a provider in an amount not exceeding two hundred fifty thousand dollars, the proceeds of which the recipient does not intend to use primarily for personal, family or household purposes;',
    bearsOn: 'the form',
    satisfiedBy: null,
    note: 'Settles the transaction scope the package had refused to guess at. Connecticut reaches sales-based financing only, and only up to $250,000 — so `CT_DISCLOSURE.transaction` moved off "unread-statutory-scope". The ceiling is a per-deal fact nothing here can check.',
  },
  {
    id: 'ct-format-prescribed-by-the-commissioner',
    citation: 'Conn. Gen. Stat. §36a-863',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'A provider shall provide to a recipient, when the provider extends a specific offer for sales-based financing, the following disclosures in a format prescribed by the Banking Commissioner:',
    bearsOn: 'the form',
    satisfiedBy: null,
    note: 'The sentence the whole Connecticut spec rests on, and it had been quoted from the guidance rather than the Act. It is why Appendix A is a prescribed FORM: the Act fixes the content and delegates the format.',
  },
  {
    id: 'ct-863-1-total-amount',
    citation: 'Conn. Gen. Stat. §36a-863(1)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'The total amount of the commercial financing.',
    bearsOn: 'the form',
    satisfiedBy: 'Total Amount of the Commercial Financing',
    note: 'The Act names the row.',
  },
  {
    id: 'ct-863-2-disbursement-amount',
    citation: 'Conn. Gen. Stat. §36a-863(2)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: "The disbursement amount, which is the amount paid to the recipient or on the recipient's behalf, excluding any finance charges that are deducted or withheld at disbursement.",
    bearsOn: 'the form',
    satisfiedBy: 'Disbursement Amount',
    note: "Appendix A splits this across two rows — the withheld charges get their own — which is the Commissioner's format decision and not a departure from the Act.",
  },
  {
    id: 'ct-863-3-finance-charge',
    citation: 'Conn. Gen. Stat. §36a-863(3)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'The finance charge.',
    bearsOn: 'the form',
    satisfiedBy: 'Finance Charge',
    note: '§36a-861(3) defines it by reference to 12 CFR 1026.4 "as if the transaction were subject to said section", which is a wider definition than the bare words suggest.',
  },
  {
    id: 'ct-863-4-total-repayment-amount',
    citation: 'Conn. Gen. Stat. §36a-863(4)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'The total repayment amount, which is the disbursement amount plus the finance charge.',
    bearsOn: 'the form',
    satisfiedBy: 'Total Repayment Amount',
    note: 'Note the arithmetic: DISBURSEMENT plus finance charge, not total amount plus finance charge. Virginia §6.2-2231(3) words it the same way.',
  },
  {
    id: 'ct-863-5-estimated-time-period',
    citation: 'Conn. Gen. Stat. §36a-863(5)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'The estimated time period required for the periodic payments to equal the total repayment amount.',
    bearsOn: 'the form',
    satisfiedBy: 'Estimated Time Period Required for the Periodic Payments to Equal the Total Repayment Amount',
    note: 'A TIME PERIOD. Virginia §6.2-2231(4) asks instead for the estimated NUMBER of payments. The spec doc comment already recorded this divergence from the guidance; it is now confirmed against both statutes.',
  },
  {
    id: 'ct-863-6-payment-amounts',
    citation: 'Conn. Gen. Stat. §36a-863(6)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'For payment amounts that are variable, a payment schedule or a description of the method used to calculate the amounts and frequency of payments, and the amount of the average projected payments per month.',
    bearsOn: 'the form',
    satisfiedBy: 'Payment Schedule',
    note: 'The variable branch, which is ours. It requires the average projected payment PER MONTH — a figure Virginia does not ask for.',
  },
  {
    id: 'ct-863-7-other-fees',
    citation: 'Conn. Gen. Stat. §36a-863(7)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'A description of all other potential fees and charges not included in the finance charge, including, but not limited to, draw fees, late payment fees and returned payment fees.',
    bearsOn: 'the form',
    satisfiedBy: 'Description of All Other Potential Fees and Charges NOT Included in the Finance Charge',
    note: '"including, but not limited to" makes completeness a judgement no checker can make.',
  },
  {
    id: 'ct-863-8-prepayment',
    citation: 'Conn. Gen. Stat. §36a-863(8)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: "Any finance charge the recipient will be required to pay if the recipient elects to pay off or refinance the commercial financing prior to full repayment, other than interest accrued since the recipient's last payment, and the percentage of any unpaid portion of such finance charge and the maximum dollar amount of such finance charge the recipient will be required to pay; and",
    bearsOn: 'the form',
    satisfiedBy: 'Finance Charges or Fees upon Prepayment or Refinance',
    note: 'TWO FIGURES, not a description: a percentage AND a maximum dollar amount. Virginia §6.2-2231(7)(b) asks only for "a description of prepayment policies". The spec doc comment had this from the guidance; it is now from the Act.',
  },
  {
    id: 'ct-863-9-collateral',
    citation: 'Conn. Gen. Stat. §36a-863(9)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'A description of collateral requirements or security interests, if any.',
    bearsOn: 'the form',
    satisfiedBy: 'Description of Collateral Requirements or Security Interests',
    note: 'Word for word identical to Va. Code §6.2-2231(8).',
  },
  {
    id: 'ct-863-10-broker-compensation',
    citation: 'Conn. Gen. Stat. §36a-863(10)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'Whether, in connection with the specific offer of sales-based financing, the provider will pay compensation directly to a commercial financing broker out of the financed amount and, if so, the amount of such compensation.',
    bearsOn: 'the form',
    satisfiedBy: 'Broker Compensation (Paid from Financed Amount)',
    note: 'The Act says "out of the financed amount", which is where Appendix A\'s parenthetical comes from. Virginia\'s §6.2-2231(9) has no such qualifier and its form label carries none.',
  },
  {
    id: 'ct-signature-required',
    citation: 'Conn. Gen. Stat. §36a-865',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: "The provider shall obtain the recipient's signature, which may be fulfilled by an electronic signature, on all disclosures required to be presented to the recipient pursuant to sections 36a-861 to 36a-866, inclusive, before authorizing the recipient to proceed further with the commercial financing transaction application.",
    bearsOn: 'the sending process',
    satisfiedBy: null,
    note: 'BEFORE authorizing the recipient to proceed further — a sequencing rule, not just a signature block. Nothing in this package enforces the order.',
  },
  {
    id: 'ct-additional-information-outside-the-disclosure',
    citation: 'Conn. Gen. Stat. §36a-866',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'Nothing in this section or sections 36a-861 to 36a-865, inclusive, shall prevent a provider from providing or disclosing additional information concerning commercial financing offered to a recipient, provided such additional information shall not be disclosed as part of any disclosure required pursuant to this section or sections 36a-861 to 36a-865, inclusive.',
    bearsOn: 'the form',
    satisfiedBy: null,
    note: 'The Connecticut analogue of CA/NY\'s "shall include only", and it reaches further: extra information is lawful but must sit OUTSIDE the prescribed disclosure. Va. Code §6.2-2233 is the same rule in nearly the same words. Nothing checks it, because the checker sees the disclosure table and not what surrounds it.',
  },
  {
    id: 'ct-other-state-form-reciprocity',
    citation: 'Conn. Gen. Stat. §36a-867',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: "If the Banking Commissioner determines that the laws of another state require commercial financing disclosures that meet or exceed the commercial financing disclosure requirements established under sections 36a-861 to 36a-866, inclusive, any commercial financing disclosure form that such other state approves for the purposes of complying with such other state's commercial financing disclosure laws may be used for the purposes of complying with the commercial financing disclosure requirements established under sections 36a-861 to 36a-866, inclusive.",
    bearsOn: 'the form',
    satisfiedBy: null,
    note: "The reciprocity door. It opens only on a DETERMINATION by the Commissioner, and the guidance records that no such determination has been made — so Virginia's form still may not be sent to a Connecticut recipient. That reading now rests on the Act plus the guidance, rather than on the guidance alone.",
  },
  {
    id: 'ct-no-prejudgment-remedy-waiver',
    citation: 'Conn. Gen. Stat. §36a-868',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: "No commercial financing contract entered into on or after July 1, 2024, shall contain any provision waiving a recipient's right to notice, judicial hearing or prior court order under chapter 903a in connection with the provider obtaining any prejudgment remedy, including, but not limited to, attachment, execution, garnishment or replevin, upon commencing any litigation against the recipient.",
    bearsOn: 'the contract',
    satisfiedBy: null,
    note: "A PREJUDGMENT-REMEDY waiver ban. It is NOT a confession-of-judgment ban and the Act contains none — the two are routinely conflated, and Virginia's §6.2-2234(C) is the confession-of-judgment one. FRPA §7.24 relies on this section; nothing in this package reads the FRPA.",
  },
  {
    id: 'ct-offer-not-revocable-for-three-days',
    citation: 'Conn. Gen. Stat. §36a-869',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'A provider shall not revoke, withdraw or modify a specific offer made on or after July 1, 2024, until midnight of the third calendar day after the date of the specific offer. A specific offer may be revoked, withdrawn or modified (1) based on information obtained in the underwriting process, including, but not limited to, verification of any information provided by the recipient, or (2) at the request of the recipient.',
    bearsOn: 'the sending process',
    satisfiedBy: null,
    note: 'NOT the flat three-day lock the package had assumed from the guidance. The same sentence that creates the window carries two carve-outs, and §36a-869(b) lets the offer state that it is a preliminary review only. Anything built on "a Connecticut offer cannot be withdrawn for three days" is built on a stronger rule than the Act contains.',
  },
  {
    id: 'ct-registration',
    citation: 'Conn. Gen. Stat. §36a-870(c)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'Each provider and commercial financing broker shall pay an initial registration fee of one thousand dollars and an annual registration fee of five hundred dollars by the fifteenth of September each year thereafter. If a provider or commercial financing broker fails to timely pay any such annual registration fee, its registration shall automatically expire by operation of law.',
    bearsOn: 'registration',
    satisfiedBy: null,
    note: "Automatic expiry by operation of law on a missed annual fee, with the same $1,000 / $500 / 15 September figures as Va. Code §6.2-2230. An unregistered provider's disclosure is conforming and unlawful at once, and nothing here can tell.",
  },
  {
    id: 'ct-penalties',
    citation: 'Conn. Gen. Stat. §36a-872(a)',
    jurisdiction: 'US-CT',
    sourceFile: CT,
    text: 'Any provider who violates any provision of sections 36a-861 to 36a-870, inclusive, or any regulation adopted pursuant to section 36a-871 shall be liable for a civil penalty pursuant to section 36a-50.',
    bearsOn: 'enforcement',
    satisfiedBy: null,
    note: "The Banking Commissioner enforces, via §36a-50. Virginia's enforcer is the Attorney General — see `va-attorney-general-enforcement`. §36a-50 itself is not vendored.",
  },

  /* ------------------------------------------------------------------ Virginia */
  {
    id: 'va-scope-sales-based',
    citation: 'Va. Code §6.2-2228',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: '"Sales-based financing" means a transaction that is repaid by the recipient to the provider, over time, as a percentage of sales or revenue, in which the payment amount may increase or decrease according to the volume of sales made or revenue received by the recipient.',
    bearsOn: 'the form',
    satisfiedBy: null,
    note: 'Settles Virginia\'s transaction scope, which had been assumed. Chapter 22.1 is headed "Sales-Based Financing Providers" and reaches nothing else. Note also the RECIPIENT definition: a person "whose principal place of business is in the Commonwealth" — the chapter is keyed to the recipient\'s location, not the provider\'s.',
  },
  {
    id: 'va-2231-1-total-and-disbursement',
    citation: 'Va. Code §6.2-2231(1)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'The total amount of the sales-based financing, and the disbursement amount, if different from the financing amount, after any fees deducted or withheld at disbursement.',
    bearsOn: 'the form',
    satisfiedBy: 'Total Amount Financed',
    note: "ONE numbered item covering what the form spreads over three rows — Total Amount Financed, Fees Deducted or Withheld at Disbursement, Disbursement Amount. The form is the Commission's prescribed format under the section's opening words.",
  },
  {
    id: 'va-2231-2-finance-charge',
    citation: 'Va. Code §6.2-2231(2)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'The finance charge.',
    bearsOn: 'the form',
    satisfiedBy: 'Finance Charge',
    note: 'Virginia\'s chapter does not define "finance charge" at all, where Conn. Gen. Stat. §36a-861(3) does by reference to 12 CFR 1026.4. A gap in the Code, not in our reading of it.',
  },
  {
    id: 'va-2231-3-total-repayment-amount',
    citation: 'Va. Code §6.2-2231(3)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'The total repayment amount, which is the disbursement amount plus the finance charge.',
    bearsOn: 'the form',
    satisfiedBy: 'Total Repayment Amount',
    note: 'Identical to Conn. Gen. Stat. §36a-863(4).',
  },
  {
    id: 'va-2231-4-estimated-number-of-payments',
    citation: 'Va. Code §6.2-2231(4)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'The estimated number of payments, which is the number of payments expected, based on the projected sales volume, to equal the total repayment amount.',
    bearsOn: 'the form',
    satisfiedBy: 'Estimated Number of Payments',
    note: 'A COUNT, where Connecticut §36a-863(5) asks for a time period. The two forms are not interchangeable and this is one of the reasons.',
  },
  {
    id: 'va-2231-5-payment-amounts',
    citation: 'Va. Code §6.2-2231(5)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'The payment amounts, based on the projected sales volume (i) for payment amounts that are fixed, the payment amounts, frequency, and method or (ii) for payment amounts that are variable, a payment schedule or a description of the method used to calculate the amounts and frequency of payments and payment method.',
    bearsOn: 'the form',
    satisfiedBy: 'Payment Schedule',
    note: "Virginia asks for the payment METHOD in both branches and does not ask for Connecticut's average projected monthly payment.",
  },
  {
    id: 'va-2231-6-other-fees',
    citation: 'Va. Code §6.2-2231(6)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'A description of all other potential fees and charges not included in the finance charge, including draw fees, late payment fees, returned payment fees, and prepayment fees or penalties.',
    bearsOn: 'the form',
    satisfiedBy: 'Description of All Other Potential Fees and Charges NOT Included in the Finance Charge',
    note: 'Virginia adds "prepayment fees or penalties" to the list; Connecticut\'s §36a-863(7) does not, handling prepayment in its own item instead.',
  },
  {
    id: 'va-2231-7-prepayment-policies',
    citation: 'Va. Code §6.2-2231(7)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'A description of prepayment policies including whether the recipient will be required to pay any additional fees, penalties, or other amounts not already included in the finance charge, or if the recipient will receive any discount to the finance charge.',
    bearsOn: 'the form',
    satisfiedBy: 'Description of Prepayment Policies',
    note: 'A DESCRIPTION, where Conn. Gen. Stat. §36a-863(8) demands a percentage and a maximum dollar amount. §6.2-2231(7)(a) also requires the whole of items 1-6 to be RE-disclosed as of the day of prepayment or refinance, which is an event-triggered obligation no blank form can carry and nothing here checks.',
  },
  {
    id: 'va-2231-8-collateral',
    citation: 'Va. Code §6.2-2231(8)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'A description of collateral requirements or security interests, if any.',
    bearsOn: 'the form',
    satisfiedBy: 'Description of Collateral Requirements or Security Interests',
    note: 'Word for word identical to Conn. Gen. Stat. §36a-863(9).',
  },
  {
    id: 'va-2231-9-broker-compensation',
    citation: 'Va. Code §6.2-2231(9)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'A statement of whether the provider will pay compensation directly to a broker in connection with the specific offer of sales-based financing and the amount of compensation.',
    bearsOn: 'the form',
    satisfiedBy: 'Broker Compensation',
    note: 'No "out of the financed amount" qualifier, unlike Conn. Gen. Stat. §36a-863(10). The two labels differ for that reason and must not be reconciled.',
  },
  {
    id: 'va-signature-required',
    citation: 'Va. Code §6.2-2232(B)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: "The provider shall obtain the recipient's signature, which may be fulfilled by an electronic signature, on all disclosures required to be presented to the recipient by this chapter at the time the recipient accepts the specific sales-based financing offer.",
    bearsOn: 'the sending process',
    satisfiedBy: null,
    note: "AT THE TIME OF ACCEPTANCE, where Conn. Gen. Stat. §36a-865 requires the signature BEFORE the recipient proceeds further. Different moments in the flow. Our Virginia form closes with a signature and Connecticut's with initials, which the spec already recorded.",
  },
  {
    id: 'va-additional-information-outside-the-disclosure',
    citation: 'Va. Code §6.2-2233',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'Nothing in this chapter shall prevent a provider from providing or disclosing additional information on a sales-based financing being offered to a recipient, provided, however, that such additional information shall not be disclosed as part of the disclosure required by this chapter.',
    bearsOn: 'the form',
    satisfiedBy: null,
    note: 'The Virginia twin of Conn. Gen. Stat. §36a-866. Extra content is lawful and must sit outside the prescribed disclosure — a constraint on page layout that this package, which sees only the table, cannot check.',
  },
  {
    id: 'va-venue-in-the-commonwealth',
    citation: 'Va. Code §6.2-2234(A)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'Where a provider enters into a contract or agreement with a recipient to provide sales-based financing, any cause of action arising under such contract or agreement shall be brought in a court in the Commonwealth. Any provision in the contract or agreement mandating that such action be brought outside the Commonwealth shall be unenforceable.',
    bearsOn: 'the contract',
    satisfiedBy: null,
    note: 'A forum-selection ban with no Connecticut counterpart. It bites on the FRPA, not on the disclosure.',
  },
  {
    id: 'va-arbitration-forum',
    citation: 'Va. Code §6.2-2234(B)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: "Where a contract between a provider or broker and recipient contains an arbitration provision, such contract shall not require face-to-face arbitration proceedings outside the jurisdiction where the recipient's principal place of business is located.",
    bearsOn: 'the contract',
    satisfiedBy: null,
    note: "The same subsection also puts the arbitrators' fees and expenses on the provider. Both are contract terms; nothing here reads the contract.",
  },
  {
    id: 'va-no-confession-of-judgment',
    citation: 'Va. Code §6.2-2234(C)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'No sales-based financing contract shall contain any confession by judgment provision or any similar provision. Any such provision in the contract shall be unenforceable.',
    bearsOn: 'the contract',
    satisfiedBy: null,
    note: 'THE PROHIBITION THAT WAS BEING ATTRIBUTED TO CONNECTICUT. Virginia bans confessions of judgment; Connecticut §36a-868 bans prejudgment-remedy waivers and says nothing about confessions of judgment. A test asserts the word does not appear in the Connecticut Act.',
  },
  {
    id: 'va-noncompliant-provision-unenforceable',
    citation: 'Va. Code §6.2-2236',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'If any provision of a sales-based financing agreement violates this chapter, such provision shall be unenforceable against the recipient.',
    bearsOn: 'the contract',
    satisfiedBy: null,
    note: 'Provision-level, not agreement-level: a violation voids the offending term rather than the deal. Connecticut has no equivalent and reaches the same ground through civil penalties instead.',
  },
  {
    id: 'va-registration',
    citation: 'Va. Code §6.2-2230',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'Each sales-based financing provider and sales-based financing broker shall pay an initial registration fee of $1,000 and an annual registration fee of $500 by September 15 every year thereafter. If the provider or broker fails to pay the annual registration fee by September 15, its registrations shall automatically expire by operation of law.',
    bearsOn: 'registration',
    satisfiedBy: null,
    note: 'Identical figures and date to Conn. Gen. Stat. §36a-870(c), which is not a coincidence worth relying on: they are separate registrations with separate regulators.',
  },
  {
    id: 'va-attorney-general-enforcement',
    citation: 'Va. Code §6.2-2238(A)',
    jurisdiction: 'US-VA',
    sourceFile: VA,
    text: 'The Attorney General is authorized to seek to enjoin violations of this chapter. The circuit court having jurisdiction may enjoin such violations notwithstanding the existence of an adequate remedy at law.',
    bearsOn: 'enforcement',
    satisfiedBy: null,
    note: 'The ATTORNEY GENERAL, where Connecticut §36a-872 gives it to the Banking Commissioner. Different enforcer, different remedies — Virginia adds restitution and attorney fees.',
  },
];
