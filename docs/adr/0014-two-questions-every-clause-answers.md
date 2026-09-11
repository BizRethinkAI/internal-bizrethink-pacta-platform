# ADR 0014 — Two questions every clause answers

- **Status:** Accepted
- **Date recorded:** 2026-09-11
- **Decision date:** 2026-09-11 (owner)
- **Extends:** [ADR 0013](0013-a-funder-profile-describes-the-funder.md)'s partition rule, by recording the reasons a clause is *not* gated.
- **Supersedes:** ADR 0013's statement that `guarantyScope: 'full-performance'` is *"deliberately unauthored… a named gap"*, and ADR 0011's `requiredBy?: string`.

## Why this exists

**The same class of question keeps being re-argued, one clause at a time.** During the FRPA rewrite six clusters were each told to gate a clause on a fact, and six refused. Every refusal was right. But each one's reasoning was written into a code comment above the clause it concerned, so the seventh cluster starts the argument again — and the reviewer who reads §5.16 in three months has no way to ask *"was this considered?"* except by reading prose.

The second half is what an attorney sees. The lease library's `why-this-clause.ts` says it plainly:

> *The first question a reviewer asks, and the one the library page could not answer. It showed `parties.recital · v2 · parties · Unapproved` — true, and useless. **Nothing on the page distinguished a disclosure Florida compels from a house rule somebody invented on a Tuesday.***

The lease fixed that. **The MCA library never got it: 3 of 219 records carry any legal-status marker at all.**

## Decision

**Every clause records the answer to two questions, and a test refuses a clause that answers neither.**

### 1. Why is this clause here?

Ported from `lease/clauses/why-this-clause.ts`, unchanged in shape because it is proven:

```ts
type WhyThisClause =
  | { kind: 'compelled'; citation: string; appliesWhen: string }
  | { kind: 'implements'; citation: string }
  | { kind: 'discretionary' };
```

- **`compelled`** — a provision requires this text to appear. The citation, and *when the requirement bites in words a funder can check*.
- **`implements`** — the duty is statutory; **the wording is ours**.
- **`discretionary`** — our drafting. No statute requires the clause at all.

**This renders to counsel**, because it is the question that decides where a reviewer spends their hour. Most of an MCA agreement is not statute, and saying so is itself information.

**This is not in tension with ADR 0012's *"findings do not render to counsel"*, and the difference matters.** A finding is an audit note about a document that no longer exists — drafting input, and at least one now contradicts the clause it annotates. `WhyThisClause` is a property of the clause **in front of the reader**, it is true of the text as it stands, and it answers a question counsel asks before reading a word. One is history about other text; the other is provenance for this text.

### 2. Does the funder choose?

```ts
type ClauseVariance =
  | { kind: 'offered'; fact: keyof McaFacts }
  | { kind: 'fixed'; because: FixedBecause; note: string };

type FixedBecause =
  | 'compelled'        // the law puts it there; there is no alternative to offer
  | 'misattributed'    // the fact is about a different party or a different question
  | 'no-alternative'   // both answers produce the same text
  | 'unwritable'       // the alternative needs an input the interview does not collect
  | 'load-bearing';    // gating it out leaves the document unable to function
```

**`note` is required on `fixed` and must say why.** That is the whole point: the six refusals stop being prose scattered through the corpus and become a thing you can query.

The four non-`compelled` reasons are the ones the rewrite actually produced:

| | the real case |
|---|---|
| `misattributed` | §5.16 binds **Merchant**; `concurrentPositions` describes what **Buyer** may hold. Also §4.11, §4.3. |
| `no-alternative` | §4.1 on `collectionMethod` — both arms are the same words. A choice where both answers give identical text is not a choice. |
| `unwritable` | §7.5 on `venueRule` — the `funder-state` arm needs a `funderState` field. The fact asks *whose courts* without supplying whose. |
| `load-bearing` | §2.3 — gate it out and the agreement has no collection mechanism at all. |

**An interview question exists only where the variance is `offered`**, and a fact only earns `offered` under ADR 0013's rule: *for every value of the fact, exactly one clause of the group is selected.*

### 3. Pacta is the platform. It does not hold commercial positions.

**A funder's commercial choice is the funder's.** Where an option is lawful and genuinely different, it is offered. Pacta does not decline to support a term because it prefers another one.

