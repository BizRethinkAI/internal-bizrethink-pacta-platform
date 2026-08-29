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
which are the only sanctioned way to modify upstream files (plus the paths declared in `overlays/BIZRETHINK-OWNED.txt`, which were never upstream). Upstream is merged
weekly by `.github/workflows/upstream-sync.yml`. See
[ADR 0002](adr/0002-additive-fork-over-hard-fork.md).

**Current upstream base: 2.16.0** (synced 2026-08-13, 142 commits, PR #16).

Live features include per-org SMTP, DB-backed instance config for
signing/storage/AI/SSO/Stripe, SaaS billing tiers with trials, and per-org
branding.

## In flight

| PR | What | State |
|---|---|---|
| #26 | Lease party list + sending wired | Open. Base of the current stack. |
| #27 | Property form, Census address lookup, market-fact suggestions | Open, stacked on #26 |
| #3 | `default-deny GITHUB_TOKEN` scope in CI workflows | Rebased 2026-08-29 |
| #4 | AATL signing setup plan (DigiCert + GCP Cloud HSM) | Rebased 2026-08-29. AATL confirmed still live. |

Merged 2026-08-29: **#18** (engine, clause library, renderer, signing handoff),
**#21** (route), **#22** (preview link), **#23** (custom clauses + interview
definition), **#24** (multi-step interview UI), **#25** (four Florida statutory
gaps found by adversarial review).

**The lease builder is now reachable and usable.** `/t/:teamUrl/leases` renders a
13-step, 68-field interview over **52 clauses**, with a live findings panel, a PDF
preview, a custom-clause editor and — as of #26 — a working Send. Both gates
remain shut: `BizrethinkFeatureAccess` grants access only to user 3, and every
clause sits at `status: 'draft'`, which renders only for a BizRethink-internal
organisation.

## Blocked

- **Lease builder cannot reach a third party** until a Florida attorney reviews
  the clause library. That is deliberate and enforced in code, not by memory.
  **52 clauses**, all `attorney-drafted, author: null` — meaning drafted by a
  language model and reviewed by nobody. `reviewedBy`, `verbatimVerifiedAt` and
  the `assertPublishable` guard all exist and are all currently set by nobody;
  the planned review loop writes into them.

  **The attorney is now the critical path, not a background task.** The
  candidate identified 2026-08-29 is the new tenant's spouse, which is an
  adverse-interest conflict (Fla. Bar R. 4-1.7, 4-1.8(i)) for the lease her
  household signs. Split agreed: she reads the pilot lease as the TENANT's side
  — free adversarial scrutiny, no conflict — and any paid library sign-off comes
  later, when she is not the counterparty.
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

Sequenced 2026-08-29 as four tranches. A, and the sending work that had to
precede it, are in flight as #26 and #27.

1. **Land #26 and #27.**
2. **The review loop (~6–8 days).** Sending a lease to a lawyer and sending it
   to a tenant are the same mechanism pointed at different people, and the
   platform has **no commenting primitive at all** — `RecipientRole` is
   CC/SIGNER/VIEWER/APPROVER/ASSISTANT and the only channel back from a
   recipient is `rejectionReason`. Decided: attorney comments **block sending
   until dispositioned** (accept / edit / dismiss-with-reason); tenant comments
   **never block**, because a tenant comment is a negotiating position, not a
   defect report; dismissal reasons are written into the **executed document's
   audit trail**, not the matter history, because the envelope log is sealed
   alongside the signed PDF while matter history is mutable.
3. **Library sign-off (~2 days), built on the same primitive.** Per-clause
   attorney review writing `reviewedBy` / `verbatimVerifiedAt` / `published`.
   **This is the milestone after which a lease may lawfully reach a third
   party.**
4. **Guardrails + AI (~3–4 days).** Non-waivable-area scan, answer-contradiction
   checks, clause drafting from plain English. The deterministic layers may
   block; the AI layer may only raise a question with a citation. A false "this
   clause is fine" is worse than no check, because it manufactures confidence.
5. **Deferred:** paid property data. Blocked on a spending decision and worth
   six manual questions per property until then — see *Property data* below.
