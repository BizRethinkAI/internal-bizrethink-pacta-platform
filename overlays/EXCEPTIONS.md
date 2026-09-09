# Upstream files we write without an overlay, and why

`overlays/*.patch` is the only sanctioned way to modify an upstream file, and
`overlays/BIZRETHINK-OWNED.txt` declares app files that were never upstream.
This file holds the third and smallest category, and it has **two sections**,
because `UPSTREAM.md` and PR #141 arrived at this filename meaning different
things:

1. **Generated output** — upstream files our own source necessarily
   regenerates. Added by PR #141.
2. **Sanctioned direct edits** — the narrow carve-out `UPSTREAM.md` has
   described since 2026-04-29 under *"When to break the rules"*: a one-line
   change to a rarely-changing config file, carrying a `MODIFIED for
   BizRethink` comment in the file itself.

They are genuinely different and the test below applies only to section 1. A
human-written edit in section 2 is allowed **only** under UPSTREAM.md's three
conditions; anything larger is still a patch.

A patch is the wrong tool for these. A patch describes a deliberate edit to
somebody else's logic and carries a fragility rating for the next upstream
merge. These are not edits — they are the mechanical result of running the
build, and a patch against them would need regenerating every time a string
changed.

Nothing may be added here to avoid writing a patch. The test is whether a
human wrote the change or a tool did.

---

# Section 1 — generated output

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

---

# Section 2 — sanctioned direct edits

Human-written, one line, in a file upstream rarely touches, carrying a
`MODIFIED for BizRethink` comment at the edit. `UPSTREAM.md` §"When to break
the rules" is the authority; this section is the register it has always
pointed at.

## `.npmrc` — `prefer-dedupe = false`

**Written by:** a human, deliberately, in `cb5690672`.

**What it is:** upstream sets `prefer-dedupe = true`. We invert it.

**Why:** with it true, npm drops nine `tailwindcss@3.4.19` CJS transitives and
the `apps/remix` Coolify build fails with `Cannot find module 'dlv'` and
`postcss-nested`. The failure is at build time on the deploy host, not in CI.

**Why not an overlay:** a one-token change to a five-line config file. A patch
would carry more header than diff, and `.npmrc` conflicts on any sync that
touches it anyway.

**READ THIS BEFORE "FIXING" IT.** Only *this line* is ours. The rest of the
file is upstream's, including `min-release-age = 7`, which upstream disabled in
July and re-enabled in the 2026-09-07 sync — we adopted that one rather than
diverging. So the file is half ours and half theirs for different reasons, and
a reader who assumes the whole file is fork-owned and restores `prefer-dedupe`
to upstream's value breaks the Coolify build in a way that does not reproduce
in CI.

**Upstream merge risk:** medium. Upstream edits `.npmrc` roughly quarterly, and
every such edit conflicts here. Resolve by keeping this line and taking
upstream's for everything else.
