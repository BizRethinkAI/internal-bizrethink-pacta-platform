# fix/mca-source-headers — the other nine sources say who published them

**Branch:** `fix/mca-source-headers`. **PR:** #TBD.

Seven vendored sources had no provenance header. They do now.

## What was actually wrong

**Not the sourcing.** Every one of these is unmistakably an official artefact —
California's DFPI rulemaking, New York's adoption signed by the Superintendent,
Florida's House letterhead, Kansas's "Session of 2024 / SENATE BILL No. 345",
Louisiana's **ENROLLED** text, Missouri's "TRULY AGREED TO AND FINALLY PASSED",
and the Connecticut Department of Banking's dated guidance. Nobody pulled these
off an aggregator.

**The recording.** Nothing in the repository said so, so nothing could check it.
Same shape as `CT-CGS-36a-861-872.txt` and `VA-Code-6.2-2228-2238.txt`, whose
provenance was right and lived only in a commit message.

## Why the header says "Publisher", not "Retrieved from"

The deep links were never written down and are not recoverable. Tried on
2026-09-08: Kansas's `kslegislature.org/li/b2023_24/measures/sb345/` 301s twice
into a 404, and a DFPI regulations path 404s outright. Legislatures reorganise.

Writing a guessed URL would have been worse than writing nothing — if a guess
resolved, it would serve **today's** text, and if the rule has been amended since
we vendored, the header would point at a document that differs from the one we
hold. That is Georgia's defect with a better-looking header on it.

So each file records the publisher and the publisher's site, dated today, as a
statement about **what the document is**. It is deliberately not a claim that
these bytes came from that host on that date. Only a fetch recorded at the
moment of fetching can say that — which is exactly what CT and VA have and these
do not, and the two-tier distinction is now visible in `sources/README.md`.

## The digests moved and no date did

Adding a header changes the file, so seven digests were recomputed across eleven
specs (California's and New York's are each shared by three forms).

**The statutory text is byte-identical in all seven, asserted before any digest
was touched.** Same treatment and same reason as `fix/ga-primary-text`: *"the
digest broke, I updated it"* is the move this mechanism exists to make somebody
justify, so the justification is written into each file rather than into a
commit message nothing reads.

`git diff` over `mca/` shows zero changed lines matching `verbatimVerifiedAt`,
`structureVerifiedAt` or `lastReadAt`.

## What this does and does not buy

**Does:** every vendored source now states its publisher where a check can read
it, and `sources-are-primary.test.ts` sees a real origin line on all of them
rather than falling through to letterhead.

**Does not:** it cannot prove where the bytes came from, cannot detect an
amendment, and cannot tell a complete copy from a truncated one — which was the
genuinely dangerous half of Georgia. Closing the first of those means a
deliberate re-fetch that diffs against what we hold; that is a separate piece of
work and it is where these nine become as strong as CT and VA.

## Interaction with #134

#134 classifies source strength from these headers and currently reads nine of
eleven as `origin-not-recorded`. After this lands that classification changes —
whichever merges second should re-run its expectations. #134's judgement that
letterhead alone is not proof of origin is **unchanged and correct**; this PR
supplies the thing letterhead could not.
