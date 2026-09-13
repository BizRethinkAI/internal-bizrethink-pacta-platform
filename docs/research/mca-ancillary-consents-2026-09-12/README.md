# Permission to Release and equipment consent correction

This implements Shwet's assignment in [task #192](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/192): correct the ancillary documents' report-use, contact-consent and signer-capacity mismatches. Fourteen existing clauses become version 2: all eight Permission to Release records, plus the report, communications and acknowledgment clauses in each equipment agreement. The library still has **211** records. All remain **draft, with no named author**.

This corrects library drafting. It does not approve the wording, rebuild a merchant PDF, establish that an individual actually consented, or migrate a stored template.

## Owner decision: processor letters remain for a future review

On September 12, 2026, Shwet explained that **Split Funding Letters are processor-specific and we often have limited or no ability to change them**. Their presence in this library is not authority to rewrite a processor's form. The letter, its source capture, its seven clause records and its findings remain unchanged.

The known contradictions remain open. `split-funding.split-funding-instruction` treats the Purchased Amount as informational, permits further withholding for fees, and stops on a written instruction/confirmation. The FRPA limits what its purchased-receipts collection instruction can collect and specifies its Completion Threshold and stopping duties. The letter's collection base and separately charged processor fees also need transaction-specific reconciliation. Processor fees owed under a separate merchant-processing contract must not be confused with additions to the FRPA's Purchased Amount.

A **future review session**, separately assigned, must obtain the actual processor-required version, verify its accepted collection base, cap, fees and stopping procedure, and determine a workable resolution with the FRPA and processor. It must not assume that a priority clause makes the processor accept different instructions or that software can cure a contractual contradiction. The deferral is not a waiver, approval or disposition of a finding. No processor negotiation, acceptance or amendment is claimed here.

## Sources and what was verified

The [manifest](manifest.json) records the exact starting commit, four unchanged source inputs, two reused authority extracts and the before/after body hashes for every changed clause. Earlier evidence and manifests are not edited.

