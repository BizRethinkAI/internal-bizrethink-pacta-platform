# ADR 0024 — Pacta is the custodian and producer of every MCA template

- **Status:** Accepted
- **Date recorded:** 2026-09-17
- **Decision date:** 2026-09-17 (repository owner)
- **Amends:** [ADR 0023](0023-pacta-produces-mca-templates.md), which made the
  builder the only producer of MCA **agreements** and parked the prescribed
  state disclosures under "What this does not decide". It should not have
  parked them, and this says why.

## Context

### Why `lombard-contracts` was in the path at all

It was asked directly, and the honest answer is not architectural. It is
chronological:

| | first commit |
|---|---|
| `lombard-contracts` | **2026-09-02** |
| `packages/bizrethink/mca` | **2026-09-06** |

Four days. `lombard-contracts` is the bootstrap pipeline — a `.docx` authored by
hand, rendered by LibreOffice, widgets injected by script, uploaded through the
UI — and it produced the templates that are in production today. Nothing
replaced it because the builder still cannot publish. It is not an intermediary
by design; it is the thing that came first and was never retired.

ADR 0023 retired it for agreements and then stopped, giving no reason for
stopping. The absence of a reason is the defect this ADR corrects.

### Why it cannot stay, for an entity-agnostic builder

That repository is client-scoped at every level: the `lombardpay` organisation,
its name, `Lombard_FRPA_v4.pdf`, and a widget called **`lombard_signer_name`**.
A second funder can reuse none of it. A per-client repository cannot sit in the
path of a builder whose whole purpose is to serve any funder, and a template
whose field names contain one funder's name is not a template — it is that
funder's document.

### What Pacta already knows about the disclosures

Everything except how to draw them. `mca/prescribed/forms/` holds California and
New York's verbatim rows, Virginia's fixed labelled form and Connecticut's; the
statute checkers re-match the quoted text on every run; the conformity tests run
in CI. So today **Pacta checks a document `lombard-contracts` produces** —
knowledge in one repository, artifact in another. That is the twin problem ADR
0023 was written to kill, left standing on the documents where a defect is
regulatory rather than cosmetic.

## Decision

### 1. Pacta produces and keeps every MCA template

Agreements and prescribed disclosures alike. One producer, one custodian, one
record of what was published — the argument ADR 0023 made for agreements, which
was never narrower than agreements.

### 2. `lombard-contracts` becomes an archive, and stops producing

It keeps what it should always have kept: the `.docx` sources, the change-note
history, the counsel packages, the REVIEW-01 and REVIEW-02 findings, and the
vendored statutes. Those are history and research and they are worth keeping.
Producing artifacts is not among them.

### 3. The order of the move

1. **The six agreements publish from Pacta.** The pipeline is proved where a
   layout mistake is ours to fix.
2. **Pacta owns the record and serves it over the API**, so `lombard-platform`
   stops vendoring `*.published.json`. This is ADR 0023 §2, and it is the fix
   for a whole class of drift rather than for one symptom — see Consequences.
3. **The disclosures move onto the proved path.**
4. **`lombard-contracts` becomes an archive.**

Staged, because the prescribed forms are the hardest artifacts in the vertical
and the first thing that ever publishes from the builder should not also be the
least forgiving thing it could publish.

### 4. A disclosure's layout is checked against the artifact, not the spec

The conformity checker is pointed at text extracted from **the PDF the builder
produces**, not only at the rows as data. Today a form can pass conformity while
the document rendered from it is wrong, because the thing verified is the
description. A single changed word in a prescribed sentence then fails CI.

## Consequences

**The vendored copy goes away, and with it a class of silent failure.**
`lombard-platform` vendors `*.published.json` into `src/templates/`, and its
widget-totality spec compares the builders against **that copy**. Both sides of
the comparison come from one snapshot, so the spec cannot see the snapshot going
stale against what is actually published. Republish without refreshing the copy
and CI stays green while production drifts. Serving the record from the producer
removes the copy, so there is nothing to go stale.

**A second funder becomes possible.** While field names carry one funder's name
and the pipeline lives in that funder's repository, there is no second funder to
be had.

**The prescribed-form checker starts checking something real.** It moves from
verifying a description to verifying an artifact, which is what it was always
for.

**The cost is the prescribed layouts.** An agreement is assembled from clauses
and react-pdf laying it out is unremarkable. California and New York prescribe
exact sentences in closed rows; Virginia prescribes a fixed labelled form.
Reproducing those faithfully is fussier than rendering our own prose, and
getting it wrong is a regulatory defect rather than a cosmetic one. Stated as a
cost, not offered as a reason to keep two producers.

**Nothing changes today.** The templates in production stay, and keep being sent
the way they are sent. Each move is a deliberate re-publication.

## The interim rule on the caller's side

`lombard-platform` #262 fixes a guard that never fired — it read `formFields`
while every record carries `acroformFields`. It **warns rather than throws**,
including on state disclosures, and that is right for now: the disclosures are
not yet republished from Pacta, so the case the guard covers cannot arise for
them, and a throw at send time would turn a cosmetic drift into an outage.

**Revisit when the first disclosure publishes from Pacta.** At that point a
blank required figure stops being cosmetic and the rule should be argued again,
with counsel if counsel is available by then.

## What this does not decide

- **Which team a second funder publishes into.** An organisation question, and
  there is one funder today.
- **When the existing templates are retired.** They keep working; each
  replacement is a decision per instrument, after parity.
- **Whether a prescribed form's layout must match the regulator's own PDF
  visually**, or only in text and order. Settled when the first one is rendered
  and there is something to compare.
