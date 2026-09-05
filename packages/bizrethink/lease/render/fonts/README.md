# Typefaces carried in the signed lease

These four files are the SOURCE for `font-data.ts`, which is what the renderer
actually loads. They are not read at runtime.

**Why not.** The first version resolved a path beside the renderer module. Every
test passed and production returned 500 on every lease PDF: the bundler rewrites
the module's location to the bundle's own directory, and the runtime image
copies only `apps/remix/build` plus a few configs — `packages/bizrethink` is not
in the container at all. This README previously asserted the files "already
would" ship. They do not. Regenerate with `node scripts/inline-fonts.mjs` after
replacing a .ttf.

The typefaces are embedded into every PDF this package renders. They are here
rather than referenced by name because a standard-14 face is **not carried in
the file**: every viewer substitutes its own metrics, so a signed lease is not
guaranteed to render as it was signed, and PDF/A rejects it. That is a poor
footing for cryptographic signing with long-term validation.

| File | Role | Licence |
|---|---|---|
| `Tinos-Regular.ttf` | Body of the instrument | SIL OFL 1.1 — `OFL-Tinos.txt` |
| `Tinos-Italic.ttf` | Document subtitle | SIL OFL 1.1 — `OFL-Tinos.txt` |
| `SourceSans3-Regular.ttf` | Running head, labels, table columns | SIL OFL 1.1 — `OFL-SourceSans3.txt` |
| `SourceSans3-SemiBold.ttf` | Section and clause headings | SIL OFL 1.1 — `OFL-SourceSans3.txt` |

Both licences are reproduced in full beside the files, which is what the OFL
requires of a redistribution. Neither font has a Reserved Font Name conflict
here: nothing is renamed or modified, the files are shipped as published.

## Why Tinos and not something better looking

Tinos is **metric-compatible with Times**, and that is the entire reason. Six of
the eight faces tried crash this react-pdf build with
`unsupported number: -2.2127632876551446e+22` the moment they become the body
face — Source Serif 4, PT Serif, Spectral, Newsreader, Libre Baskerville and
Lora. Removing every border in `lease-document.ts` does not help, so the
clipBorder explanation in that file does not cover this case, and the cause is
not understood.

Tinos and EB Garamond both render. Tinos was taken because its widths are Times'
widths: not one line break moves, the document is 25 pages before and after, and
none of the pagination `lease-document.ts` works hard to control is disturbed.
EB Garamond is the better-looking choice and remains available — but it changes
metrics, and shipping a reflow that works for a reason nobody can name is how a
lease that will not render gets found by a tenant.

So the archival correctness is banked and the appearance is left alone until the
crash is understood.

## Before changing any of this

Run `placeholder-roundtrip.test.ts`. Embedded and subset fonts encode text
differently and can defeat upstream's `page.findText()`, which is how
`{{SIGNATURE, rN}}` becomes a signature field. That risk was retired by test,
not by argument, and the test is what keeps it retired.

`fonts-embedded.test.ts` asserts the faces are actually in the PDF, so reverting
a family to a standard-14 name fails rather than quietly producing a document
that is not self-contained.

## Known loose end

react-pdf emits one unembedded `Helvetica` reference that no style in this repo
asks for — a fallback inside the library. `pdffonts` still shows it. It is not
pinned by the test because failing on it would give nobody anything to act on.
