# docs/mca-counsel-sequencing — the corrected plan

**Branch:** `docs/mca-counsel-sequencing`. Records
[ADR 0009](../../adr/0009-counsel-is-parallel-not-a-gate.md). No code.

## What changed

The roadmap in `docs-mca-roadmap.md` made *counsel engagement* a phase that
blocked building the MCA clause library. It does not. `assertPublishable` gates
text reaching a **third party**, not text being written — and the lease library
had already proved it, holding 81 clauses and zero approvals.

Counsel is now a parallel track. The build is unblocked.

## Phases

| # | What | Blocked on | State |
|---|---|---|---|
| 1 | Instance conformity | — | **done**, #112 |
| 2 | Export + read-only `/admin/mca` | — | **next** |
| 3 | The four remaining forms, then CT/VA statutes | — | **next, parallel with 2** |
| 4 | Read the 47 never-examined clauses | — | ours, before counsel |
| 5 | The MCA clause library | 4 | was blocked on counsel; no longer |
| 6 | Generalise the review link, send to counsel | 5 | counsel replies on their own clock |
| 7 | Agreement builder | 2, 5 | |

Nothing on this list waits for an attorney except the *replies* in 6.

## Phase 2 — the conformity surface

Read-only, per ADR 0008: no approval workflow, because approving a regulator's
words is a category error. It shows, per state: the statute a spec was
transcribed from, when words and structure were each last verified, whether the
vendored digest still matches, which rows the checker can only read the label
of, and which questions are open for counsel as *readings*.

Three preconditions, all currently unmet:

```
exported from packages/bizrethink/index.ts   NO
/admin/mca route                             NO
CA/NY Itemization + Lease Disclosure specs   unencoded   (phase 3)
```

The first is why the vertical is invisible: **nothing outside `mca/` can import
it.** The separation between the two libraries is currently enforced by
unreachability rather than by design, which is exactly why the owner had to ask
whether they had been mixed together.

## Phase 3 — the four remaining forms

CA Itemization (10 CCR §956), NY Itemization (23 NYCRR §600.17), CA Lease
Financing (§915), NY Lease Financing (§600.14). All four are published to Pacta
and none has a spec, so they are unverified in exactly the way the eleven
disclosures were before #101.

Then CT and VA: we hold the form and the guidance, not the General Statutes or
the Code. Everything asserted about §36a-868, §36a-869 and Virginia's
prohibitions is the Department's characterisation, not the Act.

## The counsel backlog, which grows either way

Eight questions pinned by tests, none actioned:

- CA §914(a)(2)(C)(iii) — does California require a short explanation our form
  omits, where New York's carries one?
- The `prose-described` row-order reading for CA and NY — the one place a
  weaker check was chosen on a legal reading.
- Kansas's prescribed label.
- Five `UNRESOLVED_READINGS` in `instance/identities.ts`, of which the term unit
  and the direction of the (a)(3) relative test **change verdicts**.

Making counsel parallel does not shrink this. It stops it from also holding up
the build.
