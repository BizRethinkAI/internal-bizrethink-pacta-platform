# docs/mca-single-producer — ADR 0024, one producer for every MCA template

Documentation only: the ADR and two rows in the ADR index. No code, no
behaviour, nothing to deploy.

## What it decides

**Pacta is the custodian and producer of every MCA template** — agreements and
prescribed state disclosures alike — and `lombard-contracts` becomes an archive.

[ADR 0023](../../adr/0023-pacta-produces-mca-templates.md) retired
`lombard-contracts` for agreements and then parked the disclosures under "What
this does not decide", **giving no reason for stopping there**. That missing
reason was the defect.

## Why the old arrangement existed, since it was asked and never answered

Chronology, not architecture:

| | first commit |
|---|---|
| `lombard-contracts` | **2026-09-02** |
| `packages/bizrethink/mca` | **2026-09-06** |

Four days. It is the bootstrap pipeline that produced the templates in
production today, and nothing replaced it because the builder still cannot
publish. There is no architectural justification and this note does not invent
one.

## Why it cannot stay

**It is client-scoped at every level** — the `lombardpay` organisation, the
name, `Lombard_FRPA_v4.pdf`, a widget called `lombard_signer_name`. A second
funder can reuse none of it, and a per-client repository cannot sit in the path
of a builder meant to serve any funder.

**And Pacta already knows everything about the disclosures except how to draw
them**: CA and NY verbatim rows, VA's fixed labelled form, statute checkers
re-matching quoted text on every run. So Pacta today *checks a document another
repository produces* — the twin problem ADR 0023 exists to kill, left standing
on the documents where a defect is regulatory rather than cosmetic.

## The staged order

1. the six agreements publish from Pacta;
2. Pacta owns the record and serves it over the API, so `lombard-platform` stops
   vendoring `*.published.json`;
3. the disclosures move onto the proved path;
4. `lombard-contracts` becomes an archive.

Staged because the prescribed forms are the hardest artifacts in the vertical,
and the first thing that ever publishes from the builder should not also be the
least forgiving thing it could publish.

## The cross-repo claim this ADR rests on

`lombard-platform` #262 is merged; the guard is live from `1066bfc`. It **warns
and drops** an unrecognised widget name rather than throwing — the document is
equally blank either way, so throwing at send time would turn a cosmetic drift
into an outage.

**Dropping is only safe because something else proves the names match**, and
that dependency is recorded in the ADR because it is invisible until it breaks.
Their `pacta-v2-registry.test.ts` asserts per kind that emitted names and
template widgets are the same set; its sample map was hand-maintained and typed
`Partial`, so a newly published kind could have escaped it silently. It now
asserts its own completeness.

## Verified rather than asserted

- both first-commit dates, by `git log --reverse` in each repository;
- that `lombard-platform`'s widget-totality spec reads the **vendored** copy, so
  it cannot see that copy going stale against what is actually published — the
  drift class step 2 removes;
- that `mca/prescribed/forms/` holds the CA/NY/CT/VA specs and checkers this
  ADR credits it with.

## Known and self-closing

ADR 0023 links to ADR 0024, which is not on `main` until this lands, so the
relative link dangles in the interval. Governance has no link checker, and the
link resolves the moment this merges.

## A governance guard that reads a stale branch as a modification

Guard 2 enforces append-only ADRs, and it failed this branch with:

```
✗ These ADRs were modified or deleted in place:
  docs/adr/0023-pacta-produces-mca-templates.md
```

This branch never modified ADR 0023. It branched off `feat/mca-send-gate`
*before* that PR's last commit, #288 then merged, and main moved ahead on that
file while this tree kept the older copy.

**Guard 2 diffs `BASE_SHA HEAD_SHA` with two dots, and a two-dot diff cannot
tell "this branch changed the file" from "this branch is behind main on the
file".** The three-dot diff `origin/main...HEAD` on ADR 0023 was empty, and
GitHub reported the PR mergeable — so merging was never going to revert
anything.

**Fixed by merging `origin/main` into the branch, not by taking the override
the failure message offers.** An override is for a guard that is right about
the facts and a human accepts it anyway. Here a refresh makes the guard pass
legitimately, and an override granted for a false positive on an append-only
rule is how that rule stops meaning anything.

It bit here only because an ADR was added and then amended within one PR while
another PR was stacked on it mid-flight. The next person to hit it will be
pointed at the override by the message, which is why it is written down here.
Changing the guard to a three-dot diff is a real fix and belongs in its own
change, not smuggled into this one.
