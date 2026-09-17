# feat/mca-acroform-injector — the step that makes a rendered page fillable

**Independent of #289/#290** (branched from `main`); they pin *which* widget
names a template must carry, this puts them in a page. Any merge order works.

## What it does

`injectMcaWidgets(pdf, { expect })` finds every visible `«name»` in a rendered
PDF and puts a named AcroForm text widget over it. It is the port of
`lombard-contracts/pipeline/inject_acroform_widgets.py`, which is proven on the
templates in production.

**No Poppler, no Python, no new dependency.** That script shells out to
`pdftotext -bbox-layout` and needs pikepdf. `@libpdf/core` — already a
dependency, and what Documenso's own placeholder extractor uses — returns text
bounding boxes directly. `@cantoo/pdf-lib` creates the fields. Both are already
in the tree.

## Why a marker rather than a coordinate

The renderer is react-pdf. It lays a document out and never reports where
anything landed, so there is no coordinate to place a box at. A visible marker
is the only thing that survives layout and can be found afterwards.

## What was verified rather than reasoned about

**The two field mechanisms coexist in one file.** Widgets are ours and go in
here; signer fields are Documenso's and are made at upload from `{{SIGNATURE,
rN}}` tokens. Nothing guaranteed in advance that adding an AcroForm leaves
upstream's extractor able to read the page, so the test asks **upstream's own
`extractPlaceholdersFromPDF`**, not a re-implementation, and asserts it still
returns `SIGNATURE`/`DATE` for `r1` with real geometry.

The converse is asserted too: upstream must see none of our widgets as fields.
A widget is **sender-writable only** — if the marker syntax ever collided with
the placeholder syntax, a signature would become a widget and ship permanently
blank. That is the rule in
`memory/acroform-vs-native-signer-fields.md`, now enforced by a test.

**One field per name, one widget per occurrence.** `merchant_legal_name` appears
three times on the live FRPA and is one field with three widgets (#289). A page
producing `merchant_legal_name_2` would want a `formValues` entry the platform
never sends, and would ship blank.

**Names, not numbers.** The source pipeline used `«0»`, `«23»` — an index into a
sidecar that said what each number meant. These are the names themselves, so
there is no lookup table in the middle to drift from either end.

## It fails closed

`expect` is checked in both directions: a marker nobody asked for, and an
expected name the page never mentions, are both refusals — and every problem is
reported at once, so a fix is one pass. A page with no markers is refused rather
than published flat.

The failure being guarded against is silent by nature. A template published with
a missing or misspelled widget looks finished and goes wrong later, in a document
a merchant is signing, where nothing on the sending side reports it.

## Caught by the type gate

The test fixture called `addPage([612, 792])`, which `@libpdf/core` does not
accept — it takes an options object. Vitest strips types, so this passed green
while building pages by accident. `tsconfig.typecheck.json` exists for exactly
this and caught it.

## Not in this change

The renderer still emits values and `[to complete]`, not markers. Nothing calls
this yet. The merchant-ready render mode is the next piece, and it is the one
that decides per-field widths — the marker is short on purpose, so its visible
length must not set the box.
