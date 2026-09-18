# fix/mca-instrument-casts — the three #308 left behind

#308 replaced `row.instrument as McaInstrument` with `producedInstrumentOf` in
the templates service, and **deliberately left three identical casts alone** on
separate read paths. They were called out in that PR body rather than swept in,
because each deserved its own reading. This is that reading.

    review/server-only/service.ts:153       freshness recompile
    publish/server-only/templates-api.ts:53 the caller-facing API
    publish/server-only/publications.ts:142 newest-per-instrument

## Why a cast was wrong here in the first place

Both columns — `BizrethinkMcaTemplate.instrument` and
`BizrethinkMcaPublication.instrument` — are `String`. A cast asserts what
nothing checked. `publishMcaTemplate` only ever writes a `ProducedInstrument`,
so a row saying otherwise means something wrote outside the service: a tripwire,
not a path anyone travels.

`McaPublicationInput` and `McaPublication` now say `ProducedInstrument` too, so
the write and the read agree rather than one trusting the other. ADR 0019 is why
`split-funding` is refused rather than tolerated — the letter is the processor's
and this builder produces none.

## The three behave differently, and that is the point of reading them apart

**`review/server-only/service.ts` — degrades.** The call already sits inside a
`try` that sets `providerSourcesCurrent = false`, and that is the right answer:
an instrument we do not produce means the sources cannot be current. No new
failure mode.

**`publications.ts` — throws**, and the caller is internal.

**`templates-api.ts` — throws, and this one is a trade-off worth naming.** The
throw propagates out of the loader, so **one corrupt row returns 500 for the
whole listing**, including the good rows. That is harsher than skipping it, and
it is deliberate:

- serving an instrument a funder's platform cannot interpret makes it pick a
  template by a name that means nothing;
- silently omitting a published template is worse still — the caller cannot send
  a document it has every reason to believe exists;
- it cannot currently arise, because the write path is constrained.

So it is a loud failure on corrupt data rather than a quiet wrong answer.
**`lombard-platform` reads this endpoint** (ADR 0023 §2 / ADR 0024), so if the
reviewer would rather have a skipped row and a logged warning, that is a
reasonable different call and I will take it.

## Tests

Four new, all on the refusal rather than the happy path: three shapes a bad
column can take (a processor form, a value outside the enum, an empty string)
against `currentMcaPublications`, and one asserting the API **never serves**
`split-funding` — written to accept either a refusal or a non-200, since what
matters is that the value does not reach the caller.

3,640 MCA tests pass.

## Not in this change

`select-clauses.ts`, `library-page.ts`, `clause-approvals.ts` and
`clause-library-router.ts` also cast to `McaInstrument`, but those are **clause**
rows and instrument keys, a different table and a different question. Left
alone rather than bundled.
