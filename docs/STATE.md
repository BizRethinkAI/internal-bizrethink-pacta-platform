# STATE.md — where this repo actually is

**Every session reads this first and updates it last.** It is the only memory that
survives between sessions. It replaced a user-local `~/.claude/.../memory/`
directory on 2026-08-29 — that directory was invisible to anyone but one machine,
unversioned, and absent from PRs. This file is none of those things.

Record **current reality, not intent**. A stale STATE.md is worse than none,
because it is believed.

Durable rules live in [`engineering-standard.md`](engineering-standard.md).
Decisions and their reasoning live in [`adr/`](adr/). This file is for what is
true *right now*.

_Last updated: 2026-08-29_

---

## Where things stand

Pacta is an **additive fork of `documenso/documenso`** — a document-signing
platform running at `sign.pacta.ink` on Coolify, auto-deploying from `main`.
Production holds **468 envelopes**: real, signed, customer contracts. Treat every
production action accordingly.

All customisation lives in `packages/bizrethink/` plus **42 overlay patches**,
which are the only sanctioned way to modify upstream files. Upstream is merged
weekly by `.github/workflows/upstream-sync.yml`. See
[ADR 0002](adr/0002-additive-fork-over-hard-fork.md).

**Current upstream base: 2.16.0** (synced 2026-08-13, 142 commits, PR #16).

Live features include per-org SMTP, DB-backed instance config for
signing/storage/AI/SSO/Stripe, SaaS billing tiers with trials, and per-org
branding.

## In flight

| PR | What | State |
|---|---|---|
| #18 | Lease builder — engine, clause library, renderer, signing handoff | 6/7 checks green, E2E running |
| #3 | `default-deny GITHUB_TOKEN` scope in CI workflows | Rebased 2026-08-29, E2E running |
| #4 | AATL signing setup plan (DigiCert + GCP Cloud HSM) | Rebased 2026-08-29, E2E running. AATL confirmed still live. |
| this | Engineering discipline system | You are reading it |

**The lease builder is built but unreachable.** There is no route, no UI, and no
caller outside a test. Both gates are shut: `BizrethinkFeatureAccess` grants
access only to user 3, and every clause sits at `status: 'draft'`, which renders
only for a BizRethink-internal organisation. See
[lease-builder scope](#lease-builder-29090-picana-ln) below.

## Blocked

- **Lease builder cannot reach a third party** until a Florida attorney reviews
  the clause library. That is deliberate and enforced in code, not by memory.
  47 clauses, all `attorney-drafted, author: null` — meaning drafted by a
  language model and reviewed by nobody.
- **No local development database.** Ports 5432 and 54320 are both closed and the
  only credential on the machine is `PACTA_PROD_DATABASE_URL`. Every Prisma query
  in `packages/bizrethink/server-only/` is unit-tested and has **never executed
  against a real Postgres**.
- **`npm test` cannot run on the workstation.** Node 26 removed the `recursive`
  option from `fs.rm`; `zod-prisma-types` still calls it, so `prisma generate`
  dies and takes the whole turbo pipeline with it. CI runs Node 22 and is
  unaffected — meaning **CI is currently more capable than the dev machine**, and
  the local pre-merge gate in `UPSTREAM.md` cannot be run as written.

## Decisions taken

Reasoning lives in [`adr/`](adr/); this is the index of what is settled.

- **Additive fork, not a hard fork** — [ADR 0002](adr/0002-additive-fork-over-hard-fork.md)
- **Documenso, not DocuSeal** — [ADR 0003](adr/0003-documenso-over-docuseal.md). Five working days were lost to the wrong premise; the lesson is in the ADR.
- **Instance config in the database, never Coolify env vars** — [ADR 0004](adr/0004-db-backed-instance-config.md)
- **Coolify + Docker, auto-deploy from `main`** — [ADR 0005](adr/0005-coolify-hosting.md)
- **npm, not pnpm** — [ADR 0006](adr/0006-npm-over-pnpm.md), a deliberate deviation from the house standard
- **AATL trust via DigiCert + GCP Cloud HSM** — [ADR 0007](adr/0007-aatl-via-digicert-gcp-hsm.md). Confirmed still live 2026-08-29.
- **Pacta is a product brand, not a legal entity.** No DBA filing; the Stripe statement descriptor `PACTA*BIZRETHINK` solves the customer-facing need.
- **`main` allows merge commits.** `required_linear_history` is off on purpose — squash or rebase would destroy upstream-sync ancestry.

## Next

1. Land #18, #3, #4 — all three are queued on the same E2E runner.
2. Merge this PR; adopt the standard.
3. **Lease builder:** a route to call it from, then the answers only the landlord
   has (tenant names and emails, the three §83.512 flood-knowledge statements,
   deposit institution and address, pet terms).
4. **Then** the Florida attorney engagement. The plan is deliberately
   attorney-*after*-working-tool: they review a rendered, dogfooded lease rather
   than a brief.
5. Close the two documentation lies — see *Watch out for*.

## Watch out for

**This repo's characteristic failure is silence, not breakage.** Everything below
passed, or appeared to:

- **A `cancelled` E2E job is not a pass.** It reports neither. The gate has gone
  dark twice this way — the warp runner, then the 60-minute cap. Guards now pin
  the runner, the cap (≥90 min) and `TURBO_LOG_ORDER: stream`, because without
  streaming turbo buffers output and discards it on kill, making "slow" and
  "hung" indistinguishable.
- **Upstream syncs drop features silently.** The 2026-08-13 audit found three
  (admin org-delete, signing-page branding, signup flags). Nothing was red.
- **Green tests do not mean complete code.** On 2026-08-28 a clause module was
  imported and never added to the library array: seven clauses missing from every
  lease, 286 tests still green, `noUnusedLocals` off so nothing complained.
- **vitest strips types without checking them.** A fixture missing required
  fields passes green while feeding `undefined` into every predicate. Run
  `npm run typecheck:lease --workspace=@bizrethink/customizations`.
- **Two documented controls do not exist.** The master `CLAUDE.md` cites a
  `security.yml` npm-audit gate blocking high-severity findings, and
  `scripts/apply-overlays.sh`. Neither is in the repo. `security.yml` is added by
  this PR; the `apply-overlays.sh` claim still needs resolving.
- **System service accounts are load-bearing.** `deleted-account@` and
  `serviceaccount@sign.bizrethink.ai` look like scaffolding. They are the
  orphan-envelope receiver and the impersonation block. Hiding them in the admin
  UI is fine. Deleting them breaks user deletion and risks loss of signed
  contracts.

## Open threads

### Lease builder (29090 Picana Ln)

Internal-tool-first by decision: build the real architecture, ship it gated, defer
the attorney until the tool is validated. Do **not** propose the interview UI, the
org clause library, the custom-clause editor, AI features, pricing work, or
additional states before the dogfood milestone is met.

Prod carries a `BizrethinkFeatureAccess` table and a grant for user 3, applied
2026-08-28 — **ahead of the code that uses it**, which is still unmerged. If #18
is abandoned, both are orphans and should be dropped.

### Paused elsewhere

- **Sentry triage** — replay-burn investigation paused pending Sentry MCP config.
  The insight was: fix errors, not replay rates.
- **Stripe (Pacta sandbox)** — paused at "choose pricing model". One Stripe
  account per legal entity, not per product; this one is the Server Baba Inc
  umbrella.
- **Pricing** — Free / $35 Pro / $199 Business / Enterprise, approved 2026-05-10.
  Parked for the lease builder until it becomes a product.

## Cross-repo

- `client-circular-payments-platform` consumes this platform for contract
  signing. **Do not edit it from a Pacta session** without explicit per-change
  consent; document a handoff instead.
- Its 17 contracts use an AcroForm widget pipeline (`«N»` markers). **Do not
  propose converting them to native `{{...}}` placeholders** — it was tried and
  does not work. Fix the seal flow or the send-helper instead. This does not
  apply to newly generated PDFs, which have no AcroForm layer.
- `infra-gitops` manages the VPS fleet Coolify runs on.
