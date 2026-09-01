import type { CustomClauseInput } from '../clauses/custom';
import type { ClauseFacts } from '../clauses/types';
import type { MoneyAnswers } from '../money/types';
import type { InterpolationValue } from '../render/interpolate';
import type { YardTask } from '../yard/derive-yard';

/**
 * The Florida lease interview, as data.
 *
 * Two principles from the document-assembly literature shape this, and both
 * are enforced by tests rather than left as intentions.
 *
 * COMPLETION WITHOUT UNDERSTANDING IS A FAILURE. A landlord who finishes an
 * interview without knowing what they just agreed to has not been served. That
 * is precisely how the 2026 Zillow lease failed: it completed, and its own
 * summary tables then contradicted a clause on page 22. So every field carries
 * a plain-language question, and where Florida dictates a limit the field
 * shows the limit and the citation — not after the fact in a findings panel,
 * but at the moment the number is typed.
 *
 * PROGRESSIVE DISCLOSURE. ~55 answers is too many for one page. Steps appear
 * only when they apply, fields inside them likewise. A lease with no pets never
 * shows a pet question; a Florida property never sees snow removal.
 *
 * The teaching copy states requirements and consequences, never advice — the
 * same unauthorized-practice-of-law line the rule pack holds, asserted by test.
 */

export type InterviewAnswers = {
  facts: ClauseFacts;
  money: MoneyAnswers;
  values: Record<string, InterpolationValue>;
  customClauses: CustomClauseInput[];
  /*
    A top-level key rather than a `values` entry, for the same reason
    customClauses is one: `values` is Record<string, InterpolationValue> and an
    array of rows is not an interpolatable scalar. The clause reads the
    RENDERING of these in `values.yardDuties`, derived in hydrateMatter.
  */
  yardTasks: YardTask[];
};

export type FieldKind = 'text' | 'textarea' | 'number' | 'usd' | 'date' | 'boolean' | 'select';

export type InterviewField = {
  /** Matches a ClauseFacts key, a MoneyAnswers key, or a clause variable. */
  name: string;
  target: 'fact' | 'money' | 'value';
  kind: FieldKind;
  /** The question, in plain language. Never the variable name. */
  label: string;
  /** What this answer does to the document. */
  help?: string;
  /** Shown inline where Florida constrains the answer. */
  statute?: { cite: string; note: string };
  /**
   * A common value, offered on fields no statute constrains.
   *
   * MUTUALLY EXCLUSIVE WITH `statute`, enforced by test. Where Florida sets a
   * limit the field shows the limit and the citation; suggesting a number
   * there would be advising on the statute, which is the line this project
   * holds everywhere else. Where Florida sets no limit, an empty box teaches
   * nothing, and stating what is common does.
   *
   * The note must read as an OBSERVATION, not a recommendation — "most leases
   * use X", never "we recommend X" — and a test asserts both the absence of
   * advice wording and the presence of an attributing word.
   */
  suggestion?: { value: string | number; note: string };
  /** Shown in the empty control. Use where the SHAPE of the answer matters. */
  placeholder?: string;
  /**
   * May the landlord ask the TENANT to answer this, on the review link?
   *
   * Only for things the tenant knows and the landlord would otherwise guess:
   * the names of their children, the breed and weight of their dog, where they
   * live before moving in.
   *
   * Declaring it is not sufficient — `tenant-answers.ts` additionally refuses
   * any money field and any field a statute constrains, whatever it declares,
   * because the answer to those has legal consequence and is the landlord's to
   * give.
   */
  tenantCanAnswer?: boolean;
  /**
   * Offer US Census address normalisation when this field loses focus.
   *
   * On blur, never per keystroke: the Census geocoder is a lookup service
   * rather than a typeahead, and it is a shared public resource — one request
   * when a field loses focus is fair use of it, one per character is not.
   * Free national autocomplete does not exist; Google Places requires billing
   * and Nominatim's terms discourage per-keystroke queries.
   *
   * The match is offered, never applied. Silently rewriting an address someone
   * just typed is how a form loses an apartment number.
   */
  address?: boolean;
  options?: { value: string; label: string }[];
  showWhen?: (answers: InterviewAnswers) => boolean;
  required?: boolean;
};

