# feat/mca-clause-kind-and-fields — a clause we declared and then emptied

**Branch:** `feat/mca-clause-kind-and-fields`, stacked on `chore/pr-discipline-node-24` (#147).
[ADR 0011](../../adr/0011-the-mca-clause-library-is-a-library.md) phases 1 and 2.

## Why phases 1 and 2 are one PR

ADR 0011 says phase 1 adds `kind` with the authorship test and **§9.1 fails by
design**. That branch cannot merge: CI must be green, and
`engineering-standard.md` forbids skipping a failing test to get there. The ADR
also says phases 1–2 *"can land together"*, which resolves it — the test goes
red on the real defect, then `field-group` makes it green. TDD inside one change
rather than a deliberately red branch.

## The defect was three clauses, not one

ADR 0011 was written about the FRPA's §9.1. A scan of all 204 found the same
thing in both twins:

```
equipment-lease.guarantor-information   body: ''
frpa.guarantor-information-9-1          body: ''
subscription.guarantor-information       body: ''
```

Every guarantor-identity grid in the corpus. That is not three mistakes — it is
one pattern applied consistently, which is why it survived.

## The red, and what it named

`__tests__/every-clause-has-content.test.ts` written first, against the corpus as
it stood: **5 failed, 201 passed.** Three empty bodies, plus two structural
assertions that no field group existed.

The assertion this repo never had is the converse of `frpa-coverage.test.ts`.
Coverage asks *is every LINE inside a clause or declared non-clause?* Nobody
asked *does every CLAUSE have content?* — so a `[TABLE]` row correctly declared
non-clause, and a clause record for the section above it holding nothing, were
both individually defensible and jointly a hole.

## This was a recorded decision before it was a defect

`feat/mca-clauses-twins` imported the Equipment Lease's §4.1 with an empty body
under the heading **"Not done, on purpose"** — *"because that is what the
document holds, a block of AcroForm widgets under a heading."*

That reading was defensible. What was missing is that **a deliberate empty body
and a dropped one are byte-identical**, so nothing could tell them apart — not a
test, not a reviewer. `kind` is the distinction: `field-group` says *this holds
fields, not prose*, and the test then demands the fields.

Both readings are in `docs/STATE.md` (folded by #146). Neither is retracted.

## What changed

| | |
|---|---|
| `clauses/types.ts` | `McaClauseKind` (`clause` \| `field-group` \| `explainer`), `ClauseField`, and `kind` / `fields` on `McaClause` |
| 204 clause records | `kind: 'clause'` — mechanical, one line each |
| 3 guarantor records | `kind: 'field-group'` plus their real fields |
| `clauses/documents.ts` | `linesNotAccountedFor` learns that a field group accounts for its own grid line |
| 3 × `index.ts` | the now-contradictory `[TABLE] Field | Value` non-clause declarations deleted |

**`kind` is required, not defaulted.** 204 mechanical insertions is a bigger diff
than an optional field with a fallback, and it is the honest shape: a
discriminator you can forget is one that does not discriminate, and ADR 0011 puts
`kind` inside the approval fingerprint, where it must be explicit.

**The fields are the documents', not invented.** FRPA §9.1 has six (`«35»`–`«40»`:
Full Name, Title, SSN, Home Address, Phone, Email). Both twins have four
(`«21»`–`«24»`: Full Name, SSN, Home Address, Phone Number) — no Title, no Email,
and *Phone Number* where the FRPA says *Phone*. Those differences are real and
preserved rather than harmonised.

Title is the only optional field: a guarantor signing personally may hold no
office, and the 2026-09-09 counsel memo asks for corporate and personal capacity
to be kept distinct.

## The contradiction the anchors left, and how it is resolved

A grid line was simultaneously *"not part of any clause"* (declared) and *the
entire content of one* (the empty record). Deleting the declarations required
teaching coverage about field groups.

**Matched on widgets, not labels.** The document pads its cells —
`Full Name | __________«35»___________` — so neither containment nor equality
works against a reconstructed label list. Widgets are exact, ordered and unique
per document, so a line carrying every widget of a group is that group's line and
cannot be another's.

This is not vacuous: with no field groups, `isFieldGroupLine` is always false and
coverage fails on three lines. The declarations are gone and coverage passes, so
the groups are genuinely answering for them.

## State

```
every-clause-has-content.test.ts   RED 5 failed / 201 passed  →  GREEN 206 passed
packages/bizrethink/mca            49 files, 2095 tests passed
packages/bizrethink                163 files, 3341 tests passed
scoped typecheck                   exit 0, 0 errors
biome check --write                clean (reformatted 2 files)
```

Node 24.20.0, `/opt/homebrew/Cellar/node@24/24.20.0/bin/node`.

**One pre-existing failure, verified not mine.**
`regression-tests/trpc-schema-parity.test.ts` fails with `TypeError: msg is not a
function` from `packages/lib/constants/i18n.ts` — a lingui macro. It fails
identically with this branch's changes stashed. `turbo.json:37-39` makes tests
depend on a prerequisite build; invoking `npx vitest` directly bypasses the
lingui compile that file needs, which is why CI is green and a bare vitest run is
not.

## Not done, and why

**Section 1's thirty fields are deliberately out of scope.** ADR 0011's phase 2
names them alongside §9.1. They are a different thing: the guarantor grids sit
*inside* an agreement at a numbered section, so they are that clause's content.
Section 1 is the deal's **schedule** — merchant identity and funding figures —
and modelling it as a clause `field-group` would put the interview's data inside
the clause library. It wants `mca/interview/`'s design, which is phase 3+, and
the `ClauseField` type here is what it will use.

`[TABLE] 1.1 MERCHANT INFORMATION` therefore stays a declared non-clause line,
with its existing reason.

## Next

Phase 3 — `McaFacts` and `includeWhen` — and phase 4, porting
`lease/engine/select-clauses.ts`. The eleven facts are accepted (ADR 0011,
*Settled*) and not yet written as code.
