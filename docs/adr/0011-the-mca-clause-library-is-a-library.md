# ADR 0011 — The MCA clause library is a library, not a document

- **Status:** Proposed
- **Date recorded:** 2026-09-09
- **Decision date:** 2026-09-09 (owner)
- **Supersedes:** rule 3 of [`mca/clauses/README.md`](../../packages/bizrethink/mca/clauses/README.md)
  (*"Amend the document, then follow it"*). Rules 1, 4, 5, 7 and 8 stand; rules 2
  and 6 are restated.
- **Completes:** [ADR 0010](0010-agreement-builder-lives-in-pacta.md), which made
  Pacta the assembler while the library was still written as a reader.

## Context

The MCA clause library was built by importing `Lombard_FRPA_v4.txt` and
asserting that nothing in it was missed. That produced 204 clauses across six
instruments with real provenance, real examination records, and a coverage test
that has already caught two silently-dropped clauses. None of that is wasted.

What it got wrong is that **every structural question was answered by "whatever
the .docx does."** How a clause is numbered, whether a form grid is a clause,
what `[Reserved]` means, whether an explainer belongs in the body — each was
inherited rather than decided. That is written down as rule 3, *"Amend the
document, then follow it. This library is downstream of `lombard-contracts`"*,
and enforced by `frpa-coverage.test.ts`.

The base document is `CircularPayments_FRPA_v4.docx`, a form written for a
different funder and rebranded (`lombard-contracts/change-notes/12`). It was
**input**. The library has been treating it as **specification**.

### The correction is bigger than one repo boundary

Two earlier drafts of this ADR got the diagnosis right and the remedy wrong,
both the same way. They proposed a `retired` clause kind, then a
per-document-version placement map — each still assuming the library's job is to
produce *one funder's document*.

It is not. The owner's framing, 2026-09-09:

> we can keep as many clauses as applicable but when we use these to build the
> template, the questions decide if we use ACH, if we use personal guaranty, if
> yes to what extent — not every MCA clause goes for every business. That's the
> whole point of creating the library so it can be used for future MCA funders
> and companies.

**And the lease builder already works this way.** `lease/engine/select-clauses.ts`:

> This is the step a template with slots does not have. A template's numbering
> is written into the template … Here, numbering is *derived from what survives
> selection*, so a clause added mid-document renumbers everything after it
> automatically, **and a clause that drops out leaves no gap.**

That last clause is the whole answer to `[Reserved]`. In a selection engine
there are no reserved sections, because there is no fixed numbering to hold
still. The lease library has had `ClauseFacts`, `includeWhen`, `supersedes` and
`asserts` since #18. The MCA clause type deliberately shipped without them, with
a stated reason:

> There is no `includeWhen` and no `variables` yet. Both belong to the engine,
> which is not built … When the builder needs to select between clauses it will
> need a facts type, and **that type should be derived from what the clauses
> actually branch on rather than guessed at now.**

That was right then and the debt is now due. The counsel memo of 2026-09-09,
which reviewed all 101 FRPA clauses, is precisely the artifact that says what
they branch on.

### Three defects, all downstream of the same cause

**§9.1 Guarantor Information is a clause with no body.** The document prints a
six-field, six-widget grid (`«35»`–`«40»`). Because it is a table,
`frpa/index.ts` declares it non-clause; because §9.1 is a heading, a clause
record exists. `body: ''`. The coverage test passes — every line *is* accounted
for — and counsel could not review the guarantor execution block. The memo: *"No
substantive field block is visible in the exported clause."* The test asks
whether every line has a clause; nobody asked whether every clause has content.

**Four `[Reserved]` rows are shown to counsel as reviewable clauses** — §2.5
(ACH Debit Authorization), §5.7, §7.14 (ACH Authorization), §9.3
(Cross-Collateral) — carrying approval state, a finding box, and a place in the
"101 clauses" count, while being permanently unapprovable. Three market forms
filed as SEC exhibits (Maison Capital Jan 2024, a redacted funder Sep 2025,
Pristine Capital Feb 2026) contain **zero** `[Reserved]` instances between them.
It is an artifact of editing a document in place.

