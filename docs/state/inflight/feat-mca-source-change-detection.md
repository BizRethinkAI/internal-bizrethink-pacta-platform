# feat/mca-source-change-detection — ADR 0025 §3

The hole the ADR named: *"nothing detects that a statute has changed … For a
vertical whose stated primary responsibility is keeping the library current,
that is a hole in the middle of the purpose."*

The existing provenance checkers verify that a stored copy still matches
**itself**. That catches our drift from the copy and can never catch the copy
drifting from the law.

## What the owner chose, and why the scope looks like this

The ADR's first requirement — compare the official source with the vendored copy
— could not be built as written, because the data was not there:

| needed | had |
|---|---|
| a retrieval URL per source | **0 of 19** |
| when it was last confirmed | **5 of 19** |
| publisher / site | 13 of 19 |

Several headers say why, in words: *"The deep link this file was fetched through
was not written down at the time and is not recoverable — the Kansas and
California paths tried on 2026-09-08 now 301 into 404s."*

So: **metadata first, and the job reads it.** Sources with a URL and a confirmed
baseline are checked automatically; the rest are reported as needing a person,
with their publisher, so the report is honest about its own coverage rather than
claiming to verify nineteen sources and verifying none.

## Three things running it taught me, in order

**1. Comparing our copy against the page is meaningless.** The first version
diffed the vendored text against the fetched page and reported `DIFF` for all
three fetchable sources — ours is extracted text with a header we wrote, theirs
is HTML. They can never match. A check that cries wolf monthly is one nobody
reads, which is the failure the ADR is most worried about. The comparison is now
**the page now against the page when a person last confirmed it**.

**2. The sources are evidence and must not be edited.** The second version wrote
the provenance block into the source files. Four tests in
`provenance-honesty.test.ts` failed, correctly: it pins each file's digest so a
verification date is bound to the exact bytes verified — *"it proves the bytes
have not moved since they said they did"*. Writing our metadata into them moves
the bytes and breaks that binding. Provenance now lives in a **sidecar**,
`mca/sources/provenance.json`, and the files are untouched.

**3. The filter had a silent blind spot.** It matched `*.txt` and skipped
`VA-Disclosure-Form.pdf` — a prescribed form — without saying so. Exactly the
failure §3 warns about. It now watches every source and reports one it cannot
read as one needing a person.

## A baseline is a person's assertion, not a machine's

A URL alone does not make a source automatic. `sourceDigest` says *"I read this
page and it is the statute we stored"*. A machine taking that baseline on its
first run would silently bless a change nobody had seen, so nothing here records
one — all three URL-bearing sources report as needing a person until someone
does.

**No URL was looked up.** Each one in the sidecar is the one that source's own
prose header already records.

## Where it stands today

    AUTOMATIC       0   nothing has a confirmed baseline yet
    NEEDS A PERSON  19  of which 3 have a URL and need only a baseline

The run exits non-zero, which is correct and will stay that way until someone
confirms a source. That is the point: it is now visible that nineteen statutes
are unwatched, where before nothing said so.

## Still owed

- **`VA-Code-6.2-2228-2238.txt` records nothing about its origin** and I did not
  invent one — a made-up publisher on a statute file is worse than an admitted
  gap. Pinned as an exact list in the test so it can only shrink deliberately,
  and so a new source added without provenance fails rather than joining a
  tolerated backlog.
- Baselines for the three URL-bearing sources, which is a reading task.

---

## Second pass — extraction, multi-page sources, and a finding that matters

### The digest covered markup, so a cookie banner read as an amendment

`digestOf` hashed the raw HTML. `norm` collapses whitespace and folds quotes and
dashes; it does not strip tags. So the fingerprint carried script bodies, inline
styles, every attribute and any build stamp in the template, and a publisher
touching its site was indistinguishable from a legislature amending the statute.
Both read `differs`, both said "go and read this", and a check that cries wolf
monthly is one nobody reads.

`source-extract.ts` now takes the words out first, using the method the
2026-09-12 source audit recorded and used — "Python HTMLParser; scripts/styles/
noscript excluded; block line breaks; HTML entities decoded" — so that
re-extracting an audited URL can be compared against the extraction committed
then. On the live Texas page: 85,849 characters of HTML down to 14,598 of
statute.

