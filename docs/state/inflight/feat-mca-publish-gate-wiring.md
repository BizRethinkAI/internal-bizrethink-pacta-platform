# feat/mca-publish-gate-wiring — where the gate's inputs come from

**Stacked on `feat/mca-template-artifact` (#302) → #301 → #300 → #297 → #295.**

`assertMcaPackagePublishable` is a pure rule that deliberately knows nothing
about its sources (#288, ADR 0020 §3.2). `mcaPublishablePackageFor` is the one
place that assembles them — one place, so a second caller cannot build a subtly
different package and get a different answer about the same template.

## It refuses, and that is the designed state

No clause carries a counsel approval, so every clause fails the first check.
ADR 0023: the gate ships shut and stays shut until counsel approves clauses. A
gate that passed today would be measuring nothing.

The tests assert the refusal rather than working around it.

## Two mappings worth arguing with

**A template has no blockers.** Those belonged to a filled draft — venue
conflicts, outstanding disclosures, processor acceptance — and a template has no
deal to conflict with. `blockers: []`.

**An unplaceable field is a missing input.** What a template *can* have is a
field it can neither mark nor print: a hole no caller could fill, because there
is no widget to send a value to. `templatePlacement().unplaced` maps to
`missing`, so the gate refuses on it and names each binding — the fix is
findable rather than a count.

## A coarseness recorded rather than worked around

`clause-library-router.ts` counts findings **per clause**, because a reviewer
reading one clause wants that clause's objections. The gate's contract is
**package-level**: one set of findings applied to every item.

For an all-or-nothing publication the *outcome* is right — a package with one
objected clause must not publish. The per-clause *reason* is coarse, and will
name a finding raised against a different clause. Narrowing it means changing
the gate's shape, which is a reviewed security boundary and belongs in its own
conversation rather than being quietly widened here.

## Caught while wiring

`libraryFindingHoldTargets` lives in `review/holds`, not `clauses/approval`.
Nine tests failed with `is not a function` — a runtime failure rather than a
type error, because the import resolved to a module that exists and simply does
not export it.

## Not in this change

Nothing calls this either. The shell that uploads, creates the
`EnvelopeType.TEMPLATE` and writes the record is the last piece, and this stands
in front of it.

## A fail-open closed, raised in review

`clausesIn` silently dropped any item whose slug the library could not resolve,
so the gate would have judged a **subset**. A gate that judges a subset can pass
a package whose dropped clause is exactly the one no attorney approved — which is
a merchant signing unapproved text, the single failure this vertical exists to
prevent.

It now throws, naming every unresolved slug.

**Unreachable today**, and the reviewer said so having tried to reach it:
`contentFor` is the clause library plus its reusable content filtered by
instrument, so everything the compiler placed is in it; the twin does not share
records; and a missing document returns `[]`, which the gate already refuses.

Fixed anyway, for the reason #292 gives about its own partition: *unreachable*
is a fact about the code as it stands, not a property of it. Two tests now hold
the line — one asserting the package's slugs equal the document's exactly, one
asserting the refusal.