**Four Funding Terms explainers are unnumbered** solely because the source left
them unnumbered. The memo rates `frpa.holdback-explainer` **High**, precisely
because it reads as operative text while describing a non-operative estimate.

## Decision

**The MCA clause library is a selectable corpus, and a document is what falls
out of selecting from it.** It adopts the lease builder's model, which is built,
shipped and proven.

Three consequences that settle the questions this ADR was opened to answer:

1. **This library is v1.** Lombard's `v3`/`v4` are a document lineage belonging
   to `lombard-contracts`. Pacta's library has its own version line starting at
   one. There is no "FRPA v5" here and never was.
2. **Nothing is deleted for being unused.** §2.5's ACH text stays in the library
   as a clause nobody currently selects. Lombard is split-funding-only; the next
   funder may not be. **That is what the library is for.**
3. **Numbering is emitted at assembly, not stored.** `McaClause.number` is
   deleted outright. No placement map, no per-version numbering table, no gaps
   to reserve.

### The model

```ts
export type McaClause = {
  slug: string;
  version: number;
  kind: McaClauseKind;              // NEW
  instrument: McaInstrument;
  placement: McaPlacement;          // NEW
  section: string;
  sortKey: number;
  heading: string;
  body: string;

  source: ClauseSource;
  status: ClauseStatus;
  appliesInStates: McaJurisdiction[];
  requiredBy?: string;
  examinedBy: ClauseExamination[];

  includeWhen: ((facts: McaFacts) => boolean) | null;   // NEW — null = always
  variables: ClauseVariable[];                          // NEW
  supersedes: string[];                                 // NEW
  asserts: string[];                                    // NEW
  // `number` is GONE. Selection derives it, as SelectedClause does for leases.
};

export type McaClauseKind =
  | 'clause'        // operative contract text
  | 'field-group'   // a grid the parties complete; has fields, not a body
  | 'explainer';    // non-operative prose describing an operative term

export type McaPlacement =
  | 'agreement-body'
  | 'guaranty'      // its own numbering series at assembly — see below
  | 'appendix'
  | 'exhibit';
```

`kind` gets no fourth value without a member and a distinct gate behaviour.
`frpa.definitions` stays a `clause`; defined terms bind.

**`field-group` closes §9.1.** Six fields with their `«N»` anchors instead of an
empty body, and Section 1's thirty modelled the same way — which is also the
data model `mca/interview/` has been waiting on. One construct, two problems.

### `McaFacts` — derived from what the clauses actually branch on

The lease's `ClauseFacts` sets the standard: *"Deliberately small: a clause that
needs to know something not on this list is a signal that the answer schema is
missing a field, not a licence to reach into arbitrary state."*

Proposed, from the 101 clauses and the memo's findings. **This list is the main
thing to argue with:**

```ts
export type McaFacts = {
  /** Decides §2.5, §7.14, §4.1's debit language, and the TX §86.313 analysis. */
  collectionMethod: 'split-only' | 'ach-only' | 'split-with-ach-backstop';

  /** Decides the whole guaranty block and §9.2's breadth. */
  guarantyScope: 'none' | 'limited-conduct' | 'full-performance';

  /** Decides the equipment explainers, §5.5 insurance, §4.11 ranking. */
  equipment: 'none' | 'purchased-at-funding' | 'deferred' | 'separate-lease';

  /** Decides §§8.1–8.3, §7.13, and whether Carry language exists at all. */
  renewalModel: 'none' | 'payoff-only' | 'carry';

  /** Decides §4.15's cascade. */
  concurrentPositions: boolean;

  /** Decides §§7.10, 7.11, 7.20 as a bundle — all three market forms pair
      arbitration with a class waiver; we currently have the waiver alone. */
  disputeResolution: 'courts' | 'arbitration';

  /** Decides §7.5. Virginia forbids a non-VA forum for covered transactions. */
  venueRule: 'funder-state' | 'merchant-state';

  /** Decides §7.24 riders: the TX OCCC notice, VA venue, CT PJR-waiver removal. */
  recipientStates: McaJurisdiction[];

  /** Decides §7.21 and the ISO PRA's inclusion in the set. */
  brokerChannel: boolean;

  /** Decides §4.3 and whether Exhibit C is in the set. */
  consumerReportPulled: boolean;

  /** Decides whether Exhibit A may be issued at all. A split nobody has
      accepted is not a collection mechanism — the memo's Critical at 100. */
  processorSplitAccepted: boolean;
};
```

