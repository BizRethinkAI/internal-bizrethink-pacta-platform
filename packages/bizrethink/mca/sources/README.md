# Vendored regulations

Primary text, committed so that a check can be run without a network and so
that the words a spec was transcribed from cannot change underneath it.

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

**Why this file settles a question about every other state.** §86.310(d) is the
only requirement in the eleven states we track that puts words INSIDE the
agreement. Connecticut §36a-868 and Virginia §6.2-2236(A) are prohibitions — a
contract may not waive a prejudgment remedy, may not mandate a forum outside
the Commonwealth — and the rest are satisfied by a separate disclosure. So a
base form that omits the prohibited terms needs no per-state variant at all, and
Texas needs one added clause. That is the difference between two templates and
twenty-two.

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
