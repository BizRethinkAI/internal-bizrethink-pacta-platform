# feat/mca-counsel-briefing — the counsel review link had no context

## Why

The MCA review link was opened as counsel would open it. What came back was a
funder's name, a clause count, a four-line "what you are reading" note and 101
paragraphs of contract text.

An attorney reading that has not been told what business this is, who is asking,
what they are being asked to decide, what an approval would cause, which of six
documents they are holding, what is deliberately *not* in front of them, or —
worst, because the page collects nothing — where a comment goes. Every one of
those is answerable from what the package already knows.

Two defects, one of which is only visible from outside:

1. **No briefing.** The page assumed a reader who already had the context, which
   is exactly the reader it is not for.
2. **`clause.heading || clause.slug`.** Forty of the 204 clauses carry no
   heading in the document, so an attorney was shown `frpa.holdback-explainer`
   formatted as if the contract printed it.

## What changed

- `mca/review/briefing.ts` — seven sections, derived per agreement rather than
  typed into the route. The six instruments are not interchangeable and prose in
  a page renders the same sentences for all of them.
- The route renders it, and shows the slug as a citation reference in the margin
  instead of as a heading.
- The router resolves the link's sender so the briefing can end with a name and
  a reply address, and passes the counts so the briefing cannot contradict the
  clauses below it.

## Not in this PR

- The interview (`mca/interview/`) is still not started; Section 1's merchant
  and funding grid is still captured nowhere in Pacta.
- Counsel engagement itself remains parked at the owner's request.

## State

54 new tests, 1861 MCA tests green, `apps/remix` typecheck clean.