Eleven facts. Lombard's answers are one row against them; a second funder is a
second row, over the same clauses.

### Two layers, and the interview is the upper one

**The interview is per TEMPLATE, not per deal.** Owner's correction, 2026-09-09,
and it is load-bearing: a per-deal interview would put a human in the loop on
every funding, which is exactly the automation ADR 0010 exists to preserve.

| layer | who answers | when | what it produces |
|---|---|---|---|
| **Template facts** — the eleven above | the funder, in Pacta's interview | rarely | a template: a fixed clause set with `«N»` widgets |
| **Deal fill** — merchant identity, funding figures, Section 1 | `lombard-platform`, over the API | every deal | widgets filled, document sent |

**Deal fill selects no clauses.** That is the whole point of the split. Lombard
may hold two templates — one with an ACH backstop, one without — and the app
picks; it never assembles.

### Only Texas needs a template variant

An earlier draft of this ADR worried that state riders would multiply templates
(eleven states times each structural choice). They do not, and the vendored
sources say why. The eleven states impose two different kinds of rule:

| kind | states | needs a variant? |
|---|---|---|
| **Must NOT contain** — Tex. Fin. Code §398.055 (confession of judgment voids the whole contract), Conn. Gen. Stat. §36a-868 (no prejudgment-remedy waiver), Va. Code §6.2-2236(A) (no forum outside the Commonwealth) | TX, CT, VA | **no** — a base form that omits them is compliant everywhere at once |
| **Must CONTAIN** — 7 TAC §86.310(d), the OCCC complaint notice, verbatim, "as a separate section or otherwise conspicuously set out" | **TX only** | **yes** — one added clause |
| **Separate disclosure document** | the other eight | no — a different surface entirely ([ADR 0008](0008-mca-is-two-surfaces-not-one.md)), and `lombard-platform` already handles state-specific contracts |

So Lombard's template count is **base + Texas**, not eleven of anything.

**This reframes the memo's "conservative national form" recommendations as
variant elimination rather than caution.** Merchant-state venue (memo clause
061) is what makes Virginia need no variant. Deleting the prejudgment-remedy
waiver is what makes Connecticut need no variant. Each *must-not-contain* rule
satisfied in the base form is a template never built and never maintained.

The Finance Commission endorsed exactly this structure in its response to
comments: *"If providers wish to use the same contract for multiple states, they
might consider including the OCCC notice in a state-specific provision for Texas
transactions."*

**The notice text is now vendored.** `sources/TX-7TAC-86-310-313.txt`, retrieved
2026-09-09 from the Texas Register. It was not in `TX-Fin-Code-Ch-398.txt` and
never had been — the notice lives in the implementing rules, so before this every
claim about it rested on a citation rather than on text, and the provenance gate
would have been right to refuse a Texas variant.

### Four questions this dissolves rather than answers

| was a question | is now |
|---|---|
| Should the guaranty be a separate `G`-block? | a `placement` value. `'guaranty'` gets its own numbering series at assembly, exactly as the lease's `'addendum'` does. Not a document decision. |
| What do we do about `[Reserved]`? | nothing. A clause that drops out leaves no gap. |
| Should we delete §2.5, §5.7, §7.14, §9.3? | no. They are clauses with an `includeWhen` that Lombard's facts do not satisfy. |
| v4 numbering or v5 numbering? | neither is stored. Selection emits it. |

The G-block survives as a *substantive* finding even though it stops being a
numbering decision: burying the guaranty inside the main numbering is what let
§7.9's indemnity, §9.4's clawback and §§5.11/5.13's present-fact warranties each
reach the guarantor without saying so (the memo's Criticals at 065 and 087,
Highs at 045 and 047). A separate placement makes the **next** such reach
visible. It does not fix those four clauses; they still need rewriting.

### The coverage invariant splits

`linesNotAccountedFor` is kept and re-aimed. It currently asserts a property of
the *library*; it becomes a property of an *assembled output*.

