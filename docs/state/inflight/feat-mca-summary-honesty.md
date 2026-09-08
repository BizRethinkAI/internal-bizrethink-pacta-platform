# feat/mca-summary-honesty — `/admin/mca` says what it can actually stand behind

**Branch:** `feat/mca-summary-honesty`. Owner decision, 2026-09-08: show source
strength and age on each state's card, and stop counting a state as verified
unless both hold.

## What was wrong

The page called a state **verified** when the sha256 of **our vendored copy** of
the regulation still matched what the spec recorded. That answers *"has anyone
edited our copy?"* and nothing else. A reader takes it to answer two more:

1. **Staleness.** A regulator amends the rule; our vendored file does not move;
   the digest still matches; the card stays green about text that is now wrong.
   Nothing in this package can see an amendment.
2. **Source strength.** Georgia was "verified" against a browser capture of
   law.justia.com that was *also incomplete* — subsection (a)'s definitions were
   absent, so "advance fee", the term the broker prohibition in (f)(1) turns on,
   was defined nowhere in what we held. Its card was indistinguishable from
   California's. (`fix/ga-primary-text`, `__tests__/sources-are-primary.test.ts`.)

## What changed

Two new modules, both pure derivations re-executed on every page load, plus the
wiring:

| | |
|---|---|
| `mca/provenance/source-origin.ts` | classifies a vendored file by **its own vendoring header**: `official-publisher` / `origin-not-recorded` / `secondary-publisher` |
| `mca/provenance/reading-age.ts` | `READING_GOES_STALE_AFTER_DAYS = 180`, and the age of the **older** of a spec's applicable verification dates |
| `mca/surface/view.ts` | both feed the existing three-level `Assurance`; `ConformitySummary` moved the top-line counts out of the `.tsx` |
| `admin+/mca.tsx` | a "Where the text came from" cell and a last-read line on every card; a second summary alert |

**No fourth assurance level.** An unrecorded origin and an ageing reading are
both what `partly-verified` already means — part of what this card claims is not
re-executable. A source from a publisher that *reproduces* the law is not a
partial claim but a failed one, so it lands at `unverified` beside a stale
digest. The argument is in the `Assurance` comment, where the next person to
want a fourth level will find it.

**No verification date was changed and nothing was re-vendored.**

## Decisions taken here that the brief did not settle

- **180 days.** The largest window that guarantees one human reading between the
  two conventional effective dates (1 January, 1 July) these acts arrive on. A
  year lets a full session's amendments land, take effect and sit unread; ninety
  days makes the page amber for everything, which trains a reader to ignore the
  colour.
- **Letterhead does not count as a record of origin.** It travels with the text:
  a reproduction of 10 CCR carries the Department's own heading exactly as the
  Department's PDF does, and the Georgia capture almost certainly did too. So
  California's and New York's cards now read `origin-not-recorded` — which is
  uncomfortable and is the honest answer. `sources-are-primary.test.ts` keeps
  letterhead as its **floor** (a file must show *something*); origin strength is
  a sharper question asked separately.
- **A government-host URL in the retrieval statement is what "official" means.**
  Prose ("published by the Georgia General Assembly") is a sentence anyone can
  write; the host that served the bytes is a fact about the retrieval.
  `kslegislature.org` is allowlisted beside `.gov` and `.state.xx.us` because
  Kansas's own legislature publishes from a `.org` — the one entry that is a
  claim rather than a pattern.
- **`entryFor` takes an options object** (`now`, `origin`). `now` because a
  stale branch computed from the wall clock is reachable only by waiting six
  months, and this package has already shipped two assertions that passed
  vacuously for a day. `origin` is a narrower seam, there for one branch: no
  file in `sources/` is from a secondary publisher, and committing a fake
  statute to `sources/` to reach that branch would be worse than the untested
  branch (README rule 1). `conformitySurface` never passes it, and a test pins
  that the default is the derived verdict.

## Where it stands

- `packages/bizrethink`: **2726 tests green**, `tsc -p tsconfig.typecheck.json`
  clean, `biome format` clean.
- `apps/remix`: `npm run build` green (that is `typecheck && react-router build`;
  bare `react-router build` strips types and would pass over a real type error).
- The eleven states' cards: **2 of 11 sources record a retrieval** (Georgia,
  Texas), 0 stale readings on 2026-09-08, and — as before this change — **no
  state reaches `verified`**.

## What this does not fix

- **It cannot detect an amendment.** It bounds how long one can sit unnoticed.
  Closing that needs a regulator feed or a scheduled re-read, and neither exists.
- **It cannot tell a complete source from a truncated one.** The Georgia capture
  was secondary *and* truncated, and truncation is the half that made it
  dangerous. A complete capture from a secondary publisher, or a truncated one
  from an official publisher, both pass this.
- **Nine files still record no retrieval**, including California's and New
  York's. The fix is a re-vendoring with a header naming the publisher — which
  is a source change with a digest consequence, deliberately out of scope here.
  Utah's header already names `le.utah.gov` as the publisher that would make it
  as strong as Georgia's.
- **CORRECTED 2026-09-08: the production image DOES carry `mca/sources/`.**
  This note first said it did not, and that the container would therefore read
  SOURCE MISSING on every card. That was true when
  `mca/provenance/source-text.ts` wrote its long comment about the deployment
  gap, and it stopped being true when the Dockerfile line was added —
  `docker/Dockerfile:162` copies `mca/sources`, and line 173 now copies
  `mca/clauses/source-documents` for the clause library.

  Recorded as a correction rather than deleted, because the mistake is worth
  keeping: the claim was carried forward from a source comment that describes
  the problem it was written to fix, and read as a statement of current fact.
  A file people trust for "where things stand" is exactly where that goes
  wrong, and re-reading the Dockerfile takes ten seconds.
