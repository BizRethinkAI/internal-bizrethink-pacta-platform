# Venue becomes a choice, and §7.5 splits to allow it

Task: #276 follow-on (Phase 3, second unlock). Author:
`mca-output-fidelity-20260916`. Base: main `df696e26d`. Independent of the
#277–#281 renderer stack and of #282.

## Durable behavior

`venueRule` gated nothing: §7.5 answered three questions at once — who is bound,
which law governs, where an action is brought — so the fact decided a limb. ADR
0013's rule is that the clause is then carrying two rules and they separate.

- **§7.5 keeps binding effect, governing law, the UCC rules and the service
  pointer**, ungated, and points at the venue clause. Version 2; its variance
  moves from `unwritable` to `load-bearing`.
- **`frpa.venue-7-5`** (merchant's own state) and **`frpa.venue-funder-state-7-5`**
  are the exhaustive pair, sharing `referenceId: 'frpa.venue-7-5'` so a
  cross-reference resolves to whichever is selected.
- The funder-state arm names its forum from `{{field:provider.venueForum}}`,
  composed from the provider's venue state and optional county. No state is
  hardcoded in any body.
- The provider interview asks the question and, for a funder forum, the state
  and county. Owner's decision, 2026-09-16: an explicit forum, not the state of
  organisation, because a funder organised in Delaware litigates where it works.

## The legal risk this introduces, and the guard

ADR 0011 records that satisfying the must-not-contain rules **in the base form**
is what makes Virginia need no variant. A funder-state forum reintroduces that
risk: Va. Code §6.2-2234(A) makes a forum outside the Commonwealth unenforceable
for a covered transaction.

Three things hold the line, and none of them is counsel's approval:

1. The profile **refuses** `funder-state` when the programme lists Virginia.
2. The funder-state body **yields** where the merchant's state fixes a forum,
   and §7.24's riders keep their precedence claim.
3. Merchant-state remains the default, and `LOMBARD_FACTS` is unchanged.

**Counsel has not reviewed the new clause.** Both venue records are `draft` with
`author: null`, like everything else in the library.

**Governing law does not move with venue.** A funder choosing its own courts may
expect its own law; this pair does not offer that, and no clause changes which
state's substantive law governs. Recorded as a gap, not assumed.

## Validation

TDD: five new assertions failed first, then passed, plus four for the schema
guard (missing forum, named forum, Virginia refusal, merchant-state untouched).

- `mca` suite: **103 files / 3,390 tests pass**.
- **Pinned counts moved in the same commit**, as ADR 0013 requires: clauses
  210 → 212, FRPA 107 → 109, all content 235 → 237, across eight files.
- **Existing assertions retargeted, not weakened.** The forum invariants in
  `a-default-judgment-needs-a-served-defendant` now point at the venue clause,
  the service-pointer assertion stays with governing law, and a new assertion
  keeps **both** venue records out of the business of service.
- `venueRule`'s two values left the reachability gap list; `every-clause-answers-two-questions`
  gained `venueRule` in its offered-group matrix; `provider.venueForum` is a
  labelled field so the counsel reader annotates it.

## Not in this change

`collectionMethod` and `settlementBase` are still pinned. Funder-state governing
law is unoffered. Economics is next.
