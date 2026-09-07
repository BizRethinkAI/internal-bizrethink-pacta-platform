/**
 * What a filled disclosure can still be wrong about after every identity in
 * this package has passed.
 *
 * This file is the deliverable, not the disclaimer. `check.ts` can only ever
 * report a defect it has a rule for, and a caller reading an empty findings
 * list will conclude the form is lawful. It is not; it is CONSISTENT. Those are
 * different claims and the gap between them is large enough to have a name.
 *
 * Phase 2 surfaces this list to a human beside the findings. It is written to
 * be read by one.
 */

export type LimitClass =
  /** Nothing in the envelope constrains the figure at all. */
  | 'unconstrained'
  /** The documents leave a reading open and the verdict turns on it. */
  | 'ambiguous'
  /** The fact lives outside every document in the envelope. */
  | 'outside-the-documents'
  /** Detectable in principle, not yet built. */
  | 'not-yet-built';

export type Limit = {
  id: string;
  kind: LimitClass;
  /** What can be wrong. */
  what: string;
  /** Why nothing here sees it. */
  why: string;
  /** What would see it, if anything would. */
  wouldNeed: string;
};

export const NOT_CHECKED: Limit[] = [
  {
    id: 'consistency-is-not-truth',
    kind: 'outside-the-documents',
    what: 'Every figure on both documents can be internally consistent and still describe a different deal from the one that funds.',
    why: 'Every check here is a relationship BETWEEN disclosed numbers. A coherent set of wrong numbers — a purchase price that is not the price wired, a purchased amount that is not what will be collected — satisfies all of them. This is the deepest limitation and it is structural, not an omission.',
    wouldNeed:
      'Comparison against the funding instruction and the settlement records, which are platform state rather than documents in the envelope.',
  },
  {
    id: 'the-projection-itself',
    kind: 'outside-the-documents',
    what: 'Whether the sales projection the APR is built from is a defensible estimate of this merchant’s income.',
    why: '§942(b) and §600.7 permit either the recipient’s own projection or the provider’s internal one; which to use is an underwriting decision. The offer summary discloses the resulting average monthly income figure, and `payment-projection` checks only that the payment, the split and that figure cohere — never that the figure is right.',
    wouldNeed:
      'The bank or processor history the projection was built from, retained as evidence. The computation spec requires that retention and nothing in this package can confirm it happened.',
  },
  {
    id: 'blockers-1-and-2-from-one-document',
    kind: 'not-yet-built',
    what: 'An offer summary sent WITHOUT the agreement or the Itemization can carry both the gross-purchase-price defect and the omitted-fees defect and pass every check.',
    why: 'The two move the same sum in opposite directions, so `closure` cancels. Only `amount-financed`, `finance-charge` and `itemization-agreement` separate them, and all three need a second document. `check.ts` reports them in `skipped` and `instanceCoverage` names the undetected blockers, but a caller that ignores those fields will read the empty findings list as clean.',
    wouldNeed:
      'The envelope, not the form. Phase 2 must refuse to report on a one-document envelope without saying so.',
  },
  {
    id: 'weekday-phase-and-holidays',
    kind: 'ambiguous',
    what: 'The calculated APR itself, to within about 3.1 percentage points on a 150-payment weekday stream.',
    why: 'Appendix J places payments at their true calendar-day offsets, but the offer summary does not disclose which weekday the first payment lands on and carries no funding date. Bank holidays are not modelled at all, and each one pushes the stream a further day out. The five weekday phases are all evaluated and a split verdict is reported as undetermined; holidays are simply absent.',
    wouldNeed: 'The funding date and a holiday calendar, which are deal facts rather than disclosed figures.',
  },
  {
    id: 'term-unit',
    kind: 'ambiguous',
    what: 'Whether "Estimated Term: 150 days" means 150 elapsed days or 150 payments.',
    why: '§914(a)(8)(B) and §942 do not say. On a weekday product the readings differ by a factor of about 1.4, which changes the payment count, the APR and the monthly cost. The caller declares the reading; nothing verifies it.',
    wouldNeed: 'A regulator’s reading, or a drafting choice recorded and applied consistently across the form.',
  },
  {
    id: 'relative-tolerance-direction',
    kind: 'ambiguous',
    what: 'Which direction the 2.5% relative test extends the band in — in EITHER state.',
    why: 'Both subsections are worded one-directionally and are literally satisfied by any overstatement, which would leave "below" in §955(a)(1)-(2) doing nothing. We read the relative test as extending the band only in the direction(s) that state’s POINT tests allow: upward only in California, both ways in New York. A contrary reading turns some California `apr-above-calculated` findings into passes, and would narrow New York’s floor from 2.5% relative back to a quarter point — which would report lawful New York disclosures as defects.',
    wouldNeed:
      'A reading from counsel. Until then the stricter reading is applied, so the failure mode is a false positive on a California overstatement rather than a missed one.',
  },
  {
    id: 'non-flat-streams',
    kind: 'unconstrained',
    what: 'A stepped split rate, a contractual minimum payment, a threshold-triggered payment, or a reasonably anticipated true-up.',
    why: '§942(a) requires the estimated stream to account for all of these, and none of them is a figure on the offer summary. The stream built here is flat by construction, so the APR round-trip silently assumes the product has none. Lombard’s does not today; the moment one is introduced this check is wrong and will not say so.',
    wouldNeed: 'The contract’s payment schedule, and a flag on the instance that the product is still flat.',
  },
  {
    id: 'itemization-payee-identity',
    kind: 'unconstrained',
    what: 'Whether the Itemization names its payees, and whether the named payee is the right one.',
    why: '§956(a)(3) requires each amount paid to another person to be listed on a separate line identifying that person. This package models the Itemization as five numbers; the names are not in the type.',
    wouldNeed: 'The rendered Itemization, which phase 3 encodes as a prescribed form.',
  },
  {
    id: 'renewal-double-dipping',
    kind: 'not-yet-built',
    what: 'The renewal figure NY §600.6(b)(3)(v), CT Appendix A and TX §398.051(b)(1)(B) each want: the part of the new financing that pays unpaid finance charges on the old one.',
    why: 'Not modelled. The computation spec defines it and lombard-platform implements it; nothing here checks the disclosed figure against the prior financing’s numbers, and none of the three prior-deal figures the formula needs appears on the new deal’s offer summary.',
    wouldNeed: 'The prior financing’s purchased amount, finance charge, total paid and any amount forgiven at renewal.',
  },
  {
    id: 'ct-renewal-rows',
    kind: 'not-yet-built',
    what: 'Connecticut’s four prescribed renewal dollar figures.',
    why: 'The computation spec expressly excludes them, and the finding on them says none may be pre-filled — the platform emits real numbers or the row stays blank. A blank row is indistinguishable here from a row this package does not model.',
    wouldNeed:
      'The CT form encoded as a prescribed form, plus a rule that distinguishes "deliberately blank" from "missing".',
  },
  {
    id: 'other-states',
    kind: 'not-yet-built',
    what: 'Every state but California and New York.',
    why: 'The identities are grounded in 10 CCR and 23 NYCRR. Nine other states are encoded in `prescribed/` at the template level and none of them has an instance rule here. Florida, Georgia, Kansas, Louisiana, Missouri, Texas, Utah and Virginia disclose overlapping but not identical quantities, and assuming otherwise is exactly the cross-jurisdiction error this package is built to prevent.',
    wouldNeed: 'Each state’s own definitions, read from its own vendored primary text.',
  },
  {
    id: 'the-form-around-the-numbers',
    kind: 'unconstrained',
    what: 'Everything `prescribed/` checks: row order, labels, prescribed wording, unauthorised additions.',
    why: 'This package takes an instance as a set of named quantities. It never sees the rendered page, so a form with the right numbers in the wrong rows, or with New York’s phrasing on a California form, passes everything here.',
    wouldNeed:
      '`checkFormConformity`, which already exists and runs on the blank template. The two halves are not yet run together on one document.',
  },
  {
    id: 'the-platform-models-a-different-stream',
    kind: 'outside-the-documents',
    what: 'That this checker and `lombard-platform` model the same deal’s payment stream differently.',
    why: '`computeDisclosureFigures` builds its stream on "every CALENDAR day of the estimated term", while the Lombard California form’s Payment Terms row reads "each business day (Monday–Friday)" and this package follows the row. On the sample deal the contradiction surfaces correctly as `stream-does-not-close` — it is real and it is in the documents — but nothing here says the two systems disagree by construction rather than by defect, and a reader of the finding cannot tell which.',
    wouldNeed:
      'The two to agree on one convention, which is a decision for whoever owns the disclosure computation. Phase 2 meets this immediately.',
  },
  {
    id: 'equipment-outside-the-finance-charge',
    kind: 'ambiguous',
    what: 'Whether equipment cost deferred into the purchased amount is outside the finance charge under 10 CCR §943.',
    why: 'The `finance-charge` identity subtracts it, on the computation spec’s reasoning that it is the price of goods rather than a cost of the financing. Nothing in §943(a) says so in terms, and REVIEW-01 carries `equipment-money-never-tested-as-finance-charge` as an open coverage gap. Every fixture in this package has a zero equipment amount except the one that exists to exercise the branch.',
    wouldNeed: 'Counsel, and a real deal with deferred equipment to check against.',
  },
  {
    id: 'citation-subdivision-letters',
    kind: 'unconstrained',
    what: 'Whether a quoted sentence really sits at the subdivision its `citation` names.',
    why: '`instance-authorities.test.ts` proves every quotation exists in its own vendored file, which is the part that carries legal weight. It cannot prove the sentence is §600.1(p) rather than §600.1(r): the vendored sources are pdftotext output with no structure to walk. Two subdivision letters were wrong when `authorities.ts` was written and were found by reading, not by the suite.',
    wouldNeed: 'A structured source, or a second reader. A citation here is a pointer to re-read, not a checked fact.',
  },
  {
    id: 'which-document-is-wrong',
    kind: 'unconstrained',
    what: 'When two documents disagree, which of them is right.',
    why: 'An identity is symmetric. `itemization-disagrees` reports that the offer summary says one thing and the Itemization another; it has no basis for preferring either, and neither does anything downstream.',
    wouldNeed: 'A designated source of truth for each quantity — which is a product decision, not a legal one.',
  },
];

