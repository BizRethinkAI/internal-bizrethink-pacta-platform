# Vendored regulations

Primary text, committed so that a check can be run without a network and so
that the words a spec was transcribed from cannot change underneath it.

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
