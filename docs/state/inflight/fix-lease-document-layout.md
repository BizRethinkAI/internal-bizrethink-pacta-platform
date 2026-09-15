# Lease document layout — author handoff

Author `lease-layout-20260915`; branch `fix/lease-document-layout`, stacked on
`fix/lease-send-distributes` (#233) at `f5edb6ad1`. Task #237, PR 1b. Started by
`lease-send-20260914` at the repository owner's direction; PR 1a (#238) is the
sibling. The author does not merge, deploy or consolidate STATE.md.

## What was wrong

A page-by-page read of the pilot lease package (seven documents, 29 pages,
rendered from production answers) found these in the lease renderer. Every unit
test passed while the pages did them.

1. **Execution line.** Every document read "IN WITNESS WHEREOF, the parties have
   executed this Lease as of the date first written above." No date is written
   above anywhere; clause 1 defers the effective date to the Execution clause,
   and 13.5 makes it the date of the last signature. It said "this Lease" on the
   addenda and on the flood disclosure too.
2. **Dropped section head.** When a section's first clause was longer than
   `SHORT_ENOUGH` (800), both arms of a conditional returned
   `[headingRow, body]` and the section head was never emitted — 9.2 ran into
   10.1 with no "10 DEFAULT AND REMEDIES". In the checked-in Picana matter too.
3. **Stranded heading.** A long clause's heading was a free sibling of its body,
   so "11.4 ASSOCIATION AMENITIES" sat alone at the foot of pilot page 12. The
   existing orphan guard rendered only the Picana matter, which paginates
   differently, and passed.
4. **Footers** printed `PACTA · <document key>`, e.g.
   "PACTA · ADDENDUM:HOA.GOVERNING-DOCUMENTS-RECEIPT".
5. **Addendum and disclosure heads** were clause-library categories — "RULES AND
   ASSOCIATION" over the receipt, "STATUTORY DISCLOSURES" over the flood
   disclosure — indented by an empty number column under the document's title.
6. **Initials** sat under "Date:" on the signature page only, so they
   acknowledged no page.

## What changed (`lease/render/lease-document.ts`)

- **Testimonium:** "IN WITNESS WHEREOF, the parties have signed this
  Lease | Addendum | Disclosure on the dates shown below their signatures." —
  from `spec.kind`. No new legal effect: it points at the dates 13.5 already
  makes operative.
- **Long clauses:** the section head is emitted again for a long opening clause,
  and both heads carry `minPresenceAhead` (three body lines; plus a clause-head
  row for a section head). `minPresenceAhead` was ruled out on 2026-09-05
  because react-pdf emitted -2.2e+22; that sentinel was the lineHeight
  compounding bug patched on 2026-09-06
  (`patches/@react-pdf+layout+5.2.0.patch`). It renders cleanly on the Picana
  matter, the pilot package and every lease test fixture. Short clauses keep the
  `wrap: false` binding unchanged.
- **Footer:** the document's title (`spec.title`), no key, no product name.
- **Unnumbered sections print no head.** Addenda and disclosures go straight
  from the recital to the body; the title is the head.
- **Per-page initials in the page foot** on every addendum page, one INITIALS
  field per signer, in recipient order, each on a short rule above the foot's
  hairline. `fixed` repeats the foot on every page, so upstream's extractor makes
  one field per page per signer. Tokens are set at 9pt in 90pt cells
  (`flexShrink: 0`) — each widget ~68 x 10pt — four per line; a fifth signer
  wraps to a second line and `initialledPaddingBottom(signers)` raises the body
  by 23pt a line. Tokens come from `buildSignatureBlocks`, so numbering cannot
  drift from the signature cells. The cells no longer carry initials. The lease
  body and the flood disclosure are not initialled (unchanged `withInitials`).

## Validation

- **Red first.** On both packages: execution line, footer, category heads and
  initials all failed; section head "10" missing on both; the orphan guard
  failed on the pilot (11.4). A six-signer initials test first passed
  VACUOUSLY — with cells squeezed, every token wrapped, NO field was extracted
  and the loop over "pages with fields" ran zero times; rewritten to count
  fields per page, it failed (0 of 12), then passed after the rows fix.
- **Pilot fixture:** `lease/__tests__/pilot-package.fixture.json` — the pilot's
  render input with every person, email, postal address, pet and occupant
  replaced by fictional values of the same length. Verified to break every page
  of all seven documents at the same line as the original before being used.
  `heading-orphans.test.ts` now runs on it as well as on Picana.
- New `lease/__tests__/document-layout.test.ts` (14 tests) and
  `lease/__tests__/page-text.ts` helper.
- `lease/` + `regression-tests/`: 166 files, 1,946 tests pass.
  `typecheck:lease` clean. Biome clean on changed files apart from three
  warnings already in `lease-document.ts`.
- Rendered the real pilot package with this branch plus `whiteOutSigningTokens`
  and read the changed pages; overlaid extracted field boxes on addendum pages
  to confirm initials, signature and date fields land on their rules. Page
  counts: lease 16 (unchanged; pp. 12–13 re-broken), receipt 3 → 2, others
  unchanged.

## Integration with PR 1a (#238)

1a replaces the two `text(<clause>.text, styles.bodyText, …)` body calls with
`clauseBody(…)` and adds an import. This PR leaves both call sites and
`styles.bodyText` / `styles.sigName` untouched (the long-clause branch reuses
the existing `body` variable), so the expected conflict is those lines only.

## Limits

- Pages that exist only for the execution block (lease p.16; the flood
  disclosure's p.1 ends two-thirds full) are unchanged.
- The lease body is not initialled per page; only addenda were, and still are.
- Checkbox gaps, election marks, spelling, date formats and list punctuation
  belong to other PRs.