This is recorded because **the drafting session proposed the opposite** — a third test asking *"is Pacta willing to sell both options?"* — and the owner rejected it on 2026-09-11:

> *we are not selling options, we are a SaaS provider… why would Pacta care if a company wants full-performance or narrowed one as long as it's legally required*

The codebase already said so and nobody noticed: `governance.yml`'s **`No legal-advice language`** guard bans `you should`, `we recommend` and `we suggest` from user-facing strings. *"Pacta declines to offer this"* is exactly the posture that guard exists to prevent.

**The line is lawful or not, and even that is not ours** — it is the statute, and it belongs in `compelled`. Texas voids a contract containing a confession of judgment; that is not Pacta having a view.

**What survives is default versus option.** The library ships defaults. A funder changes what they like. Nothing is forbidden.

## What this supersedes

**ADR 0013:** *"`guarantyScope: 'full-performance'` is deliberately unauthored… It is a named gap, not an oversight."* **Reversed by the owner on 2026-09-11: author it.** The reasoning in 0013 was that market-standard full recourse *"is not a drafting agent's decision"* — which was right about **who decides** and wrong about **whether it gets built**. Under decision 3 above, a lawful commercial term a funder wants is a term the platform supports. The same applies to `disputeResolution: 'arbitration'`, which no ADR named but which the in-flight record treated the same way.

**ADR 0011's `requiredBy?: string`** is replaced by `WhyThisClause`. A bare citation string cannot distinguish *compelled* from *implements*, and cannot say when the requirement bites.

**Two statements in ADR 0013 are now stale rather than wrong.** `frpa.guarantor-information-9-1` *"is a `field-group` that nothing gates"* — it was gated on 2026-09-10 (`923b97be9`). And *"the Equipment Lease and Subscription… both are unreviewed"* — a rewrite is in flight.

## Questions that are closed

Do not re-derive these. A change of mind needs an ADR that supersedes this one.

| question | answer |
|---|---|
| Is "not legally required" enough to make a clause an interview question? | **No.** It is necessary, not sufficient. Four recorded reasons defeat it. |
| Does Pacta decline to support a lawful term it disagrees with? | **No.** Pacta is the platform. The funder's commercial choice is the funder's. |
| Where does a refusal to gate get recorded? | **In `ClauseVariance.note`, not a code comment.** Six were lost in prose before this. |
| Does the legal-status field render to counsel? | **Yes.** It is the first question a reviewer asks. |
| Is `requiredBy` still the legal-status field? | **No.** Replaced by `WhyThisClause`. |
| Is `full-performance` a named gap? | **No, not any more.** Owner reversed it 2026-09-11; it is authored. |

## Consequences

**Backfilling 219 records is the cost, and it is the point.** Most will be `discretionary` + `fixed`, and writing that down is what makes the exceptions visible. A statutory walk of the kind `why-this-clause.ts` records for Florida — *"every section read end to end, asking of each: does this require text in an AGREEMENT, or does it only regulate conduct?"* — has **never been done for the eleven MCA states.** Until it is, `compelled` may only be claimed where a vendored source in `mca/sources/` supports it.

**Three fact values still have no clause behind them**, and they are the whole remaining backlog: `collectionMethod: 'ach-only'` and `'split-with-ach-backstop'` (§2.5 and §7.14 left the paper and **no change note records why**), and `venueRule: 'funder-state'` (needs `funderState`).

**`processorSplitAccepted` is misfiled.** Whether a given processor countersigned is a per-deal operational fact, not a funder profile answer. It should leave `McaFacts`.

## What this does not change

- [ADR 0008](0008-mca-is-two-surfaces-not-one.md) stands, and bounds this. **Nothing here applies to `mca/sources/`, `mca/content/` or `mca/prescribed/`** — a state's prescribed disclosure is a creature of statute, transcribed verbatim, and is not a clause with a variance.
- [ADR 0009](0009-counsel-is-parallel-not-a-gate.md) stands. Counsel is parallel; drafting does not wait.
- [ADR 0012](0012-the-baseline-document-is-input-not-specification.md) stands entirely. The baseline is input.
- [ADR 0013](0013-a-funder-profile-describes-the-funder.md) stands except as named above. **Its partition rule and its diagnostic are the foundation of decision 2, not a casualty of it.**
- Nothing here approves any clause. Every record remains `status: 'draft'` with `author: null`.