6. Close the remaining documentation lie (`scripts/apply-overlays.sh`).

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
- **A permanently-red guard hides every guard behind it.** The `Governance`
  workflow's fork-discipline check decided "is this upstream?" by path, so it
  failed on **every** lease-builder PR — #21, #23, #24, #25 and both open ones —
  and each was merged over the failure. Remix resolves routes by filename, so a
  route we write *must* live in `apps/remix/app/routes/`; those files were never
  upstream. Fixed 2026-08-29 by declaring ownership in
  `overlays/BIZRETHINK-OWNED.txt`. Two further real failures were sitting behind
  it, invisible, because `bash -e` stops a job at the first failing step: the
  advice-language guard (the §83.49(3)(a) notice quotes statutory wording the
  guard bans) and this very STATE.md check. **Never merge over a red guard —
  fix it or delete it.**
- **The first version of that fix was itself wrong.** Converting a glob to a
  POSIX regex in `sed` needs a bracket expression containing `]`, which sed
  misparsed; the result exempted only half the declared paths and would have
  silently hidden real upstream edits. A filter that over-exempts is worse than
  the bug it fixes. It is Python now, and verified against adversarial
  near-misses (`lease-something.tsx`, `lease/nested/deep.tsx`).
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
the attorney until the tool is validated. Still **not** in scope: pricing work,
additional states, or the org-level clause library. The interview UI and
custom-clause editor were in that list and are now built (#23, #24).

Prod carries a `BizrethinkFeatureAccess` table and a grant for user 3, applied
2026-08-28. The code that uses it is now merged.

**The root defect this feature exists to fix**, for anyone picking it up: the
2026 Zillow lease had one `securityDeposit` field carrying two different facts —
money *held* from a prior tenancy versus money *collected* at signing. Entering
$6,300 double-charged; entering $0 misstated. `money/derive.ts` splits them, and
the summary table can no longer disagree with page 22.

**Sending was unreachable by construction until #26.** `landlordNames` and
`tenantNames` are required variables on the opening clause and sit in
`DERIVED_VALUES` — nobody types them — and nothing derived them. The only place
they were ever populated was a hardcoded fixture, so tests were green while every
real lease reported two permanently-missing variables and `readyToSend` could
never be true. The party list simply did not exist in the product.

**Two silent invariants around signers.** Emails reach `createEnvelopeFromMatter`
as `Record<name, email>`, so two signers sharing a name collapse to one entry and
one receives the other's link; two sharing an email get two links to one inbox.
Both create a valid envelope and produce a lease countersigned by the wrong
person with no error anywhere. `validateParties` rejects both. **Party order is
load-bearing** — placeholders are numbered positionally and resolved by index, so
nothing may sort or regroup that list.

### Property data

Settled 2026-08-29 after checking what "national, fast, free" actually buys.
**Free national data does not include the field that matters.** `yearBuilt`
decides whether the federal lead-paint disclosure fires (42 U.S.C. §4852d), and
the free tiers that carry it cap at ~5 properties (RentCast) or cost ~$299/mo
(ATTOM). Zillow retired its public API in 2021 and prohibits automated access;
third-party wrappers resell scraped data, which is not a foundation for a legal
documents product.

So: the **US Census geocoder** (free, no API key, US government data) normalises
the address and derives the **county**, which sets venue. `yearBuilt` and
`propertyType` stay asked, and "unknown" includes the disclosure rather than
skipping it — a fail-safe an API guess would defeat.

On blur, not per keystroke: it is a lookup, not a typeahead. Verified live before
being designed around; the test fixture is a real captured response, because two
things about the real shape would not have been guessed — the match returns ALL
CAPS, and `addressComponents` carries no house number at all (`fromAddress`/
`toAddress` are the block range).

### The UPL line, now structural

A field carrying a `statute` shows the bound and the citation and may **never**
carry a suggested value — suggesting a number on a statutorily-constrained field
is advising on the statute. A field with no statutory bound may state a market
fact, phrased as an observation ("most leases use…", never "we recommend…").
Both halves are asserted by test, including a required attributing word, so the
rule cannot be eroded by a copy edit. Only three fields qualify today; inventing
market statistics to fill more would be worse than an empty box.

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
