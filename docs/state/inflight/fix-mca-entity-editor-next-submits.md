# fix/mca-entity-editor-next-submits — the Next button was saving the entity

Closes #319. Written by an implementing session; not merged by it.

## What the button actually did

On `/t/:teamUrl/mca-entities?entity=<id>` — a **saved** entity — pressing
**Next** appeared to do nothing. The issue recorded it as "no step change, no
error", and that is what you see. It is not what happened.

What happened is that the form **saved**. `mcaEntities.update` was posted 93 ms
after the click, the write succeeded, `version` went 1 → 2, and the editor's
`key` in `entities.tsx` is `${saved.data.id}:${saved.data.version}` — so the
refetch remounted the editor, and a fresh mount starts at step one. The person
saw the page they were already on. They did not see that a record had been
written.

The issue listed "remount resetting `step`" as ruled out because both halves of
that key are stable on the page. They are stable only until something bumps the
version, and the click was the thing that bumped it.

## The cause

The two buttons were the branches of one ternary:

```tsx
{step === 0 ? <Button type="button" onClick={next}/> : <Button type="submit"/>}
```

A ternary reads as an either/or, and in JSX it is not one: it is **a single
position in a single children array**. React reconciles both branches onto the
same host node and edits its attributes rather than replacing it. `setStep` runs
from a discrete event, so React flushes the re-render *while the click is still
being dispatched*; by the time the browser reaches the click's default action,
the node under the pointer says `type="submit"` and the browser submits its form
owner.

Demonstrated, not inferred — a standalone page built against this repo's own
React 19.2.8 and driven in headless Chromium:

| shape | result |
|---|---|
| one ternary slot | `step=1 submits=1` — the node captured before the click now reads `<button type="submit">` |
| three conditionals, one per button | `step=1 submits=0` |
| ternary + `event.preventDefault()` | `step=1 submits=0` |

## Why the create path looked fine

The same accidental submit fires there too. On `?new=1` the record is
incomplete, so `handleSubmit` takes the *invalid* branch, and that branch ends
`setStep(errors.label || errors.identity ? 0 : 1)` — the outstanding error is
`policy.supportedTermsConfirmed`, which is on step two, so it lands on step two.
Next "worked" on the create path by accident, via the failure handler of a
submission nobody asked for. The stray `[role="alert"]` it left behind was
cleared by the real save before the test looked for it.

## The fix

Each button gets its own conditional, so React unmounts one and mounts another
instead of retyping the one that was clicked. `next` also calls
`event.preventDefault()`: the structural change is the fix, and the one-liner
holds if the JSX is ever collapsed back or the buttons come from a `.map`.

## Limitations

- `packages/bizrethink/mca/__tests__/advance-button-does-not-submit.test.ts`
  parses our TSX with the TypeScript compiler and fails on any conditional whose
  branches render elements with different `type`s. It is a **syntax** rule. It
  sees the shape that caused this and not the general class — a stepper that
  mapped over an array and gave the last entry `type="submit"` would pass it.
  That is what the `preventDefault` line is for.
- It is a syntax rule because **this repo has no React rendering harness**: no
  jsdom, no happy-dom, no `@testing-library/*` anywhere in `node_modules`.
  Adding one means new devDependencies and a second vitest environment in a fork
  that merges upstream weekly, which is a bigger decision than this bug.
- The scan covers `packages/bizrethink/**/*.tsx` plus the `.tsx` files declared
  in `overlays/BIZRETHINK-OWNED.txt`. Upstream components are out of scope; the
  two upstream steppers that were checked by hand
  (`team-member-create-dialog.tsx`, `team-group-create-dialog.tsx`) already use
  one block per step and are not exposed.
- Across all of our TSX there was exactly **one** offender: this one. No other
  stepper in the codebase shares a slot between a button and a submit.

## Local verification

- `npx vitest run packages/bizrethink/mca` — 119 files, 3,653 tests, green.
- `npx tsc -p packages/bizrethink/tsconfig.typecheck.json --noEmit` — clean.
- `npx biome format packages/bizrethink` — clean.
- The new test was run **red first** against the unfixed source; it named
  `entity-editor.tsx:374` as the single offender.
- `npx vitest run packages/bizrethink` reports 33 failures in
  `regression-tests/` both with and without this change — they are worktree
  artefacts (`state-note-workflow.test.ts` resolves
  `.github/scripts/state-notes.ts` from the wrong root outside the primary
  checkout), not a regression from here.
