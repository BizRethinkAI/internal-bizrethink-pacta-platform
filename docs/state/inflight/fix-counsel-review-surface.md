# fix/counsel-review-surface

**What an attorney sees on `/mca-clause-review/:token`, brought into line with
[ADR 0012](../../adr/0012-the-baseline-document-is-input-not-specification.md)
— and asserted, for the first time.**

## Why

ADR 0012 decided on 2026-09-10 that the two adversarial DOCUMENT reviews'
findings *"stop being shown to a reviewing attorney as annotations on the
product"*, and its **Questions that are closed** table answers *"Do findings
render to reviewing counsel? **No.** They are drafting input."*

**The page still rendered them.** The decision was recorded and the code change
never happened, and it was found by the owner opening the link — not by any of
the 2,476 tests, because **not one of them asserted anything about what this
page renders.** That absence is the root cause, so the test came first.

What was on the page:

- **Annotations describing text that no longer exists.** The findings audited
  `Lombard_FRPA_v4`; every FRPA clause has since been rewritten. Under §2.1 the
  clause now reads *"Merchant makes no representation or warranty as to the fair
  market value of the Purchased Receipts"*, and the note beneath it said §2.1
  *"makes the merchant agree that the Purchase Price equals the fair market value
  of the Receipts"* — **the annotation asserted the opposite of the clause it sat
  under.**
- **Internal working papers.** Two rendered findings named `CONTRACT_INDEX.md`
  and told outside counsel our own entity records are *"unverified"*. They landed
  on FRPA §4.9 and §4.10.
- **A briefing paragraph pointing counsel at them** — *"40 of the 100 clauses
  below carry a finding that nothing has yet disposed of… marked in place"* —
  which to an attorney reads as *40% of this agreement has known unresolved
  problems and you are being asked to approve it anyway*.
- **A numbering sentence in the framing ADR 0012 retired** — *"Clause numbers are
  the document's own, never invented"* — carrying a count that was never the
  count of unnumbered clauses. It said forty; forty is the number of clauses with
  no **heading**. Twenty-nine carry no number, nine of them in the FRPA.

## What changed

| file | what |
|---|---|
| `packages/bizrethink/mca/review/counsel-view.ts` | **new.** The counsel payload, extracted from `openLibrary` as a pure function so a property can be stated over it without a database |
| `packages/bizrethink/mca/review/__tests__/counsel-surface.test.ts` | **new.** 89 assertions over the payload of all six agreements and over the route source |
| `packages/bizrethink/mca/review/briefing.ts` | `history` section deleted; numbering paragraph rewritten; `outstandingCount` and `findingsReadable` gone from the input, `unnumberedCount` added |
| `apps/remix/app/routes/_recipient+/mca-clause-review.$token.tsx` | findings block and the unreadable-register alert removed; the stale component docstring corrected |
| `packages/bizrethink/mca/server-only/trpc/clause-library-router.ts` | `openLibrary` now returns `counselReviewView(...)` |

The route is a **BizRethink-added file** — verified against
`overlays/BIZRETHINK-OWNED.txt` line 111 and `git log --diff-filter=A` — so it is
edited directly and needs no overlay.

### `outstandingFindings` is no longer computed or sent

Not sent-and-hidden. A field the page declines to paint is still in the JSON the
browser holds, still in the network tab, and still readable by anyone holding an
unauthenticated review link. The register itself is untouched, is still drafting
input, and is still read where it has consequences: `findingsHold` /
`approvalBlocks` refuse an approval on the staff side, and `/admin/mca-library`
still shows the findings.

`findingsReadable` went with it. It existed so an empty findings list would not
read as a clean bill; with no list on the page it named a register the reader
cannot see, which either invites a request for it or reads as something withheld.

### Two existing assertions were deleted rather than weakened

Both had ADR 0012 remove their subject. Neither was touched to go green — each is
recorded in place, in a comment, where it used to be:

- `review/__tests__/briefing.test.ts` — *"does not claim earlier findings are
  accounted for when the register is unreadable"*. The `history` section it
  asserted over no longer exists.
- `clauses/__tests__/approval-is-reachable.test.ts` — *"tells the reviewer when
  the earlier reviews could not be read"*, which required `findingsReadable` on
  the counsel page. **Rewritten to assert the half that survives**: the register
  still HOLDS an approval, on the staff page, which is where the decision is
  taken.

