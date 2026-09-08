# fix/mca-finding-dispositions — a finding that was fixed is not outstanding

**Branch:** `fix/mca-finding-dispositions`. **PR:** #TBD.

A correctness fix to what #126 and #128 shipped. `outstandingFindingsFor`
reported **more than twice the real backlog**.

## What was wrong

It filtered on `status === 'survived'` alone. That is the answer to *"was the
finding right?"* — did it survive the refutation pass. It is not the answer to
*"has anybody done anything about it?"*, and that second question has an
authoritative answer nobody had read: `REVIEW-01-manifest.json` carries a
disposition for every one of that review's findings.

| | |
|---|---|
| REVIEW-01 findings in the register | 205 |
| `implemented` | **166** |
| `open` | 31 |
| `handoff` | 2 · `rejected` 1 · `wont-fix` 1 |
| refuted, so no disposition | 4 |

Measured on the clauses already merged: 44 findings cited, **23 of them already
implemented**. The library was reporting all 44.

**The error runs in the direction that makes the corpus look worse than it is**,
which is the direction that gets a mechanism ignored. It also made two PR
descriptions overstate — #126 said the ISO PRA's seventeen findings had "every
one survived refutation" in a context implying they were live work.

## FRPA §6.5, which is how it was found

Eight REVIEW-01 findings name §6.5 — including
`liquidated-damages-plus-actual-costs` and `remedy-stack-exceeds-the-debt`, both
serious. **The section does not exist in FRPA v4.** It was deleted outright by
option (a) of the review's own fix; the manifest records all three findings
`implemented` and `change-notes/10-frpa-v4-lockdown.md` names the deleted
"§6.5 Liquidated Damages on Default — 25% of unpaid balance".

So the library would have pointed an attorney at eight live findings against a
section of the contract that is gone. It was found while checking whether the
reviews' loci still line up with the FRPA, ahead of importing it — which is
the check that also vindicates the rule from #126 that a finding must never be
attached to a clause by matching its locus string.

## The asymmetry that cannot be fixed here

**REVIEW-01 keeps a manifest. REVIEW-02 does not.** That review's dispositions
live in the prose of `change-notes/16-review-02-document-defects.md`, which says
23 of its 48 findings were fixed and does not say which in a form anything can
read.

So every REVIEW-02 finding is `unrecorded` — not open, not implemented,
**unknown** — and unknown is counted as outstanding, because the safe reading of
unknown is that somebody still has to look. That keeps the asymmetry visible
rather than quietly resolving it. Giving REVIEW-02 a manifest is work in
`lombard-contracts`, not here.

## Also recorded

- A refuted finding carries no disposition, and the manifest agrees: all four of
  REVIEW-01's refuted findings are absent from it. Asserted, so that a future
  regeneration cannot start inventing one.
- The manifest holds 209 unique ids against the register's 204 — nine name work
  done outside the review (`rollover-method-names-read-as-loan-words`,
  `tx-398-056-and-055-compliance-confirmed` and others). Not an error; the
  manifest tracks more than one review's findings.
- The register now carries `manifest` and `manifestSha256` per review, null for
  REVIEW-02, so "there is no manifest" is a value rather than an absence.

## Still open

Unchanged: agreement-builder placement, `/admin/mca` summary honesty, counsel.
Plus `instruments` as an array, to be settled at the FRPA import — which is the
next PR and is what this one unblocks.