export type InterviewStep = {
  id: string;
  title: string;
  intro?: string;
  fields: InterviewField[];
  showWhen?: (answers: InterviewAnswers) => boolean;
  /** Only on the custom-clause step: sections an author may target. */
  customClauseSections?: string[];
};

/**
 * Values the renderer computes from other answers. Asking for them would let a
 * human enter a figure that disagrees with the arithmetic — which is the exact
 * defect in the Keane lease, where §1.1 said $0.00 and page 22 said $6,300.
 */
export const DERIVED_FACTS = [
  'depositHeldUsd',
  'depositCarriedInUsd',
  'advanceRentHeldUsd',
  'advanceRentCarriedInUsd',
  'prorationApplies',
  'termMonths',
  'hasNamedOccupants',
  'hasYardAllocation',
  'hasTenantYardDuty',
];

export const DERIVED_VALUES = [
  'rentDueDay',
  'monthlyRentUsd',
  'depositHeldUsd',
  'depositCarriedInUsd',
  'depositDueAtExecutionUsd',
  'advanceRentUsd',
  'advanceRentCarriedInUsd',
  'advanceRentTrueUpUsd',
  'proratedFirstPeriodUsd',
  'proratedDays',
  'prorationMethodLabel',
  // Assembled from the party list rather than typed.
  'landlordNames',
  'tenantNames',
  // §83.505 addresses, one per signer, assembled from the same list.
  'landlordNoticeEmails',
  'tenantNoticeEmails',
  'propertyAddress',
  'propertyTypeLabel',
  'effectiveDate',
  // Rendered from the yard rows, not typed.
  'yardDuties',
];

const pets = (a: InterviewAnswers) => a.facts.petsPermitted;
const tiered = (a: InterviewAnswers) => a.facts.lateFeePolicy === 'tiered';
const singleFamilyOrDuplex = (a: InterviewAnswers) =>
  a.facts.propertyType === 'single-family' || a.facts.propertyType === 'duplex';

