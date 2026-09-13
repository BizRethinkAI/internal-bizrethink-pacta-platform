# Coordinated MCA equipment terms

Author session: **mca-build-20260913**, directly assigned by the repository owner.
[Task #205](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/205)
is the equipment step in the authorized continuous funding/identity → equipment →
final mapping → provider interview/reusable-template queue. This PR is stacked on
[#204](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/pull/204)
at `e7385339a` and inherits its #190 dependency. Independent review and merge remain
separate. The author owns this note only.

## Outcome

Thirty draft clauses change together, fifteen in each equipment instrument. Each
changed version advances; no source receives a named attorney or published status.
The original source files and their historical review annotations remain evidence.
The two instruments retain thirty records each and the five actual commercial
vocabulary divergences, whose explanations now describe the corrected terms.
Eight resolved vocabulary exceptions are removed; three still apply.

- The fixed-term $1 Lease elects purchase expressly at signing, itemizes the dollar
  with the final scheduled payment and stops periodic billing at term end. It has
  no automatic renewal or contradictory purchase-and-return instruction. An early
  completion quote itemizes remaining obligations, credits and required rebates.
- The Subscription has no purchase option, retains monthly continuation with a
  defined notice/termination date, and stops recurring billing at that date when
  return is timely tendered. Provider delay in return instructions cannot extend
  billing; nonreturn is not both unlimited renewal and full-value recovery.
- Both require a complete itemized payment schedule, agreed commencement, separate
  invoices, no duplicate interim period and actual tax reconciliation. Equipment
  remains outside purchased receipts. Processor collection requires separate
  acceptance and cannot dilute the purchased share or invent a 100% default sweep.
- Security language distinguishes the Lease's nominal-purchase economics from the
  Subscription's actual-term/residual classification. Attachment, perfection and
  priority require their legal prerequisites; no first-lien declaration or power
  to sign another agreement establishes them. Applicable lease-financing disclosure
  categories are not displaced merely by Article 9 treatment.
- Remedies require notice/cure, lawful recovery, accounting, credits and no double
  recovery. Mandatory notice, redemption, disposition, surplus and deficiency rules
  remain. No fixed 5% discount formula automatically accelerates future charges.
- Guarantor liability is for that separately identified guarantor's own intentional
  fraud, knowing material false statement or intentional equipment interference,
  measured by actual caused loss. Ordinary charges, others' misconduct, innocent
  error, business failure and automatic extensions are outside it. Entity capacity
  and separate signatures remain required. Costs have aggregate and individual caps.
- Express delivery and warranty promises survive; implied-warranty exclusions are
  conspicuous text candidates, subject to actual rendered review. Indemnity excludes
  provider fault, entry requires an appointment/consent, and software rights depend
  on actual authority and terms delivered before signing.

The shared `MCA_EQUIPMENT_FIELDS` definitions identify the separate equipment
counterparty, items, dates, amounts, tax basis, software, insurance and return
instructions. They are **separate from operative clause records**, awaiting the
next catalogue/interview wiring. Historical anchors are retained only where their
original value remains represented; this is not a claim that every original
metadata slot has been mapped. Actual serial numbers and delivery date can be
recorded on delivery, distinct from the delivery date agreed before signing.

## Commercial choices requiring independent review

These are explicit draft baseline choices, not assertions that a provider has
adopted them or that every state mandates them:

- No late fee, default interest, flat collection, upgrade or assumption fee. A later
  requested change must be separately priced and signed; introducing another fee
  model needs an authored, reviewed alternative and appropriate disclosures.
- Preserve the existing 25% concept as **one aggregate enforcement-cost cap** on the
  non-fee amount lawfully recovered, plus the same individual guarantor cap. Costs
  require lawful award or a separately signed post-dispute settlement and cannot
  compound or be recovered through another clause.
- Ten business days after receipt to cure (longer mandatory periods preserved),
  no processing-agreement cross-default, and actual provable damages in place of
  automatic future-payment acceleration. Mandatory rights are not contracted away.
- Narrow the equipment guaranty to the guarantor's own intentional conduct and
  require separate consent to increased obligations. Remove general debt
  subordination; payment creates appropriately limited subrogation rights.
- Use the scheduled charges paid **or payable** as the ordinary direct-damages cap,
  with stated provider-fault/title/data/infringement and nonwaivable-right exceptions.

## Sources and boundaries

Reuses [research #202](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/pull/202)
findings MCA-R08–R12 and retained evidence at research head
`d7a1186da1bf13282b4bb257b7edc8091122f6dc`. The
[source ledger](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/blob/d7a1186da1bf13282b4bb257b7edc8091122f6dc/docs/research/mca-substantive-review-2026-09-13/source-ledger.md)
records fetched URLs, dates, exact reviewed provisions and currency limitations.
Relevant verified provisions include Florida §§671.201(40), 679.2031, 679.509,
679.602, 679.609, 680.504, 672.316 and 680.214; California FIN §22800(j); New York
FIS §§801/802 and GOB §§5-901/5-903. The monthly-renewal exception is preserved;
this change does not assert those NY sections require a reminder for every monthly
Subscription renewal. No third Utah/California source refresh was undertaken.

This PR does not establish eleven-state product eligibility, legal approval,
rendered conspicuousness, licensing authority, effective insurance or actual
processor acceptance. These must be evidenced in the later provider/transaction
workflow before use. No calculation engine, schema migration, production operation
or new upstream overlay is introduced.

PR #194 owns the credit, communications and acknowledgment correction. Those six
equipment bodies are intentionally not changed here; its corrections must be
integrated before equipment templates can be used. The processor-controlled Split
Funding Letter and actual processor-form reconciliation remain separately owned.
Final numbering/classification (including embedded headings) remains the next task.

## Validation and next action

Focused TDD reproduced **17 failures** before implementation. Those seventeen
regressions now pass. The affected catalogue, twin, reference/numbering, approval,
source-coverage and review selection passes **44 files / 2,232 tests**. Existing
regressions now assert the narrower guaranty scope and require its citation in
indemnity and remedy limits. Actual CI evidence is recorded on the PR/task. Source digests remain unchanged. The new field metadata
is not misrepresented as an implemented or validated transaction-fill interface.
Changed-file formatting and normal commit hooks apply; no redundant local full
build, typecheck or browser sweep is used for clause text and field definitions.

#204 supplies the before Playwright gate when its current run passes; this PR's CI
must execute the after gate, separate typecheck, full unit suite and builds. The
author owns CI through green, then continues the final mapping and provider queue
without pausing for a new instruction. A fresh human-started independent review
of this legal/money/signing surface is required. The author does not merge or
deploy. The authorized reviewer/merger and consolidator close #205 only after its
required completion work is finished.
