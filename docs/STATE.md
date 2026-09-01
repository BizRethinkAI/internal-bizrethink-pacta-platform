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

_Last updated: 2026-08-31_

---

## Where things stand

Pacta is an **additive fork of `documenso/documenso`** — a document-signing
platform running at `sign.pacta.ink` on Coolify, auto-deploying from `main`.
Production holds **450 documents and 34 templates**: real, signed, customer
contracts. Treat every production action accordingly.

**Pacta now hosts a second tenant.** Until 2026-08-31 every production
organisation was BizRethink's own; `lombard` is the first outside one. That
changes the blast radius of instance-wide changes — see *Lombard tenancy* below.

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
| #27 | Property form, Census address lookup, market-fact suggestions | Open, stacked on #26. You are reading its STATE update. |
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

- **AGPL §13 needs an attorney's eye, and it is not a CI question.** Raised
  2026-08-31 while diagnosing the runner; it turned out to be orthogonal to it
  and more urgent.

  ADR 0003 line 29 and `CLAUDE.md` both record the obligation as *"dormant
  while we do not distribute modified versions"*. That is
  **distribution-triggered reasoning**, which is GPL's test. **AGPL §13 is
  triggered by remote network interaction** and requires Corresponding Source
  to be offered *prominently, from the running program, to the users
  interacting with it*.

  **What is true of the deployed app, verified:** no source-offer link renders
  anywhere a signer goes. Overlay 056 deliberately removed the one
  "Built on the Documenso open-source core" sentence, reasoning that the
  attribution "still lives in the marketing site's About + Security pages" —
  but that is `internal-bizrethink-pacta-web` (pacta.ink), a **separate
  property signers never visit**. The signing routes under `_recipient+`
  render no footer at all.

  **Repo visibility is not the lever.** A public repo signers were never
  pointed to does not discharge §13, and source can be offered while the repo
  is private. So the runner's public-repo decision does not turn on this.

  **Scale:** 118 distinct signer emails, 729 recipients, 468 envelopes.

  Two questions genuinely for the attorney, not for us: whether the deployed
  build is "modified" in the copyright sense, and whether signers count as
  users interacting remotely. If both hold, the obligation is live now.

  **The remedy is NOT simply "add a link", and I recorded that wrongly first
  time.** Two things make it bigger:

  - A link is only cheap **while the repo stays public**. Under the private-repo
    option it would 404 for exactly the 118 people it is owed to, and §13 asks
    for source offered "through some standard or customary means of
    facilitating copying" — so going private would need a separate mechanism: a
    public mirror of the deployed source, or a tarball endpoint served by the
    app.
  - **Corresponding Source must match the RUNNING build.** A link to a repo
    that drifts from what is deployed is not Corresponding Source, so whatever
    the mechanism it has to track releases. That is a small ongoing obligation,
    not a one-time change.

  **Therefore the ordering matters: ask the attorney BEFORE committing to the
  private-repo move**, because the answer changes the work. It does not change
  which runner option is safest — private still wins on security — only the
  sequence.

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
2. **The review loop — DONE 2026-08-29** (#31, #32). Domain, schema, server
   layer, the reviewer's tokenised route and the landlord's comment panel.
   Attorney comments block the send until dispositioned; tenant comments never
   do; dismissal requires a written reason and is append-only. Outstanding:
   the dismissal reason is not yet written into the ENVELOPE audit trail —
   upstream's audit-log type is a closed Zod enum, so that needs its own
   overlay PR with its own fragility rating. Sending a lease to a lawyer and sending it
   to a tenant are the same mechanism pointed at different people, and the
   platform has **no commenting primitive at all** — `RecipientRole` is
   CC/SIGNER/VIEWER/APPROVER/ASSISTANT and the only channel back from a
   recipient is `rejectionReason`. Decided: attorney comments **block sending
   until dispositioned** (accept / edit / dismiss-with-reason); tenant comments
   **never block**, because a tenant comment is a negotiating position, not a
   defect report; dismissal reasons are written into the **executed document's
   audit trail**, not the matter history, because the envelope log is sealed
   alongside the signed PDF while matter history is mutable.
3. **Library sign-off — BUILT 2026-08-29** (#34). Per-clause approval recorded
   in `BizrethinkClauseApproval` and overriding the code's `status`, because
   the library is TypeScript and a reviewing attorney cannot edit it.

   **The safety property is that an approval LAPSES.** It is pinned to a
   fingerprint of everything a signer reads — body, heading, version, and the
   condition selecting the clause — so editing a clause returns it to
   unapproved rather than silently inheriting sign-off on words nobody read.
   `sortKey` is deliberately excluded: lapsing over a reordering would train a
   reviewer to re-approve without reading.

   **It records, it does not sign.** The landlord enters the approval under the
   attorney's name and bar number; `approvedByUserId` records who typed it, and
   those differing is the honest description. A signature by the attorney is a
   different feature and pretending otherwise would be worse than not having it.

   The four `verbatimRequired: true` statutory clauses get a distinct prompt:
   approving them confirms the wording matches the statute as published, which
   is what `verbatimVerifiedAt: null` has been recording the absence of.

   **Still needs an actual attorney.** The mechanism is built; nobody has
   approved anything.
4. **Guardrails — BUILT 2026-08-29** (#35). Non-waivable-area scan over the
   seven areas Florida reserves (§83.47 waiver and liability, §83.67 utilities,
   access and removal, §83.51(1) building codes, §83.682(5) servicemember) plus
   answer-contradiction checks on pets and the monthly-rent figure.

   **Two tiers, and the distinction is the design.** Explicit waiver formulas
   block; subject-matter proximity only warns — a clause that RESTATES a
   protection must not be blocked for mentioning what the statute governs, or
   people learn to ignore the mechanism. A negation before a match flips it:
   "Tenant does not waive any rights" warns, while "Landlord shall not be
   liable", whose *not* is part of the waiver formula itself, blocks.

   It reports the statute and the exact words matched, and stops. **A regex is
   not entitled to a verdict on a specific provision.**

   **AI clause drafting — BUILT 2026-08-30** (#40). Vertex confirmed as the
   right provider for this app (Claude is the fallback), so no Anthropic
   provider was added.

   Describe a term in plain English, get a clause back to edit. **It proposes
   into the editor and never inserts** — the draft is appended as an ordinary
   customer-authored clause and goes through the same guardrails as a typed
   one. The output shape has nowhere to put a verdict (no `enforceable`, no
   severity; unknown keys are dropped), and prose stating a legal conclusion
   about its own clause is REJECTED rather than shown, with a message saying
   why so the landlord can rephrase.

   **No SDK.** A `fetch` against the documented REST endpoint: a dependency
   lands in upstream's lockfile and must be reconciled every weekly sync,
   which is a recurring cost for one POST.

   **The AI config was simplified to a provider and a key.** It had asked for a
   GCP project ID, a location AND an API key — credentials for two different
   products at once, since the Gemini API takes a key alone while Vertex proper
   needs a service account. At least two fields could never have been
   load-bearing, and none were: the model was **forward scaffolding added
   2026-05-01** for an upstream AI feature that never shipped, and its own
   commit says "NO upstream consumer reads these vars yet". Nothing read it
   until the clause drafter. Gemini and Anthropic are both supported, Claude
   being the house fallback. `/admin/ai` now has a **Save and test connection**
   button, which every other instance-config page already had.

   **The lesson:** scaffolding built against a guess about someone else's
   roadmap sat unused for four months and shaped a UI around the wrong
   product. YAGNI applies to config schemas too.

   **Not configured in production.** `BizrethinkInstanceAiConfig` has no row at
   all; the feature fails closed and says so, pointing at `/admin/ai`.
5. **Deferred:** paid property data. Blocked on a spending decision and worth
   six manual questions per property until then — see *Property data* below.
6. Close the remaining documentation lie (`scripts/apply-overlays.sh`).

## Watch out for

**This repo's characteristic failure is silence, not breakage.** Everything below
passed, or appeared to:

- **STATE.md union-merges, and that has a silent failure mode.**
  `.gitattributes` sets `docs/STATE.md merge=union`, because the governance
  guard requires this file on every PR and concurrent branches therefore
  collided by construction — three times on 2026-08-31, always two different
  sections at the same anchor with nothing actually in dispute.

  Union merge keeps BOTH sides of a conflicting region and leaves **no marker**.
  For added sections and bullets that is exactly right. For a CORRECTED entry it
  is not: if one branch fixes an entry while another touches the same lines, you
  silently keep the fix *and* the thing it corrected, sitting next to each
  other. Several entries here were corrected rather than appended on
  2026-08-31, including one that reversed its own recommendation.

  **So after any merge touching this file, read the result.** A section
  appearing twice, or an entry contradicting the one below it, is union merge
  and needs a human. The conflict-proof alternative — one note file per change
  under `docs/notes/` — was considered and passed over for the one-liner.
- **Do NOT stack pull requests in this repo.** It has now lost work twice, the
  same way both times. A PR whose base is another branch merges into THAT
  branch, and if the base PR merges into `main` first at an earlier commit, the
  stacked PR's content is stranded on a branch whose PR reads MERGED. It looks
  like success from every angle: both PRs green, both marked merged, nothing
  red anywhere — and the code is simply not on `main`. Cost: five commits in
  #26/#27 (recovered in #28) and all of #32 (recovered in #33). **Sequential
  PRs to `main` only.** With auto-merge on and a 20-minute gate there is no
  longer a reason to stack. Always verify a merge landed by checking the FILE
  on `main`, never by trusting the PR's MERGED badge.
- **CI runs on the homelab. TWO GATES HAD TO BE OPEN, and only one is
  obvious.** `ci-runner-01` (Proxmox VM 102, `10.10.10.41`, 8 cores, org-level
  for BizRethinkAI and lombardpay, outbound-only) gives 4 Playwright workers
  where a 2-core `ubuntu-latest` gave 1.

  It hung for an hour on the runner group's **`allows_public_repositories`**,
  which is `false` by default on every group GitHub creates and is a SEPARATE
  gate from `visibility: all` despite reading like a synonym. This repo is
  public, so it matched the label, found no eligible runner, and queued
  forever.

  What makes opening that safe is the second gate: the repo's fork-PR policy is
  now **`all_external_contributors`**, so an outside PR executes nothing here
  without explicit approval. **Do not loosen it** — the runner sits on the LAN
  with docker-group access, on the same Proxmox node as the production Coolify
  control plane. Chosen over making the repo private, which would have dragged
  in the AGPL §13 question below.

  **`matrix: [1]` is the END STATE, not a step down.** One instance processes
  ONE job at a time, and extra instances share the same 8 cores — they add
  concurrency, not CPU, so two parallel shards would get 2 workers each rather
  than 4. Real shard parallelism needs a **second runner VM**. Never raise the
  matrix without adding hardware first.

- **Two CI experiments that produced nothing, both worth not repeating.**
  Building once and sharing across 8 shards removed 25 min of duplicated
  compute and moved wall clock **0.1 min** — the build simply moved from inside
  the shards to in front of them. A GitHub 4-core larger runner was
  provisioned, reported `Ready`, and every job sat **queued for 30 minutes**
  with none assigned: larger runners are gated by the Actions **spending
  limit**, which defaults to $0. **Entitlement is not schedulability.**
- **A slow gate gets bypassed, and that is a design failure, not a discipline
  one.** The E2E suite took ~50 minutes of wall clock on every PR, which on a
  solo-maintained repo means it does not get waited for. PRs #26 and #27 were
  merged mid-flight for exactly this reason and **five commits were lost** —
  the governance fix, the statutory-notice fix, the STATE update and all of
  Tranche A — because #26 merged at its first commit and the PRs then closed.
  Recovered in #28. Two fixes landed 2026-08-29: repo-level **auto-merge is now
  enabled**, so `gh pr merge <n> --auto --merge` merges a PR the moment it goes
  green with nobody watching; and the suite is **8 shards instead of 4**.
  Sharding is balanced by test COUNT, not duration, and specs are distributed
  in sorted order — so the slow browser flows in the back half of the alphabet
  all landed on shards 3 and 4 (31 min) while 1 and 2 finished in 10.
- **A `cancelled` E2E job is not a pass.** It reports neither. The gate has gone
  dark twice this way — the warp runner, then the 60-minute cap. Guards now pin
  the runner, the cap (≥90 min) and `TURBO_LOG_ORDER: stream`, because without
  streaming turbo buffers output and discards it on kill, making "slow" and
  "hung" indistinguishable.
- **Upstream syncs drop features silently.** The 2026-08-13 audit found three
  (admin org-delete, signing-page branding, signup flags). Nothing was red.
- **A free-text answer prints exactly as typed.** The occupancy clause read
  "The following people are authorised to occupy the Premises:
  {{authorisedOccupants}}". A real answer was "daughters and father" — which
  identifies nobody, and, because the clause listed only that field, left the
  SIGNING TENANT off the list of people allowed to live in their own home. The
  question said "who is authorised to occupy it" and the load-bearing word,
  *named*, sat mid-sentence in the help. Fixed in #41: the tenants are named
  automatically from the party list, naming anyone else is optional, and there
  are two clause variants so a household with nobody extra does not print
  "together with ." **Where the SHAPE of a free-text answer matters, show an
  example in the control — a label alone did not carry it.**
- **Asking twice for the same fact hid a correctness bug.** The interview asked
  `landlordNoticeEmail` and `tenantNoticeEmail` by hand, after the same
  addresses had been entered against each signer. The redundancy was the
  visible symptom; the real defect was that §83.505 requires a valid email
  address for EACH party, and one singular `tenantNoticeEmail` cannot represent
  two tenants — the addendum named one and the second had elected nothing, and
  it rendered perfectly because one field had one value. Now derived from the
  party list, which already holds one address per person and refuses two people
  sharing one. Fixed in #39. **When a form asks for something it already
  knows, check whether the duplicate can even represent the real answer.**
- **A clean merge can silently revert a feature.** Resolving #38 against #37:
  both touched `interview/steps.ts`, #38 having MOVED two fields that #37 then
  edited in place. Git resolved it by keeping #38's moved copy — which was the
  older text, so `address: true` quietly vanished and the address lookup on
  that field stopped existing. Nothing conflicted, nothing was red, 523 tests
  still passed. **After resolving a conflict, check that the other side's
  change is still present, not just that the file compiles.**
- **A failed query must never blank a page.** The review step returned `null`
  whenever validation produced no data, which removed the findings, the
  "send for review" panel and the Send button together, with no explanation.
  Sending a lease to a lawyer is exactly what you would do when something is
  wrong with it, so that path cannot be gated on the checks succeeding. Fixed
  in #37.
- **A one-sided bound is a bound that is missing.** Found in production
  2026-08-29: the only real matter carried `depositReturnDays: -124`. Every
  statutory check in `validate.ts` compared in one direction only
  (`returnDays > 15`), so a negative sailed through and the lease would have
  told a tenant their deposit is returned within minus 124 days, with nothing
  objecting. `graceDays` and `monthlyUsd` had no check at all. The fix is not
  more `if`s — bounds now live in a `COHERENCE_CHECKS` table, and a test
  enumerates the numeric leaves of a real answer set and fails when one is
  missing from it. Fixed in #36.
- **Green tests do not mean complete code.** On 2026-08-28 a clause module was
  imported and never added to the library array: seven clauses missing from every
  lease, 286 tests still green, `noUnusedLocals` off so nothing complained.
- **vitest strips types without checking them.** A fixture missing required
  fields passes green while feeding `undefined` into every predicate. Run
  `npm run typecheck:lease --workspace=@bizrethink/customizations`.
- **Four BizRethink admin pages live in upstream's `admin+/` directory** —
  `ai`, `signing`, `storage`, `sso-providers`. Each was added by its own
  overlay-phase commit and none exists upstream; they sit there because that is
  where the admin layout and nav are. All four are declared in
  `overlays/BIZRETHINK-OWNED.txt`, one by one rather than as a glob, because
  that directory is overwhelmingly upstream's and a wildcard would exempt
  twenty of their files to cover four of ours.
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

### Two of tier 3 were mechanical, four are the attorney's

**Fixed here.** §83.49(1) attaches to money taken as security **or** as advance
rent, and both notices gated on `depositHeldUsd > 0` alone — so a
last-month's-rent-only lease held the tenant's money with no disclosure and no
depository notice, the omission §83.49(3)(a) punishes by forfeiting the right to
claim against it. And `termination.early-election` read `pay ${{...}}` while the
`usd` formatter emits its own symbol, rendering **`pay $$4,600.00`** in the one
paragraph §83.595(4) prescribes. A library-wide test now forbids a currency
symbol in front of any `usd` variable.

**Sent to the attorney** — the memo is published at
https://claude.ai/code/artifact/f90c0aeb-fb52-401a-81d2-696b7d2a2ba8 (private until
shared from the page).
These are not "is this wrong" but "what should it say instead", which is
drafting:

1. `general.waiver` states the opposite of §83.56(5) — accepting rent with
   knowledge of a breach **does** waive the right to terminate for it.
2. Answering "no pets" produces a lease silent on pets, under an integration
   clause making the document the entire agreement.
3. `fees.administrative` has `includeWhen: null`, charging lockout and
   key-replacement fees on condo and multi-family, where §83.51(2) makes locks
   and keys a landlord duty that may not be shifted.
4. `disclosure.lead-paint` carries `requiredBy: 42 U.S.C. §4852d` but holds only
   the Lead Warning Statement, not the three further items 24 C.F.R. §35.92(b)
   requires.

Also for her, carried from tier 3: `hoa.compliance` characterises fine
reimbursement as **additional rent**, making non-payment a §83.56(3) three-day
ground, and `hoa.cure` extends that to cure costs.
### A one-shot link has to say what it needs before it closes

`review.submit` closes the link in the same transaction. So on the reviewer's
page: `required` was dropped when the router mapped `askedFields`, nothing
marked a mandatory answer, and nothing checked completeness — a tenant could
leave `tenantPreTermAddress` blank, the link died, and the landlord had to
issue a fresh review for an answer nobody had told them was mandatory.

A draft comment with a clause reference and an empty body was also silently
discarded, while the button still offered to "send back with no comments".

Both now block the send and say why. Asked fields also honour their own `kind`
— everything rendered as a textarea, so a single-line answer could carry
newlines into the lease.

### Conflict resolution reverted a fix, again

Taking `origin/main`'s side on the `statutoryInput` extraction silently undid
the entry-hours fix that lived in the literal main had extracted. Caught by
grepping for the change afterwards, not by the merge.

**The rule stands and is worth re-reading every time:** after resolving a
conflict, verify BOTH sides' changes are still present. A clean merge is not
evidence that nothing was lost.

### A tenant's returned answers could be destroyed in silence

The interview seeds every answer into React state once at mount and writes the
whole set back on each step change. It is not the only writer:
`applyTenantAnswers` writes a tenant's returned answers into the same `values`
column. A landlord with the page open when the tenant returned their review link
wiped what they sent on the next click of Next — unrecoverably, and against the
delegation control's own promise that *"you see what they wrote before anything
is sent"*.

**Refused, not merged, and not resynced.** Merging by key would not help: the
stale copy holds the SAME keys with the answers as they were before the tenant
filled them, so a merge overwrites with blanks just as surely. Resyncing would
throw away whatever the landlord had typed. A lost update must not be settled by
guessing which writer mattered — `saveStep` now carries `expectedUpdatedAt` and
refuses a write built on a stale read.

Recovery is a **full page reload**, not `revalidator.revalidate()`: state is
mount-seeded and nothing resyncs it, which is the defect itself.

### A failed save was invisible

`saveStep.error` was rendered nowhere, and `goTo` awaited the mutation with no
catch while every caller was `void goTo(...)`. The page did not move, the
rejection went to the console, and the caption still read *"Progress saves as
you move between steps"*. Now shown, and the step deliberately does not advance.

### Checks that ran against constants, not answers

- **§83.53(2) entry hours.** Both entry times are free text and the rule pack
  was handed `earliestHour: 9, latestHour: 18` — hardcoded. "6:00am" to
  "11:00pm" produced zero findings. `parseHour` reads what was typed; an
  unreadable answer falls back INSIDE the window, because citing a statute at
  someone for a typo is worse than missing one.
- **`prorationMethod`'s `showWhen`** read `facts.prorationApplies`, computed
  server-side in `hydrateMatter`. The browser never has it, so the question
  could never appear and a mid-month lease used the seeded default.
- **`propertyTypeLabel`** was a snapshot taken at matter creation while
  `propertyType` stays editable — correcting condo to single-family left the
  clause reading *"The Premises are a condo. As permitted by §83.51(2)…"*. Also
  `.replace('-', ' ')` printed *"a single family"*.

### A draft with no start date crashed every read

`deriveFacts` split `money.term.startDate`, which the seeder writes as null on
purpose. Absent dates now derive nothing rather than zero.

### A reviewer must read what gets signed

`buildLeaseDocuments` emits the lease PLUS one document per addendum and per
standalone disclosure, and the envelope uploads every one. Both the landlord's
preview and the reviewer's copy did `rendered.find(d => d.key === 'lease')` and
returned that alone — so an attorney read one document while up to seven were
signed, including the two Florida requires to be separate instruments.

`renderLeaseForReview` concatenates them into one file **for reading only**.
Signing is untouched: the envelope still gets distinct items, because §83.512
and the addenda's own signature blocks make that separateness load-bearing.
Asserted by extracting every placeholder from each signed document and
requiring all of them in the reviewer's copy.

### Gates that lived only in the advisory query

`validate` is a query. Nothing forces a client to call it, and its cache is
enabled only on the review step. Three things had that shape:

- **`validateAnswers`** — the eight blocking statutory rules — ran nowhere else.
  Its input is now built by one `statutoryInput()` so query and mutation cannot
  drift, and the mutation re-runs it.
- **`sendBlockers`** never compared answers to `review.answersHash`. Disposition
  every comment, change the rent, send — with the attorney's approval attached
  to a document that no longer exists. Now blocks on a **returned attorney**
  review whose hash has moved. (`ReviewStatus` is `open | returned | closed`;
  the type system caught a first attempt that tested for `'submitted'` and
  would have been silently never true.)
- **`unreviewedClauses`** was computed and dropped from both totals while
  `createEnvelopeFromMatter` throws on exactly that condition — "nothing
  blocking", then a hard failure naming raw slugs.

`hashAnswers` now covers the property's utilities, via one `currentAnswersHash()`
shared by both callers. They are read live, so editing a utility row moves a
lease already out for review.
### No lease had ever been sendable

An adversarial review (four passes, 45 findings) opened with this: `readyToSend`
was false for **every lease ever built through the product**, for two reasons,
and no answer a landlord could give would clear either.

- **`effectiveDate`** sat in `DERIVED_VALUES` — so no step asked for it — and
  nothing derived it. The only assignment in the repo was a checked-in fixture.
- **`startDate`** is asked with `target: 'money'`, so it lands in
  `money.term.startDate`, while `term.fixed` declares it as a required VALUE.

**The test written to catch exactly this compared by field NAME and ignored
`target`**, so a money-targeted answer falsely satisfied a value variable, and
membership of `DERIVED_VALUES` was accepted as proof of derivation. Both now
checked properly, plus a test that renders the reference matter and asserts
nothing in `DERIVED_VALUES` is left outstanding.

`effectiveDate` turned out not to need deriving at all: `general.execution`
already says *"The effective date is the date of the last signature"*, so two
always-on clauses were fixing it two different ways. The recital no longer
states a date.

### A toggle may not sit on a step it can renumber

`petsPermitted` was the last field of the FLOOD step and gated the PETS step
declared before it. Switching it on inserted a step at the index the answerer
was standing on — the page silently became "Pets" with two flood questions
unanswered behind them. The Pets step is always visible now and asks the
question itself.

### `missing` is the renderer's vocabulary, not the landlord's

The review panel printed `parties.recital: effectiveDate` in monospace.
`describeMissing` turns each entry into the question and its step — and where
nothing asks for the variable, says so, because telling someone to go and
answer it sends them hunting for a question that does not exist.

### Deriving an answer is not a reason to hide it

Removing the two free-text utility boxes was right — they were a second,
editable copy of what the property records. It left step 4, *"Utilities and
insurance"*, showing only insurance, with nothing anywhere in the interview
saying what the lease would print about utilities.

Step 4 now shows the derived allocation read-only, with a link to the one place
it can be edited. Guarded by `regression-tests/interview-step-content.test.ts`,
which also refuses their return as answerable fields.

**The general rule, worth keeping:** every field in this interview shows its
consequence at the moment it can still be changed. That is the premise the
whole thing rests on, and it does not stop applying when an answer becomes
derived.

### AI in the lease builder: one place, deliberately

`ai.draftClause`, on step 12 (*Your own clauses*), is the only AI call in the
product. It drafts prose the landlord then owns, and everything it writes goes
through `scanCustomClauses` against the §83.47 non-waivable list.

It is not offered for the yard rows, and the reason is structural rather than
squeamish: the job NAMES are a constant the code already holds — now offered as
*"Start from the usual Florida list"* — and the only other column is the
allocation, which is the one genuine decision on that step. A pre-filled
`doneBy` reads as agreed.

### `<SelectItem value="">` throws, and only once a row exists

Radix reserves the empty string — setting a Select's VALUE to `''` clears it
and shows the placeholder, so an ITEM may not claim it. It is a runtime throw
inside the item, so the yard editor's "Not decided" option passed review,
passed 666 tests, and rendered fine on every lease that had no yard rows. The
first press of **Add a job** on a lease with none was a full-page 500.

`''` is still the right value in the DATA — an unassigned job is a real state
and `unassignedYardTasks` keys off it. The sentinel exists only at the Radix
boundary. Guarded by `regression-tests/radix-select-empty-value.test.ts`, which
checks the mapped-options shape as well as the JSX literal.

### Utilities are read live from the property, not copied at creation

Two free-text boxes on step 4, `required`, seeded once at matter creation. A
lease created before its property had utilities recorded therefore held two
empty required boxes **that adding the utilities to the property afterwards
could not reach** — and the two boxes could be edited into disagreeing with
each other, which is the defect the property rows were introduced to remove.

Derived in `hydrateMatter` from the property's rows now, on every read, and no
longer asked. Unlike the party list nothing here is order-dependent or signed
positionally, so there is no reason to freeze a copy — the trade is that
editing a property's utilities changes what a DRAFT will print. A sent lease is
unaffected: its PDF is already in the envelope.

**Three render paths, and the reviewer's is the one that hides.** The
landlord's preview and the router sit together; `_recipient+/lease-review.
$token.document.tsx` does not, and it would have handed a lawyer a lease
reading "none" on both sides while the landlord's preview read correctly. All
three are now guarded by test.

### Lombard tenancy — first outside tenant

Stood up 2026-08-31 for Lombard Pay's contract e-signing, driven from the
`lombard-platform` session. Production now carries:

- **Organisation `lombard`** (`org_tfvwxmvbtyhumbba`), **team `lombard-api`**
  (id 40). The slug is exact and load-bearing — Lombard's client defaults to it.
- **Webhook** `ccpmq3h3r4e756ua0ng16pnln` → `app.lombardpay.com/api/webhooks/pacta`,
  all seven document events, plain `X-Documenso-Secret`. Test Connection passed.
- **16 templates, ids 61–76** (FRPA, Payzli split-funding, subscription,
  permission-to-release, ISO PRA, and eleven state disclosures).

**The org claim is `bizrethink`, applied by SQL, not by the admin UI.** New orgs
are created on the `pro` claim by the SaaS signup path, which caps teams at 1 and
leaves `unlimitedDocuments` false — the team creation had already failed once
against that cap. The admin UI's inherited-claim panel is **read-only**, so the
claim was set directly on `OrganisationClaim`, and `BizrethinkOrganisationBilling.
bizrethinkInternal` was set true so the trial-expire cron skips the org. Overlay
001/002's route-everything-through-BIZRETHINK only covers the org-creation paths
that predate the billing work. **Any future outside tenant needs the same two
writes** or it silently degrades to free-plan limits.

**Templates must be uploaded through the UI, one per template.** Documenso does
not expose the auto-place primitive over REST: the UI's `createEnvelope` parses
`{{SIGNATURE, r<n>}}` out of the PDF text layer, bootstraps placeholder
recipients, positions the fields and whites the markers out of the stored PDF,
all in one transaction. Reproducing that in SQL means reimplementing placeholder
geometry, and a wrong row set looks healthy until a signer opens a broken
envelope. After upload, `publish-to-documenso.mjs sync` emits the specs the
consumer reads. Every new template was verified against its source-era
counterpart on recipient and field counts before being handed over.

**Contract sources are Lombard's, not ours.** They live in
`~/github/lombard/lombard-contracts` (copied from the read-only BizRethink
Contracts library, which was not modified). Regeneration removed all
CircularPayments/MFG branding from PDF *contents* — it is baked into cover
pages, footers and recitals, so clone-and-retitle was never viable — and stripped
the ACH-debit collection machinery per Lombard's ADR 0019, leaving `[Reserved]`
stubs rather than renumbering, so the disclosures' cross-references stay valid.

**Nothing here is cleared for a real signer.** Open gates, all owner/counsel:
states of organization for both Lombard entities (currently the working text "a
Florida limited liability company"), prescribed-form literals for all eleven
disclosures unverified against the vendored `state-disclosures/regulatory-source/`
PDFs, hardcoded economics, NY-law choice, subscription affiliate cross-default,
guaranty breadth, arbitration-vs-courts inconsistency. `processor2` is
deliberately **not** built: its source is vendor-authored and immutable, so it
needs fresh authoring, and its entity assignment is contested.

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

### The interview's shape

Reordered 2026-08-30 (#38) after a real run through it. **The landlord and the
§83.50 notice details now live on the PROPERTY**, not on each lease — none of it
changes between tenancies and it was being re-typed every time.

**Copied into a matter at creation, never referenced live.** A lease that read
its party list from the property row would have its signers silently rewritten
whenever that row was edited, and party order decides where signature fields
land — a lease countersigned by the wrong person, with nothing red anywhere.

**The interview now opens with "Who is renting it".** It used to open with a
property step in which six of eight answers already came from the property
record — a screen confirming facts nobody had been asked for, standing in front
of the question a landlord actually arrives with. That step still exists as
*Confirm the property*, placed immediately before Maintenance because
`propertyType` decides which duties Florida permits a lease to shift. Close
enough to matter, late enough not to be a toll gate.

Seeding runs on the server: the party list is who signs, and a browser does not
get to assert it.

### Editing and deleting

Added 2026-08-31 (#44), because neither existed: a property could be created
and never corrected, and a draft lease could be started and never removed —
trying the interview out for ten minutes leaves several.

**A property may be edited freely, and that is safe because of the seeding
rule** (see above): a lease copies what it needs at creation and never reads
back, so correcting a typo cannot rewrite the signers or address on a lease
already drafted, still less one out for signature. Archiving is soft, since
leases reference a property by id.

**Only a draft with no envelope may be deleted.** `canDeleteMatter` allowlists
`draft` rather than denylisting the sent states, so a status invented later is
refused by default instead of becoming quietly deletable. Its reviews and
comments are deleted in the same transaction — they carry no foreign key, and
an orphaned comment is not just clutter: `sendBlockers` treats one whose review
is missing as BLOCKING, precisely so deleting a review cannot erase an
objection.

### AI providers

`/admin/ai` has **Save**, **Save and test connection**, and **Test saved
connection**. The last tests what is stored without writing — before it, an
admin verifying a working config had to re-submit the form to check it. It is
disabled while the key box has text in it, because that text is not saved yet
and testing would report on the old key while the page shows the new one.

The key field reveals what has been **typed**, never what is stored: the saved
key is encrypted at rest and the server only ever tells the page `hasApiKey`.
A secret that never reaches the browser cannot leak from it, and that is worth
more than being able to re-read it.

**Anthropic rejects `temperature`.** The current Claude models return
`400: \`temperature\` is deprecated for this model` rather than ignoring it, so
sending it fails the whole request. Gemini still honours it and keeps 0.2. The
intent — a lease clause is not the place for invention — now rests on the
prompt's fixed JSON shape and on `parseClauseDraft` discarding anything that
strays.

This was found only because the error surfacing landed first: before that it
read as a bare 400, which is every failure at once.

Gemini and Anthropic, each authenticating with a key alone. Configured at
`/admin/ai`, which has a Save-and-test button.

**A failure must say which failure it was.** The first version reported only the
HTTP status, so a wrong model name, a revoked key, a key from the wrong product
and an exhausted quota all read the same — which is precisely the hole a
working Gemini key and a failing Anthropic key fell into on 2026-08-30. The
provider's own `error.message` is now surfaced.

Narrowly, and this is the constraint: **Gemini takes its key in the URL**, so
only that one field is read, never the raw body, and the key is redacted from
it afterwards in case the provider quoted the request back. Redaction has a
16-character floor — with a short key the guard rewrote "The API key was not
accepted" as "The API [redacted]ey was not accepted", mangling messages while
protecting nothing. Real keys are 39–100 characters.

### Asking the tenant directly

Added 2026-08-30 (#42). A landlord can mark a question "ask the tenant instead";
it appears on the tenant's review link and the answer writes back into the
lease. Three fields qualify today — `authorisedOccupants`, `permittedPets`,
`tenantPreTermAddress` — all things a tenant knows and a landlord would
otherwise guess and then correct by email.

**This is the most dangerous surface in the lease builder.** It is an
unauthenticated endpoint, reached with a link, writing into a document destined
for signature. The rules, all in `interview/tenant-answers.ts`:

- **The field definitions are the authority.** The allowlist is computed from
  `tenantCanAnswer` on every read. The stored `delegatedFields` column is only a
  SELECTION from it — a wrong or tampered list cannot widen what may be written.
- **No money field, ever**, whatever it declares. Asserted across the whole
  interview by test.
- **No field a statute constrains**, for the same reason: that answer has legal
  consequence and is the landlord's to give.
- Strings only, trimmed, empty means unanswered, capped at 2000 characters.
- Only a `tenant` review may write; an attorney link carries no questions and
  so may not write answers either.
- A matter that is no longer `draft` is never touched — a sent lease must not
  move under its signers.

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

### An association violation now has somebody to cure it

`hoa.compliance` made the tenant FORWARD a notice and REIMBURSE a fine. It
never said who performs the cure, or by when. The real sequence would have run:
notice arrives 26 Aug naming dead palm fronds with a 9 Sep cure date, tenant
forwards it inside 48 hours exactly as required, nothing is trimmed, the fine
lands. The lease worked as written.

`hoa.cure` (new, gated on `hasHoa && hasTenantYardDuty`) keys the deadline to
**the association's own date**, not to the moment the tenant forwards — the
association emails the owner directly, so a tenant who bins the letter cannot
move the deadline. In exchange the landlord owes a reciprocal duty to pass on
what he receives directly.

Its last sentence is the load-bearing one: under **Fla. Stat. §720.305(1)** the
association's remedy runs against the parcel OWNER. Allocating palm trimming to
a tenant is an arrangement between landlord and tenant — it gives the tenant no
standing with the association and moves nothing off the owner.

`hoa.compliance` → v2: "any notice received from the association" became
"received at or posted on the Premises". Association post is addressed to the
owner and delivered to the house the tenant lives in; the old wording invited
opening it (18 U.S.C. §1702).

**For the attorney:** `hoa.compliance` already characterises fine reimbursement
as *additional rent*, which makes non-payment a §83.56(3) three-day ground.
`hoa.cure` extends that to cure costs. Her call, not ours.

### Yard duty is rows, and the router had a second derivation

`landlordProvidesLawnService` was one boolean with the whole allocation
hard-coded in the clause: landlord mows, tenant waters and trims. A landlord
whose split ran the other way could not express it, and turning the toggle off
did not give a different split — it gave **no clause at all, and an unallocated
yard**. The 2026-08-26 Estancia violation notice (dead palm fronds, 14-day cure)
is what that costs.

Rows now, in `BizrethinkLeaseMatter.yardTasks`, one `doneBy` each, three duty
lists derived from the one array. Per LEASE, not per property — the electric
co-op does not change between tenancies, who cuts the grass is negotiated with
the signer. An unallocated row **blocks the send**, in `validate` and again in
the send mutation.

**Found on the way:** the tRPC router still had its own copy of the answer
derivation, the exact duplication `matter-answers.ts` was written to be the
only copy of — its own doc comment claimed the router had been converted. It
had not. A derived value added to one and not the other means the landlord
previews one document and the signers receive another. The router now delegates
to `hydrateMatter`, guarded by a source-level test.

### Notice addresses are POSTAL, and the copy said otherwise

The §83.50 field read "The address must be given in writing", which is true of
an email address too — so it invited being filled with one. It cannot be: the
§83.49(3)(a) notice this lease prints verbatim says the landlord "MUST MAIL YOU
NOTICE, WITHIN 30 DAYS AFTER YOU MOVE OUT", and that the deposit must be
returned outright if that mailing is not timely. An email address there is
somewhere a statutory notice cannot be sent.

**Email is additive, never a substitute.** §83.505 permits it only under a
signed addendum — the "Deliver notices by email?" election on step 1 — and that
addendum names each party's address separately.

### Utilities live on the property

Added 2026-08-31 (#50). They were two free-text boxes on the interview, and a
real answer went in as a hand-typed numbered list with company names and phone
numbers — all of it property data retyped every lease.

Structured rows on the property, `[{ service, provider, phone, paidBy }]`, and
**both clause variables render from that ONE list split by payer**, so a
utility cannot sit on both sides or vanish from both. Seeded as text and still
editable per lease: a tenancy where the tenant takes over the trash is an
ordinary variation, and the property record should not be edited to describe
one lease.

Prose with a serial comma, not a numbered list — the clause interpolates it
mid-sentence ("Tenant shall arrange and pay for the following directly with the
supplier: …"). An empty side renders "none" rather than leaving a dangling
colon.

**No provider auto-lookup.** [NREL's Utility Rates API](https://developer.nlr.gov/docs/electricity/utility-rates-v3/)
is free and returns the ELECTRIC utility from a lat/lon, which the Census
geocoder already gives us — but water, sewer and trash are municipal with no
national dataset, and no source carries phone numbers. One row of four, so it
was not worth building.

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
- `lombard-platform` consumes this platform for contract signing via team
  `lombard-api` — the first outside tenant. Same rule as CircularPayments: **do
  not edit it from a Pacta session** without explicit per-change consent. Its
  contract sources are `lombard-contracts`, which is Lombard-owned; the
  BizRethink Contracts library on the Desktop stays read-only. See *Lombard
  tenancy* above.
- `infra-gitops` manages the VPS fleet Coolify runs on.
