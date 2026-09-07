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

Both are official publishers, fetched over HTTPS with the certificate chain
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
