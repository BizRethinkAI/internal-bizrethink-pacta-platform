# Engineering standard

Rules for working in this repo. Short, because rules nobody reads are decoration.

Where a rule can be enforced by CI it is, and the workflow is named. **Rules that
aren't mechanically enforced decay** — this repo has the history to prove it.

---

## 1. Definition of done

**A change is done when CI is green on a pull request. Not before.**

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

## 3. The implementing session never merges its own PR

The session that writes a change **opens the PR and stops.** A human merges.

The implementer is the worst-placed reader of their own change: they know what
they meant, so they see it. This is the rule most easily rationalised away and
the one worth keeping when everything else is dropped.

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

---

## Repo-specific rules

Learned the hard way. Each one cost something.

### Testing

- **TDD-first.** Every feature and every bugfix gets a failing vitest test first,
  then the implementation. No untested code lands.
- **Run the Playwright suite before and after** any change touching user flows.
  On an upstream merge that means three gates: baseline, post-merge-branch,
  post-deploy.
- **Never skip or `xfail` a failing test to make the suite green.** The curated
  exclusions in `FORK-TESTING.md` are the only sanctioned skips, and each is
  justified there.
- **A `cancelled` E2E job is not a pass.** It is no verdict. Re-run it.
- **Typecheck separately from testing.** vitest strips types without checking
  them; a fixture missing required fields runs green while feeding `undefined`
  into every predicate.

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
