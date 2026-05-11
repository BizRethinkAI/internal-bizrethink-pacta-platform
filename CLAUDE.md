# internal-bizrethink-pacta-platform — Project context

BizRethink AI's document signing platform. **Additive fork of [documenso/documenso](https://github.com/documenso/documenso).** All BizRethink customization lives in `packages/bizrethink/` and `overlays/*.patch`; upstream files in `apps/` and `packages/*` (except `bizrethink/`) are NEVER modified directly.

## Background — read before designing anything

**This project replaces a deprecated DocuSeal CLI attempt** (`internal-bizrethink-docuseal-deprecated`, deleted from local 2026-05-10 — never pushed to GitHub; safety tarball at `/tmp/docuseal-deprecated-backup-2026-05-10.tar.gz`). Five working days were spent attempting to build a CLI for self-hosted DocuSeal Pro before discovering that on-prem DocuSeal lacks the multi-tenant API surface the bootstrap spec assumed. Documenso has the correct surface (per-team API tokens, first-class multi-team primitives) and matches BizRethink's TypeScript stack.

- **Decision rationale + paywall audit:** `~/.claude/projects/-Users-shwet-github-bizrethink-internal-bizrethink-pacta-platform/memory/`
  - `documenso_paywall_audit.md` — confirms self-host unlock = 1 env var + 1-line patch
  - `lessons_from_docuseal_attempt.md` — what we learned + patterns worth carrying forward
  - `coolify_api.md` — Coolify access pattern (still valid)
- **Setup Guide (deprecated):** `~/Desktop/Claude Cowork/BizRethink/Platform/DocuSeal_Setup_Guide.md` — has a deprecation banner; §10 (business model) still valid, everything DocuSeal-specific is stale
- **Cutover target unchanged: 2026-05-10** (MFG-only acceptable on day one; MORG CAP can roll out the following week)

## Architecture — additive fork pattern

**Three discipline conventions (LOAD-BEARING):**

1. **`packages/bizrethink/` is sacred.** Every BizRethink feature goes here, structured as a regular Documenso package. Importable from upstream code only via `overlays/` patches.
2. **`overlays/*.patch` is the ONLY place upstream files get modified.** Each patch has a one-line rationale at the top: *what this patches*, *why we couldn't do it as a new file*, *estimated upstream-merge fragility (low/med/high)*.
3. **Schema additions go in `packages/bizrethink/prisma-extensions/additions.prisma`**, not by editing `packages/prisma/schema.prisma`.

**Why these conventions:** the GitHub Action at `.github/workflows/upstream-sync.yml` runs weekly to merge `documenso/main`. Conflicts only happen on `overlays/` patches and `packages/bizrethink/` files (rare since both are isolated). Solo-dev gets a 5-min weekly chore instead of a 3-hour quarterly nightmare.

## Layout

```
internal-bizrethink-pacta-platform/
├── apps/                            ← upstream files (DON'T MODIFY)
│   ├── remix/                       ← main web app
│   ├── docs/                        ← docs site (probably skip deploying)
│   └── openpage-api/                ← cloud marketing API (probably skip deploying)
├── packages/                        ← upstream files (DON'T MODIFY EXCEPT bizrethink/)
│   ├── api, auth, ee, lib, prisma, signing, trpc, ui, ...    ← upstream as-is
│   └── bizrethink/                  ← NEW: ALL customizations live here
│       ├── server-only/             ← per-tenant routing, mailer adapter, fintech audit hooks
│       ├── ui/                      ← per-DBA themes, custom signing-page overlays
│       ├── prisma-extensions/       ← BizRethink-specific schema additions
│       ├── feature-flags.ts         ← single switchboard for "enable in our build"
│       └── README.md                ← how to add a feature
├── overlays/                        ← targeted patches to upstream files
│   ├── README.md                    ← every patch documented with rationale + line-anchor
│   └── *.patch                      ← discrete patches; applied via scripts/apply-overlays.sh
├── .github/workflows/
│   └── upstream-sync.yml            ← weekly: pull documenso/main, attempt merge, open PR
├── UPSTREAM.md                      ← runbook for handling merge conflicts + patch re-application
└── CLAUDE.md                        ← this file
```

