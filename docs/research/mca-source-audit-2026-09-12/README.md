# MCA source provenance and version audit — 2026-09-12

**Fourteen of the sixteen saved text files match an identified official
publication. The two Virginia form extractions do not match the official form.**
Matching a publication does not establish that it is current: Connecticut needs
its 2026 supplement, Missouri has a 2025 amendment, and Florida has a 2024
amendment. Utah also disproves the repository's blanket claim that only Texas
requires content in the agreement.

This is the source audit authorized before
[ADR 0014](../../adr/0014-two-questions-every-clause-answers.md), against main
`0c440a396c9b5f5c9161538358fc08ff120fdc80`. It accounts for **all 16 existing
`.txt` files across 11 states** in
[`mca/sources`](../../../packages/bizrethink/mca/sources). It does not complete
the eleven-state agreement-requirements walk or classify the 211 current MCA
library records. No clause is approved by this audit.

The original sixteen files, source digests, verification dates and application
behavior are unchanged. Fresh evidence is stored here so a follow-up can update
the affected statutory inputs and conformity assertions explicitly.

## What is recorded

[`manifest.json`](manifest.json) has a separate entry for every saved file:

- Original path, byte count and SHA-256; the provenance actually recorded by the
  earlier session, including unknown original retrievals.
- Exact official URL requested, final URL, UTC retrieval timestamp, response
  SHA-256, identified publication/version and comparison result.
- A separate currency finding and the official pages used to assess it.
- Selection and normalization methods, comparison hashes and the hashes of the
  thirteen retained evidence files.

All successful retrievals below occurred on **2026-09-12**; exact times and
redirects are in the manifest. HTTPS certificate verification remained enabled.
Connecticut's CGA pages required the system curl trust store after Python's
certificate store rejected the issuer; TLS verification was not disabled.

An original retrieval that was not recorded remains **unknown**. Finding the
same document today establishes today's retrieval, not where an earlier agent
got it. A site's `Last-Modified` header is recorded separately from the law's
effective date.

## Every existing file

“Matches” below means the complete selected source body matches, after the
documented extraction/publication normalization. It does not mean that a few
labels or citations were found.

