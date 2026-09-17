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

Four things hold the line, and none of them is counsel's approval:

1. The profile **refuses** `funder-state` when the programme lists Virginia.
2. **A deal is checked too.** `recipientStates` is the states a funder offers
   into, never a determination of merchant nexus, so a Florida-only programme
   could still sign a Virginia merchant. Filling a deal whose merchant's
   principal-place state fixes its own forum raises a **`venue-conflict`
   blocker** under a funder-forum template. `FORUM_FIXED_BY_STATE` holds
   Virginia alone, sourced to Va. Code §6.2-2234(A) and §6.2-2228; it grows by
   statutory walk, not by guess.
3. The funder-state body **yields** where the merchant's state fixes a forum,
   and §7.24's riders keep their precedence claim.
4. Merchant-state remains the default, and `LOMBARD_FACTS` is unchanged.

**A field both venue clauses needed did not exist.** Each names "the state of
Merchant's principal place of business stated in the grid", and the grid held a
free-text business address and a state of *formation* — a different fact, since
a Delaware company trading in Virginia is a Virginia recipient. The grid now
collects `merchant.principalState`. That adds one blank to Section 1, and it is
what makes the deal-level check possible at all.

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

## Review findings, fixed

An independent review of this PR found the deal-level guard was a free-text
string match: `['virginia', 'va']` against a trimmed, lowercased value, so
"Va.", "Commonwealth of Virginia" and "US-VA" all missed and the blocker
**silently did not fire** — on the one check standing between a Virginia
merchant and a funder's forum.

- `usStateCode` now reads a typed state into a code, tolerating
  "Commonwealth of", "State of", a `US-` prefix and punctuation, and **returns
  `null` for anything it cannot read**. "West Virginia" is a different state and
  does not match Virginia.
- An unreadable state under a funder-forum template raises its own
  **`venue-unverified`** blocker rather than passing as "not Virginia". A
  merchant-state template asks nothing, because the question does not arise.
- Nine near-miss cases and both unreadable-state cases are pinned.

A second pass found the matcher itself fail-open: `US_STATES` is a plain object,
so `US_STATES['constructor']` answered with `Object.prototype.constructor` —
truthy, not a state code, and therefore past **both** guards. The lookup now
asks `Object.hasOwn`, and the prototype keys are pinned as unreadable. Nobody
types "constructor" into a state field, but it is the exact shape this function
exists to remove.

The same review asked why the funder-state arm carried
`whyThisClause: 'implements'` with `appliesInStates: ['US-VA']`, on the arm a
Virginia programme is refused. It was wrong: `appliesInStates` drives the
counsel-routing sentence in `approval.ts`, so it asked for a Virginia-admitted
reviewer to approve the one clause Virginia can never use. The arm is now
`discretionary` with no states — no statute requires a funder's forum — and a
test pins the asymmetry so it is not "corrected" later. The merchant-state arm
keeps `implements` and Virginia, because it satisfies §6.2-2234(A) by
construction.

## Batch-level effect worth knowing

This batch changes the clause library, so `compileMcaTemplate(stored
profile).fingerprint` no longer equals a stored `revision.fingerprint`, and
`providerSourcesCurrent` flips false for every existing template revision after
deploy. That is the designed staleness signal, not a defect: stored packages
stay readable because saved reviews compare stored to stored. It will be visible
in the workspace, and belongs in the shipping consolidation.

## Refreshed onto the merged batch

Merged main at `13ef4786f` (the renderer stack plus #282). Three conflicts, all
two sides adding distinct blocks, resolved keep-both:

- `profile.ts` — venue fields beside #278's `website`.
- `provider-interview.tsx` — the venue question and its conditional forum
  fields beside #282's dispute-resolution question; the step blurb now claims
  neither venue nor disputes as fixed, because both are choices.
- `profile.test.ts` — **both** `disputeResolution: 'arbitration'` and
  `venueRule: 'funder-state'` leave the unsupported-values list, each because
  its clauses became selectable. `collectionMethod` and `settlementBase` still
  have none.

105 files / 3,439 tests pass on the merged revision.

### Two process lessons from resolving this, for whoever resolves the next one

**"Both sides added a block" is only safe when the block boundaries are whole,
and conflict markers do not guarantee that.** The first keep-both join here
spliced mid-structure and dropped two closing braces and a comment opener. The
suite caught it as a *parse error*, not a failed assertion — which is luck, not
design. Where a conflict runs through a file with real structure, as #284's
renderer did, take the incoming file and re-apply the change onto it; a
re-apply is verifiable by counting deletions against main, and a splice is not.

**Run Biome over the changed files as the last step of a resolution.** Resolving
by hand is exactly when prose rewrapping drifts, and it broke the format check
here after the conflict was otherwise correct. It is the same class as the
formatter churn on #281, from the opposite direction.

## Not in this change

`collectionMethod` and `settlementBase` are still pinned. Funder-state governing
law is unoffered. Economics is next.
