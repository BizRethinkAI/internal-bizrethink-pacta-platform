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
