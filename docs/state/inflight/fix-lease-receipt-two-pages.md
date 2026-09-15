# Receipt of Governing Documents on two pages — author handoff

Author `lease-send-20260914`; branch `fix/lease-receipt-two-pages`, from main
`8f62e1744`. Follow-up to #259 / #261, raised by the repository owner on the
re-prepared pilot envelope. The author does not merge, deploy or consolidate
STATE.md.

## What was wrong

With sixteen linked governing documents the receipt ran to three pages: the
list filled page 1 and a third of page 2, and the execution block — kept
together (`wrap: false`) and about 420pt tall with four signers — did not fit
the ~340pt left, so the signatures took page 3 alone.

## What changed

Text carrying `[[link …]]` (in practice only the receipt's document list and
its surrounding paragraphs) renders at `lineHeight: 1.35` instead of the body's
1.55, in `election-marks.ts` `runProps`. Measured on the pilot answers: 1.45 and
1.40 still give three pages; 1.35 gives two, with the last signature date ~45pt
above the page limit. No other clause's text or pagination is touched.

## Validation

- Red first: a test rendering the anonymised pilot package's sixteen documents
  with links and four signers expects two pages (was three).
- `lease/` + `regression-tests/` 173 files / 2,017 tests, including the
  heading-orphan guard; `typecheck:lease` clean; `apps/remix` `tsc` 0.
- Rendered the pilot receipt and inspected both pages.

## Limits

A longer document list, or longer labels, goes back to three pages; the block is
kept together by design. On the current pilot data item 15's "download" wraps to
the top of page 2 — the owner is removing a duplicated date from that item.
