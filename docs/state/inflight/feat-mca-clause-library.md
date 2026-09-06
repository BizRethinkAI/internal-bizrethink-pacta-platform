# feat/mca-clause-library — prescribed MCA disclosure forms

**Branch:** `feat/mca-clause-library` · **Not yet a PR.**

## What this is

Pacta's second vertical, beside the lease builder. Same shape — a clause library
with provenance — for merchant cash advance rather than residential tenancy.

Phase 2 is the part that has to come first: the **prescribed forms**. Eleven
states require a commercial-financing disclosure, and two of them — California
(10 CCR §§900–956) and New York (23 NYCRR Part 600) — do not merely require
topics to be covered. They prescribe the table row by row, and close most rows
with the words *"shall include only"*. A closed row is not a place to be helpful
in, and everything below follows from that.

`packages/bizrethink/mca/` holds the regulations (vendored as text), the specs
transcribed from them, and a checker. It records comparisons; it does not make
them.

## Where it stands

| | |
|---|---|
| Encoded | CA §914 (10 rows), NY §600.6 (11 rows) |
| Checked | Lombard's four shipped CA/NY disclosures, all conforming |
| Tests | 29, green |
| Remaining | 9 states — CT, FL, GA, KS, LA, MO, TX, UT, VA |

## What it found

Three defects in forms that had already shipped to production as templates
104–107. Two were in California, one in New York; the New York one was found
*after* the California fix had been published, which is why those templates were
replaced twice in one afternoon (104/105 → 124/125, 126/127 → 128/129).

The one worth remembering: **our California form carried New York's sentence.**
§914(a)(2)(C)(ii) says *"on what amounts will be deducted"*; §600.6(b) says *"on
the amounts that will be deducted"*. Four words. It had survived REVIEW-01 — a
human reading both regulations side by side — and it was found by the checker on
its first run against a real document.

Full write-up: `lombard-contracts/change-notes/14-ca-ny-closed-row-conformity.md`.

## The thing to carry forward

**CA and NY are structurally different forms, not one form with different
strings.** NY prescribes ten rows to CA's nine; NY has a Collateral Requirements
row CA never asks for; NY puts the double-dipping question in the first row and
CA has no double-dipping disclosure in the offer summary at all; and §600.6(k)
closes the ninth row with "only" where §914(a)(11) deliberately omits it.

Anything that edits "the state disclosures" as a set is wrong by construction
for these two. That is not hypothetical — it is exactly how defect #1 got in: a
sweep that was correct for nine states and unlawful in two.

## What the checker cannot see

Five of NY's eleven rows and four of CA's ten prescribe *"a short explanation"*
rather than words. There is nothing to pin, so the checker reads their labels
and stops. `coverage()` returns that as a number and the tests assert it,
because the failure mode of a green suite is being read as a clean form.

Those rows still need a human. So does §600.6(l): it closes the Collateral
Requirements row to "collateral requirements or security interests", and our row
also describes the personal guaranty, which is neither — kept on the view that
omitting a material credit requirement from the row meant to disclose credit
requirements reads worse. Counsel's call.