| Existing file | Earlier provenance recorded in repo | Official publication retrieved now and result | Currency finding |
|---|---|---|---|
| `CA-10CCR-900-956.txt` | Publisher identified September 8; original fetch unknown | [DFPI final PRO 01-18 text](https://dfpi.ca.gov/wp-content/uploads/sites/337/2022/06/PRO-01-18-Commercial-Financing-Disclosure-Regulation-Final-Text.pdf); matches | [DFPI index](https://dfpi.ca.gov/rules-enforcement/laws-and-regulations/california-financing-law-regulations-opinions-releases/) still links this final text; effective December 9, 2022. A consolidated CCR/current-amendment check remains open. |
| `NY-23NYCRR-600.txt` | Publisher identified September 8; original fetch unknown | [DFS adopted Part 600](https://www.dfs.ny.gov/system/files/documents/2023/01/rf_finservices_23nycrr600_text.pdf); matches | [DFS current regulatory-activity index](https://www.dfs.ny.gov/industry_guidance/regulatory_activity/financial_services) links the identical PDF and gives February 1, 2023 as effective date. The signature date is January 12. A consolidated NYCRR check remains open. |
| `CT-CGS-36a-861-872.txt` | README records CGA chapter 669 fetch September 7 | [CGA base chapter 669](https://www.cga.ct.gov/current/pub/chap_669.htm); all twelve sections match | Incomplete for current use without [2026 supplement](https://www.cga.ct.gov/2026/sup/chap_669.htm), which updates §§36a-868, 870 and 872. |
| `CT-DOB-Guidance.txt` | Publisher identified September 8; original fetch unknown | [DOB guidance, updated August 1, 2024](https://portal.ct.gov/-/media/dob/consumer-credit-division/commercial-financing-guidance-8-1.pdf); complete reading-order body matches | Official PDF recovered; current guidance-index linkage not established. Registration discussion predates the 2025 statutory changes. |
| `CT-DOB-Guidance.layout.txt` | Companion extraction; no separate fetch record | [Same DOB PDF](https://portal.ct.gov/-/media/dob/consumer-credit-division/commercial-financing-guidance-8-1.pdf); complete layout body matches | Same qualification as the reading-order file; not an independent authority. |
| `VA-Code-6.2-2228-2238.txt` | README records eleven Virginia Law Portal section-page fetches September 7 | [Official full chapter 22.1](https://law.lis.virginia.gov/vacodefull/title6.2/chapter22.1/); all eleven sections and histories match | Current published chapter compared; each section history cites 2022 c. 516. |
| `VA-Disclosure-Form.txt` | Imported from `lombard-contracts` September 6; original publisher retrieval unknown | [Official October 2022 form](https://ris.dls.virginia.gov/uploads/10VAC5/forms/Sales-Based%20Financing%20Disclosure%20Form-20220920152455.pdf), linked by [10VAC5-240](https://law.lis.virginia.gov/admincodeexpand/title10/agency5/chapter240/); **different** | The existing form cannot receive a new current-source verification stamp. See differences below. |
| `VA-Disclosure-Form.layout.txt` | Companion of the locally imported PDF | [Same official form](https://ris.dls.virginia.gov/uploads/10VAC5/forms/Sales-Based%20Financing%20Disclosure%20Form-20220920152455.pdf); **different** in text and visible layout | Same issue; neither extraction repairs the underlying document mismatch. |
| `TX-Fin-Code-Ch-398.txt` | Enrolled HB 700 URL and September 5 retrieval in header | [HB 700 enrolled](https://capitol.texas.gov/tlodocs/89R/billtext/html/HB00700F.htm); matches | All thirteen codified sections also match the [current official static chapter](https://tcss.legis.texas.gov/resources/FI/htm/FI.398.htm), excluding codifier histories. Effective September 1, 2025. |
| `TX-7TAC-86-310-313.txt` | Texas Register URL and September 9 retrieval in header | [July 3, 2026 adopted-rule publication](https://www.sos.state.tx.us/texreg/archive/July32026/Adopted%20Rules/7.BANKING%20AND%20SECURITIES.html); all four republished rules and certification footer match | Filed June 19, published July 3, effective July 9, 2026. Current codified-rule text was not retrieved from the regulator-linked JavaScript portal. |
| `GA-SB90-enrolled.txt` | Exact legislature document URL and September 7 retrieval in header | [SB 90 as passed, document 219440](https://www.legis.ga.gov/api/legislation/document/20232024/219440); complete bill matches | Enacted-source identity verified. Later O.C.G.A. amendment/codification currency has not been established by this audit. |
| `UT-Title-7-Ch-27.txt` | Imported from `lombard-contracts` September 6; original fetch unknown | [Legislature chapter PDF](https://le.utah.gov/xcode/Title7/Chapter27/C7-27_2022050420220504.pdf); complete body matches | [Current chapter index](https://le.utah.gov/xcode/Title7/Chapter27/7-27.html) selects this version. Despite the chapter's 2022 marker, §7-27-202 includes its 2024 amendment. |
| `FL-HB-1353.txt` | Publisher identified September 8; original fetch unknown | [CS/HB 1353 Engrossed 1](https://www.flsenate.gov/Session/Bill/2023/1353/BillText/e1/PDF); matches. Operative text also matches [enrolled version](https://www.flsenate.gov/Session/Bill/2023/1353/BillText/er/PDF) | Historical 2023 text; §559.9611(9) was changed by [chapter 2024-139 §3](https://laws.flrules.org/2024/139). |
| `KS-SB-345.txt` | Publisher identified September 8; original fetch unknown | [SB 345 as introduced](https://www.kslegislature.gov/b2023_24/bills/download/?apn=b2023_24/year2/ready_for_publication/sb_345/sb345_00_0000.pdf); matches. Operative text matches [enrolled version](https://kslegislature.gov/b2023_24/bills/download/?apn=b2023_24/year2/ready_for_publication/sb_345/sb345_enrolled.pdf) | All five current K.S.A. sections compared; only codification headings/reference and a Revisor marker differ. History: 2024 ch. 29, July 1. |
| `LA-Act-198.txt` | Publisher identified September 8; original fetch unknown | [HB 470 enrolled](https://www.legis.la.gov/Legis/ViewDocument.aspx?d=1421306); complete body matches | Operative text matches [Act 198](https://www.legis.la.gov/Legis/ViewDocument.aspx?d=1425126) and [current RS 9:3137.10](https://legis.la.gov/Legis/Law.aspx?d=1429292). This is the **2025** act. |
| `MO-SB-1359.txt` | Publisher identified September 8; original fetch unknown | [SB 1359 truly agreed to and finally passed](https://www.senate.mo.gov/24info/pdf-bill/tat/SB1359.pdf); complete omnibus bill matches | §427.300 was amended in 2025; use the [current Revisor text](https://www.revisor.mo.gov/main/OneSection.aspx?section=427.300) for current analysis. |

## Findings that change the next task

### Connecticut: the base volume alone is not the current statute

The stored file accurately reproduces the base volume. The CGA's
[2026 supplement](https://www.cga.ct.gov/2026/sup/chap_669.htm) incorporates
P.A. 25-115 §§21–23, effective July 1, 2025:

- **§36a-868:** a technical punctuation change removes the comma after
  “replevin”; the prohibition is still present. This is not a newly discovered
  permission to waive the recipient's rights.
- **§36a-870(c):** replaces the old annual-fee/September deadline language with
  registration expiration and renewal rules, including a November–December
  renewal window, December 31 expiration rules and a $1,000 registration fee
  plus other required charges.
- **§36a-872:** replaces the former penalties text with registration sanctions
  and commissioner-action provisions, including references to §§36a-50–52.

All three complete replacement sections and their histories are retained in
[`ct-2026-supplement-36a-868-870-872.txt`](evidence/ct-2026-supplement-36a-868-870-872.txt).
This is the supplement as published, not an unlabeled synthesized statute.
The disclosure guidance's matching bytes do not override these later statutory
changes. Product/source updates must consider existing obligation quotations as
well as source digests.

### Missouri: a historical enacted bill missed an amendment

The [2024 Revisor version](https://www.revisor.mo.gov/main/OneSection.aspx?section=427.300&bid=54951)
and [current version](https://www.revisor.mo.gov/main/OneSection.aspx?section=427.300)
differ in §427.300(4): the current version adds item (10), an exemption for the
specified premium-finance agreements offered or entered into by registered
premium finance companies. Items (8) and (9) receive the corresponding list
punctuation/conjunction changes. The remaining operative section text matches
between those two Revisor versions. Current history cites the 2025 amendments,
with an effective date of August 28, 2025.

Both complete versions are retained:
[`2024`](evidence/mo-427.300-2024.txt) and
[`2025`](evidence/mo-427.300-2025.txt). The original omnibus bill is authentic
historical evidence; its continued availability does not make it current code.

### Florida: version identity and statutory currency are separate issues

The stored file is the Engrossed 1 publication, not the enrolled publication.
Its operative text matches the enrolled act after removing publishing apparatus
and PDF whitespace artifacts. However,
[2024 chapter 139 §3](https://laws.flrules.org/2024/139), effective July 1, 2024,
replaced the “depository institution” definition in §559.9611(9). The replacement
describes charter jurisdiction, authority to transact business in Florida and
deposit/share insurance. That definition matters to the act's scope; it cannot
be treated as a cosmetic publication change.

The six current sections, [§§559.961–9615](evidence/fl-559.961-9615-2026.txt), were
compared with the enrolled act. Apart from definition (9), they match after
documented publication/quote/whitespace normalization. The
[amending act PDF](evidence/fl-chapter-2024-139.pdf) is retained; pages 3–4 were
visually checked so struck text was not mistaken for operative law.

### Virginia: the source form itself differs

The [official form](evidence/va-official-disclosure-form.pdf) is linked from the
Forms section of [10VAC5-240](https://law.lis.virginia.gov/admincodeexpand/title10/agency5/chapter240/)
and carries **Eff. 10/2022**. Both pages were visually compared with the original
PDF in `lombard-contracts`; both extraction modes were compared too.

| Location | Existing local form | Official linked form |
|---|---|---|
| First monetary label | “Total Amount Financed” | “Total Amount of the Sales-Based Financing” |
| Disbursement formula | Uses the shorter first-row label | Uses the official first-row label |
| Estimated number of payments | No range qualification | Includes a reasonable-range qualification limited to variable payment schedules |
| Payment-schedule left column | Separate Fixed/Variable boxes | Those separate boxes are absent |
| Version/layout | No effective marker; disclosure date at top left | October 2022 marker; disclosure date in right column |

The replacement PDF and both text extractions are retained together. Do not
update the old form's digest/date as if these were the same document. A follow-up
must reconcile the prescribed spec, labels, layout and its conformity checks.
This audit has not changed the rendered form or assessed every rendered label.

### Utah: the “Texas only” inference is unsupported

The [current linked Utah chapter PDF](https://le.utah.gov/xcode/Title7/Chapter27/C7-27_2022050420220504.pdf)
matches the saved body, including §7-27-202 as amended in 2024. Its subsection
(3) expressly requires the agreement to describe how variable payments are
calculated and what circumstances can make them vary. Thus the broad statement
in the old source README/Texas rule preface that other states are satisfied by
a separate disclosure is false.

This establishes an agreement-content duty; it does not establish that Utah
prescribes our exact clause wording. That distinction is central to ADR 0014's
`compelled` versus `implements` model. No classification is assigned here.
The source README is corrected; the Texas `.txt` preface is preserved as part
of the old digest input and must be read subject to this correction.

The Utah chapter's **Effective 5/4/2022** marker is not proof that each section
is frozen in 2022. The current index selects the same oddly dated filename, and
§7-27-202 expressly carries its 2024 amendment history.

## Comparison method and limits

PDF comparisons used the same `pdftotext` reading-order or `-layout` mode as the
stored source. Repository provenance prefaces were excluded at their explicit
separators. Matching original-publication comparisons collapsed whitespace;
they did not rewrite substantive text or discard words/numbers.

For the separate bill-to-enrolled/current-code checks:

- Florida and Kansas bill line numbers were removed only from the publishing
  margin of numbered PDF lines. Kansas enrolled page headings/certification and
  Florida publication headers/footers were excluded. Operative enactment text
  was compared before moving on to code sections.
- Whitespace was removed for those comparisons because extraction can split a
  word internally or wrap `open-end`. Digits, punctuation and substantive
  hyphens were retained. Florida code comparisons additionally mapped curly
  quotes/apostrophes to the straight equivalents printed in the bill.
- Kansas codification adds section titles, changes the bill's “sections 1
  through 5” reference to K.S.A. 75-783 through 787, and adds the `(iii)*`
  annotation. Its [Revisor note](https://www.ksrevisor.gov/statutes/chapters/ch75/075_007_0083.html)
  says that designation should have been `(B)`. The note and printed marker are
  retained in [the current-code evidence](evidence/ks-75-783-787-current.txt);
  the anomaly was not silently repaired in source text.
- Texas code comparisons excluded the codifier's repeated enactment histories.
  The enrolled source's accidentally included CSS line was excluded from the
  original-publication comparison. Texas rule extraction joined the section
  sign to each of the four headings before comparison.
- Louisiana's numbered bill/act bodies were compared with each other and with
  the current code; bill captions, signature blocks and codifier history were
  excluded from that operative-body comparison.

The manifest records 46 relevant document/index retrievals. Only the Virginia
form and Florida amending-act PDFs are duplicated as raw response bytes here;
the other raw HTML/PDF response hashes identify the downloads inspected, not an
immutable public archive. Selected statutory/form text is retained in the
evidence directory. None of those snapshots is an application source input.

HTTP 200 alone was not accepted as proof: a guessed Connecticut provider page
redirected to an error page, old Texas code/PDF URLs returned an application
shell, and the Texas rules portal returned no codified text. These failed or
nontext routes are recorded separately from successful comparisons. No missing
page is interpreted as evidence that a legal requirement does not exist.

## Targeted follow-up before the ADR 0014 backfill

1. **Refresh the four affected source areas deliberately:** Connecticut's
   supplement and obligation quotations, Missouri's amended exemption,
   Florida's amended definition, and Virginia's prescribed form. Use the saved
   evidence and exact URLs; update digests and verification metadata only with
   the associated conformity/behavior changes reviewed.
2. **Close the stated currency/coverage gaps:** verify Georgia's later code
   history; consolidated California/New York regulations and their underlying
   statutes; current Connecticut guidance linkage; and the current Texas
   codified rules, including provisions outside the four republished sections.
   Utah's referenced implementing rules and other missing authorities belong
   in the agreement-requirements walk too. These are targeted gaps, not a claim
   that the matched official publications are fabricated or unusable history.
3. **Perform the eleven-state agreement-requirements walk:** record each
   relevant section, its applicability, whether it regulates conduct, requires
   a separate disclosure, requires agreement content, mandates exact wording,
   or prohibits a term. A matching source is the input to this review, not its
   conclusion. Silence in the current source collection is not evidence for
   `discretionary`.
4. **Then implement ADR 0014** against the current 211-record library with
   clause-level citations/reasons. The ADR's 219 count describes an earlier
   library state. Its accepted model and draft/null-author status remain intact.

Validation for this documentation change is limited to complete file coverage,
whole-body comparisons, evidence/source hashes, local links and the changed
diff. Application browser tests and broad local builds/typechecks were not run;
GitHub CI remains the completion gate under the agreed session workflow.