| assertion | scope | catches |
|---|---|---|
| **Fidelity** — assembling with Lombard's facts reproduces `Lombard_FRPA_v4.txt`, line for line | one funder, one fact row | a clause we never noticed *(unchanged — still the direction that fails silently)* |
| **Authorship** — every entry has a `kind`, non-empty content for that kind, and a reachable `includeWhen` | the library | **§9.1 — a clause we declared and then emptied** |

Fidelity becomes a *regression test on the engine* rather than a constraint on
the corpus: it proves selection can still produce the paper Lombard has, while
leaving the library free to hold clauses that paper does not use.

## Migration

Six phases, each a PR, each independently CI-green. Only two consumers exist
today — `readable-agreement.ts` and `/admin/mca-library` — and the builder is
not built, which is why this is cheap now and expensive later.

| # | Phase | What lands | Risk |
|---|---|---|---|
| 1 | **`kind` + authorship test** | `kind` added, defaulting to `'clause'`. **§9.1 fails, by design.** | none — additive, one intended red |
| 2 | **`field-group`** | §9.1's six fields and Section 1's thirty modelled; the two `FRPA_NON_CLAUSE` anchors deleted; fidelity still green because fields now account for those lines | low — closes §9.1, unblocks `mca/interview/` |
| 3 | **`McaFacts` + `includeWhen`** | the facts type, `includeWhen` on every clause, `LOMBARD_FACTS` as the first row. The four `[Reserved]` rows are **replaced by their real former bodies** with an `includeWhen` Lombard does not satisfy | low — v3 bodies **located and confirmed readable** at `lombard-contracts/legacy/v3-archive/CircularPayments_FRPA_v3.docx` |
| 4 | **`select-clauses` for MCA** | ported from `lease/engine/`; numbering derived; `number` deleted from `McaClause` | medium — the one phase that must not be split across the FRPA and the twins |
| 5 | **`placement`** | `'guaranty'` gets its own series; `supersedes` and `asserts` populated | low |
| 6 | **`explainer`** | the four Funding Terms blocks reclassified and rendered distinctly | low |

Phases 1–2 pay for themselves immediately and can land together.

### Effects on the gates

- **`assertPublishable`.** `clause` and `explainer` need an author — an explainer
  is still text a merchant reads. `field-group` needs field definitions instead.
- **The approval fingerprint.** `kind`, `placement` and `includeWhen` go **in** —
  each changes what a clause means or when it appears. `sortKey` stays **out**,
  and there is no longer a `number` to argue about. The reasoning is already in
  `approval.ts`; this is its second application.
- **Counsel-facing counts.** An attorney reviews the clauses a given fact row
  *selects*, plus — deliberately — the ones it does not, marked as such. Both are
  in the library; only one is in the paper.

## Consequences

**Rule 3 is replaced.** The library is not downstream of `lombard-contracts`.
It is the corpus; `lombard-contracts` holds documents assembled from earlier
states of it and the change-note history of how they got there.

**Rule 6 is restated.** *"A clause the document does not number still gets
imported"* becomes *"a clause has no number to be imported with."* Same fourteen
unnumbered FRPA clauses, opposite reasoning.

**Rule 2 narrows, and this is the part to review most carefully.** Today every
clause body must appear verbatim in a vendored `.txt`
(`bodies-match-the-document`). Under selection that holds for clauses Lombard's
facts select and *cannot* hold for the rest — a clause written for a funder who
uses ACH will match no document we have. The test narrows to the selected set.
This is the last transcription anchor.

**A second funder becomes a fact row, not a fork.** `parties.ts` already
parameterises party names and per-tenant source documents. Facts plus
`includeWhen` is the rest of it.

## What this does not change

- **Provenance and examination.** Rules 1, 4, 5, 7, 8 stand. `examinedBy` stays
  required and non-empty; findings attach by judgement, never by locus string.
- **The two-surface split.** [ADR 0008](0008-mca-is-two-surfaces-not-one.md)
  stands. Conformity is a creature of statute and is correctly transcribed
  rather than authored. **Nothing in this ADR applies to it.**
- **Counsel's timeline.** [ADR 0009](0009-counsel-is-parallel-not-a-gate.md)
  stands.