It removes markup noise, **not chrome noise**. A cookie banner or nav label is
text the publisher renders and still lands in the digest. Narrowing further
needs a per-source anchor, which `sectionOf` already models with literal
from/to strings; not done, because whether it is needed is a question for the
first real runs and an anchor that silently stops matching is its own failure.

PDFs go through `pdftotext` — the audit's extraction — rather than
`response.text()`, which on a PDF is mojibake: deterministic, so no false alarm,
but it verifies nothing about the words. `VA-Disclosure-Form.pdf` is a
prescribed form, so its words are the requirement. The workflow installs
`poppler-utils`.

### A source is not one page

`retrievedFrom` was a single URL. Counting the deep links in the files' own
headers, `FL-Stat-559.961-9615.txt` consolidates **six** statute sections, and
CT, UT and both Virginia form extractions cite two each — only seven of nineteen
are cleanly one page. Connecticut's README says it outright: "the combined file
is our consolidation, not a document fetched from a single official URL."

`pages` replaces it. A source is checkable only once **every** page has a
baseline: checking the sections somebody got to and ignoring the rest would
report `unchanged` for a statute with an unwatched part. An unreachable page
outranks a difference elsewhere — "we could not look" is a weaker claim than "it
changed", and reporting the stronger one from a partial read would overstate
what the run established.

All 19 sources now carry `pages` (26 URLs, every digest null). Still no URL
invented: each comes from the file's own header, the audit's verified retrieval,
or that document's text sibling, and each entry's `note` says which.

### THE FINDING: half these URLs can never change

Running the extractor against Texas and comparing with the audit's evidence
turned up a difference that is not an extraction fault.

`TX-Fin-Code-Ch-398.txt` is the **enrolled bill**, HB 700 of 2025, and its
recorded URL is the enrolled bill's page. That document is finished. It will
read the same in 2030. A check watching it will report `unchanged` every month
for as long as the job runs, and would not notice Chapter 398 being amended —
because an amendment appears in the **codified chapter**, which lives at a
different URL entirely: `tcss.legis.texas.gov/resources/FI/htm/FI.398.htm`, the
audit's `tx-current-static` retrieval.

The same shape covers roughly eleven of the twenty-six pages: enrolled bills
(GA, KS, LA), an *archive* URL (`sos.state.tx.us/texreg/archive/July32026/…`),
dated snapshots (UT's `C7-27_2022050420220504.pdf`) and final rulemaking texts
(CA, NY). Watching a frozen instrument is a check that cannot fire.

A second fragility alongside it: Florida's live URLs carry the year —
`flsenate.gov/Laws/Statutes/2026/559.961` — so a rollover to `/2027/` will read
as unreachable rather than as the statute moving.

So identifying **the page where an amendment would appear** is a research step
per source, and is not the same as reusing the historical retrieval. That is
work for the baselining pass, not something to guess at here; the sidecar
records what the headers and the audit actually say, and the `note` on each
entry makes the provenance of the URL explicit so the pass can correct it.

### Validation

- 58 provenance tests; 3,711 across `mca/`; typecheck clean.
- `source-extract.test.ts` is 13 tests, red first, including that an attribute
  change does not move the digest and that an inserted "not" or a changed figure
  does.
- Ran the real job: 0 automatic, 19 needing a person — the honest state.
- Ran the extractor against the live Texas page, which is how the frozen-URL
  finding surfaced.

### Review finding #329-1 — the workflow pinned a literal Node 22

Correct finding. `.github/actions/node-install` defaults to `v24.x` and the only
literal left on main is `pr-discipline.yml: 24`, whose own comment calls it "the
last literal version left" after the 20-to-24 EOL sweep. This job added a second
one, at a *lower* version than everything else in the repo — so the first change
here relying on a 24 feature would break a monthly job nobody is watching, for a
reason with nothing to do with statutes.

Fixed with `node-version-file: .node-version` rather than the literal `24` the
review offered, because that is what `governance.yml` and
`state-ready-to-ship.yml` already do and it cannot go stale. `.node-version` is
also the real pin rather than a preference: `engines.node` is `>=24.0.0`, which
admits 25 and 26, and zod-prisma-types calls `fs.rmdirSync(path, {recursive:
true})`, which throws after 24 — `ci.yml` records the measurement.

Not the composite action: it runs `npm ci --no-audit` and `prisma:generate`, and
this job needs `tsx` alone and no database client.
