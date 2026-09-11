# docs/adr-0014-two-questions — the rule that stops clause-by-clause relitigation

**Branch:** `docs/adr-0014-two-questions`. One ADR. No code.

## Why

**The same class of question keeps being re-argued one clause at a time.** During
the FRPA rewrite six clusters were each told to gate a clause on a fact and six
refused — every refusal right, and every reason written into a **code comment
above the clause it concerned.** The seventh cluster starts the argument again.

And the counsel page cannot answer the first question an attorney asks. The
lease library solved this and said why: *"Nothing on the page distinguished a
disclosure Florida compels from a house rule somebody invented on a Tuesday."*
**The MCA library never got it — 3 of 219 records carry any legal-status marker.**

## What it decides

Two fields, and a test that refuses a clause answering neither.

1. **`WhyThisClause`** — `compelled` (citation + when it bites) / `implements`
   (citation, wording ours) / `discretionary`. Ported unchanged from the lease
   because it is proven. **Renders to counsel.**
2. **`ClauseVariance`** — `offered` (naming the fact) or `fixed` (with a required
   `note`). The four `fixed` reasons are the ones the rewrite actually produced:
   **misattributed** (§5.16 binds Merchant, the fact describes Buyer),
   **no-alternative** (§4.1's two arms are the same words), **unwritable**
   (§7.5 needs a `funderState` that does not exist), **load-bearing** (gate §2.3
   out and nothing collects).

An interview question exists only where variance is `offered`, and only under
ADR 0013's partition rule.

## The correction that is the point of decision 3

The drafting session proposed a **third** test — *"is Pacta willing to sell both
options?"* — and the owner rejected it:

> *we are not selling options, we are a SaaS provider… why would Pacta care if a
> company wants full-performance or narrowed one as long as it's legally required*

**The codebase already said so and nobody noticed.** `governance.yml`'s
`No legal-advice language` guard bans `you should` / `we recommend` /
`we suggest` from user-facing strings. *"Pacta declines to offer this"* is
exactly that posture.

## Conflicts checked, and one real

**Supersedes ADR 0013's** *"`guarantyScope: 'full-performance'` is deliberately
unauthored… a named gap"* — reversed by the owner on 2026-09-11. 0013 was right
about **who decides** and wrong about **whether it gets built**. Same for
`disputeResolution: 'arbitration'`.

**Supersedes ADR 0011's `requiredBy?: string`** — a bare citation cannot
distinguish *compelled* from *implements*, nor say when a requirement bites.

**Checked against every closed-questions row in 0012 and 0013: no contradiction.**
The one that looks like a clash is not — 0012 bars *findings* from counsel's
view; 0014 renders *legal status*. A finding is history about text that no longer
exists; `WhyThisClause` is provenance for the text in front of the reader.

**ADR 0008 bounds this**: nothing here touches `mca/sources/`, `mca/content/` or
`mca/prescribed/`. A prescribed disclosure is not a clause with a variance.

## Owed

- **Backfill 219 records.** Most will be `discretionary` + `fixed`; writing that
  down is what makes the exceptions visible.
- **`compelled` may only be claimed from a vendored source** — the statutory walk
  the lease did for Florida has **never been done for the eleven MCA states.**
- **Three fact values still have no clause**: `collectionMethod: 'ach-only'` and
  `'split-with-ach-backstop'` (§2.5 and §7.14 left the paper and no change note
  records why), and `venueRule: 'funder-state'`.
- **`processorSplitAccepted` is misfiled** and should leave `McaFacts` — it is a
  per-deal operational fact, not a funder profile answer.
