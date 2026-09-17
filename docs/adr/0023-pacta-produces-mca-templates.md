# ADR 0023 — Pacta produces MCA templates, and owns the record of them

- **Status:** Accepted
- **Date recorded:** 2026-09-17
- **Decision date:** 2026-09-17 (repository owner, in answer to the open
  questions in [`docs/design/mca-template-publication.md`](../design/mca-template-publication.md))
- **Completes:** [ADR 0016](0016-mca-provider-template-revisions.md), which made
  a provider recipe a saved, revisioned thing but stopped short of letting it
  become a template anybody can send.

## Context

Two things can produce an MCA template for a funder's Pacta team:

- **`lombard-contracts`** — a `.docx` authored by hand, rendered by LibreOffice,
  AcroForm widgets injected by script, uploaded through the Pacta UI, and
  recorded in `*.published.json`, which `lombard-platform` reads to find a
  `templateId`.
- **The Pacta MCA builder** — a provider interview that compiles a clause set
  into an assembled package, which today stops at an internal draft PDF.

The funder's platform sends by calling `POST /api/v2/template/use` against a
published template. So whichever route produced that template decides what a
merchant signs, and **only one of the two routes passes through the approval
gate**.

## Decision

### 1. The Pacta builder becomes the only producer of MCA templates

`lombard-contracts` keeps the historical documents, the change-note history and
the state-disclosure work. It stops producing new MCA agreement templates once
the builder reaches parity.

**One producer, because two is the twin problem this vertical has already paid
for twice** — and here the cost is sharper than duplication: a second route to
publication is a route around `assertMcaPackagePublishable`. A gate that can be
walked around is not a gate.

### 2. Pacta owns the record of what was published

The `templateId` is recorded against the **provider revision that produced it**,
in Pacta, and exposed over the API. The funder's platform reads it from the
producer rather than from a JSON file in a third repository.

A record kept by someone other than the producer drifts the first time anybody
republishes without editing it. `*.published.json` stays as history of what the
old pipeline did; it stops being the source of truth.

### 3. Parity before the first publication

The builder's output must match the documents in use — same AcroForm widget
names, same recipient roles, same signer fields — before anything it produces is
published.

**The widget names are an interface contract.** `lombard-platform` prefills by
**widget name**: `formValues` keyed by the names in the published record's
`acroformFields`, with `prefillFields` sent empty
(`documenso-prefill-helper.mjs`, `buildFormValues`). Field labels are not the
interface.

Their own CI catches a drift authored on their side: `pacta-v2-registry.test.ts`
asserts every kind emits exactly its template's widgets. What it cannot see is a
template **republished from outside that repository** — which is precisely what
this ADR introduces. A name the builder renames therefore breaks a caller this
repository does not deploy, at the moment a merchant is waiting, as a blank where
a figure belonged. lombard-platform #262 adds a runtime warning for that case;
the parity test here is what stops it reaching publication at all.

The set is pinned in `packages/bizrethink/mca/publish/template-parity.ts`, with
every gap between it and the library stated and checked. Parity is a diff, not a
judgement — and it is not yet met.

## Consequences

**The approval gate becomes real.** With one producer, `assertMcaPackagePublishable`
stands between unapproved text and anything sendable. Today it refuses
everything, which is correct and will stay correct until counsel approves
clauses.

**The builder inherits a parity obligation it does not yet meet.** Its renderer
produces internal drafts: an `INTERNAL DRAFT` banner on every page, no native
placeholders, printed rules where signature fields belong. Publishable output is
a second render mode, and it is the largest remaining piece of the MCA vertical.

**`lombard-platform` changes how it resolves a `templateId`**, from a vendored
file to a Pacta API call. That is a change in a repository this session does not
own, and it must not happen before the builder can actually publish.

**Migration is per instrument, and each is a re-publication.** A template
produced by the builder is a new template with a new id. Nothing rewrites the
templates already in `lombard-api`; they stay until replaced deliberately, and
the platform is told the new id through the record in decision 2.

## What this does not decide

- **Which team the builder publishes into** for a second funder. Lombard's
  templates live in `lombard-api`; a team per funder is an organisation
  question, and there is one funder today.
- **When the existing templates are retired.** They keep working; replacing them
  is a decision per instrument, after parity and after counsel.
- **Anything about state disclosures.** They are prescribed forms under
  [ADR 0008](0008-mca-is-two-surfaces-not-one.md) and stay where they are.

## Alternatives rejected

**Both producers, split by document.** Incremental, and it leaves two pipelines
publishing into one team — the twin problem, plus a standing bypass of the gate.

**`lombard-contracts` stays the producer.** Least disruption, and it makes the
builder a drafting toy: the interview's output would never become a document
anybody signs, and the approval gate would guard nothing real.

**New labels, with `lombard-platform` updated to match.** Cleaner naming bought
by breaking a working integration, in a repository this session does not own.
