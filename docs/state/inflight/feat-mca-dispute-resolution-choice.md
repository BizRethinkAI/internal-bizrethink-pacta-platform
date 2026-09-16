# A funder chooses courts or arbitration

Task: #276 follow-on (Phase 3, first unlock). Author:
`mca-output-fidelity-20260916`. Base: main `df696e26d`.

**Based on main, not on the #277–#281 renderer stack.** The two tracks touch
different files and merge in any order; stacking eight deep would rebase
everything above on every review comment.

## Durable behavior

`profile.ts` pinned `disputeResolution: z.literal('courts')`, so no funder could
select arbitration and `frpa.arbitration-7-26` could never appear in a package,
although it is authored and gated. It is now `z.enum(['courts', 'arbitration'])`
and the provider interview asks the question.

- **courts** selects the jury-trial, class-action and counterclaim waivers
  (§§7.10, 7.11, 7.20), exactly as before.
- **arbitration** selects §7.26 and drops those three.

ADR 0020 §5.6 is the authority: a lawful term a funder wants is a term the
platform supports, and Pacta holds no position on which they should choose.

No clause text, fingerprint, approval or review-link change. The values with no
clauses behind them — `collectionMethod: 'ach-only'` and
`'split-with-ach-backstop'`, `settlementBase: 'gross'`, `venueRule:
'funder-state'` — are still refused.

## Validation

TDD: four new assertions failed first (`received: "arbitration"`), then passed.

- One existing assertion moved: arbitration left the "does not substitute the
  baseline for unsupported value" list, with a comment saying why the others
  remain. Its intent — never silently substitute a baseline — is unchanged.
- `mca` suite: **102 files / 3,376 tests pass**.
- Changed files formatted; `git diff --check` clean.

**One typecheck error could not be reproduced honestly in this worktree.**
`provider-templates.tsx` reports two unrelated copies of the profile type,
because this worktree shares the main checkout's `node_modules`, whose
`@bizrethink/customizations` alias resolves into that checkout — where the
literal is still `'courts'`. In CI the alias points at the same tree and both
types come from one file. **If it is real, CI's separate typecheck fails and it
gets fixed rather than waived.**

## Not in this change

The interview still hard-codes `collectionMethod`, `settlementBase` and
`venueRule`. `funderState` and the economics fields are the next two pieces.
