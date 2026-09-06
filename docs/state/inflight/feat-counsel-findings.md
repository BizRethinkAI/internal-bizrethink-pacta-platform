# feat/counsel-findings — counsel can finally say something

**PR:** #TBD. Attacks the documented critical path directly.

## The asymmetry

`STATE.md` records the blocker plainly: **the lease builder cannot reach a third
party until a Florida attorney reviews the clause library**, and 52 clauses are
`attorney-drafted, author: null` — drafted by a language model, reviewed by
nobody.

The counsel-facing page for that review was **145 lines with one query and zero
mutations**. No textarea, no button. An attorney could open the link, read 52
clauses, see approved/unapproved badges — and say **nothing**. Findings came
back by email and somebody retyped them into a system that had nowhere to put
them.

Meanwhile `lease-review.$token.tsx` gives a **tenant** seven mutation and input
controls: comment on any clause, tracked to a disposition.

The person whose review gates the entire product had less than the person whose
comments the UI itself describes as "a negotiating position, not a defect
report".

## What a finding is

Not a comment. A tenant's comment is a negotiating position and does not block.
An attorney's finding is a defect report against text we are asserting is
lawful, so it **blocks that clause until answered**, and answering is a
deliberate act with a reason attached.

Both halves are required to clear one. A timestamp with no text, or whitespace,
leaves it outstanding — otherwise the mechanism is as fast to bypass as to
satisfy, which is the same as not having it.

## What shipped

- `lease/clauses/findings.ts` — `outstandingFindings` and `findingBlockers`.
  Blockers name the clause and quote the finding: "3 outstanding" makes somebody
  go looking; the slug puts them where the work is. Two findings on one clause
  stay two lines, so answering the first cannot clear the second.
- `BizrethinkLibraryFinding` + hand-written migration. Stores
  `clauseFingerprint` for the same reason the review stores
  `libraryFingerprint`: an answer to a finding against text that has since moved
  is answering a different question.
- `recordFinding` (unauthenticated, like the tenant's), `answerFinding` and
  `listFindings`. **Attribution comes from the review row, never from the
  caller** — a caller who could name themselves could name somebody else. The
  slug is validated against the library, so a typo cannot become a blocker no
  clause page will ever show.
- A per-clause finding box on the counsel page. Per clause rather than one box
  at the end: a finding that names its clause can be answered against it; a
  paragraph covering four needs somebody to split it, and that somebody is not
  the attorney.

## What did NOT change

**Approval still requires an account.** It carries a bar number and a
jurisdiction and is checked against the clause's own jurisdiction (#89) before
it is written. Sending a link should not be the same act as granting that. Only
the other direction — saying what is wrong — needed no such ceremony, and that
was the half that was missing.

The page's header comment said "Read-only on purpose". Half of that reasoning
still holds and is kept; the half that was wrong is corrected in place rather
than left to contradict the code.

## Verified

1080 tests / 105 files pass. Both typechecks clean, including
`react-router typegen && tsc` in `apps/remix`. `prisma validate` passes on the
merged schema.

## Still not done by this

This makes counsel's review *possible to record*. It does not make it happen.
The 52 clauses remain reviewed by nobody, and no quantity of mechanism changes
that — someone qualified still has to read them.
