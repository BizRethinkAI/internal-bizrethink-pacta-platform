# MCA substantive review before catalogue mapping

**The unified MCA design supports the intended interview → reusable provider
template → completed transaction workflow. The current content is not yet ready
for final mapping or provider release.** Several seemingly structural records
contain operative protections, and some ancillary documents still contradict
the revised FRPA. Resolve those dependencies before turning the existing labels
and fields into interview questions.

This is the research deliverable for [task #201](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/201),
authorized by the repository owner on September 13, 2026. It applies an MCA and
alternative-finance legal-content review framework. It is analysis, not approval
by licensed counsel, certification of enforceability, or the fresh independent
review required for this author's earlier correction PRs.

## What was reviewed

Initial reading baseline: merged main `1813b1d72fb231593ddcb2cb0b2a55054ac7f040`.
PR #187 merged during the review; integrated base is
`7f178f8e4f8242a4abe2ca2ba4864d3ee7e16492`. All 211 decoded clause-body hashes
still match the initial review; the changed state-rider metadata cites §22806(b).
Every body in the six-instrument corpus was read in document/section order:

| Instrument | Current records read |
|---|---:|
| Future Receivables Purchase Agreement | 108 |
| Equipment Lease | 30 |
| Subscription | 30 |
| ISO Partner Referral Agreement | 28 |
| Split Funding Letter | 7 |
| Permission to Release | 8 |
| **Total** | **211** |

All **14** changed bodies at pending PR #194 head
`174a45b6513772528a381f8aae63bcce9b3766e6` were also read as separate candidates.
The [coverage register](coverage.md) and [machine-readable record](coverage.json)
identify every body, its source revision, file/line and hashes, review
observations, related findings, gates and historical review references. A
historical “implemented” finding is not approval of a later rewritten clause.

The review considers purchase characterization, actual reconciliation,
default/remedies, guaranties, security, fees, renewals, equipment ownership and
payments, information/report/contact permissions, signatures, provider roles,
processor control, broker duties and their disclosure dependencies. It reads
the instruments together. An equipment payment guaranty is not automatically an
MCA repayment guaranty; it becomes relevant through its actual scope and links.

The eleven-state source work reuses the complete September 12
[agreement-requirements review](../mca-agreement-requirements-2026-09-12/README.md)
and [source audit](../mca-source-audit-2026-09-12/README.md), checks current official
publications and adds targeted primary authority. The [source ledger](source-ledger.md)
states which sources were actually refreshed and which limitations remain.
This is not another complete review of every rendering, numeric calculation or
non-MCA law in those states, and it is not a fifty-state survey.

## Conclusions that affect the next work

1. **Content function must precede catalogue assignment.** A preamble, field
   group or execution block can establish liability, funding conditions or
   privacy protections. Keep the separate-catalogue design; refine PR #200's
   provisional map after these effects are understood. The 18 initial mapping
   cases are not an exhaustive inventory of embedded subclauses/headings.
2. **Repair the funding and identity contract before interview design.** The
   funding grid retains deferred-equipment/payback language and a nonportable
   cost formula. It omits several bindings required by the prose. Required full
   SSN fields conflict with the FRPA's separate secure-collection direction.
3. **Review equipment as a coordinated product.** Purchase option, automatic
   title, return, charges, default, security and guaranty provisions must agree.
   PR #194 corrects consents and acknowledgment; it does not correct these
   economics/remedies. Lease and Subscription classification must determine the
   relevant disclosure, rather than inheriting one table because they look alike.
4. **Provider configuration needs actual business facts.** The current library
   still assumes Florida LLCs, a particular ISO portal/venue, net card receipts
   and processor split. Gross/ACH/funder-state options lack complete alternatives.
   Lombard's net pricing base remains unconfirmed in the recorded profile;
   Circular Payments has no verified profile in this corpus.
5. **A template cannot establish operational compliance.** Monthly
   reconciliation, refunds, collection caps, processor acceptance, report
   authority, registrations and disclosure timing need evidence and workflows.
   Recent New York appellate decisions show why actual conduct and the entire
   bargain matter; they do not establish that all MCAs are loans or that a
   particular checklist guarantees a true sale. See [MCA-R05](findings.md#mca-r05).

The [18-item findings register](findings.md) separates confirmed source
inconsistencies, drafting judgments, known pending corrections and operational
prerequisites. It does not propose eighteen separate PRs.

## Existing work and source limits

| Existing work | Treatment in this review |
|---|---|
| [PR #187](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/pull/187) — Utah/California | Merged into the integrated base during this review; citation/source correction only, all clause bodies unchanged. Original PR head: `e5fbec884b3c02cb02e3e32815fa5d24022310cc`. |
| [PR #190](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/pull/190) — Virginia | Pending correction to the prescribed form; the official PDF was fetched again and matches the prior raw hash. Recorded head: `eb537ac395fc16fcb1e30ac0e50f8e7908c7c3ad`. |
| [PR #194](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/pull/194) — ancillary consents | Fourteen complete candidate bodies read; their independent review, merge and actual template/operational implementation remain separate. |
| [PR #200](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/pull/200) — unified MCA design | Architecture remains useful; initial catalogue classifications remain provisional. Recorded head: `4c1053696129c004c137ac8f863373f7449c0722`. No existing ADR is edited. |
| Processor-owned Split Funding Letter | Owner expressly deferred actual form reconciliation to a separately assigned session. The base/cap/fees/stop conflict remains open; this review obtains no current processor form or acceptance. |

California's consolidated rule publisher still prints August 28, 2026 currency.
New York's linked adoption PDF is still the 2023 edition; the previous register
search extends through September 9, 2026. Connecticut statute refresh attempts
failed this time, so the September 12 base/supplement evidence remains the stated
source. Georgia's full current-code body and Missouri's rule-dependent
commencement history remain unresolved. These limits must not disappear behind
a “source unchanged” or “conformity passed” badge.

The January 2026 FCC order adds a specific delayed-effect qualification for
cross-category consent revocation; it does not delay all revocation obligations.
See [MCA-R17](findings.md#mca-r17). No blanket legal-currentness status is granted.

## Recommended sequence

Complete the existing correction PR review/merge path, preserving the assigned
#187/#190 integration owner and checking #190 against merged #187. Next address
funding/identity bindings and the coordinated equipment issues in bounded changes.
Keep the external processor
dependency with its assigned review. Then resolve the catalogue map, define the
supported provider interview and its transaction-data contract, and implement
template assembly with the required checks for the behavior being changed.

The [interview readiness note](interview-readiness.md) explains the four distinct
inputs and how the package should remain coherent. It is a design input, not a
new runtime architecture decision, an approved migration, or authority to
implement unsupported business options.

Reuse this review and its dated source evidence for those tasks. Repeat a
targeted source check for an identified gap, conflicting authority, material
currency concern or newly supported product/state; a PR merge alone does not
justify another complete source walk.

This PR changes only research documentation, evidence and its own handoff.
It changes no clause, source file used by the application, approval state,
database, interview, template or production record. Validation is documented in
the [handoff](../../state/inflight/docs-mca-substantive-review.md); live PR/CI
status belongs on task #201 and the PR. The author stops after green applicable
CI. Review, merge and state consolidation remain with the authorized completing
sessions; the task stays open until that scope is finished.
