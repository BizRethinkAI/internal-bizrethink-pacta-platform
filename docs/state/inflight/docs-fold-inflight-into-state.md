# docs/fold-inflight-into-state — the first compaction, three weeks late

**Branch:** `docs/fold-inflight-into-state`, stacked on `docs/correct-runbooks-after-incident` (#145).
Documentation only.

## Why

CLAUDE.md says merged notes are folded into `docs/STATE.md` and deleted.
`docs/state/inflight/README.md:47-49` asks for roughly weekly consolidation.
**Neither had ever happened.** Every one of the 21 note files belonged to an
already-merged PR — #124 through #144 — while STATE.md still said:

> `packages/bizrethink/mca/clauses/` — **does not exist** — the clause library
> … is the next build

It holds **204 clauses across six instruments**, an admin surface, per-clause
approval and a counsel review link. A file whose entire purpose is *"the only
memory that survives between sessions"* was three weeks wrong about the thing
this vertical spent three weeks building.

**The governance gate could not catch it.** `governance.yml:170-205` checks that
a PR touches a state file and that STATE.md carries no conflict markers. It does
not check whether a note's PR is merged, whether its `#TBD` was ever filled in,
or whether the file's claims are still true. It was green throughout.

## What changed

- **`docs/STATE.md` — *Where things stand* rewritten.** The MCA table now
  describes what exists. Adds one line the old table implied and never said:
  the library is text with provenance, **not an engine** — no `includeWhen`, no
  `variables`, no selection.
- **`docs/STATE.md` — new section, *The week of 2026-09-07 → 09-09*.** The twenty
  notes, folded.
- **`docs/STATE.md` — *In flight* corrected.** It listed the MCA clause library as
  "**not** built" and named two lease PRs as the current stack.
- **Twenty notes deleted.** #145's stays, because #145 is open and the convention
  forbids touching another PR's note.

## Synthesis, not concatenation

The notes disagree with each other, because later ones settled what earlier ones
listed as open. Four items appear as *Still open* in up to four notes each and
are closed:

| Listed open in | Actually settled by |
|---|---|
| Where the agreement builder lives | ADR 0010 — Pacta assembles |
| `/admin/mca` summary honesty | #134 |
| Whether `instrument` should be an array | #130 — singular |
| Owner decisions 5 and 6 | `lombard-contracts/change-notes/18` |

Concatenating would have carried all four forward as live work.

**The reverse risk was also live: not turning an open decision into a settled
one.** Counsel engagement is parked at the owner's request, the second-tenant
property is unexercised, and the Connecticut renewal-date conflict is unresolved.
All three are recorded as open, with what would settle them.

## The one place two records disagree, kept visible

`#128` imported §4.1 *Guarantor Information* with an empty body and filed it under
**Not done, on purpose** — *"because that is what the document holds."*
[ADR 0011](../../adr/0011-the-mca-clause-library-is-a-library.md) reframes the
same pattern at the FRPA's §9.1 as a **defect**, because an outside reviewer hit
it and could not review the guarantor execution block.

Both are in the folded section. The honest reading is that the coverage test asks
whether every *line* is inside a clause and nobody asked whether every *clause*
has content — so a deliberate choice and an unnoticed gap looked identical.

## State

`docs/STATE.md` 2468 → 2591 lines. Twenty files removed.
48 test files / 1889 MCA tests pass, scoped typecheck exit 0, on Node 24.20.0
darwin/arm64. No conflict markers. No dangling links to deleted notes.

## Still open

- **The governance gate does not check note freshness.** It would have stayed
  green for another three weeks. Making it check merged-PR notes is a real guard
  with a real failure behind it — not added here, because it is a workflow change
  and this PR is documentation.
- STATE.md still carries **two sections both titled `## Blocked`** and a lease
  *Next* list written 2026-08-29. Untouched: this compaction was scoped to the
  MCA notes, and rewriting the lease narrative is a separate judgement.
