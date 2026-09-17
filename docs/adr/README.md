# Architecture decision records: index

**This index is the current status of every ADR.** A status line inside an ADR
file is its status when written and is not updated. This file is updated
instead ([ADR 0021](0021-manual-batch-deploys-and-the-adr-index.md)), and it is
the one file in this folder the append-only guard allows to change.

**What to read:**

- **Platform:** 0001–0007, with 0021 replacing 0005's auto-deploy.
- **MCA vertical:** [0020](0020-mca-decisions-consolidated.md) only. It
  consolidates 0008–0019; those files are the history behind it.

**Keeping it current:** a PR that adds, supersedes or completes an ADR updates
its row here in the same change. Progress, deploys and open work belong in
[`docs/STATE.md`](../STATE.md), not here.

**Status values:**

| Status | Meaning |
|---|---|
| **Current** | Read it; it governs. |
| **Current, amended** | Read it together with the ADR named. |
| **Superseded** | History only. The named ADR governs. |
| **Accepted, not implemented** | The decision stands; the work is not done. |

## Platform

| ADR | Decision | Status | Notes |
|---|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record decisions as append-only ADRs | Current, amended by 0021 | This index is the one exception to append-only |
| [0002](0002-additive-fork-over-hard-fork.md) | Additive fork: `packages/bizrethink/`, overlays, schema additions | Current | Its overlay count (42) is historical; 68 patches on 2026-09-15 |
| [0003](0003-documenso-over-docuseal.md) | Documenso over DocuSeal | Current | |
| [0004](0004-db-backed-instance-config.md) | Instance config in the database with an admin UI | Current | |
| [0005](0005-coolify-hosting.md) | Coolify + Docker | Current, amended by 0021 | Auto-deploy on every push is superseded: deploys are manual, per batch |
| [0006](0006-npm-over-pnpm.md) | npm, not pnpm | Current | |
| [0007](0007-aatl-via-digicert-gcp-hsm.md) | AATL trust via DigiCert + GCP Cloud HSM | Accepted, not implemented | Last confirmed 2026-08-29; not re-checked in this compaction |
| [0021](0021-manual-batch-deploys-and-the-adr-index.md) | Manual batch deploys; this index stays current | Current | |

## MCA vertical

**[ADR 0020](0020-mca-decisions-consolidated.md) is current for everything
below.** Each row says which part of 0020 carries it forward, and what changed
before it got there.

| ADR | Decision | Status | Carried into 0020 |
|---|---|---|---|
| [0008](0008-mca-is-two-surfaces-not-one.md) | Prescribed forms vs authored clauses | Superseded by 0020 | §2. Separate products (0015), sequencing (0009) and Payzli as "ours" (0019) were overridden |
| [0009](0009-counsel-is-parallel-not-a-gate.md) | Counsel is parallel, not a gate | Superseded by 0020 | §3.1 |
| [0010](0010-agreement-builder-lives-in-pacta.md) | The builder lives in Pacta: facts in, documents out | Superseded by 0020 | §1 |
| [0011](0011-the-mca-clause-library-is-a-library.md) | The library is a library; numbering derived; `McaFacts` | Superseded by 0020 | §4.1, §5. Phases 1–4 built (#171); phase 5 not built; file still says "Proposed" |
| [0012](0012-the-baseline-document-is-input-not-specification.md) | The baseline document is input, not specification | Superseded by 0020 | §4.2–4.4. Placeholder row and REVIEW-02 claim corrected by 0013 |
| [0013](0013-a-funder-profile-describes-the-funder.md) | Funder profile; partition rule; retired guards | Superseded by 0020 | §5. Its full-performance "gap" was reversed by 0014 |
| [0014](0014-two-questions-every-clause-answers.md) | `WhyThisClause` and `ClauseVariance`; no commercial positions | Superseded by 0020 | §4.5, §5.5–5.6. Implemented (#180) |
| [0015](0015-one-mca-workspace-with-separate-content-catalogues.md) | One MCA workspace, separate catalogues | Superseded by 0020 | §1.3. Implemented (#208, #215); file still says "pending" |
| [0016](0016-mca-provider-template-revisions.md) | Team-owned provider templates, immutable revisions | Superseded by 0020 | §6. Implemented (#210); file still says "merge pending" |
| [0017](0017-versioned-neutral-mca-counsel-packages.md) | Versioned neutral counsel packages | Superseded by 0020 | §3.4. Implemented (#234) |
| [0018](0018-holistic-mca-findings-and-provider-review.md) | Holistic findings and provider review | Superseded by 0020 | §3.4. Implemented (#236 via #250; repair #258) |
| [0019](0019-split-funding-letters-are-processor-controlled.md) | Split funding letters are processor-controlled | Superseded by 0020 | §2.3. Replacing the retained Payzli text is not done |
| [0020](0020-mca-decisions-consolidated.md) | MCA decisions, consolidated | Current | |
| [0023](0023-pacta-produces-mca-templates.md) | Pacta produces MCA templates and owns the record of them | Current, amended by 0024 | Completes 0016. Its "does not decide" parking of the state disclosures is reversed by 0024 |
| [0024](0024-pacta-is-custodian-of-every-mca-template.md) | Pacta is custodian and producer of EVERY MCA template | Current | `lombard-contracts` becomes an archive. Agreements move first, then the record and API, then the disclosures |
