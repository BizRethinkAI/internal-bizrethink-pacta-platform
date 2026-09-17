# feat/mca-template-renderer — the renderer produces a template

**Stacked on `feat/mca-publication-record` (#295), and merges
`feat/mca-acroform-injector` (#291)** so the end-to-end test can run. #291's
commits leave this diff the moment it lands.

## What it is

ADR 0025's first piece of code. `renderMcaTemplatePdf(snapshot, instrument,
revision)` renders the **template** — not a filled deal with a publishable mode
beside it. A deal never enters here, so a page carries exactly three things
where a value belongs:

| | |
|---|---|
| `«widget_name»` | a slot the funder's platform prefills per deal; `injectMcaWidgets` turns it into an AcroForm widget |
| the value itself | a fact the builder knows at publication, set in type — a widget for it would need a value re-sent every deal for something that never changes |
| `{{SIGNATURE, rN}}` | a native placeholder Documenso turns into a signer field at upload. Never a widget: a widget is sender-writable only |

A separate module from `transactions/server-only/pdf.ts` rather than a mode
inside it, because the two produce different artifacts for different readers and
one function would mean a flag deciding whether a merchant may be handed the
output.

## THE BUG THIS FOUND, which is the reason to compose the chain in a test

The first end-to-end run failed with widget names the page had never been asked
to carry:

```
Expected but never marked: effective_date, equipment_defer_amount, remittance_frequency
Marked but not expected:   eqective_date, e2uipment_defer_amount, remittance_fre2uency
```

**The sans face renders text that `@libpdf/core` reads back scrambled.**
Probing each face directly: Tinos, Helvetica and Times-Roman round-trip;
`McaSans` and `McaSansBold` come back as `«eteciv_ed»aieq` for
`«effective_date»`. **pdfjs reads the same file correctly**, so the PDF is not
malformed — that extractor simply cannot read that subset.

It matters because `@libpdf/core` is what **both** `injectMcaWidgets` and
upstream's `extractPlaceholdersFromPDF` use. A marker or a signer token set in
that face is invisible to both. The document would have looked right to a human
and published with widgets nobody could fill.

**The class was already known.** `lease/render/lease-document.ts` records it from
Phase 0 — "embedded/subset fonts encode text differently and can defeat
`page.findText()`" — and retires it by test for the lease, with Tinos. This is a
fresh instance in a different face, caught the same way: by test rather than by
argument.

Markers, values and signer tokens are now set in Tinos. Labels may stay sans:
nothing extracts them. **Anything a machine must read back may not be.**

## The test reads with `@libpdf/core`, deliberately

An earlier version asserted with pdfjs and **passed while the markers were
corrupt**, because pdfjs reads that face correctly and nothing in this pipeline
uses pdfjs. The helper now reads with the same call the injector and upstream
make. A test that checks a reader nothing uses is not a test of this.

## What is not placed yet, counted rather than hidden

`templatePlacement` reports three lists — marked, printed, and **unplaced**: the
bindings this renderer can neither mark nor print. Most are the per-deal names
from `field-triage.ts` that no live template carries yet, and emitting them
before the caller has agreed to send them would publish a template full of slots
nobody fills. They render as an em-dash rather than vanishing, so the gap is
visible in the document instead of invisible in the code, and the count is
asserted.

## Not in this change

The transaction path is untouched — recasting it as a specimen preview (ADR 0025
decision 1) is its own change. Nothing calls this renderer; the publication
service that will is still to come, and the gate (#288) stands in front of it.
Only the FRPA is asserted end to end; the other instruments render through the
same path but are not yet pinned.
