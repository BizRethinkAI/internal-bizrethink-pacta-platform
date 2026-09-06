# Vendored regulations

Primary text, committed so that a check can be run without a network and so
that the words a spec was transcribed from cannot change underneath it.

## Two extractions of the Virginia form

`VA-Disclosure-Form.txt` is a reading-order `pdftotext` dump.
`VA-Disclosure-Form.layout.txt` is the same PDF with `-layout`.

Both are kept because they fail in opposite directions, and the checker reads
the first for a reason worth writing down.

Virginia's form is a two-column grid. Under `-layout`, a label that wraps inside
its cell has the *neighbouring column* interleaved between its lines, so
"Payment Schedule" comes out as `Payment ☐ Amount of each fixed payment: $
Schedule ☐ Frequency of fixed payments:`. Collapse the whitespace and the label
is not there as a contiguous string — the checker reported it missing from a
form that prints it plainly.

The reading-order dump keeps multi-line labels together and loses the column
structure instead. Since `checkAgainstSource` asks "do these words appear", that
is the extraction it should read. The layout dump stays for humans, who need the
grid to see which answer belongs to which label.

The general point: an extraction is a lossy view of a document, and a checker
run against the wrong view reports the loss as a defect. Pick the view that
preserves what is being asserted.
