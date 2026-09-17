# docs/mca-vertical-purpose — ADR 0025, what this vertical is for

Documentation only: the ADR and one row in the ADR index. Stacked on
`docs/mca-single-producer` (#294).

## Why it exists

The purpose was recorded in pieces across ADRs 0008 to 0024, and in the gaps
between those pieces it drifted somewhere nobody chose: **the only artifact the
builder can render is a filled deal document.** Not because that was decided — a
per-deal interview had already been rejected once — but because the first
renderer needed something to put in the fields, and nothing afterwards
questioned it.

The owner stated the purpose directly. Checking the code against it found three
divergences. This settles all three.

## The three divergences

**1. The artifact is a template; a deal never enters this vertical.** The
transaction path becomes a preview driven by **specimen values**, and stops
accepting a merchant's legal name, guarantors, signers, deposit account or
funding figures. Amends [ADR 0020](../../adr/0020-mca-decisions-consolidated.md)
§6.3, which recorded a per-deal fill as *stateless*; there is now no per-deal
fill at all.

The consequence worth naming: **the question of merchant identity at rest in
Pacta stops existing.** It has been circled repeatedly — in the schema's refusal
of unmasked identifiers, in a closed pull request, in the stateless rule. A
vertical that never receives a merchant's details needs no rule about keeping
them.

**2. Registration and licensing duties are in scope**, held exactly as the
disclosures are: verbatim from the vendored source, cited to section, re-matched
on every run, verified never approved, and surfaced as what the statute says
rather than as advice. This reverses the exclusion in `mca/content/types.ts`.

**3. Keeping the library current has no mechanism.** The provenance checkers
verify that our vendored copy still matches *itself*. That catches our drift
from the copy; it cannot catch the copy drifting from the law. A monthly
change-detection job is the answer, **deferred on purpose** so the template
builder finishes first, and written into the ADR with what it must do so it is
not dropped.

## Verified rather than asserted

- `transactions/README.md` states the deal-shaped intent in its own words
  ("enter the transaction facts, preview the filled draft"), and `McaDraftInput`
  carries merchant identity, guarantors, signers and funding figures;
- `mca/content/types.ts` narrows label checks to exclude "definitions,
  exemptions and registration duties" — the exclusion divergence 2 reverses;
- `mca/statutes/ct-va-obligations.ts` exists, covers CT and VA only, and usefully
  records obligations it *cannot* check;
- nothing in `mca/provenance/` or `mca/sources/` records a retrieval date or
  re-checks an official source.

## What it changes about work in flight

Nothing's direction. The parity measurements, the injector and the publication
record are all about producing and recording templates, and none of them assumes
a deal.

It does make the next piece smaller: the merchant-ready renderer stops being a
*second* mode beside the draft renderer and becomes **the** renderer.

## Also in this branch

A note in the ADR index that **0022 is deliberately unused** — drafted for a
pull request that was closed without merging, and not reissued, so that nothing
written against it can be misread later.
