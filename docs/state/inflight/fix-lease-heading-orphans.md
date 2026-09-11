# fix/lease-heading-orphans

A heading printed at a page foot with its body overleaf, in five places in the
rendered Picana lease. Found by looking at the pages, which is the only way it
can be found: every unit test passed while the document was doing it.

## What was wrong

`cfffbd641` bound a heading to its body in a `wrap: false` node, but only where
the clause was under **420 characters**, reasoning that "a long body fills the
page under its own heading" so an orphan there matters least.

The rendered lease disproved it. `hoa.compliance` is 732 characters, and page 10
ended with **two** stacked headings — "11 RULES AND ASSOCIATION" and "11.1
ASSOCIATION RULES" — and no body under either. A section head could strand
itself the same way, because it was emitted as a sibling of the clauses it
introduces: "4 RENT AND CHARGES" sat alone at the foot of page 3.

## What changed

1. **Threshold 420 → 800.** Chosen by measurement, not by argument: a sweep of
   420/600/700/800/1000/1200/3000 against the real lease.
2. **The section head now renders inside the first clause's bound unit**, so a
   page break cannot separate a section title from the clause it introduces.

## Why 800 and not "bind everything"

My first attempt raised it to 3,000 — bind every clause — on the reasoning that
the white space is the same either way, since a bound clause that does not fit
moves whole to the next page and leaves the gap an unbound one would have left.

**That is wrong for large blocks, and the render showed it.** An unbound clause
*splits* across the break and fills the page; a bound one cannot. At 3,000 the
all-caps §83.49 disclosure jumped whole and left page 5 two-thirds empty —
trading five orphans for a worse defect.

800 is where the sweep put orphans at zero with the mildest gap:

| threshold | real orphans | pages | worst mid-document page |
|---|---|---|---|
| 420 | 3 | 14 | 17 lines |
| 600 | 2 | 14 | 21 |
| 700 | 0 | 15 | 17 |
| **800** | **0** | **15** | **21** |
| 3000 | 0 | 16 | 13, and visibly bad |

## The guard

`regression-tests/heading-orphans.test.ts` renders the lease and asserts no page
ends with a heading. Verified by reverting the fix: it reports exactly the five
real orphans, and passes with the fix.

Two things it got wrong first, both worth knowing for the next PDF assertion:
- **pdfjs joins a heading's number and text with ONE space.** The patterns were
  written against `pdftotext -layout`, which pads to column position, so
  `\s{2,}` matched nothing — including the real orphans. The test passed on
  broken code until this was fixed.
- **Section heads are tracked**, so they reach pdfjs letter-spaced —
  "7 U T I L I T I E S". The contents page is recognised with whitespace
  stripped for the same reason.

The renderer is used by the lease vertical only; MCA has its own path.
