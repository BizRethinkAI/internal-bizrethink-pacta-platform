# feat/interview-follows-property-jurisdiction — #94 stops being inert

**PR:** #TBD. Completes the jurisdiction work of #89 / #93 / #94.

## Why

#94 split the interview by jurisdiction and shipped it **inert**. `interviewFor`
was called from nowhere; the builder went on importing `FL_INTERVIEW` directly.
Dead code that looks like a feature is worse than no code, because the next
person reads the split as done.

## What it prevents

Florida asks the tenant to elect under §83.595(4). North Carolina has no such
provision. Asked of a North Carolina landlord, that answer would be stored and
then rendered into a clause with no statute behind it — a term invented by a
form rather than by law.

The guarantee is not "fewer questions". It is that **no question can produce an
answer its jurisdiction cannot support.**

## What changed

- `matter.get` now returns `propertyState`. The matter carries only a
  `propertyId`, so the state has to be sent explicitly — the page cannot derive
  it. A separate query, for the same reason `loadMatter` uses two: the matter
  deliberately has no Prisma relation into the property (ADR 0002).
- The builder builds its steps with
  `interviewFor(normaliseJurisdiction(propertyState) ?? 'US-FL')`, and derives
  the delegable-field set from the same list, so the tenant can never be asked
  something the jurisdiction does not support either.

Falls back to Florida because it is the only state with clauses of its own
today. The fallback stops being harmless the moment a second state has any,
which is why the state is threaded now rather than then.

## Measured

Florida 15 steps / 66 fields. North Carolina 12 steps / 43 fields — maintenance,
access and disclosures drop entirely. Federal lead paint still reaches a North
Carolina lease, because it is selected by `propertyYearBuilt`, a fact rather
than a marked question.

## Verified

1059 tests / 102 files pass, typecheck clean.

The split itself is proven in `lease/__tests__/interview-jurisdiction.test.ts`,
where a field counts as jurisdiction-specific exactly when every clause
consuming it belongs to that jurisdiction — derived from the library, so it
self-maintains. The new guard covers the **wiring**, which that test cannot see:
that the page does not import `FL_INTERVIEW`, that it uses `interviewFor`, that
the payload carries `propertyState`, and that an unrecognised state falls back
to Florida rather than to no questions at all.