| Input | Location and verification |
|---|---|
| Original release | `mca/clauses/source-documents/Lombard_Permission_to_Release_v1.txt`; header identifies `lombard-contracts` commit `7b8e61c3c1c9fa02ff4a98f3e4d477132066008d` and DOCX hash `0daa7a28cfd484b2e6208303f2ebd302b4539d8d57f847f1d74a04dfa81d1f27` |
| Equipment sources | `Lombard_Equipment_Lease_Agreement_v1.txt` and `Lombard_Subscription_Agreement_v2.txt` in the same directory; their headers identify original source revisions and DOCX hashes |
| Historical findings | The unchanged `review-register.json`; original dispositions are evidence of those reviews, not review of these new bodies |
| FCRA | [FTC March 2026 compilation](https://www.ftc.gov/system/files/ftc_gov/pdf/fcra-march-2026.pdf), §§604(a)(2), (f), 615(a), 623(a), (b); [retained text](../mca-clause-metadata-2026-09-12/evidence/fcra-web-extract.txt) and original [retrieval manifest](../mca-clause-metadata-2026-09-12/manifest.json) |
| Calling consent | [47 CFR §64.1200](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200), (a)(1)–(3), (10)–(11), (f)(9); [retained text](../mca-clause-metadata-2026-09-12/evidence/cfr-web-extract.txt), same manifest |

The retained FCRA extraction is 28,153 bytes, SHA-256 `06761765ba3a72b9c3f847dd8ce2d945f7e1ae10e4e34f0ff71bbc40f1b16c4c`. The CFR extraction is 36,618 bytes, SHA-256 `14e00e002de267bec65bfac32981a700e876de4929c4cec8d499d3e010a9a3cd`. Both match the existing manifest. They are labeled browser-tool extractions, not raw publisher responses.

The official FTC PDF and eCFR page were opened again on September 12. The latter displayed Title 47 currency to September 10, 2026. Direct U.S. Code attempts for §§1681b and 1681m returned 403; they are recorded as failed access, not verification. The FTC expressly describes its compilation as a convenience rather than a substitute for the U.S. Code. This work does not claim a complete post-publication statutory, FCC-order or state-law survey. The drafting requires applicable law's consent, timing and notice protections and does not codify a universal calling exemption or deadline.

The existing FRPA drafting is the contractual comparison: Financial Condition, Transaction History, Protection of Information, Communications, and Exhibit C. It is not substituted for primary authority. Its source records and text are unchanged.

## Substantive changes and decisions

| Area | Previous defect | Revised boundary |
|---|---|---|
| Business information | Access for any program/agreement and continuing qualification | Identified transaction; proportionate underwriting, servicing, reconciliation and suspected-diversion purposes within the FRPA |
| Release's individual reports | Periodic pulls, broad collection/review purposes and presumed guarantor authority | Only the actual individual signer; one initial underwriting report before funding; defined expiry and revocation of unused instructions |
| Equipment reports | Continuing authority for one or more reports, without a stated purpose or ending | Equipment provider's own identified transaction and limited-guaranty underwriting; one initial report before acceptance; no grant to the receivables funder |
| Adverse action | An incomplete “upon request” description | Applicable notice without a prior request; agency identity/contact, its nondecision role, free-report/60-day and dispute rights, and required score disclosures |
| Furnishing | Reporting language not tied to the limited guaranty | Applicable accuracy/correction/dispute duties; no reporting an unowed equipment payment as the individual's personal debt |
| Communications | Bundled servicing/marketing consent, discovered numbers and another person's purported consent | Obtain consent from the person entitled to give it; separate optional marketing permission; reasonable revocation methods and required recording consent |
| Signature capacity | Missing individual signature deemed a guaranty; equipment acknowledgment adopts all payment terms | Separate capacities; no guaranty created by the release; equipment individual signs only the existing limited-guaranty obligations |
| Duration and sharing | Open-ended reliance and a broad liability release | Defined endings, no new access from retained records, limited recipients and preserved claims/rights |

**One initial report is an authored scope choice**, consistent with the FRPA's rejection of recurring/open-ended pulls. It is not a statement that FCRA permits only one report or requires written instructions for every statutory permissible-purpose route. A later proposed report needs fresh specific instructions and its own lawful purpose under this wording. That choice, expiry on the initial decision, and the prospective-revocation provisions are explicit independent-review items.

Marketing consent remains an available separate election. This work does not silently consent for anyone or invent an affirmative marketing-consent form. An equipment provider is a different legal recipient from the receivables funder, so `consumerReportPulled` does not become a gate that grants or revokes its permissions. Existing clause/instrument gates remain unchanged.

The report instructions and execution acknowledgment cannot create a payment duty excluded by the existing equipment guaranty. Its operative economic limits, payment terms, fees, defaults, title rules and five declared equipment/subscription divergences are unchanged. This is not a full redraft or legal clearance of the equipment agreements.

## The signature finding that must not be repeated as current fact

The retained release's last table **already contains** an r2 individual signature, printed-name `«10»` and date, alongside the r1 merchant signature. The older missing-line finding was marked implemented. That does not cure the still-current fallback saying an absent separate signer is deemed the FRPA guarantor, and it does not prove the generated PDF or production recipient mapping is correct.

The new draft removes that fallback and distinguishes the individual report subject from a guarantor. Historical finding IDs and dispositions remain unchanged: rewriting a clause does not authorize us to declare a historical finding reviewed, rejected or closed. Its existing `examinedBy` records describe earlier text, not independent approval of the version-2 bodies.

## Regression and source-history handling

Before implementation, **25 new assertions failed and seven detector controls passed**. The tests exercise affirmative limits and reject the original grants across all three revised instruments. The controls prove the negative detectors recognize actual old wording; the tests do not certify legal sufficiency or actual consent.

The first shared-consumer run caught “FCRA Section 615(a)” as a stored internal citation. It is now written as the statute citation “FCRA §615(a)” without weakening the numbering guard.

The legacy source remains intact. `permission-to-release-legacy.fixture.json` captures its eight pre-rewrite clause records from the exact base. The letter coverage test still requires every legacy source line to be accounted for using that snapshot, while the new draft must retain all eight identities and satisfy the new consent boundaries. This follows ADR 0012: preserving source evidence must not require new drafting to reproduce the old defects. No failing test is skipped. The equipment twin checks still require agreement without a new divergence or vocabulary exception.

Body/version changes move approval and review-link fingerprints; no approval row is migrated. Publication checks still reject these unnamed-author drafts if someone attempts to promote them. Final focused counts and exact-head CI evidence are in the branch note and task/PR.

## Follow-up for review and actual templates

Shwet starts one fresh independent legal-surface review of this PR. Review the one-report scope, expiry/revocation, correct named recipient, adverse-action rights, limited-guaranty boundary, marketing separation and all three instruments together.

A separately assigned template task must rebuild the actual documents, label merchant and individual capacities correctly, bind the independent signature/date/identity fields, identify the transaction and reporting agency before signature, and deliver the complete form and executed copy. It must verify that a missing individual signature grants no individual report authority and that neither signature creates an unintended guaranty. Where the same person signs twice, each capacity must be explicit; multiple individuals require their own instructions. Existing r2 markup or a DOCX filename is not evidence of correct live routing.

Operational follow-up must enforce report counts, purposes, expiry and revocation; required notices and dispute handling; and separate consent/recording controls. Text tests do not implement those systems. Stored templates, the separate contract repository, production records, processor forms and statutory disclosure corrections are outside this PR. The library remains unavailable for unapproved merchant publication.
