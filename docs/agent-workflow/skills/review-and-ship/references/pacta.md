# Pacta profile

Apply only to `BizRethinkAI/internal-bizrethink-pacta-platform`. Read the repo's
current instructions; this profile records important routing and constraints,
not current PR numbers, deployment state or permanent overlay numbers.

For security remediation from the 2026-09-10 incident, read in the owner's order:

1. `~/Desktop/Claude Cowork/BizRethink/Platform/incidents/2026-09-10-pacta-probe/HANDOFF.md`.
2. `security-audit-report.md` and `security-audit-pr-review.md` in that folder.
3. Current repo `docs/STATE.md`, `docs/engineering-standard.md`, `UPSTREAM.md`,
   `overlays/README.md`.
4. The project's Claude memory `incident_2026_09_10_probe.md`, located under
   `~/.claude/projects/.../memory/`.

Then read the current `docs/state/inflight/*.md` notes for coordination.

Verify audit findings against latest merged code. Owner dispositions remain
one finding at a time: fix now / later / accept. Do not use queue shipping to
authorize remediation of undecided findings or changes to consumer repos.

- Node **24**, a fresh worktree outside the shared checkout, own `npm ci`, then
  `npm run prisma:generate --workspace=@documenso/prisma`. No dependency symlink.
- No local `npm run build` unless explicitly requested. Typecheck separately
  from Vitest; test-first failures must exercise the real defect. Check full
  Playwright baseline/final evidence for user-flow changes and report curated
  skips/flakes. Reuse verified results on unchanged exact revisions.
- Implementation in `packages/bizrethink/`. Each upstream edit requires a
  committed overlay with rationale/why-not-additive/fragility header, README
  entry and inline marker. Determine the next free overlay from current state.
  Instance configuration follows the repo's DB/admin-UI architecture.
- Auth, upstream, signing, migrations, money and legal-text changes need the
  mandated fresh human-started adversarial review. The implementer never merges
  their own PR. A creating session supplies substantive fixes; review again
  after its changes. Do not treat a reviewer who fixes the app as independent
  of that fix.
- Read `docs/session-workflow.md` when present. Under batch consolidation,
  Governance checks each author's own note; **State ready to ship** rejects
  main while any merged note remains. The shipping session automatically
  prepares one pure `chore/state-consolidation-<batch>` PR after the selected
  implementation queue merges; no reminder or new author assignment is needed.
  It updates STATE.md and deletes processed notes, creating no new note.
  Shwet reviews and merges it unless a different independent reviewer/merger is
  already assigned. Never self-merge. Honor existing fold ownership and resume
  the same shipping ledger after the handoff. Require the state check on the
  exact final main SHA before deployment. Do not add this push-only check to
  author PR requirements. Until these rules are merged/adopted, retain
  legacy Guard 5 and existing fold assignments; never silently bypass it.
  Inspect union merges for duplicate/conflicting claims and preserve limitations.
- Coordinate with live Claude sessions before landing. If `SendMessage` is
  unavailable, disclose that and obtain an owner relay/direction rather than
  pretending other sessions were notified.
- Preserve CircularPay's server-to-server REST integration from `45.76.255.53`.
  Do not introduce throttling, alter consumer repos or attack/probe production.
  Production database reads require separate owner approval. Credentials go
  through `creds`. No production data/configuration changes in this workflow.
- Every applicable PR check must pass, including Governance even if GitHub does
  not enforce it. Recheck actual base branches for stacked PRs and prove their
  merge commits reached main. Do not mistake a feature-branch merge for landing.
- Auto-deploy being off must be verified live. Merge is not deployment. The
  owner's explicit review-and-ship request authorizes one final Coolify MCP
  deployment after the queue and final-main checks pass: omit force, do not
  wait, do not watch. Preserve a receipt without claiming verified live status.

For this repo, `docs/engineering-standard.md`, the incident handoff and the
owner's session instructions take precedence over generic shipping shortcuts.