## Red first

The new test was written against the unchanged behaviour (after a
behaviour-preserving extraction of the payload, so that a property could be
written at all). **47 assertions failed, 36 passed.** The 36 green were the
detector-vacuity group and the staleness group — both describe behaviour that
already worked and both had to be green from the start or the rest would mean
nothing.

A further **6 went red** when the last assertion was added — *"the briefing does
not present the clauses as quoted from a document"*, against *"The text is quoted
exactly as the document publishes it"*, the same retired framing one paragraph
above the numbering one. **53 red in total**, none of them fixed by editing a
test.

Three of the six agreements passed *"ships no repository path"* while red, which
is the argument for stating these over the set: the leaked filename was on the
FRPA only by accident of which document had been read.

Every detector is proved to fire against the real strings that were on the page —
the register's own `CONTRACT_INDEX.md` finding — and proved not to fire on any of
the 203 clause bodies, slugs or `requiredBy` citations.

## The staleness banner — investigated, not touched

**It is correct and it is firing for the right reason.** `reviewIsStale` compares
the `libraryFingerprint` pinned when the link was minted against
`mcaLibraryFingerprint(libraryFor(instrument))` now; the FRPA clauses were
rewritten after the link went out, so it differs. The mechanism is now pinned in
**both** directions by `counsel-surface.test.ts`, so it cannot be quietly
loosened.

What the investigation found, and did **not** fix:

1. **There is no re-issue.** `share` mints a new row with a new token; the old
   link has to be revoked and the new URL sent out of band. Nothing re-pins an
   existing link to the current text.
2. **Re-issuing costs counsel her own findings.** `openFindings` is scoped by
   `reviewId`, so a fresh link shows none of what she recorded on the old one.
   They still block approval (`approve` counts by slug, across links) and staff
   still see them — but the attorney does not.
3. **Nothing notices.** `share` sends no email and there is no alert; `stale` is
   visible only to somebody who opens `/admin/mca-library`. **The only remedy is
   a human noticing**, which is a workflow gap rather than a bug.
4. **The banner's second sentence overstates.** *"Ask for a fresh link before
   recording anything against what you read here"* — but the page shows the
   CURRENT text, and `recordFinding` fingerprints the finding against the current
   resolved clause. Her reading and her finding are consistent; what moved is the
   text relative to the engagement she was briefed on. The copy was left alone: it
   is the check's wording, and changing it was not this PR's job.

## Not done here, deliberately

- **No renumbering, no `kind: 'explainer'`, no touching `McaClause.number`** —
  ADR 0011 phases 1–4, another agent's work. The briefing now states the true
  unnumbered count and promises no numbering work.
- **No page redesign** — no table of contents, cross-reference links, defined-terms
  index or download.
- **No clause body edited. No salutation changed** (*"For Open AI"* is the
  owner's test label).

## Gates

- `npx tsc --noEmit -p packages/bizrethink/tsconfig.typecheck.json` — clean.
- `npx biome format packages/bizrethink` — clean but for the pre-existing
  `font-data.ts` info.
- `npx vitest run packages/bizrethink` — **181 files / 3,836 tests green with
  four files excluded, and none of the exclusions is this PR's.** See below; CI on
  a clean checkout is the gate that counts.
- `npx tsc --noEmit -p apps/remix/tsconfig.json` — 0 errors, run because the
  route is a `.tsx` the bizrethink typecheck project does not cover.

### Another session was writing into this checkout at the same time

Mid-task, `packages/bizrethink/mca/clauses/{equipment-lease,subscription}/*.ts`,
`clauses/__tests__/a-default-judgment-needs-a-served-defendant.test.ts` and a new
untracked `clauses/__tests__/the-twins-cannot-undo-the-frpa.test.ts` appeared in
the working tree, and `clauses/__tests__/coverage.test.ts` went red with them. They are red in progress (TDD, presumably ADR 0011 work) and
`trpc-schema-parity.test.ts` fails on `main` too, locally, with
`msg is not a function`. **Only this PR's files were staged.** A full local suite
verdict is not available while two sessions share one checkout.
