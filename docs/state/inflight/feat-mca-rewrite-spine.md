# feat/mca-rewrite-spine — the FRPA rewritten, and what it turned up

**Branch:** `feat/mca-rewrite-spine`, PR #152, based on `main` (#151 merged
2026-09-10). The drafting under [ADR 0012](../../adr/0012-the-baseline-document-is-input-not-specification.md)
and [ADR 0013](../../adr/0013-a-funder-profile-describes-the-funder.md).

**All 100 FRPA clause records rewritten**, across ten agent runs. 63 test files,
2474 tests, typecheck 0, biome clean, Governance clean.

**Nothing here is reviewed.** Every clause is `status: 'draft'` with
`author: null` and zero counsel approvals exist. **`assertPublishable` does not
refuse them** — it returns early on anything not `published`, and the surfaces
call it on a hypothetical to display what *would* be wrong. What actually keeps
this text from a merchant is that **no render or assembly path exists in `mca/`**.
The first thing that path must do is fail closed on `assertPublishable`.

## Read this first: the FRPA is not the document a merchant signs

`instrumentsFor(LOMBARD_FACTS)` returns **six** instruments. Only the FRPA was
rewritten. In the same envelope, a natural person signs the Equipment Lease and
Subscription guaranties, which say:

> *"I understand that the cost of litigating in Florida may be in excess of the
> amount at stake in the litigation. **Nonetheless, I waive any objection that
> such courts are an inconvenient forum**… {{equipmentAffiliate}} may properly
> serve me with legal process via certified mail… and **upon such mailing,
> service shall be effective irrespective of whether a signed certified mail
> return receipt is returned**."*

**Service effective on mailing, receipt irrelevant** — worse than the v4 §7.12
the memo rated Critical. Beside it: exclusive Pasco County venue, jury waiver,
class waiver, a one-sided one-year limitation, and the nonreliance clause §7.22
just deleted. **Those are the four defects §§7.5, 7.10, 7.11 and 7.19 were
rewritten to fix**, re-imposed on the same merchant by the documents next to it.

They entered Lombard's suite on 2026-09-10 through the `equipment` fix. **Neither
review nor the counsel memo read them in this role.** Found by the last cluster
stating its property over every instrument rather than the FRPA — because all
three vendored statutes are rules about what a contract may *contain*.

Two more from the same sweep:

- **`iso-pra.confidentiality`** forbids disclosure *"to any third party without
  prior written consent"* with **no carve-out at all** — not a regulator, not a
  court, not the broker's own lawyer. It is §4.8's defect in unrefuted form, on
  the signer a regulator most wants to hear from.
- **`iso-pra.governing-law` mandates binding arbitration in Pasco County.** So
  *"there is no arbitration clause in this library"* is true of the FRPA and false
  of the corpus.

## The Critical, answered on the paper

The owner's question was whether the product works at all: *a UCC §9-406 notice of
a partial assignment does not compel an acquirer to split settlement.*

`Lombard_Payzli_Split_Funding_Authorization_v2.txt` — **nobody countersigns it.**
One signature widget, one date widget, both Seller's. **There is no processor
acceptance block.** §2.3's duty on Buyer to obtain written acceptance before the
Purchase Date has nowhere on the paper to be discharged, so
`processorSplitAccepted: false` is not a record-keeping gap — it is what the form
makes inevitable. It also sweeps a fee in terms, has no aggregate cap, and makes
Merchant indemnify the processor for following Buyer's instructions.

**No cluster owns `split-funding`.**

## Six memo premises proved false

The memo is drafting input, not authority. **Verify anything it asserts about our
documents.** Every one was caught by an agent checking rather than assuming, and
four were repeated by me in a brief.

| premise | truth |
|---|---|
| §8.2 "the memo contradicts itself on Carry" | It does not. The Deduct/Carry text is marked `DELETE — entire current clause`; the `INSERT` opens *"No prior Remaining Balance is carried"*. **My error, in the brief.** |
| Permission to Release "is missing" | Vendored twice, and eight clauses in this library. Reading it sharpens the question: §3 grants bureau authority; §4 sources the FCRA written instructions to a guarantor signature line **the form does not have**. |
| Appendix A "fee table/rates are not supplied" | A completed nine-row grid. Changing your bank account costs **$75 and is also an Event of Default carrying $5,000**, while §2.4 permits the change with approval not unreasonably withheld. |
| Virginia venue is §6.2-2236(A) | It is **§6.2-2234(A)**. §6.2-2236 has no subsection (A) and is not about forum. `facts.ts` had copied the memo's error three times; `ct-va-obligations.ts` was already right. |
| §7.19's "two-year period" is the memo's figure | It appears nowhere but **my own note**. §7.19 is redrafted mutual with no shortened period. |
| §9.1 "no substantive field block is visible" | The block is there, «35»–«40». What was missing was the record's *body*. |