/**
 * The three REVIEW-01 blockers, and what actually catches each.
 *
 * Recorded here rather than only in a report because a claim about coverage
 * that lives in prose drifts from the tree. `instance-limits.test.ts` asserts
 * each `caughtBy` identity exists and lists the blocker in its own `catches`.
 */
export const BLOCKER_COVERAGE = [
  {
    finding: 'ca-funding-provided-is-gross-purchase-price',
    caughtBy: ['amount-financed', 'itemization-agreement'],
    needsSecondDocument: true,
    note: 'Not detectable from the offer summary alone. `closure` cancels against the finance-charge blocker; `recipient-funds` does not fire because the gap the defect creates is exactly what §914(a)(2)(C)(ii)’s sentence exists to explain.',
  },
  {
    finding: 'ca-finance-charge-omits-withheld-fees',
    caughtBy: ['finance-charge'],
    needsSecondDocument: true,
    note: 'Not detectable from the offer summary alone, and the weaker `finance-charge-floor` does not catch it either: $24,500 is still far above the $2,895 omitted.',
  },
  {
    finding: 'ca-apr-understated',
    caughtBy: ['apr-round-trip'],
    needsSecondDocument: false,
    note: 'The one blocker the offer summary can convict on its own, because the disclosed rate, the disclosed stream and the disclosed amount financed are all on the same page.',
  },
] as const;
