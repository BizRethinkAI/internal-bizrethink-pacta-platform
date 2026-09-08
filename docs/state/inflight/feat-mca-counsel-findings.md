# feat/mca-counsel-findings — counsel can say something back

## Why

The MCA review link shipped read-only. The reason given was real and the
conclusion drawn from it was too wide: findings from the two adversarial
*document* reviews live in `lombard-contracts` manifests, and a second
Pacta-side register of **those** findings would drift from the first.

Nothing counsel writes on a link is a second copy of a manifest finding. It
arrives only through a token we minted, it is attributable to the reviewer named
on that link, and no manifest has ever held one. One register per origin, and
both pages label which origin a finding came from.

## What changed

- `BizrethinkMcaLibraryFinding` + migration. Separate table from the lease's,
  for the reason `review/link.ts` gives about the review rows: the lease token
  is resolved by a query with no discriminator.
- `counselFindingsHold` in `clauses/approval.ts`, wired into `approvalBlocks`
  ahead of the vendored register's hold (counsel's is the faster loop to clear).
- `recordFinding` / `openFindings` (token-scoped, unauthenticated) and
  `answerFinding` / `listFindings` (admin-gated).
- `FindingBox` on the counsel page; a `From counsel` section on `/admin/mca`.
- The briefing's "how to send comments back" section now says the opposite of
  what it said one revision ago, because the page does.

## The trap this deliberately avoids

The lease shipped this exact feature unplugged — PR #103 built every piece and
nothing called anything, and CI was green because every unit was tested in
isolation. `mca/review/__tests__/findings-wiring.test.ts` was written **before**
the router this time, not after the failure.

## State

Stacked on `feat/mca-counsel-briefing` (#139). 1880 MCA tests green,
`apps/remix` typecheck clean, `prisma validate` clean.
