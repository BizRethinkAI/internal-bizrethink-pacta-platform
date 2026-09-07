# fix/ga-primary-text — Georgia was verified against a secondary source

**Branch:** `fix/ga-primary-text`.

## What was wrong

`ga.ts` carried `verbatimVerifiedAt: '2026-09-06'` against
`GA-OCGA-10-1-393.18.txt`, which was a **browser capture of law.justia.com** —
a secondary publisher — and was **incomplete**. The file's own header said so:

> the primary text is not reachable from the sandbox (Justia 403s automated
> fetches; the Georgia legislature's document API returns an unrelated
> resolution), so it was captured through the browser. Definitions
> (subsection (a)) and the full text of subsections (b)-(k) are on the [other
> pages]

So **"advance fee" — the term the broker prohibition in (f)(1) turns on — was
defined nowhere in what we held**, while the spec claimed verification and
`/admin/mca` rendered Georgia's date beside California's with no caveat.

## Why nothing caught it

Every check in this package asks whether the text still matches. **None asked
where it came from.** A digest over a secondary source is perfectly faithful —
a faithful record of the wrong document.

It was found by a refutation pass over a review of something else entirely,
which is not a repeatable way to find anything.

## The fix

**Senate Bill 90, AS PASSED**, from the Georgia General Assembly's own document
API at `legis.ga.gov/api/legislation/document/20232024/219440`. The enrolled
act. It contains subsection (a)'s definitions including `'Advance fee'`, and the
full (b)–(k).

The earlier note that the legislature's API "returns an unrelated resolution"
was a **wrong document id**, not a broken API.

The verification date was **re-earned, not carried over**: all six lettered
disclosure items and the (f)(1) prohibition were re-checked against the enrolled
text before the new date was written.

## The guard

`__tests__/sources-are-primary.test.ts` — every vendored source must show where
it came from, and must not name a secondary publisher as its origin. A header
may *discuss* a secondary source it replaced; the Georgia file's history is
worth keeping.

It immediately found two more: **`VA-Disclosure-Form.txt` and
`UT-Title-7-Ch-27.txt` had no recorded provenance at all.** Rather than widen
the check until they passed, both now carry headers stating what is actually
known — including, in plain words, that the original retrieval source is
unrecorded. Utah's names `le.utah.gov` as the official publisher that would make
it as strong as the rest.

Two digests were re-computed because those headers changed the files. The
statutory text is byte-identical, so `verbatimVerifiedAt` stands rather than
being re-stamped — recorded in the code, because "the digest broke, I updated
it" is exactly the move this mechanism exists to make someone justify.

## Still open

Georgia's own `/admin/mca` card said nothing about any of this, and the view
model has no notion of source strength. A reader could not have told Georgia
from California. That is the summary-honesty decision already open on #118's
review, and this is its sharpest instance.
