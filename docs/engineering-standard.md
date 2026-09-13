# Engineering standard

Rules for working in this repo. Short, because rules nobody reads are decoration.

Where a rule can be enforced by CI it is, and the workflow is named. **Rules that
aren't mechanically enforced decay** — this repo has the history to prove it.

---

## 1. Definition of done

**A change cannot be called complete before CI is green on its pull request.**

Green PR CI completes author validation. The GitHub task stays open while its
approved review, merge, consolidation, installation or shipping work remains.
The session completing the final required step records the evidence, sets the
task body to **Done** with no remaining action, closes it as completed and verifies
the result. See [task completion](session-workflow.md#update-status-and-close-completed-tasks).

Not "it builds locally". Not "the tests pass on my machine". Not "this should be
fine". If CI cannot run, the task is **blocked**, and saying so is the correct
outcome.

This exists because of PR #1 (2026-05-25), merged while `Build App` was red.
Coolify rebuilt from `main`, hit the same errors CI had already reported, and the
deploy failed. PR #2 was titled *"fix: post-merge typecheck errors blocking
Coolify deploy"*.

A second reason, added 2026-08-29: until this PR, **CI ran no tests**. It built
the app and built a Docker image, nothing else. "CI green" certified that the
code compiled. If you are reading this in a future where CI has quietly narrowed
again, that is the failure mode repeating.

## 2. Every change goes through a pull request

No direct commits to `main`. Branch protection enforces the four required checks:
`Build App`, `Build Docker Image`, `E2E Tests`, `Validate PR title`.

`enforce_admins` is deliberately **off** so the rollback path in `UPSTREAM.md`
(`git revert && git push origin main`) still works when production is broken.
That is an escape hatch for outages, not a shortcut for ordinary work.

Keep each PR to one bounded, coherent outcome. Include the related implementation,
tests and documentation together; avoid splitting one feature into tiny PRs that
each repeat integration work and CI. New unrelated work needs its own assignment.

## 3. The implementing session never merges its own PR

The session that writes a change **opens the PR and stops.** A human merges.

The implementer is the worst-placed reader of their own change: they know what
they meant, so they see it. This is the rule most easily rationalised away and
the one worth keeping when everything else is dropped.

### Concurrent sessions and state

Follow [the session workflow](session-workflow.md). The repository owner or one
explicitly appointed coordinator assigns separate GitHub task issues. Each author owns one
branch/worktree, its PR and its CI fixes. Live assignments do not require a Git
registry commit. Read open task cards/comments and PRs before taking work.

Use role labels and unique session labels in public records; do not carry the
owner's personal name or identifying local details into issues, PRs, comments
or committed handoffs. See [public records](session-workflow.md#public-records-use-roles).
Assignment fields remain coordinator-owned. The session responsible for the
current step updates its task's PR link, status and next action as described in
the workflow; a progress comment alone does not keep the task body current.

Author PRs update only their own state note. One assigned consolidation author
updates STATE.md and deletes merged notes in a pure consolidation PR at the end
of a shipping batch; that PR creates no note of its own. A different session or
the repository owner reviews and merges it. Governance enforces per-PR note
scope; **State ready to ship** must pass on the final main revision before an
authorized deployment.
This replaces Guard 5's requirement that the next author fold prior merges.

A fresh review-and-ship session may merge other sessions' cleared PRs when the
repository owner explicitly delegates that work. It never merges a PR it implemented. Setup or
review-only requests do not authorize shipping.

## 4. The PR description is the review surface

Two sections are **mandatory**:

- **"Decisions I made that you did not specify"** — every judgment call. Naming a
  default, picking a threshold, choosing a library, deciding what "done" meant.
- **"What I deliberately did not do"** — scope consciously left out, and why.

Under-reporting either defeats the review. A reviewer who has to *discover* your
decisions is auditing, not reviewing.

## 5. Adversarial review

Runs in a **separate, fresh session started by the human** — never a subagent fed
the implementer's summary. A reviewer given the implementer's framing inherits
the implementer's blind spots.

One independent review satisfies this requirement. Return substantive fixes to
that reviewer on the new revision; an additional reviewer needs a specific
unresolved concern or an explicit owner request. An implementation helper does
not replace the independent review.

**Mandatory for changes touching:**

| Surface | Why |
|---|---|
| `overlays/*.patch` or any upstream file | The invariant the whole architecture rests on |
| `packages/prisma/migrations/` | Production holds 468 real signed envelopes |
| Signing, sealing, or certificate generation | The product's core guarantee |
| Anything executed against the production database | No local DB exists to rehearse against |
| Clause text or user-facing legal language | Unauthorized-practice-of-law exposure |
| Money — billing, Stripe, deposits, fees | Wrong numbers reach real contracts |

Everything else: reviewer's judgment.

See [`review-checklist`](#appendix-review-checklist) below for what to check.

## 6. Honest reporting

**Never report complete when part is unfinished.** Partial-and-honest beats
complete-and-wrong, every time, and it is not close.

If a test is skipped, say which. If a step failed, show the output. If you
assumed something, name the assumption. "Done" is a claim about reality, and this
repo's characteristic failure is a change that *looks* finished.

## 7. Efficient use of time and compute

Optimize the total effort to deliver a correct, reviewed change, including CI
failures and rework. These rules apply to every assistant and model. Provider
names, model versions, prices and tool configuration belong in separate settings
or tool-specific guidance. This document does not configure those tools.

- **Keep thorough reading.** Read the required instructions, current state and
  all PR notes, relevant decisions and source evidence before choosing an approach.
  Reuse established understanding of unchanged material within the session;
  refresh affected context when the code, sources or assignment change. Search
  and read targeted sections instead of repeatedly dumping whole files or logs.
- **Keep detailed handoffs.** Record behavior, decisions, source locations and
  retrieval dates where relevant, validation evidence, dependencies and unfinished
  work. Distinguish implemented, reviewed, merged and deployed. Link lengthy
  evidence instead of copying it into multiple notes. Use the task/PR for final
  CI status so recording a verdict does not cause another status-only code push.
- **Use existing tools for mechanical work.** Prefer searches, formatters and
  small scripts for deterministic operations. Batch independent reads and keep
  output focused. Monitor a PR with one watcher; report changed conditions and
  failures instead of repeatedly collecting the same large status output.
- **Match capability to complexity and risk.** Use lower-cost options for clear,
  bounded work whose result can be verified. Reserve stronger reasoning for
  ambiguity, legal interpretation, money, permissions, signing, migrations and
  difficult debugging. Honor the owner's explicit model choice; escalate when
  the task exceeds the selected capability rather than repeatedly retrying it.
- **Use one lead by default.** When delegation is authorized and supported, use
  an optional helper for a bounded, independent task while the lead makes useful
  progress elsewhere. Provide the necessary context and an explicit deliverable;
  verify the returned work. More helpers need a concrete benefit that outweighs
  duplicated context, coordination and verification. A cheaper token rate alone
  does not establish a cheaper completed task.
- **Keep the same safeguards for every agent.** Model choice and delegation do
  not relax permissions, tests, source verification, review or completion gates.
  Separate tool configuration determines which capabilities are available;
  do not claim a model switch or delegation that did not happen.

---

## Repo-specific rules

Learned the hard way. Each one cost something.

### The development machine

Written down 2026-09-09, after a day was lost to a broken local toolchain that
no gate could see. Until then this contract existed nowhere.

- **Node 24, and check what you are actually running.** [`.node-version`](../.node-version)
  pins `24`; the Docker image is `node:24-alpine3.23`. `engines.node` is
  `">=24.0.0"`, which still *admits* 25 and 26 — and `zod-prisma-types@3.3.5`
  calls `fs.rmdirSync(path, {recursive: true})`, which no longer works after
  Node 24 — verified here: 24.20.0 succeeds with a `DEP0147` warning, 26.0.0
  throws. Node's docs date the removal to v25. The range does not protect you.
- **A non-login shell is not your shell.** Node selection is `fnm`, initialised
  from `~/.zshrc`. A script, a CI-like invocation or an agent running a
  non-interactive shell gets Homebrew's Node instead — which is how a machine
  running Node 24 correctly was reported as running Node 26. Verify with
  `node -p "process.version + ' ' + process.execPath"`, never with `node -v` alone.
- **`npm ci` is not enough on its own.** It wipes the generated Prisma client, so
  the next typecheck fails with phantom
  `'@prisma/client' has no exported member` errors. Always follow it with
  `npm run prisma:generate --workspace=@documenso/prisma`.
- **Never run an installer from a container against this checkout.** Docker here
  is Colima, and its generated Lima config mounts `~` writable — so
  `docker run -v "$PWD":/app … npm install` rewrites the Mac's `node_modules`
  with Linux binaries. CI stays green, `git status` stays clean, the lockfile is
  untouched, and every local gate stops working. The full mechanism, the
  postflight check and the recovery are in
  [`UPSTREAM.md`](../UPSTREAM.md) under *Never install from a container into this
  checkout*.
- **Green CI does not mean the local tree is sound, and a broken local tree does
  not mean the project is broken.** They are separate claims about separate
  machines. Say which one you are making.

### Testing

- **TDD-first.** Every feature and every bugfix gets a meaningful failing vitest
  test first, then the implementation. The failure must expose the missing or
  incorrect behavior. No untested behavioral code lands. Documentation-only and
  formatting-only changes need their relevant validation, not invented tests.
- **Run focused tests while coding.** Cover the changed behavior and the callers,
  consumers and invariants it could affect. Scope follows risk and dependencies,
  not the number of edited lines. Expand for shared behavior, a failure or a
  specific uncertainty. Repeated CI failures in the same area are a reason to
  improve that local selection, not to repeat every suite after every edit.
- **Use CI for the broad final checks.** It runs [unit tests and builds](../.github/workflows/ci.yml),
  [separate type checking](../.github/workflows/governance.yml) and
  [Playwright](../.github/workflows/e2e-tests.yml) under the existing gates and
  exemptions. Before pushing, inspect the diff, check changed-file formatting
  and run the relevant focused tests after behavioral changes. Do not duplicate
  a full local build, test suite or typecheck merely to repeat CI; additional local
  validation needs a specific unresolved concern. The prohibition on local builds
  without an explicit request still applies. All applicable CI must pass on the
  actual final PR revision before calling implementation complete.
- **Run the Playwright suite before and after** any change touching user flows.
  On an upstream merge that means three gates: baseline, post-merge-branch,
  post-deploy.
  A prior passing run can supply the before gate when it represents the unchanged
  pre-change application, dependencies and test configuration. Record its revision,
  run link and why it applies; use current PR CI for the after gate. Neither gate
  requires a duplicate local run solely because the evidence came from CI.
- **Browser inspection follows impact.** Text or metadata alone does not require
  an additional manual browser sweep. Check rendering, interaction or access when
  the change introduces or leaves uncertainty there. Legal language, consent and
  signed content can be consequential even when only text changes. Existing
  Playwright gates and independent-review requirements still apply.
- **Never skip or `xfail` a failing test to make the suite green.** The curated
  exclusions in `FORK-TESTING.md` are the only sanctioned skips, and each is
  justified there.
- **A `cancelled` E2E job is not a pass.** It is no verdict. Re-run it.
- **Typecheck separately from testing.** vitest strips types without checking
  them; a fixture missing required fields runs green while feeding `undefined`
  into every predicate. CI's separate typecheck satisfies this requirement for
  the code it covers; a passing vitest run does not.

### Security validation

Green CI establishes only what the configured checks enforce. The production
dependency audit in [security.yml](../.github/workflows/security.yml) is advisory;
its success does not mean there are no findings. For dependency or security
changes, compare findings with the documented accepted baseline. Newly introduced,
unaccepted findings need a fix or an explicit disposition from the authorized
reviewer before merge. Preserve existing controls and test the relevant access
boundaries and failure cases. Making new findings automatically blocking remains
separate work; this policy does not add that CI enforcement.

### The fork

- **`packages/bizrethink/` is the only place features go.**
- **`overlays/*.patch` is the only sanctioned way to modify an upstream file**,
  and every patch carries a rationale plus a fragility rating. Enforced by
  `governance.yml`.
- **Schema additions go in `packages/bizrethink/prisma-extensions/additions.prisma`**,
  never by hand-editing `packages/prisma/schema.prisma`.
- **Governance and BizRethink docs live in `docs/`**, not the repo root — the
  root already holds 11 upstream Markdown files and mixing ours in creates sync
  conflicts.
- **Merge sync PRs with `--merge`.** Squash or rebase destroys upstream ancestry
  and the next sync will not know what it already has.

### Configuration

- **Instance config is DB-backed with an admin UI. Never a Coolify env var.**
  Every config surface — signing, storage, AI, SSO, SMTP, Stripe — is a Prisma
  model plus a server-only getter plus an `/admin/*` page with a sandbox/live
  toggle and a "Test connection" button. A setting that can only be changed by
  redeploying is a setting the admin cannot see. See
  [ADR 0004](adr/0004-db-backed-instance-config.md).

### Legal and domain

- **Never write legal advice into user-facing strings.** State the statutory
  requirement and the state of the form; let the reader draw the conclusion.
  *"Fla. Stat. §83.595(4) caps the fee at 2 months' rent ($13,800). This lease
  sets $20,000."* — not *"you should reduce this"*. Banned: **you should**,
  **we recommend**, **we suggest**, **is unenforceable**, **is illegal**.
  Enforced by `governance.yml`; exempt a legitimate line with a trailing
  `// legal-language-ok: <reason>`.
- **The clause library is Florida law, not one property.** Clause text may be
  fixed only by a statute, a regulation, or a court-approved form. Anything
  fixed by a *private* instrument — an HOA declaration, an association rule, one
  property's covenant — is **data**, and reaches the lease through a variable.
  The test: *if I lease a different house in a different community, is this text
  still true?* If no, it is an answer, not a clause. Enforced by
  `library-invariants.test.ts`, which pins every `requiredBy` by slug rather
  than matching a pattern — a pattern can be widened by whoever it inconveniences,
  and once was.
- **A clause may not reach `published` without provenance** — statutory text
  needs a verification date, attorney-drafted text needs a named reviewer.
- **Never log or expose** API keys, tokens, passwords, PII, or financial data.

### Scope

- **Don't scaffold for futures that haven't arrived.** No new orgs, accounts or
  DBAs in anticipation. Lead with "create when X happens", not "create now to
  prepare for X".
- **Don't edit sibling repos from this one.** Document a handoff instead.

---

## Appendix: review checklist

Derived from this repo's actual failure history, not from a generic list.
Phase-1 assessment, 2026-08-29.

### Silence — the characteristic failure

This repo's changes fail by being *absent*, not by being wrong. Everything below
passed CI at the time.

- [ ] Is every new module actually **wired in**? (A clause module was imported
      and never added to the library array: seven clauses missing, 286 tests
      green.)
- [ ] Does the change **remove** anything the diff doesn't show? Upstream syncs
      have silently dropped three features this way.
- [ ] Are the tests asserting **presence**, or only that nothing threw?
- [ ] Is there an in-flight note at `docs/state/inflight/<branch-slug>.md`, and
  is it **this PR's own file**? Editing `docs/STATE.md` directly still satisfies
  the guard but collides with every other open PR — three did on 2026-09-05,
  each costing a rebase and a full E2E re-run.
- [ ] Did any CI job report `cancelled` rather than pass or fail?

### Fork discipline

- [ ] Any upstream file modified? Is there a corresponding overlay, with a
      rationale and a fragility rating?
- [ ] Schema change in `additions.prisma`, not `schema.prisma`?
- [ ] Would this conflict on the next weekly sync? `package-lock.json` counts —
      see `UPSTREAM.md`.

### Production safety

- [ ] Does this touch the production database? There is no local DB to rehearse
      against, and prod holds 468 real signed envelopes.
- [ ] Is a migration purely additive? If not, what is the rollback?
- [ ] Is `_prisma_migrations` bookkeeping consistent, so the next deploy doesn't
      re-run applied DDL?

### Correctness of claims

- [ ] Does any documentation added here assert a control that exists? (Two did
      not: `security.yml` and `scripts/apply-overlays.sh`.)
- [ ] Are reported test counts real, and did the suite actually run?
- [ ] Does the PR description name the decisions the author made unprompted?

### Legal surface

- [ ] Any user-facing string that gives advice rather than stating a fact?
- [ ] Any clause text promoted to `published` without a named reviewer or
      verification date?
- [ ] Any statutory text paraphrased where the statute prescribes exact words?
