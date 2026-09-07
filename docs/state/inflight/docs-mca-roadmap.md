# docs/mca-roadmap — finishing the MCA vertical

**Branch:** `docs/mca-roadmap`. Records [ADR 0008](../../adr/0008-mca-is-two-surfaces-not-one.md)
and the execution plan behind it. No code.

## Where it stands

**Conformity.** Eleven states encoded from vendored primary text, wired to the
provenance gate in PR #108 (open, reviewed, green). What is missing is not more
states:

| gap | detail |
|---|---|
| No product surface | no route, no tRPC procedure, no component |
| Not exported | `packages/bizrethink/index.ts` does not export it — nothing *can* import it |
| **Checks templates, never instances** | verifies spec-against-statute and blank-form-against-spec; has never seen a rendered document with real numbers |
| Four forms unencoded | CA/NY Itemization, CA/NY Lease Disclosure |
| Partial coverage | 5 of NY's 11 rows, 4 of CA's 10, are label-only |
| CT and VA | we hold the form, not the statute |

**Clause library.** Not started. 140 clauses; REVIEW-01 examined 93; **47 have
never been examined by anything.**

## The gap that outranks everything on that list

The checker validates a **blank template**, and every defect it has found lived
in fixed prose. But `DISCLOSURE-COMPUTATION-SPEC.md` opens with *"Owner:
contracts side. Implemented by: lombard-platform"* — and three REVIEW-01
blockers (`ca-funding-provided-is-gross-purchase-price`,
`ca-finance-charge-omits-withheld-fees`, `ca-apr-understated`) were **not
document defects**. The widgets were correct and correctly placed. The numbers
written into them were wrong, because no written definition existed.

Nothing in #108 would catch any of the three. A conformity checker that never
sees a filled form is checking the half where the defects were not.

## Phases

Each is one PR, reviewed at its boundary before the next starts.

| # | What | Blocked on |
|---|---|---|
| 1 | **Instance conformity** — check a *filled* disclosure against the computation spec | nobody |
| 2 | **Export + read-only conformity view** | phase 1 |
| 3 | **The four remaining forms**, then CT/VA statutes | sourcing CT/VA primary text |
| 4 | **Counsel engagement** — the 47 unexamined clauses first | **the owner** |
| 5 | **Clause library**, mirroring `/admin/lease-library` | phase 4 |
| 6 | **Agreement builder** | phases 2 and 5 |

Phases 1–3 need nobody and are the whole near-term plan. Phase 4 sets the clock
for everything after it.

## Why phase 6 is the point, not a flourish

The decisions taken this session are, exactly, the questions a builder would
ask: rollover method (Deduct or Carry); whether a renewal pays off another
financing, which drives the double-dipping disclosure; prepayment costs,
discounts and the contract cross-reference; equipment cost deferred; the 25%
liquidation cap; ISO involvement, which drives broker compensation; and the
merchant's state, which decides whether the disclosure prescribes words, a form,
or only content.

One answer set should produce three things that today three systems produce
independently: the FRPA's clause selection, the disclosure's computed numbers,
and which state form attaches. **They did disagree — that is what those three
blockers were.** The builder collapses that defect class by construction,
because the disclosure stops being a separate document someone fills in and
becomes a projection of the same answers.

## How this gets executed

Two agents, defined in `.claude/agents/` (gitignored — see *Open* below).

- **`mca`** does the work, phase by phase. Its brief is invariants, not tasks,
  because a task-shaped brief is how the first attempt drifted into building a
  parallel type system with no connection to the publish gate. It writes only
  inside `packages/bizrethink/mca/`, never publishes a template, never messages
  another session, and needs both this repo and `lombard-contracts` — specs
  that never meet a real document verify nothing.
- **`mca-reviewer`** runs at each phase boundary, never continuously. It
  reviews the tree and the diff, never the report: the failure it exists to
  catch was invisible in a narrative and visible only in what was absent from
  the tree.

That pairing has already paid for itself twice. The reviewer refuted the
headline claim of #108's own report — the tree contained the test that
disproved it — and the equivalent review on the lease side found a cross-tenant
write that eleven passing checks and a full E2E run had missed.

Phase 1 additionally needs read access to `lombard-platform`, which computes the
disclosure numbers. It is cloned locally.

## Open — owner decisions

1. **Counsel.** Who, when, budget. Everything from phase 4 is blocked, and the
   clause library can never publish without a named reviewer.
2. **Where the builder lives.** `lombard-platform` computes the numbers and owns
   the deal; Pacta owns the documents and the clause library. Needs deciding
   before phase 5, not after. Becomes its own ADR when decided — an ADR records
   a decision taken, so writing one now would be wrong.
3. **Three counsel questions** already pinned by tests, none actioned: whether
   CA §914(a)(2)(C)(iii) requires a short explanation our form omits; whether
   §914 and §600.6 describe rows out of table order (the `prose-described`
   reading, the one place a weaker check was chosen on a legal reading); and
   whether "estimated payments" is Kansas's prescribed label.
4. **`.claude/agents/` is gitignored** (`.gitignore:58`). The two agent
   definitions live on disk only — no history, no backup, not shared. Fine for
   one machine; a `.gitignore` change if they should be versioned.
