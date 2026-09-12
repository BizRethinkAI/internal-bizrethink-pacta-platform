# Virginia prescribed-form correction

The MCA checking library now uses the official **October 2022** Virginia
Sales-Based Financing Disclosure Form. The previous locally imported form was
different. Its original rendered specimen is preserved and now produces four
specific row-text findings instead of a clean result.

This is the Pacta source/specification correction assigned in
[task #189](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/189).
It does not claim to repair a merchant PDF, replace a stored template or enforce
the provider's disclosure/signature workflow. Those boundaries follow
[ADR 0008](../../adr/0008-mca-is-two-surfaces-not-one.md).

## Sources and verification

The [source audit](../mca-source-audit-2026-09-12/README.md#virginia-the-source-form-itself-differs)
already retained the complete official PDF, both text extractions and the
implementing rules. This implementation verifies their recorded hashes and
reuses them. The audit and later requirements-review artifacts are unchanged.

| Authority | Exact official location | Recorded retrieval |
|---|---|---|
| Prescribed form | [Virginia RIS PDF](https://ris.dls.virginia.gov/uploads/10VAC5/forms/Sales-Based%20Financing%20Disclosure%20Form-20220920152455.pdf) | `va-form`, `2026-09-12T08:42:05.055077+00:00`, response SHA-256 `146da959abc2581a47fd9839da3771630bc63a0b915a5596cd8a2d4941e18b29` |
| Form authority and implementing rules | [10VAC5-240, complete chapter](https://law.lis.virginia.gov/admincodeexpand/title10/agency5/chapter240/) | `va-rules`, `2026-09-12T08:39:56.759637+00:00`, response SHA-256 `9687fec38c67acea3c5fb4331e1e89c94ada3cc877cdf569436e80a3b98e9479` |

The [manifest](../mca-source-audit-2026-09-12/manifest.json) distinguishes raw
response hashes from extraction hashes. The active
[PDF](../../../packages/bizrethink/mca/sources/VA-Disclosure-Form.pdf) is byte-for-byte
identical to the retained official response. Both active `.txt` bodies are the
complete corresponding audit extractions, with new editorial retrieval headers.
The four rule sections and histories in `VA-10VAC5-240.txt` are retained from the
audit's complete page-text capture, excluding navigation and its Forms/footer block.

On **September 12, 2026**, the implementing session opened the current official
chapter and followed its Forms link to the same October 2022 PDF. Both retained
PDF pages were rendered with Poppler and visually inspected at 1800-pixel height.
The linked official text agrees with those pages. This additional web reading
does not invent a second archived HTTP response or retrieval hash.

## Findings and implementation

| Location | Old specimen | Official form and new check |
|---|---|---|
| First monetary label | Total Amount Financed | Total Amount of the Sales-Based Financing; exact label match |
| Disbursement formula | Uses the old short label | Uses the full official first-row label; bracketed formula checked literally |
| Estimated number of payments | Omits the qualification | Retains the instruction limiting a reasonable range to variable-payment schedules |
| Payment Schedule heading | Adds separate Fixed/Variable boxes | Exact heading rejects those added boxes; the official body has its own payment-option fields |

`PrescribedRow.labelSuffix` represents fixed text below a label heading, including
Virginia's formulas and range instruction. It is separate from the heading
because PDF extraction can interleave another column between them. Rendered
labels must match the heading plus this fixed text. Source checks find both
literally; square brackets here are not the template wildcards used for some
California/New York prescribed sentences. Forms without this field retain their
existing behavior. Virginia uses exact label matching.

The first-row statutory `satisfiedBy` reference is corrected. The earlier
Code-only finance-charge explanation is also corrected: **10VAC5-240-10** supplies
the implementing definition, including Regulation Z finance charges. No numeric
calculation or new enforcement behavior is implemented.

Both source-verification dates advance to September 12 after reading the new
document. The digest changes for the different official form and its retrieval
header. This is not a header-only refresh. Virginia's source-origin classification
becomes official; its filled answers remain outside the row-text check, so that
classification is not a complete conformity verdict.

## Layout observations and remaining checks

The retained PDF, not an inferred table, is the layout authority:

- Both pages print `Eff. 10/2022`. Page one places Disclosure Date and the
  recipient/provider details in the right column alongside the six monetary rows.
- The payment-range instruction is beneath the estimated-number explanation in
  the first column. The payment schedule spans the form width and has no separate
  Fixed/Variable heading boxes.
- Page one includes the other-fees, collateral, broker and prepayment sections,
  the relevant SEE PAGE 2 boxes, and a recipient acknowledgment/signature/date.
- Page two has recipient/date/provider identifiers, six information-category
  boxes, the large explanation box and another acknowledgment/signature/date.

Section **240-30(B)–(G)** governs N/A entries, checked boxes, page-two use and
signatures, separate-document presentation, retaining the prescribed format,
recipient acceptance and updated payoff/refinance disclosure. The provider may
remove SEE PAGE 2 references/boxes only under the stated one-page condition.

The row representation cannot prove geometry, header placement, actual numbers,
checkbox selections, delivery or signatures. The new official-row fixture is a
transcription of a **blank official form**, not evidence that a merchant document
was rebuilt. The old `va-rows.fixture.json` is unchanged, with exact expected
findings at zero-based rows **0, 2, 5 and 6**; the former false-green assertion is
replaced with that negative regression. No failing check is skipped or relaxed.

## Contract-renderer and template handoff

Read-only discovery found the separate repository at
`/Users/shwet/github/lombard/lombard-contracts`, HEAD
`58974ca1eead7fb6135ed8378475b8b53d5ecca6`. Relevant paths are:

- `sources/Lombard_VA_Disclosure_v1.docx`
- `PDFs_Lombard/Lombard_VA_Disclosure_v1.pdf`
- `state-disclosures/regulatory-source/VA-Sales-Based-Financing-Disclosure-Form.pdf`
- `templates/va-disclosure.fields.json` and versioned `va-disclosure-*.published.json`

No file there was edited and no production template was queried or replaced.
Its assigned follow-up must rebuild the merchant form from the official layout,
correct the four known text differences, review both pages and field geometry,
rebind coordinates/identifiers as needed and validate completion/signature rules.
Re-run these conformity checks against text extracted from the rebuilt PDF, then
independently review the actual generated document and stored-template migration.
Do not relabel the legacy fixture as corrected or assume a published JSON filename
establishes current production state. No owner is assigned to that separate work
by this document.

## Validation and integration

Fifteen regressions failed first, exposing the wrong source, false-green legacy
specimen and ignored fixed wording. The focused selection covers the changed
checker, Virginia/Connecticut mappings, California/New York conformity, source
provenance and the read-only surface. Final local counts and CI evidence are
recorded in the branch note and task/PR.

The exact starting base is `1813b1d72fb231593ddcb2cb0b2a55054ac7f040`.
[Playwright run 34719946377](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34719946377)
executed successfully on that revision, so it supplies the unchanged before
gate. PR CI supplies the after gate, broad tests/builds and separate typecheck.
No additional manual browser sweep is needed for this existing read-only
rendering; the prescribed PDF itself received visual inspection.

**PR #187 integration:** it is still open on this branch's base. Each correction
independently raises the official-source count from 13 to 14. After both merge,
the expected disclosure-origin count is **15**, with no unrecorded active
disclosure source. Keep both Utah and Virginia in the official list, both source
correction sections, and this PR's isolated anonymous-origin surface test. That
test now mocks the origin verdict and verifies a partly-verified result with
matching digest, fresh reading and otherwise valid form, so it does not depend
on either state's source remaining anonymous. The same MCA author owns any
needed integration fix; do not silently choose one PR's count over the other.
