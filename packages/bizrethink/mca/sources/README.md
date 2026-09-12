# Vendored regulations

Primary text, committed so that a check can be run without a network and so
that the words a spec was transcribed from cannot change underneath it.

## Source audit — 2026-09-12

The [source audit and per-file retrieval manifest](../../../../docs/research/mca-source-audit-2026-09-12/README.md)
record exact official URLs, retrieval times, response hashes, publication
versions and comparison results for all **16 text files / 11 states** here.
Fourteen files match identified official publications; both Virginia form
extractions differ from the official October 2022 form. Original retrievals
that were not recorded remain unknown; the audit establishes a new retrieval.

**Matching historical text is not proof of current law.** The audit identifies
Connecticut's missing 2026 supplement, Missouri's 2025 amendment and Florida's
2024 definition amendment. It also corrects the old “Texas only” inference:
Utah §7-27-202(3) requires variable-payment information in the agreement.
The complete eleven-state agreement-requirements walk remains open under
ADR 0014. Other specific currency/coverage gaps are listed in the report.

All sixteen existing text files, digests and verification dates are unchanged.
Fresh evidence is retained alongside the audit for explicit source/conformity
updates. In particular, the older Texas `.txt` preface's broad claim about
other states is superseded by the correction below; it is not statutory text.

## The Connecticut and Virginia statutes (added 2026-09-07)

`CT-CGS-36a-861-872.txt` and `VA-Code-6.2-2228-2238.txt` close the gap the
package README carried from the start: *"Two states where we hold the form but
not the statute."* Until they landed, every claim about §36a-863, §36a-868 and
§36a-869 came from the Department of Banking's guidance — the Department's
characterisation of the Act — and Virginia's prohibitions rested on a note with
no primary text behind it.

| file | publisher | fetched from | on |
|---|---|---|---|
| `CT-CGS-36a-861-872.txt` | Connecticut General Assembly | `https://www.cga.ct.gov/current/pub/chap_669.htm` | 2026-09-07 |
| `VA-Code-6.2-2228-2238.txt` | Virginia Law Portal (DLAS) | `https://law.lis.virginia.gov/vacode/title6.2/chapter22.1/` (eleven per-section pages) | 2026-09-07 |

### The other nine, headed 2026-09-08

Every remaining source now carries a `Publisher:` and `Site:` line. They are a
weaker claim than the two above and the header says so: a publisher identified
from the document itself, not a fetch recorded at the moment of fetching.

The distinction is worth keeping because it is the only honest one available.
The deep links these were originally fetched through were never written down and
are not recoverable — Kansas's and California's paths both 301 into 404s today,
because legislatures reorganise their sites. What the documents themselves make
plain is who published them: an enrolled act, a chamber's letterhead and a
Superintendent's signed adoption are not artefacts a reproducer manufactures.

**Adding those headers moved seven digests and no verification date.** The
statutory text is byte-identical in all seven, asserted before the digests were
touched. Same treatment and same reason as the two headers in
`fix/ga-primary-text`: "the digest broke, so I updated it" is the move this
mechanism exists to make somebody justify, so the justification is in each file.

Both CT and VA are official publishers, fetched over HTTPS with the certificate chain
verified, tag-stripped and otherwise untouched: no word is rewritten, reordered
or normalised. The only removals are the CGA page's own "(Return to …)"
navigation lines.

**Two citation corrections the fetch forced,** each of which had been wrong in a
way that re-reading our own notes would never have surfaced:

- Connecticut's Act is in **chapter 669**, not 668. Chapter 668 ends at
  §36a-644 and contains none of it.
- Virginia's chapter runs **§6.2-2228 to §6.2-2238 and stops**. §6.2-2239 and
  §6.2-2240 exist and belong to an unrelated chapter on virtual currency kiosk
  operators, so a range that included them would have cited the wrong law.

The claims read out of these two files are in `mca/statutes/ct-va-obligations.ts`
as verbatim quotations, re-matched against the vendored bytes on every run.

**Why these are not the forms' `sourceFile`.** Neither Act prescribes a label.
§36a-863 requires content "in a format prescribed by the Banking Commissioner"
and §6.2-2231 "according to formatting prescribed by the Commission", so the
labels on both forms come from the form, and the specs still point at the form.
The Acts are what the obligations AROUND the form are read from.

## The Texas implementing rules (added 2026-09-09)

`TX-7TAC-86-310-313.txt`. `TX-Fin-Code-Ch-398.txt` does not carry the OCCC
complaint notice — its own header said the implementing rules were 7 TAC
Chapter 86 Subchapter C and we never fetched them, so every claim about the
notice rested on a citation rather than on text.

| file | publisher | fetched from | on |
|---|---|---|---|
| `TX-7TAC-86-310-313.txt` | Texas Secretary of State, Texas Register | `https://www.sos.state.tx.us/texreg/archive/July32026/Adopted%20Rules/7.BANKING%20AND%20SECURITIES.html` | 2026-09-09 |

Adopted text only. The Texas Register page also carries the preamble and the
Commission's responses to comments; those are reasoning about the rules rather
than the rules, and are not vendored. One response is quoted in the file's
header because it endorses the deployment structure we had already chosen.

**Correction recorded 2026-09-12.** §86.310(d) requires a specific OCCC notice
in the agreement. That does not establish that every other state is satisfied
by a separate disclosure. The [current linked Utah chapter](https://le.utah.gov/xcode/Title7/Chapter27/C7-27_2022050420220504.pdf),
which matches our saved body, expressly requires the agreement to describe the
variable-payment calculation methodology and circumstances of variation in
§7-27-202(3). Agreement-content duties and prescribed exact wording are separate
questions. The number of templates needed cannot be inferred from the Texas
notice alone; the eleven-state review required by ADR 0014 remains open.

§86.313 is also here because the FRPA's split-only design turns on it: a
provider may debit a deposit account only while holding a validly perfected,
first-priority security interest in ALL of the recipient's accounts receivable.

**Not yet wired to anything.** No `MCA_DISCLOSURES` spec names this file, so
`sources-are-primary.test.ts` does not currently read it. Giving the OCCC notice
a home — a clause with `includeWhen`, per
[ADR 0011](../../../../docs/adr/0011-the-mca-clause-library-is-a-library.md) —
is the follow-up.

## Two extractions each of the Virginia and Connecticut forms

`VA-Disclosure-Form.txt` and `CT-DOB-Guidance.txt` are reading-order `pdftotext`
dumps. The `.layout.txt` files beside them are the same PDFs with `-layout`.

Both are kept because they fail in opposite directions, and the checker reads
the first for a reason worth writing down.

Both forms are two-column grids. Under `-layout`, a label that wraps inside its
cell has the *neighbouring column* interleaved between its lines, so "Payment
Schedule" comes out as `Payment ☐ Amount of each fixed payment: $ Schedule ☐
Frequency of fixed payments:`. Collapse the whitespace and the label is not
there as a contiguous string — the checker reported it missing from a form that
prints it plainly. Connecticut's Appendix A failed the same way on four labels,
including "Total Amount of the Commercial Financing".

The reading-order dump keeps multi-line labels together and loses the column
structure instead. Since `checkAgainstSource` asks "do these words appear", that
is the extraction it should read. The layout dump stays for humans, who need the
grid to see which answer belongs to which label.

The general point: an extraction is a lossy view of a document, and a checker
run against the wrong view reports the loss as a defect. Pick the view that
preserves what is being asserted.
