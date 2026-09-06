# feat/jurisdiction-aware-interview

**Step 3 of the lease product plan — the half that decides whether a second
state is possible at all.**

## Why the interview, not just the clauses

Splitting the clauses was the easy half. Florida asks the tenant to elect under
§83.595(4); **North Carolina has no such provision**, so the question must not
appear — an answer would render a clause with no statutory basis behind it. NC
also caps the deposit by term length and requires a trust account, neither of
which Florida does.

So it is not one questionnaire with some clauses swapped. The questions differ.

## What this adds

- `InterviewField.jurisdictions?` — absent means every jurisdiction asks it;
  present means only those do.
- `interviewFor(jurisdiction)` filters fields, and **drops a step left with no
  questions** rather than rendering a heading with nothing under it. Steps that
  carry no fields by design — the association-documents and condition uploads —
  are kept, because their content is the intro and the editor beneath it.
- 23 fields marked `['US-FL']`.

## The marking is derived, not remembered

A field is Florida-only exactly when **every clause consuming it is Florida**.
That relationship already exists in the library, so the test computes the
expectation from the clauses rather than from a hand-kept list.

Add a North Carolina clause that uses `depositReturnDays` and the field stops
being Florida-only — and the test says so, in those words. Nobody has to
remember.

## Measured

| | Florida | North Carolina |
|---|---|---|
| Steps | 15 | 12 |
| Fields | 66 | 43 |

Dropped entirely for NC: **maintenance, access, disclosures** — every question
in them is Florida statute (§83.51 repair thresholds, §83.53 entry, §83.512
flood).

Federal lead paint still reaches an NC lease: it is selected by
`propertyYearBuilt`, which is a fact asked in the property step, not a
Florida-marked question.

## Verified

- `interviewFor('US-FL')` asks **exactly** what the interview asks today, in the
  same order.
- `interviewFor('US-NC')` asks nothing that only Florida law supports, and still
  asks everything that travels.
- No step survives with zero questions unless it never had any.

1031 tests passing, typecheck clean.

## Open

- North Carolina's own questions: deposit cap by term length (NCGS §42-51),
  trust account or bond, and its entry and repair provisions. Additive now.
- The builder UI still calls `FL_INTERVIEW` directly. Switching it to
  `interviewFor(property.state)` is the next wiring step, and is why this PR
  changes no behaviour yet.
- The test imports `FL_LIBRARY as ALL_CLAUSES` because `clauses/library.ts` is
  in #93. Swap when that lands.
