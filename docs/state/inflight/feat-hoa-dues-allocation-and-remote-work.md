# feat/hoa-dues-allocation-and-remote-work

**PR:** #TBD. Two tenant-found drafting defects, the questions that fix them,
and the renderer bug that surfaced while fixing them.

## What a tenant found

Harsha Setty read the pilot lease as the tenant — the counterparty reading the
document he is being asked to sign, which is adversarial scrutiny for free.
Three comments on the first pass.

1. `use.no-alterations` — "what credit for approved alterations?" A negotiating
   position, not a defect. No library change.
2. `use.residential-only` — forbade "any business or commercial purpose", which
   on its face prohibits a physician reading charts at his kitchen table.
   Overbroad; every professional tenant breaches it on day one.
3. `hoa.compliance` — **the serious one.** It bound the tenant to "all of the
   obligations of the Owner under those governing documents". An owner's
   obligations under a declaration INCLUDE PAYING THE ASSESSMENTS. He asked who
   pays; the lease could not answer while containing language suggesting he did.

## Where each fix went, per the boundary rule

- **Library text** (a drafting error, affects every lease): narrowing
  `hoa.compliance` to use/occupancy/conduct obligations; the remote-work
  carve-out, bounded by no visitors, no employees, no signage, no stock, and
  subject to the association documents.
- **Questions feeding variables** (negotiated terms, not law): who pays the
  association assessments; whether the property is in a CDD, its name, and who
  pays its assessments. Hard-coding "Landlord" would repeat the mistake
  `hoa.lease-requirements` already records.

`cdd.assessments` is its own `US-FL` clause on its own `hasCdd` fact — a
community development district is a unit of local government under Ch. 190, not
the association, and a property can be in one, the other, both or neither.

**The pilot matter was factually wrong**: Estancia at Wiregrass HAS a CDD (its
"Suspension and Termination of Access Rule" is in the governing-document set the
tenant signs a receipt for). `hasCdd` corrected to true.

## The renderer bug this uncovered

Adding a clause crashed every lease PDF: `unsupported number:
-2.2127632876551446e+22`.

`lineHeight` is the only non-idempotent style handler — a unitless ratio is
resolved by multiplying by `fontSize`, and it cannot tell `1.5` from the
`16.5` it already produced. `@react-pdf/layout` re-runs the resolver on the
already-resolved tree once per page, so line-height grows as
`fontSize ^ pageCount` until it passes pdfkit's 1e21 ceiling.

The sentinel is `Math.fround(1.5 * 11 * 7 ** 25)` exactly.

**The variable is PAGES, not content.** 13 pages rendered, 14 crashed. The lease
sat at 13. Hours went into clause length and an orphan-control character
threshold first — both dead ends, because both left the document at 14 pages.
It also explains the file's folklore about six of eight typefaces "crashing":
wider metrics, more pages, over the ceiling.

**A live production bug it also fixes:** every lease PDF shipped so far has an
invisible footer on every page, its translate degrading from -4922 on page 1 to
-4.5e20 by page 13. Now correct on every page.

Fixed by `patches/@react-pdf+layout+5.2.0.patch` (patch-package, already this
repo's convention). No overlay: overlays cover Documenso files, this is a
third-party dependency. No constants, no thresholds — line-height resolves once,
as in CSS. 784 clauses / 186 pages renders clean.

## Verified

1053 tests / 100 files pass, typecheck clean, and the guard fails with the exact
crash when the patch is reversed. Content streams differ from before by exactly
13 lines — the footer translates. Body text byte-identical; page counts
unchanged.

## Not in scope

- Whether the six rejected typefaces fail for this reason (strong inference via
  a font-size proxy, not tested on the real faces).
- Whether the painted-rules and `minPresenceAhead` workarounds in
  `lease-document.ts` were fighting the same effect. If so, some of that design
  constraint may now be liftable.
- Reporting upstream: https://github.com/diegomura/react-pdf/issues/3277 is the
  same bug in a different document.