Two more I got wrong in briefs: §7.8 "incorporates five unseen instruments" (it
is eleven words and incorporates nothing), and that Exhibit A and the execution
block carry `«N»` markers (neither has one).

## Four routes to guarantor liability, all closed

1. **§9.2's scope** — gated on `guarantyScope`, insolvency and bankruptcy excluded.
2. **§7.21** — made each Guarantor indemnify Buyer for *"any act or omission by
   any ISO"*. Unlimited liability for a broker they did not choose. **The memo
   does not raise it.**
3. **`frpa.execution`** — a binding recital plus a standalone fraud cause of action.
4. **§9.1** — the execution grid holds **one** guarantor block, non-repeating,
   **with no capacity line**, while §9.5 makes *"the persons or entities
   constituting Guarantors"* jointly liable.

Each was found by an assertion stated **over the set**. None was found by reading
a clause.

**`«37»` is labelled "Social Security Number" and prints a full SSN into the body
of the agreement** — every completed PDF carries it, including a broker's copy.
§9.1 now requires a masked identifier in distributed copies; **the form still
renders the full number**, and the test asserts that disagreement.

## Rules that stopped being re-argued

- **Three fidelity guards retired** — `bodies-match-the-document`,
  `frpa-coverage`'s line-accounting, and `selectClauses` completeness. Replaced by
  **cross-reference coherence** across nine profiles, which was red on real
  defects completeness could not see.
- **A fact may only gate a whole clause, and its values must partition the clauses
  it gates.** **Six clusters refused a gate their brief asked for and every
  refusal was right** (§4.11, §5.16, §4.3, §4.1, §7.1, §7.5).
- **Diagnostic:** if two limbs bind different parties or answer different
  questions, the fact is misattributed, not too coarse.
- **A fact row and the clauses it gates move in the same change.**
- Pinned clause counts are **record counts, not section counts.**

## The facts, and what still does nothing

- **`settlementBase`** — `net`, and the row says loudly this describes the clause
  as drafted, **not a confirmed business fact**. Still the most consequential
  unknown: it reaches every state disclosure.
- **`guarantyScope`** — closed. `full-performance` is a **deliberately unauthored
  gap** and is what all three SEC-filed market forms do.
- **`equipment`** — `'none' | 'merchant-elects'`.
- **`venueRule`** — flipped to `merchant-state`, and **still inert**. The gate was
  refused because **the funder-state arm cannot be drafted: `McaFacts` has no
  field naming the funder's state.** Needs a `funderState` field plus a variables
  mechanism, or the row deleted.
- **`collectionMethod`** — gates no FRPA clause; it gates the `split-funding`
  instrument. §2.5/§7.14 would read it if they returned.
- **`disputeResolution: 'arbitration'`** selects no merchant-facing clause.

## Open, with owners

| item | owner |
|---|---|
| **Five instruments never rewritten** — Equipment Lease, Subscription, ISO PRA, Split Funding, Permission to Release. The first two are the largest open exposure. | **Owner: scope decision** |
| Arbitration product decision. Va. §6.2-2234(B) bars face-to-face arbitration outside the recipient's PPB **and puts the arbitrators' fees on the provider**. | Owner |
| `guarantyScope: 'full-performance'` — §9.1 + §§10.2/10.4 with no guaranty between them | Owner |
| §7.19's period; §7.10 conspicuousness | Owner / counsel |
| `frpa.indemnification-7-9 -> Section 6.3.1` — §6.3.1 is a paragraph inside another record, not a record | Unassigned; needs a split + three counts moved |
| Appendix A grid, §9.1's SSN and repeating block, §4.13's three missing Section 1 rows, §5.11's permitted-prior-interests row, §004's `«25»` label, Section 10's empty headings | `lombard-contracts` form changes |
| UCC-1 collateral description vs the rewritten §4.10 | Operations |
| Six memo-refuted dispositions — **`rejected` already exists in `FindingDisposition`**, so this is a data fix plus regenerate | `lombard-contracts` |
| `examinedBy` over-claims on every rewritten clause. **A third `ReviewId` would not fix it** — the memo read the same old text. What is missing is provenance for the *current body*: which memo entry, and adopted/adapted/departed | Unassigned |
| `types.ts`'s `McaClauseKind` says a `field-group` "holds `fields`, never a body" — now false | One-line fix |
| Pacta records an envelope **role**, not the legal **capacity** in which a human signed — and §9.1 and `frpa.execution` both turn on it | Platform |

## What the cross-reference checker still cannot see

A reference **by name** rather than `Section N` (found with "Exhibit A"); a
sub-provision inside another record (§6.3.1); and a citation that resolves but
means nothing (§7.1's old carve-out for a cascade that no longer exists).
