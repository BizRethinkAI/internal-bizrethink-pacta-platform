# feat/mca-source-baseline-skill — the machine half of setting a baseline

Stacked on `feat/mca-source-change-detection` (#329), which it imports
`source-extract.ts` and the `pages` model from. It cannot merge before that one.

## What this is

#329 built a check that compares a publisher's page against a baseline. No
source has a baseline, so it reports all nineteen as needing a person. This is
the tooling that lets a person create one without doing the mechanical parts by
hand — and, more importantly, without the mechanical parts quietly making the
assertion for them.

Three steps, and **the order is enforced rather than documented**:

    collect <source-file>   →  lays out what the sidecar claims, asks the open question
    fetch   <package.json>  →  REFUSES until step 1 is signed
    apply   <package.json>  →  REFUSES until both are signed; only this writes a digest

Every refusal exits non-zero.

## Two signatures, because there are two claims

`readyToApply` is the gate, and it is the part worth reviewing. 16 tests,
written red first.

**1. Where would an amendment appear?** Not "where did the text come from" —
that is a different question and answering the second in place of the first is
what produced eleven frozen pages in #329's sidecar.

**2. Is this the source we stored?**

Each signature carries an exact attestation sentence rather than a boolean.
`signedOff: true` is set by anything that can write JSON; a sentence that has to
match makes an absent-minded or automated sign-off visible in the record, and
states in the record what was actually being claimed. The two sentences are
different and are not interchangeable — a test asserts that swapping them fails.

The gate also refuses: pages that are not the ones identified (the Texas trap as
a rule), a non-200 response, a digest that is not a sha256, an extraction of
zero characters — which would hash stably and report `unchanged` forever — and
vision that disagrees with the text verdict.

**Acknowledged, not overridden.** A gate with no way past it gets worked around.
A blocking reason can be cleared only by naming it in
`baseline.signOff.acknowledged`, beside the signature, so the acceptance stays
in the record. An unsigned package cannot acknowledge its way through.

## Division of labour

Deterministic code fetches, extracts, digests and diffs. A model does the two
things that need judgment: identifying where an amendment would appear, and
corroborating from a screenshot that the page is the statute at all. **A model
never produces a digest or a diff**, and never signs.

## Texas, run for real

`collect` and both refusals ran against `TX-Fin-Code-Ch-398.txt`. Step one's
research is filled in and **deliberately left unsigned** for the owner.

The recorded URL is the enrolled HB 700 of 2025 — the stored file's own header
says "Enrolled text of HB 700" — and an enrolled bill is finished. The codified
chapter is at `tcss.legis.texas.gov/resources/FI/htm/FI.398.htm`: verified
today, 13,947 characters, opening "FINANCE CODE CHAPTER 398. COMMERCIAL
SALES-BASED FINANCING", carrying §398.051 and the note "Ch. 723 (H.B. 700), Sec.
1, eff. September 1, 2025" — the chapter this bill created.

### The rejected alternative is the finding

`statutes.capitol.texas.gov/Docs/FI/htm/FI.398.htm` is the obvious Texas
statutes host and looks right. It returns **HTTP 200** and yields **1,353
characters of navigation chrome** — "Skip To Main Content", "Site Information" —
with neither `398.051` nor the words "sales-based" anywhere in it. The statute
renders client-side.

A fetch-and-digest pipeline would have baselined that shell happily and reported
`unchanged` every month forever. It is not caught by the empty-extraction guard,
because 1,353 is not zero. **It is caught by looking at the page**, which is
exactly the job the screenshot and the vision reading were given, and it turned
up on the first source tried.

## Also here

`scripts/mca/fetch-page.ts` — the fetcher, extracted from `check-sources.ts` so
the monthly check and the baselining tool share one implementation. The digest a
person signs must be produced by the same code that later compares against it;
two implementations would drift, and the first symptom would be every source
reporting `differs` on the run after its baseline was set. The monthly check was
re-run after the refactor and still behaves identically.

## The first baseline is recorded

`TX-Fin-Code-Ch-398.txt` went through all three steps with the owner signing
both attestations. The monthly check now reports **AUTOMATIC (1)**, where it
reported none: it fetched the codified chapter, compared it against the signed
baseline and returned `ok`.

The reading evidence, recorded in `visionCorroboration`:

- 15 structural landmarks read off the owner's screenshot — Title 5, Chapter
  398, all three subchapters, §§398.001-005, 398.051-056, 398.101-102, the
  $10,000 penalty, the effective date — each confirmed present in the extracted
  text by literal match.
- The stored file is the ENROLLED BILL and the watched page is the CODIFIED
  CHAPTER, so they differ by wrapper and that difference is expected rather than
  a finding. All twelve phrases of the §398.051(a)(1)-(11) disclosure elements
  our spec is built on appear in both, verbatim after normalisation. The only
  divergences are wrappers: "Added by Acts 2025" source notes on the code side,
  "BE IT ENACTED BY THE LEGISLATURE" / "Secretary of the Senate" / "Speaker of
  the House" on the bill side. No operative provision differs.

### A defect found by reading the diff

`apply` wrote the digests and left the sidecar `note` alone, so the entry read
"URL from this file's own header. No baseline confirmed yet." beside a URL that
came from research and a digest that had just been signed — both clauses false,
in the one file whose whole job is saying where things came from.

`sidecarEntryFor` now rewrites it, and three tests pin it. The note it replaces
is NOT carried forward: quoting "No baseline confirmed yet" inside the note that
confirms a baseline reproduces the confusion being fixed, and what the entry used
to say is git's job. The superseded URL IS kept, because "this is not where the
text came from" is the most surprising thing about the entry.

## An independent audit found four real defects

The procedure was written retrospectively by the session that did Texas by
hand, which already knew the answer. A fresh Codex session ran it cold against
`GA-SB90-enrolled.txt` with signing forbidden. It found more than the document
was worth, and every code finding below was reproduced before being fixed.

**1. Signatures could be acknowledged away.** The waiver filter subtracted every
named reason, including the signature failures — so `acknowledged:
['READING_ATTESTATION_WRONG']` beside a signature reading "looks fine to me"
applied cleanly. **The gate was bypassable by anything that could write JSON**,
which is precisely what demanding an exact attestation sentence was meant to
prevent. The four signature reasons are now non-waivable. The test that looked
like it covered this set `signOff` to null, so `acknowledged` was empty and the
subtraction never ran — it tested the adjacent case and read as coverage.

**2. A PDF was routed to the HTML extractor.** Georgia serves its enrolled bills
from `legis.ga.gov/api/legislation/document/<id>` with **no `Content-Type`
header and no `.pdf` in the path**. Both of the fetcher's tests missed, so a
13-page PDF went through `textFromHtml` and produced 16,674 characters of PDF
syntax — not empty, so `NOTHING_EXTRACTED` would not have caught it, and it
would have been digested and signed as though it were statute. Now sniffed by
magic bytes first. After the fix the same URL yields 24,026 characters of real
text carrying §10-1-393.18 and no PDF debris.

**3. A re-fetch kept the previous reading signature.** `fetch` replaced `pages`
and left `signOff` and the vision verdict intact, so fetching again after
somebody signed carried their signature onto content they had never seen. It
now clears the reading, the comparison and the vision verdict.

**4. `agreesWithTextVerdict` had nothing to agree with.** The script extracts
and hashes and never compares, while the procedure said "the text diff is the
verdict" — describing an artifact that does not exist. A confident visual
reading could therefore look like a completed verification. `textComparison` is
now a required field with a required `method`, because what counts as
equivalent depends entirely on what was compared.

### And a fifth, found by running the fix

`readyToApply` **threw** on the first package ever written, because
`textComparison === null` is false when the field is absent and reading
`.method` off `undefined` is a TypeError. A gate that crashes has not said no,
it has said nothing. A package is a JSON file a person edits by hand, so a
missing field or an older shape is ordinary rather than exceptional; the gate
now reads everything defensively and four tests hold it to refusing rather than
throwing, down to an empty object.

### Corrections to the procedure itself

- **"Bill and code differ only by wrappers" was the Texas result stated as a
  general rule.** Georgia's stored file is an omnibus bill also carrying
  operative real-estate and telephone-solicitation provisions, which are not
  wrappers. The TX package's `findings` now says so against itself.
- **Verification must go through the watcher's retrieval path.** Justia renders
  in a browser and returns **403** to the watcher's user-agent; Georgia's
  official Lexis gateway returns a bootstrap that extracts to zero characters.
  A page only a human can fetch cannot be watched.
- **An annual edition is another frozen document.** A `/2023/` codified page has
  the right heading and is exactly as unamendable as the bill.
- **UNRESOLVED is a legitimate step-1 outcome.** Georgia's official text sits
  behind a CAPTCHA, so it has none and stays manual. Substituting a secondary
  publisher would make the digest assert that a third party's rendering is the
  statute.
- `mode: 'adjudicate'` is a field, not a feature — `collect` always writes
  `baseline` and carries no prior digest. The skill now says so.
- The screenshot is **not** the only instrument that sees a consent gate;
  response bodies, status codes and accessibility text often show it cheaper.

The audit report and Georgia's unsigned package are under `output/`, which is
gitignored. Both `signOff` fields there are null and no tracked file was
modified by that run.

### The Texas baseline stands

Its digest is unchanged and the monthly check still reports `AUTOMATIC (1)`.
`textComparison` was backfilled verbatim from the comparison presented before
the owner signed, moved out of prose into the field the gate now requires —
the package records that it was backfilled and that nothing was re-decided.

## A second audit, and what it says about the first fix

The same independent session re-ran the procedure cold against Missouri. It
confirmed the PDF fix works — the Georgia endpoint again arrived with no
`Content-Type` and no `.pdf`, and now yields 24,026 characters of statute — and
then walked through three of the others.

### Defensive against ABSENT is not defensive against MALFORMED

The first audit found the gate threw on a package with a missing field. The fix
read every field through `??`. That handles a field that is not there and does
nothing about one that is the wrong type, and the second audit demonstrated it:

- `{ method: 'x' }` with no verdict and no findings **applied**;
- `verdict: 'maybe'` **applied**;
- `method: 42` threw `TypeError: .trim is not a function`;
- `pages: {}` threw `pages.map is not a function`;
- a missing nested `amendmentAppearsAt` threw on `.length`.

Patching those would have left a fourth. A package is a JSON file a person
edits by hand, so its shape is what a schema is for, and everything else here is
validated with zod. `readyToApply` now **parses before it reasons** and reports
`PACKAGE_MALFORMED` with the offending paths — a different problem from an
unsigned package, and sending somebody to sign it would be the wrong
instruction.

### A claim of mine that was simply false

The in-flight note and the PR body both said the gate refuses a page without a
screenshot. **It did not.** Only an explicit `null` blocked; an omitted field
and an empty string both applied. The schema now requires a non-blank path.

That matters more than it sounds: the same audit caught a Missouri screenshot
showing §40.405 — larceny and court-martial — above the commercial-financing
body, with §427.300 elsewhere on the page. A check that the section number
"appears somewhere" would have passed it. The screenshot is the instrument that
catches that, so a page without one cannot apply.

### The re-fetch invalidation was half a fix

Clearing the signature in memory and saving only after every page succeeded
still leaves freshly written extraction files on disk beside a package carrying
the old signature, if a later page fails. The invalidation is now written
**before the first request goes out**, so a crash, a 404 or a Ctrl-C leaves an
unsigned package next to whatever was fetched. Worse-looking, and true.

### Two smaller ones

- **Every stored source was read as `latin1`**, so a UTF-8 statute came back
  with `§` as `Â§` and the "characters" it reported were bytes. Text sources now
  read UTF-8; `VA-Disclosure-Form.pdf` is genuinely binary and keeps the
  byte-preserving read.
- **The CLI claimed to produce a diff it does not produce.** It now says so, and
  says what `textComparison.method` has to carry instead.

### Still open from that audit, and not fixed here

- **`textComparison` is enforced but not established.** A verdict and findings
  are now required and typed, which stops the vaguest paperwork, but nothing
  checks that a comparison actually happened. The auditor wrote one — bounding
  the statutory text, excluding editorial chrome, normalising, comparing every
  character across all eight subsections — and showed it catching a mutated
  exemption threshold that a disclosure-only comparison missed. Turning that
  into a helper the script offers is the real fix and is a separate change.
- **"Prefer a URL with no year in it" is the wrong rule.** Missouri's historical
  and current links are both yearless, and a pinned historical version passes
  the edition check. The publisher's own persistent bookmark is the distinction.
- **"A miss is usually normalisation" is dangerous reassurance** and should go.

## Not done here

- The remaining eighteen sources.
- The skill lives at `~/.claude/skills/mca-source-baseline/SKILL.md`, outside
  this repo, because this repo does not version `.claude/` — same as
  `review-and-ship`. It is therefore not reviewable in this PR.
