# ADR 0014 — clause metadata assessment

Assessed on **2026-09-12** against the **211 live source records** on merged
research baseline `42394e5f3` (#179), not the historical 219-record count in
the ADR. All six instruments were read, including both equipment contracts and
the two ancillary letters. Every record now explicitly stores `whyThisClause`
and `variance` beside its slug. No missing-citation default assigns a class.

| Legal purpose | Records |
|---|---:|
| Compelled wording | 1 |
| Implements a legal duty in our own wording | 35 |
| Discretionary commercial drafting | 175 |

| Variance | Records |
|---|---:|
| Offered | 6 |
| Fixed: compelled | 1 |
| Fixed: misattributed | 32 |
| Fixed: no alternative | 71 |
| Fixed: unwritable | 1 |
| Fixed: load bearing | 100 |

These are **drafting assessments of purpose and available wording**, not
approvals, enforceability opinions or a certification that every limb satisfies
its cited authority. An `implements` label can identify the duty an unfinished
draft is intended to address. A discretionary contract term remains subject to
mandatory law. All 211 source records remain draft with null authors.

## Source trail

The [eleven-state requirements walk](../mca-agreement-requirements-2026-09-12/README.md),
its [section register](../mca-agreement-requirements-2026-09-12/section-register.md)
and [source ledger](../mca-agreement-requirements-2026-09-12/source-ledger.md)
are the primary state-financing basis. They identify fetched URLs, dates,
publisher versions, saved evidence and precise applicability limits. The
historical [#174 source audit](../mca-source-audit-2026-09-12/README.md) remains
unchanged. Neither a matching hash nor silence in those publications establishes
that a contract clause is discretionary.

This directory adds targeted primary-authority reading for the actual clauses:
consumer reports, communications consent, data disposal and security, security
agreement formalities, partial-assignment instructions, warranty exclusions,
electronic execution and deceptive marketing. The [manifest](manifest.json)
records eleven raw HTTP attempts and ten retained evidence files, including
exact source URLs, retrieval times and hashes. HTTP 200 access-challenge pages
are explicitly classified as challenges, not successful statute retrievals.
FTC/eCFR text read through the indexed browser tool is retained as labeled
extraction, not misrepresented as a raw publisher download.

| Authority read | Publisher and retained evidence | Assessment boundary |
|---|---|---|
| FCRA §604(a)(2), (f); §615(a); §623(a), (b) / 15 USC §§1681b, 1681m, 1681s-2 | [FTC March 2026 compilation](https://www.ftc.gov/system/files/ftc_gov/pdf/fcra-march-2026.pdf); [selected text](evidence/fcra-web-extract.txt) | Written individual instructions are one permissible-purpose route; a commercial relationship does not automatically supply authority for every individual's report. Adverse-action and furnishing duties depend on the actual consumer/report use. The FTC describes its compilation as a convenience, not a substitute for the U.S. Code. |
| 47 CFR §64.1200(a)(1)–(3), (10)–(11), (f)(9) | [eCFR](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200); [selected text](evidence/cfr-web-extract.txt) | Covered calling methods require the applicable consent; the written-consent definition includes the number, authorization and optional-purchase disclosures. Reasonable revocation cannot be limited to an exclusive method. Title 47 displayed currency to September 10, 2026. No opinion on a particular calling system or every state recording law. |
| 16 CFR §682.3 | [eCFR](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-F/part-682/section-682.3); [selected text](evidence/cfr-web-extract.txt) | Reasonable disposal measures apply to consumer-report information held for business purposes. This is not a claim that GLBA consumer-privacy rules govern every commercial merchant record. Title 16 displayed currency to September 9, 2026. |
| Fla. Stat. §501.171 | [Florida Senate, 2025 edition](https://www.flsenate.gov/Laws/Statutes/2025/501.171); [text](evidence/fl-501-171.txt) | Covered entities' security and breach-notice duties for covered personal information. The contractual purpose and no-sale restrictions extend beyond the specific statutory minimum. |
| UCC §§9-203, 9-509; Florida enactments §§679.2031, 679.509 | [Florida Senate §679.2031](https://www.flsenate.gov/Laws/Statutes/2025/679.2031), [§679.509](https://www.flsenate.gov/Laws/Statutes/2025/679.509); [attachment text](evidence/fl-679-2031.txt), [filing text](evidence/fl-679-509.txt) | Signed security-agreement and authorized-filing requirements for the selected secured structure. The 2025 Florida enactment is an example, not an eleven-state UCC comparison. The applicable enactment and conflict rules govern each deal. Texas MCA filing duties are cited on the FRPA only, not the equipment contracts. |
| UCC §9-406; Fla. Stat. §679.4061(2)(c) | [Florida Senate](https://www.flsenate.gov/Laws/Statutes/2025/679.4061); [text](evidence/fl-679-4061.txt) | The account debtor can reject notification demanding a partial periodic payment. A split agreement is commercial implementation of a chosen collection structure; this rule does not prescribe our processor letter. |
| UCC §§2-316, 2A-214; Fla. Stat. §§672.316, 680.214 | [Florida Senate §672.316](https://www.flsenate.gov/Laws/Statutes/2025/672.316), [§680.214](https://www.flsenate.gov/Laws/Statutes/2025/680.214); [sale text](evidence/fl-672-316.txt), [lease text](evidence/fl-680-214.txt) | These constrain an elected warranty exclusion; they do not require a provider to disclaim warranties. Equipment warranty choices are discretionary. Conspicuousness and enforceability remain drafting/layout review questions. |
| 15 USC §7001(a), (b) | [Office of the Law Revision Counsel](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section7001&num=0&edition=prelim); [text](evidence/esign-7001.txt) | Electronic legal effect does not compel a party to agree to electronic execution. Our agreement-to-use clauses are discretionary. This does not displace consumer-consent requirements when those actually apply. |
| 15 USC §45(a)(1)–(2) | [Office of the Law Revision Counsel](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section45&num=0&edition=prelim); [text](evidence/ftca-45.txt) | The ISO marketing and compliance covenants implement the unfair/deceptive-practice prohibition within FTC jurisdiction. They do not establish universal MCA-specific AML or licensing duties. |

## Classification decisions

**One compelled record.** `frpa.texas-occc-notice-7-25` cites 7 TAC
§86.310(d), states when Chapter 398 contract-for-services coverage applies,
and is fixed because that notice must be conspicuous. Its existing Texas gate
remains. The corpus test pins this positive claim to that exact slug.

**Agreement methodology is implemented, not transcribed.** The net-receipts
definition, holdback explanation and actual-percentage collection rule together
address GA §10-1-393.18(e)(4), UT §7-27-202(3), KS §75-784(b)(5) and MO
§427.300.3(2)(e). Those states require agreement methodology; they do not
prescribe this prose. Their positive state scope is recorded in
`appliesInStates`; that field is not a selection gate.

**Other implemented state duties.** The FRPA identifies Texas contracted-fee
and third-party-payment protections, Connecticut's offer hold, California/New
York redisclosure and broker controls, New York assignment/compensation
notices, and Virginia's court/arbitration protections. The general state rider
and judicial-service rule identify the relevant prohibited-waiver duties.
The ISO disclosure procedure implements duties using its elected direct-delivery
route; the universal ban on ISO offer communications is the commercial channel
design, not a statement that the regulations prohibit compliant broker offers.

**Commercial terms were classified by their actual function.** Price and fee
amounts, recourse allocation, warranties, indemnities, confidentiality periods,
execution recitals, optional cancellation, equipment terms, commission timing
and processor charges are contractual bargains. Their statute-related savings
language does not alone turn them into prescribed agreement content. The
three-day cancellation right is not Connecticut's three-day offer hold; a
prepayment disclosure requirement does not mandate a discount or a fee.
Reconciliation is integral to the authored contingent-percentage purchase,
without claiming CA/NY definitions require every MCA to use this reconciliation
clause or establish a judicial loan-characterization safe harbor.

**Mixed clauses retain one classification.** Where a clause affirmatively
implements a specific duty, the citation identifies that duty and its scope;
it does not claim all of the clause's commercial extensions are statutory.
Generic references to applicable law do not substitute for an identified duty.

## What “offered” means in this backfill

The current six offered records form these complete groups:

| Fact | Clause alternatives | Values tested |
|---|---|---|
| `concurrentPositions` | `frpa.position-and-cascade-of-collections-4-15`, `frpa.single-active-position-4-15` | `true`, `false` |
| `guarantyScope` | `frpa.events-of-default-6-1`, `frpa.full-performance-events-of-default-6-1` | `none`, `limited-conduct`, `full-performance` |
| `disputeResolution` | `frpa.jury-trial-waiver-7-10`, `frpa.arbitration-7-26` | `courts`, `arbitration` |

Exactly one offered record is selected for every value. The remaining guaranty,
class-proceeding and counterclaim provisions follow the chosen structure; their
fixed notes say so. Metadata does not split their bodies or alter their gates.

The two renewal settlement records remain usable under their existing gates,
but `renewalModel: 'none'` selects neither. Labeling that pair an exhaustive
three-value group would contradict the live predicates. The `fixed` notes
record the boundary. Equipment, broker and report-use omissions likewise do
not acquire invented opposite clauses merely to pass a partition assertion.

The six reasons identified in ADR 0014 are recorded and pinned: Merchant versus
Buyer at §5.16, separate questions at §4.11 and §4.3, identical §4.1 wording,
missing funder-state input at §7.5, and the indispensable collection mechanism
at §2.3. “Fixed” means the available wording in this corpus; it does not mean a
commercial alternative is prohibited or can never be authored.

## Migration and verification

- `McaClause` requires both fields; all 211 authored records explicitly answer
  both questions. No runtime default silently labels an unassessed clause.
- The staff and counsel payloads carry the answers. The two existing review
  pages render them beside each clause, using a shared pure description helper.
- Both fields replace `requiredBy` in the approval fingerprint. Previously
  stored approvals no longer cover this new review context. Review-link hashes
  also move, including dependent FRPA context in ISO review links. No database
  record is overwritten, and no approval is automatically migrated.
- State scopes were expanded where an identified state duty supports the
  classification. Existing attorney-admission checks consequently use the more
  explicit scopes. National duties and UCC references are not falsely scoped
  only to the Florida enactment used as an example.
- Clause bodies, fields, slugs, versions, reference identities, section order,
  inclusion predicates, source provenance, draft status and examination records
  retain their pre-backfill values. No stored merchant template changes.
- TDD observed five initial invariant/fingerprint failures and six initial
  counsel-payload failures before implementing the corresponding behavior.
  The shared text helper was also introduced after its missing-module failure.
  Focused checks cover all six instruments, 211 metadata records, positive
  Texas wording, the four methodology authorities, rejected gates, complete
  offered groups, counsel payload isolation and approval staleness.

## Boundaries and next drafting work

The eleven-state report's GA full-current-body and Missouri commencement-rule
gaps remain. California/New York publisher dates remain those documented in
that report. The targeted Florida UCC examples are not an eleven-state UCC,
contract, usury, bankruptcy, guaranty, privacy or procedural-law opinion.

Existing drafting mismatches remain visible in the source corpus: the ancillary
split letter still describes additional fees and a stopping rule different from
the FRPA's controlling instruction; parts of the equipment and release forms
still contain broader report-use, contact-consent or signer-capacity language.
Their statutory-purpose labels do not resolve those defects. A separate
substantive rewrite must reconcile them with the FRPA and the authority above.

The unauthored ACH collection choices, gross-settlement definition, funder-state
venue input and `processorSplitAccepted` deal-fact move remain separate work.
No interview, new commercial alternative, guaranty renumbering, stored-template
rebuild, prescribed-form correction, source-content citation fix, merge or
deployment is part of this backfill.
