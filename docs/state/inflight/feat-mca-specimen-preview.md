# feat/mca-specimen-preview — the preview is the template, with specimen values

**Stacked on `feat/mca-template-renderer` (#297).**

ADR 0025 decision 1: the artifact is a template and a deal never enters this
vertical — so there is nothing real to fill a preview with, and nothing real
should.

## One layout, two fillings

`renderTemplateDocument` now takes a **render mode** saying what goes in each
kind of slot. `PUBLISH_MODE` puts a `«marker»` where a caller prefills and a
native `{{SIGNATURE, rN}}` where a party signs. `PREVIEW_MODE` puts a specimen
value and a printed rule.

**A preview built by a second code path is a preview that can disagree with the
thing it previews** — and it would disagree exactly when somebody is relying on
it, while reviewing a document before publishing it. The layout is shared; only
the filling differs.

## A preview cannot become a working template by accident

The safety property, and the reason it is a separate artifact rather than a flag:

- **no marker**, so `injectMcaWidgets` has nothing to place;
- **no `{{SIGNATURE, rN}}`**, so Documenso's extraction at upload makes no signer
  field — asserted by running upstream's own extractor and getting `[]`;
- **a banner on every page** saying specimen values, not for signing.

Upload one by mistake and it is inert: a document that goes nowhere, rather than
one that looks like it works and collects nothing.

## Specimen values

Realistic in shape, unmistakable in content. A figure has to be the length of a
figure or the layout lies — `$12,345.67`, `(555) 010-0100`, a real-length
address. Party names say `Specimen`, so a reviewer is never in doubt whether
they are reading somebody's deal.

Deterministic: one binding always gets the same specimen, so two previews of one
template are comparable and a diff between them means something.

Anything without a named specimen falls back to its own label, prefixed —
`Specimen — Merchant Legal Name`. A specimen that *looked* like a real answer
would be worse than an obviously empty one, because a reviewer would try to
check it.

## Not in this change

`transactions/` is still present and still accepts deal input. This is the
replacement for what it does, and removing it is the next step — a change that
touches the workspace UI and the download endpoint, and deserves its own review
rather than riding along here.
