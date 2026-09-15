# Review the envelope, then send it — author handoff

Author `lease-send-20260914`; branch `fix/lease-review-envelope-link`, from main
`d5b93cd72`. Follow-up to #254 / #255, raised by the repository owner the same
day. The author does not merge, deploy or consolidate STATE.md.

## What was wrong

#255 replaced the prepared envelope's "Open the envelope" link with one "Review
and send the envelope" button pointing at the envelope **editor**, which opens on
its upload-and-recipients step. The page the owner used to check a prepared
lease — the envelope summary, a tab per document with every field drawn — was no
longer reachable from the lease page.

## What changed

For a DRAFT envelope the lease page shows two buttons: **Review the envelope** →
`/t/:team/documents/:id` (summary), and **Send the envelope** →
`/t/:team/documents/:id/edit` (Send Document is at its top right). The panel copy
says to review each document tab first. Sent envelopes keep "Open the envelope".

## Validation

Red first: a source test requiring both links with their labels, and no "Review
and send" button. `lease/` suite green; `apps/remix` `tsc` 0.
