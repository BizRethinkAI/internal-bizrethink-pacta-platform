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

## Not done here

- The skill wrapper that drives the screenshots and the model, which is where
  `visionCorroboration` gets filled. The contract it writes into is settled and
  tested; the wrapper is not written.
- Any baseline. Nothing in this branch signs anything, and `provenance.json` is
  unchanged.
- The remaining eighteen sources.
