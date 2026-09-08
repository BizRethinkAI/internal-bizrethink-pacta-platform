# chore/mca-revendor-command — re-vendoring in one command, and the drift it found

**Branch:** `chore/mca-revendor-command`. **PR:** #TBD.

`scripts/mca/revendor.py`. Owner asked for re-vendoring to be one command
because the approval gate hands 66 clauses back to `lombard-contracts`, and a
handoff is only a handoff if the return trip is cheap.

## What it replaces

Four steps that lived in nobody's runbook: run the vendor script once per
document, regenerate the review register, run `biome format` over the JSON
because CI blocks on it, then find the new digests by hand and paste them in.

The two easiest to skip fail in ways that look like something else. **A missed
`biome format` reads as a lint problem. A missed digest reads as a passing test
suite** — because a digest nobody updated still matches the copy nobody
re-read.

## It found real drift on its first dry run

`--check` reported the review register a commit behind. `lombard-contracts` #10
had recorded five REVIEW-02 findings as `implemented`; Pacta still held them as
`open`.

| | before | after |
|---|---:|---:|
| Distinct outstanding findings | 43 | **38** |
| Clauses the approval gate holds | 73 | **66** |

**The gate was over-blocking seven clauses on work already done.** That is #129's
defect in miniature — the library reporting more outstanding work than exists —
except caused by staleness rather than by asking the wrong question. #133
re-vendored the documents and did not regenerate the register, which is exactly
the partial move this script exists to make impossible.

## What it deliberately will not do

It updates the vendored text and **prints** the digests that moved. It does not
touch a clause body and does not re-stamp `bodiesVerifiedAt`.

Those two acts assert that a human re-read the document. A script that did them
would turn the digest from evidence into ceremony — and the whole mechanism
exists to make "I re-stamped the date without re-reading" impossible to do by
accident.

## Two smaller decisions

**No npm alias.** `mca:revendor` in the root `package.json` would have been the
first unoverlaid edit to an upstream file there, and `fork-discipline.py` does
not watch that path — so CI would not have caught it. `python3
scripts/mca/revendor.py` is already one command; an alias is not worth the
merge surface on every weekly sync.

**`--check` compares the register's DATA, not its bytes.** The generator writes
one-space indent and `biome format` rewrites it, so a byte comparison reported
CHANGED on every run. A check that always cries wolf is a check people stop
reading — and it would have hidden the real drift above in its own noise.

## Also in this PR

The `.txt` headers of two documents record the `lombard-contracts` commit they
were vendored from; those lines moved with the re-vendor. **Body text is
unchanged**, so no digest moved and no verification date was re-stamped.

## Still open

Unchanged: the CT/VA provenance gap #134 found, counsel, republishing the five
Pacta templates.