- **No `.docx` is edited and no Pacta template is republished** by this ADR.

## Settled, 2026-09-09

**The `McaFacts` list is accepted** as the eleven above.

**A fact value is never a global decision.** Whether a deal runs on courts or
arbitration, funder-state or merchant-state venue, ACH or split-only, is an
*interview question* answered per funder and per deal. Nothing in this ADR picks
one. What the library owes is that **every value of every fact has at least one
clause selectable under it** — a fact with only one authored answer is a
hardcode wearing a fact's clothes. That is an assertion
(`__tests__/every-fact-value-is-reachable.test.ts`) and it is how library
coverage becomes visible instead of assumed.

Measured against the current corpus, three values have no clause behind them
today: `disputeResolution: 'arbitration'` (we hold a bare class waiver and no
arbitration clause at all), `venueRule: 'merchant-state'`, and
`guarantyScope: 'full-performance'`. Authoring those is library work, not a
decision about Lombard's paper.

**A funder profile is where a default fact row lives**, with its reasoning.
`LOMBARD_FACTS` is that row: `split-only`, `limited-conduct`, and the rest. The
interview may override per deal; the profile records what this funder normally
does and why — which is where the ACH reasoning belongs, since no change note
carries it.

### The memo, split — done 2026-09-09

All 101 entries of the Codex memo classified by what each fix actually is:

| | count |
|---|---|
| **Rewrite the words** — defective under every template, no fact decides it | 58 |
| **Rewrite, then gate** — a real defect *and* a fact-gated scope | 23 |
| **Not a rewrite — a fact** — the memo proposes a product design change | 12 |
| No change / Pacta-side | 8 |

The twelve that are facts rather than fixes: §2.5 (`collectionMethod` — the ACH
backstop returns whole from v3), §§4/7.13/8.1/8.2 (`renewalModel`), §§7.10, 7.11,
7.19, 7.20 (`disputeResolution` — **one bundle, not four decisions**), the
equipment explainer and §5.5 (`equipment`), §4.15 (`concurrentPositions`).

`guarantyScope` alone touches seven of the twenty-three "both" entries (§7.9,
§9.2, §9.4, §9.5, §9.6, §10.2, §10.4). Rewriting those without gating leaves
dead clauses in a no-guaranty template; gating without rewriting ships the leak.

## Pending decisions

1. **Whether `bodies-match-the-document` narrows or goes.** See rule 2 above.
   Recommendation: narrow to the selected set rather than drop — it is the only
   automated check that library text equals real paper.
2. **Which instrument gets the engine first.** **Decided: the FRPA**, owner,
   2026-09-09. The
   small instruments (Split Funding, Permission to Release) have almost no
   conditional clauses, so building against them would exercise nothing and
   defer every real problem; the FRPA is where all eleven facts actually branch
   and it is the only instrument with a fresh 101-clause review to check the
   output against.
3. **§2.5 and §7.14 contradicted each other in v3, and only one should return.**
   Recovered from the archive: §2.5 is a *narrow, gated* backstop — ACH only on
   a defined Backstop Event, capped at the Estimated Daily Holdback. §7.14 is a
   *blanket* authority to debit "any amount now due or hereafter due" from "any
   other bank account that Merchant may open or maintain," on any default.
   `change-notes/09` planned to demote §7.14 for that reason and no note records
   what happened. Under `collectionMethod: 'split-with-ach-backstop'`, §2.5 is
   the clause that returns; §7.14 as drafted should not, and saying so is a
   clause decision rather than a fact one.
4. **Where the OCCC notice lives as a clause.** The text is vendored; nothing
   reads it yet. It wants a clause with
   `includeWhen: f => f.recipientStates.includes('tx')`, `placement` set so it
   prints "as a separate section or otherwise conspicuously set out", and a
   `requiredBy` of `7 TAC §86.310(d)`.
5. **Whether `recipientStates` is really a template fact.** It is the one fact
   in the eleven that is a property of the *merchant* rather than the product.
   Under the two-layer split it must be answered at template time (base vs
   Texas), which works because `lombard-platform` already picks state-specific
   contracts — but it is the seam to watch.