export const FL_INTERVIEW: InterviewStep[] = [
  {
    id: 'parties',
    title: 'Who is renting it',
    /*
      FIRST STEP AS OF 2026-08-30. It used to sit behind a screen confirming
      property facts that the property record had already answered. This is the
      question a landlord actually arrives with, and the landlord side of it is
      now pre-filled from the property, so what is genuinely being asked is:
      who are the tenants.
    */
    intro:
      'The landlord comes from the property record and is already filled in below. Add each tenant — everyone listed becomes a signer on the lease and on every addendum.',
    fields: [
      {
        name: 'electronicNoticesElected',
        target: 'fact',
        kind: 'boolean',
        label: 'Deliver notices by email?',
        help: 'Adds a separate addendum both parties sign. Without it, email is not a valid way to serve a notice under the lease, so the lease does not claim otherwise.',
        statute: {
          cite: 'Fla. Stat. §83.505',
          note: 'Electronic delivery of notices requires a signed addendum stating that the election is voluntary and revocable, with a valid email address for each party.',
        },
      },
      {
        name: 'tenantPreTermAddress',
        tenantCanAnswer: true,
        target: 'value',
        kind: 'text',
        address: true,
        label: 'Where should notices go to the tenant BEFORE they move in?',
        // Postal, for the same reason as the landlord's: a mailed statutory
        // notice has to reach somewhere before the tenancy begins.
        help: 'A postal address. After the start date notices go to the property itself; this covers the gap between signing and moving in.',
        required: true,
      },
      {
        name: 'occupantLimit',
        target: 'value',
        kind: 'number',
        label: 'How many people may live at the property?',
        required: true,
      },
      {
        name: 'authorisedOccupants',
        tenantCanAnswer: true,
        target: 'value',
        kind: 'textarea',
        label: 'Anyone else living there, by name?',
        /*
          A real answer was "daughters and father", which identifies nobody and
          printed into the lease exactly as typed. The label asked "who is
          authorised to occupy it" and the word doing the work — "named" — was
          buried mid-sentence in the help. Both now say names, and an example
          shows the shape.

          No longer required. The tenants are named automatically from the
          party list, so a household with nobody else is an ordinary answer
          rather than something to invent an entry for.
        */
        help: 'Full names of anyone beyond the signing tenants — children, a parent, a partner who is not signing. The tenants themselves are added automatically. Leave blank if it is only the tenants.',
        placeholder: 'Ava Shetty, Rohan Shetty',
      },
      {
        name: 'guestNightsLimit',
        target: 'value',
        kind: 'number',
        label: 'After how many nights does a guest need your written consent?',
        help: 'Below this, a guest is a guest. Above it, staying on without consent is a breach you can act on.',
        suggestion: {
          value: 14,
          note: 'Most residential leases set this between 7 and 14 consecutive nights.',
        },
        required: true,
      },
    ],
  },

  {
    id: 'term',
    title: 'Term and rent',
    fields: [
      {
        name: 'startDate',
        target: 'money',
        kind: 'date',
        label: 'When does the lease start?',
        required: true,
      },
      { name: 'endDate', target: 'value', kind: 'date', label: 'When does it end?', required: true },
      { name: 'monthlyUsd', target: 'money', kind: 'usd', label: 'What is the monthly rent?', required: true },
      {
        name: 'dueDayOfMonth',
        target: 'money',
        kind: 'number',
        label: 'Which day of the month is rent due?',
        required: true,
      },
      {
        name: 'prorationMethod',
        target: 'money',
        kind: 'select',
        label: 'How should a partial month be apportioned?',
        suggestion: {
          value: 'actual-days-in-month',
          note: 'Most leases prorate on the actual number of days in the month the tenancy begins, which is also the method that matches what a tenant can check on a calendar.',
        },
        showWhen: (a) => a.facts.prorationApplies,
        options: [
          { value: 'actual-days-in-month', label: 'By the actual days in that month' },
          { value: 'thirty-day-month', label: 'By a 30-day month' },
          { value: 'actual-365', label: 'By a 365-day year' },
        ],
      },
    ],
  },

  {
    id: 'deposit',
    title: 'Deposit and money held',
    intro:
      'The part most builders get wrong. Money already held from a previous tenancy is not money to collect again — these are two different questions and the lease states both.',
    fields: [
      {
        name: 'securityUsd',
        target: 'money',
        kind: 'usd',
        label: 'How much security deposit is held under this lease?',
        required: true,
      },
      {
        name: 'alreadyHeldUsd',
        target: 'money',
        kind: 'usd',
        label: 'How much of that was already collected under a previous tenancy?',
        help: 'Enter 0 for a new tenant. Where money carries over, the lease states the full amount held AND that nothing is due at signing — so a tenant is never billed twice for a deposit they already paid.',
      },
      {
        name: 'depositInstitution',
        target: 'value',
        kind: 'text',
        label: 'Which institution holds the deposit?',
        statute: {
          cite: 'Fla. Stat. §83.49(2)',
          note: 'The lease must name the institution holding the deposit and state whether the account bears interest.',
        },
        required: true,
      },
      {
        name: 'depositInstitutionAddress',
        target: 'value',
        kind: 'textarea',
        label: 'At what address?',
        required: true,
      },
      {
        name: 'depositInterestLabel',
        target: 'value',
        kind: 'select',
        label: 'Does the account bear interest?',
        options: [
          { value: 'does not bear interest', label: 'No — non-interest-bearing' },
          { value: 'bears interest', label: 'Yes — interest-bearing' },
        ],
        required: true,
      },
      {
        name: 'depositReturnDays',
        target: 'value',
        kind: 'number',
        label: 'How many days to return the deposit when you make no claim against it?',
        statute: {
          cite: 'Fla. Stat. §83.49(3)(a)',
          note: 'Where no claim is made, the deposit must be returned within 15 days of the tenant vacating. A longer period cannot be agreed.',
        },
        required: true,
      },
      {
        name: 'depositClaimNoticeDays',
        target: 'value',
        kind: 'number',
        label: 'How many days to give written notice if you do make a claim?',
        statute: {
          cite: 'Fla. Stat. §83.49(3)(a)',
          note: 'Written notice of a claim must be given within 30 days of the tenant vacating.',
        },
        required: true,
      },
      {
        name: 'advanceRentUsd',
        target: 'money',
        kind: 'usd',
        label: 'How much advance rent is held for the final month?',
        required: true,
      },
      {
        name: 'advanceRentHeldUsd',
        target: 'money',
        kind: 'usd',
        label: 'How much of that was already collected previously?',
        help: 'Advance rent is one month of rent, so if rent has risen since it was collected the difference is a top-up — calculated for you, not typed.',
      },
      {
        name: 'prepaidRentUsd',
        target: 'money',
        kind: 'usd',
        label: 'Is a block of rent being prepaid beyond the first and final months?',
        help: 'Its own concept, not a deposit and not advance rent. The 2025 lease on this property took $25,200 this way, expressly not escrowed.',
      },
    ],
  },

  {
    id: 'utilities',
    title: 'Utilities and insurance',
    fields: [
      {
        name: 'tenantUtilities',
        target: 'value',
        kind: 'textarea',
        label: 'Which utilities does the tenant arrange and pay for?',
        help: 'Only what applies is listed. Nothing renders as "N/A".',
        required: true,
      },
      { name: 'landlordUtilities', target: 'value', kind: 'textarea', label: 'Which do you provide?', required: true },
      {
        name: 'rentersInsuranceMinUsd',
        target: 'value',
        kind: 'usd',
        label: "What minimum liability cover must the tenant's renter's insurance carry?",
        /*
          Eligible for a suggestion precisely because Florida says nothing: it
          neither requires renter's insurance nor sets a minimum, so there is no
          statutory bound to advise on. The note states what is common and
          attributes it; it does not recommend. A field carrying a `statute`
          may never have one of these — asserted by test.
        */
        suggestion: {
          value: 100000,
          note: "Most residential leases that require renter's insurance set the liability minimum at $100,000; $300,000 is common on higher-value properties.",
        },
        required: true,
      },
    ],
  },

  {
    id: 'property',
    title: 'Confirm the property',
    /*
      DEMOTED FROM FIRST, 2026-08-30. Six of these eight answers already come
      from the property record, so as an opening step it confirmed facts nobody
      had been asked for while the question a landlord actually arrives with —
      who is renting it — sat behind it.

      Not removed, and not hidden. `propertyType` decides which maintenance
      duties Florida permits a lease to shift, so it is placed immediately
      before the maintenance step it governs: close enough to matter, late
      enough not to be a toll gate.
    */
    intro:
      'These come from the property record and are already filled in. They decide which clauses Florida lets you agree, so it is worth a moment — change anything that is wrong for this particular lease.',
    fields: [
      {
        name: 'propertyType',
        target: 'fact',
        kind: 'select',
        label: 'What kind of property is this?',
        help: 'This is load-bearing, not descriptive. Florida only lets you shift certain maintenance duties to a tenant in a single-family home or duplex — on a condo or a unit in a multi-family building those clauses are not offered at all.',
        statute: {
          cite: 'Fla. Stat. §83.51(2)',
          note: "The landlord's obligations under §83.51(2) may be altered in writing for a single-family home or duplex, and only for those.",
        },
        options: [
          { value: 'single-family', label: 'Single-family home' },
          { value: 'duplex', label: 'Duplex' },
          { value: 'condo', label: 'Condominium' },
          { value: 'multi-family', label: 'Unit in a multi-family building' },
        ],
        required: true,
      },
      {
        name: 'propertyYearBuilt',
        target: 'fact',
        kind: 'number',
        label: 'What year was it built?',
        help: 'Anything before 1978 requires a federal lead-paint disclosure and the EPA pamphlet. Leave it blank if you are unsure — the disclosure is then included, because not knowing is not evidence of a later build.',
        statute: {
          cite: '42 U.S.C. §4852d',
          note: 'Pre-1978 housing requires a lead-based paint disclosure and a federally approved pamphlet before the lease takes effect.',
        },
      },
      {
        name: 'hasPool',
        target: 'fact',
        kind: 'boolean',
        label: 'Is there a pool or hot tub?',
        help: 'Adds a clause splitting pool duties — who services it, who keeps the water level and reports faults.',
      },
      {
        name: 'hasHoa',
        target: 'fact',
        kind: 'boolean',
        label: 'Is the property in an HOA or condominium association?',
        help: 'Adds a clause binding the tenant to the association rules and passing association fines through to them.',
      },
      {
        name: 'hoaName',
        target: 'value',
        kind: 'text',
        label: 'What is the association called?',
        showWhen: (a) => a.facts.hasHoa,
        required: true,
      },
      {
        name: 'hoaCureDays',
        target: 'value',
        kind: 'number',
        label: 'If an association notice sets no cure date, how long does the tenant have?',
        help: 'Only used as a fallback. Where the notice names a date — and they usually do — that date governs.',
        suggestion: {
          value: 14,
          /*
            An observation about the documents themselves, not a view on what
            is reasonable. The Estancia at Wiregrass notice of 26 August 2026
            gave until 9 September: fourteen days.
          */
          note: 'Association notices commonly set a cure date about two weeks out, and typically state that date on the notice itself.',
        },
        showWhen: (a) => a.facts.hasHoa,
        required: true,
      },
      {
        name: 'hoaNoticeHours',
        target: 'value',
        kind: 'number',
        label: 'How many hours does the tenant have to forward you an association notice?',
        suggestion: {
          value: 48,
          note: 'Association covenants commonly allow the owner 24 to 48 hours to act on a notice, so leases typically require it to be passed on inside that window.',
        },
        showWhen: (a) => a.facts.hasHoa,
        required: true,
      },
      {
        name: 'includedAppliances',
        target: 'value',
        kind: 'textarea',
        label: 'Which appliances and equipment come with the property?',
        help: 'Listed in the lease as included on the start date. Anything not listed is not part of what you are agreeing to provide.',
        required: true,
      },
      {
        name: 'venueCounty',
        target: 'value',
        kind: 'text',
        label: 'Which Florida county is the property in?',
        help: 'Sets the venue for any proceeding — which is where a Florida eviction is actually filed.',
        required: true,
      },
      {
        name: 'noticeName',
        target: 'value',
        kind: 'text',
        label: 'Who receives notices for the landlord?',
        help: 'Florida requires the lease to name the landlord, or whoever is authorised to receive notices on their behalf.',
        statute: {
          cite: 'Fla. Stat. §83.50',
          note: 'The name and address of the landlord, or of a person authorised to receive notices and demands, must be disclosed in writing.',
        },
        required: true,
      },
      {
        name: 'noticeAddress',
        target: 'value',
        kind: 'text',
        address: true,
        label: 'At what mailing address?',
        /*
          A POSTAL address, and the old wording invited the opposite reading.
          "The address must be given in writing" is true of an email address
          too, so the field asked to be filled with one.

          It cannot be. The §83.49(3)(a) notice this lease prints verbatim says
          the landlord "MUST MAIL YOU NOTICE, WITHIN 30 DAYS AFTER YOU MOVE
          OUT", and that the deposit must be returned outright if that mailing
          is not timely. An email address here is somewhere that notice cannot
          be sent.

          Email is additive and separate: §83.505 permits it only under a
          signed addendum, which is the "Deliver notices by email?" election on
          step 1. Never a substitute for this.
        */
        help: 'A postal address. Statutory notices are served here — including the deposit claim, which must be mailed within 30 days of move-out. Email is a separate election on step 1 and does not replace this.',
        statute: {
          cite: 'Fla. Stat. §83.50',
          note: 'The name and address must be disclosed in writing. §83.49(3)(a) then requires the deposit claim notice to be MAILED, so this has to be an address post can reach.',
        },
        required: true,
      },
    ],
  },

  {
    id: 'maintenance',
    title: 'Maintenance',
    /*
      "some of this" narrowed. §83.51 is what only bends on a single-family
      home or duplex; the yard below is not a statutory duty at all on any
      property type, so it is offered everywhere and the old intro over-claimed
      the restriction.
    */
    intro:
      'Florida fixes the repair duties and lets you agree the rest. The repair threshold is offered only on a single-family home or duplex; the yard is a matter of agreement anywhere.',
    fields: [
      {
        name: 'repairThresholdUsd',
        target: 'value',
        kind: 'usd',
        label: 'Up to what cost is a minor repair the tenant’s responsibility?',
        help: 'Applies to non-structural items only. Roof, plumbing in working order and structural components stay with you regardless of cost, and the clause says so on its face.',
        statute: {
          cite: 'Fla. Stat. §83.51(1)',
          note: 'Structural soundness, the roof, plumbing in reasonable working condition and code compliance cannot be shifted to a tenant on any property type.',
        },
        showWhen: singleFamilyOrDuplex,
        required: true,
      },
    ],
  },

  {
    id: 'fees',
    title: 'Late payment and charges',
    fields: [
      {
        name: 'graceDays',
        target: 'value',
        kind: 'number',
        label: 'How many days after the due date before rent is late?',
        required: true,
      },
      {
        name: 'lateFeePolicy',
        target: 'fact',
        kind: 'select',
        label: 'How should late rent be charged?',
        options: [
          { value: 'flat', label: 'A single flat fee' },
          { value: 'tiered', label: 'A fee, then a further fee if it stays unpaid' },
        ],
        required: true,
      },
      { name: 'lateFeeUsd', target: 'value', kind: 'usd', label: 'How much is the late fee?', required: true },
      {
        name: 'secondTierDay',
        target: 'value',
        kind: 'number',
        label: 'After which day of the month does the second fee apply?',
        showWhen: tiered,
      },
      {
        name: 'secondTierFeeUsd',
        target: 'value',
        kind: 'usd',
        label: 'How much is the second fee?',
        showWhen: tiered,
      },
      {
        name: 'returnedPaymentFeeUsd',
        target: 'value',
        kind: 'usd',
        label: 'What is the handling charge for a returned payment?',
        required: true,
      },
      {
        name: 'lockoutFeeUsd',
        target: 'value',
        kind: 'usd',
        label: 'What do you charge to attend a lockout?',
        required: true,
      },
      {
        name: 'keyReplacementFeeUsd',
        target: 'value',
        kind: 'usd',
        label: 'What do you charge for a key or device not returned?',
        required: true,
      },
      {
        name: 'inspectionRefusalFeeUsd',
        target: 'value',
        kind: 'usd',
        label: 'What do you charge if the tenant refuses access for an arranged inspection?',
        required: true,
      },
    ],
  },

  {
    id: 'access',
    title: 'Access and inspection',
    fields: [
      {
        name: 'entryNoticeHours',
        target: 'value',
        kind: 'number',
        label: 'How much notice will you give before entering?',
        statute: {
          cite: 'Fla. Stat. §83.53(2)',
          note: 'At least 12 hours notice is required for repairs. More notice than the statute requires is permitted.',
        },
        required: true,
      },
      {
        name: 'entryEarliestLabel',
        target: 'value',
        kind: 'text',
        label: 'Earliest time you would enter',
        statute: {
          cite: 'Fla. Stat. §83.53(2)',
          note: 'The statute treats 7:30am to 8:00pm as the reasonable hours for entry.',
        },
        required: true,
      },
      { name: 'entryLatestLabel', target: 'value', kind: 'text', label: 'Latest time you would enter', required: true },
      {
        name: 'inspectionsPerYear',
        target: 'value',
        kind: 'number',
        label: 'How many inspections per year?',
        required: true,
      },
    ],
  },

  {
    id: 'termination',
    title: 'Ending the lease early',
    fields: [
      {
        name: 'holdoverPenalty',
        target: 'fact',
        kind: 'boolean',
        label: 'Charge a penalty rate if the tenant stays past the end date?',
      },
      {
        name: 'holdoverRatePercent',
        target: 'value',
        kind: 'number',
        label: 'At what percentage of the monthly rent?',
        showWhen: (a) => a.facts.holdoverPenalty,
      },
      {
        name: 'terminationOnSale',
        target: 'fact',
        kind: 'boolean',
        label: 'May you end the lease if you sell the property?',
        help: 'Worth deciding deliberately if a sale is possible during the term.',
      },
      {
        name: 'saleNoticeDays',
        target: 'value',
        kind: 'number',
        label: 'How many days notice would you give?',
        showWhen: (a) => a.facts.terminationOnSale,
      },
      {
        name: 'nonRenewalNoticeRequired',
        target: 'fact',
        kind: 'boolean',
        label: 'Require notice before the tenant vacates at the end of the term?',
        help: 'Florida allows this only if the lease also obliges you to tell the tenant, within the same window, that it will not be renewed. The clause states both sides.',
        statute: {
          cite: 'Fla. Stat. §83.575(1)',
          note: 'A rental agreement may not require less than 30 nor more than 60 days notice, from either party.',
        },
      },
      {
        name: 'nonRenewalNoticeDays',
        target: 'value',
        kind: 'number',
        label: 'How many days notice?',
        statute: { cite: 'Fla. Stat. §83.575(1)', note: 'Between 30 and 60 days.' },
        showWhen: (a) => a.facts.nonRenewalNoticeRequired,
      },
      {
        name: 'earlyTerminationOffered',
        target: 'fact',
        kind: 'boolean',
        label: 'Offer the tenant a paid early-termination option?',
        help: 'Florida makes this available only where the tenant elected it by signing a separate addendum, which this builder produces. Without that election the option does not exist.',
        statute: {
          cite: 'Fla. Stat. §83.595(4)',
          note: 'Liquidated damages or an early termination fee require a separate signed addendum, may not exceed 2 months rent, and may require no more than 60 days notice from the tenant.',
        },
      },
      {
        name: 'earlyTerminationFeeUsd',
        target: 'value',
        kind: 'usd',
        label: 'What is the fee?',
        statute: { cite: 'Fla. Stat. §83.595(4)', note: 'Capped at 2 months rent.' },
        showWhen: (a) => a.facts.earlyTerminationOffered,
      },
      {
        name: 'earlyTerminationNoticeDays',
        target: 'value',
        kind: 'number',
        label: 'How much notice must the tenant give?',
        statute: { cite: 'Fla. Stat. §83.595(4)', note: 'No more than 60 days may be required.' },
        showWhen: (a) => a.facts.earlyTerminationOffered,
      },
    ],
  },

  {
    id: 'pets',
    title: 'Pets',
    showWhen: pets,
    fields: [
      {
        name: 'permittedPets',
        tenantCanAnswer: true,
        target: 'value',
        kind: 'textarea',
        label: 'Which animals are permitted? Give breed, weight and number.',
        help: 'Only the animals named here are permitted. An assistance animal required by a person with a disability is not a pet under the addendum — no fee, no pet rent, and no breed or weight limit applies to it.',
        required: true,
      },
      { name: 'petFeeUsd', target: 'value', kind: 'usd', label: 'One-off pet fee', required: true },
      { name: 'petRentMonthlyUsd', target: 'value', kind: 'usd', label: 'Monthly pet rent', required: true },
    ],
  },

  {
    id: 'disclosures',
    title: 'Flood disclosure',
    intro:
      'Florida requires you to state your own knowledge of flooding, as a separate document given at or before signing. These three answers are yours alone — nothing is defaulted for you.',
    fields: [
      {
        name: 'landlordKnowsOfFlooding',
        target: 'value',
        kind: 'select',
        label: 'Has flooding damaged the property during your ownership?',
        statute: {
          cite: 'Fla. Stat. §83.512',
          note: 'Effective 1 October 2025. A separate written flood disclosure is required for a term of 1 year or longer.',
        },
        options: [
          { value: 'has no', label: 'No — I have no knowledge of any flooding' },
          { value: 'has', label: 'Yes — I have knowledge of flooding' },
        ],
        required: true,
      },
      {
        name: 'landlordFiledFloodClaim',
        target: 'value',
        kind: 'select',
        label: 'Have you filed an insurance claim for flood damage here?',
        options: [
          { value: 'has not', label: 'No' },
          { value: 'has', label: 'Yes' },
        ],
        required: true,
      },
      {
        name: 'landlordReceivedFloodAssistance',
        target: 'value',
        kind: 'select',
        label: 'Have you received flood-damage assistance, including from FEMA?',
        options: [
          { value: 'has not', label: 'No' },
          { value: 'has', label: 'Yes' },
        ],
        required: true,
      },
      {
        name: 'petsPermitted',
        target: 'fact',
        kind: 'boolean',
        label: 'Are pets permitted at the property?',
        help: 'Adds a pet addendum as its own signed document.',
      },
    ],
  },

  {
    id: 'custom-clauses',
    title: 'Your own clauses',
    intro:
      'Anything the library does not cover goes here — and it becomes a real clause, numbered, in the contents, checked against the rest of the lease. It does not become a paragraph in a box at the back.',
    customClauseSections: [
      'parties',
      'premises',
      'term',
      'rent',
      'deposit',
      'use',
      'utilities',
      'maintenance',
      'access',
      'default',
      'rules',
      'general',
    ],
    fields: [],
  },

  {
    id: 'review',
    title: 'Review',
    intro:
      'Everything Florida constrains is checked before the lease can be sent. Blocking findings state the requirement and your answer, and must be resolved.',
    fields: [],
  },
];

export const visibleSteps = (steps: InterviewStep[], answers: InterviewAnswers): InterviewStep[] =>
  steps.filter((step) => step.showWhen === undefined || step.showWhen(answers));

export const allFields = (steps: InterviewStep[]): InterviewField[] => steps.flatMap((step) => step.fields);
