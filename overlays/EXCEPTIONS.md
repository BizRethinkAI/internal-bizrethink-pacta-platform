# Upstream files we write without an overlay, and why

`overlays/*.patch` is the only sanctioned way to modify an upstream file, and
`overlays/BIZRETHINK-OWNED.txt` declares app files that were never upstream.
This file is the third and smallest category: upstream files that are
**generated output**, which our own source necessarily regenerates.

A patch is the wrong tool for these. A patch describes a deliberate edit to
somebody else's logic and carries a fragility rating for the next upstream
merge. These are not edits — they are the mechanical result of running the
build, and a patch against them would need regenerating every time a string
changed.

Nothing may be added here to avoid writing a patch. The test is whether a
human wrote the change or a tool did.

---

## `packages/lib/translations/*/web.po`

**Written by:** `lingui extract`, during `npm run build`.

**Why it cannot be an overlay:** every feature that adds a `<Trans>` string to
an app route causes extraction to append that message to all eleven locale
files. The content is derived entirely from our own source; a patch would be a
diff of generated text that goes stale on the next string.

**What a reviewer should check:** that the diff contains only messages whose
`#:` comment points at a BizRethink-owned route (see `BIZRETHINK-OWNED.txt`),
with English filled in and other locales left with an empty `msgstr`. Anything
touching an upstream message is a real modification and needs a patch.

**Why it is committed rather than left dirty:** `npm run build` writes these
files, so leaving them uncommitted means the working tree is dirty after every
build and a genuine change cannot be distinguished from build residue. That is
the state PR #141 fixed.

**Upstream merge risk:** low. Upstream regenerates the same files from its own
source; conflicts resolve by re-running extraction, never by hand-merging.