## Stack (inherited from Documenso)

- **Monorepo:** npm workspaces (`apps/*`, `packages/*`) — Documenso uses npm despite the master CLAUDE.md preference for pnpm; do NOT switch package manager without coordinating an upstream-merge plan
- **Web framework:** Remix (React-based, similar to Next.js)
- **ORM:** Prisma + PostgreSQL
- **API:** tRPC for internal, REST for public (`/api/v2/*`)
- **Auth:** custom session-based + per-team API tokens
- **PDF signing:** CAdES / PKCS#7 cryptographic (eIDAS Advanced Electronic Signature) with optional Time Stamp Authority + Long-Term Validation
- **Storage:** Postgres + S3-compatible object storage
- **License:** AGPLv3 (fine for self-hosted internal use; no obligation as long as we don't distribute modified versions)

## Self-host configuration (from the audit)

**Two unlocks for full features (no licensing/EE gates):**

1. **Env var:** `NEXT_PUBLIC_FEATURE_BILLING_ENABLED=false` (or omit; default is "not 'true'")
2. **Overlay patch:** `overlays/001-default-claim-enterprise.patch` — changes one line in `packages/lib/server-only/organisation/create-organisation.ts:172` to give new orgs the ENTERPRISE claim by default

That's it. See `overlays/README.md` for status.

## What BizRethink layer adds (target — being built day 4–7)

- **Per-tenant routing** — `client-circular-payments-platform` calls `documenso-client.sendContract({legalEntity:"mfg", template:"frpa_v3", ...})` → routes to the right Documenso team via per-team API token
- **Postmark mailer adapter** — overrides Documenso's default mailer so signer emails come from `contracts@circularpayments.com` / `contracts@circularpay.io` per tenant
- **Fintech audit hooks** — extra audit events for SOC 2 / future compliance posture
- **Webhook fan-out** — Documenso webhook → BizRethink internal event bus → `client-circular-payments-platform` updates `contracts.legal_entity`
- **Per-DBA signing themes** — Tailwind theme overlays loaded per-team

## Out of scope (for v1, revisit later)

- HIPAA compliance flag (Documenso supports via custom claim; we don't need it for fintech)
- 21 CFR Part 11 (FDA pharma; not relevant)
- SSO via SAML (defer until > 1 admin)
- Embedded signing in third-party React apps (use case TBD)

## Cutover plan

**2026-04-29 → 2026-05-10 (10 working days):**

- Day 1 (today): vanilla deploy on Coolify, smoke-test, verify per-team API tokens
- Day 2–3: apply unlocks, set up `packages/bizrethink/` skeleton, GitHub Actions upstream sync
- Day 4–7: build BizRethink-specific features (routing, mailer, themes, webhook bridge)
- Day 8: add «anchor» markers to 6 contract JSX source files, re-export PDFs
- Day 9: end-to-end test (real test FRPA from platform → through wrapper → through Documenso → to test signer email → branded → signed → webhook → platform updates)
- Day 10: cutover prep
- 2026-05-10: first real merchant contract through Documenso

## Key external references

- Master tech stack: `~/github/bizrethink/CLAUDE.md`
- Documenso upstream: `https://github.com/documenso/documenso`
- Documenso docs: `https://docs.documenso.com`
- Contract source library: `~/Desktop/Claude Cowork/BizRethink/CircularPayments/Contracts/CONTRACT_INDEX.md`
- Brand assets: `~/Desktop/Claude Cowork/BizRethink/Platform/brand/`

## Hard rules (carried over from BizRethink master)

- TypeScript everywhere (already satisfied — Documenso is TS)
- Tailwind only for styling (already satisfied)
- npm package manager (Documenso uses npm; the master BizRethink stack prefers pnpm but switching here would fight every upstream sync)
- Conventional commits where possible
- No secrets in code or logs
- Coolify env vars hold all production secrets, never in repo
