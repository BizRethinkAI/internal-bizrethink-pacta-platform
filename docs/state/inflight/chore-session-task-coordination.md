# Session coordination and batch state consolidation

Branch: `chore/session-task-coordination`, from main `42394e5f3ab6c85079a4328b9971fa19a835223b`.
Task: [#181](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/181).
Shwet remains coordinator. This session owns only this workflow PR and its CI.

## Behavior

Separate GitHub task issues hold live assignments. The coordinator owns each
assignment body; authors/reviewers append comments. Session labels distinguish
agents sharing one account. Cards do not provide locks or wake other sessions.
The repository startup pointers and versioned coordinate-work, author-pr and
review-and-ship skills define the handoffs without a shared Git registry.

Governance checks the author's own nonempty note and rejects changes to another
note or STATE.md. It permits a pure `chore/state-consolidation-<batch>` PR that
updates STATE.md, deletes all merged notes and introduces no code or new note.
An assigned consolidator owns that PR; another session/human reviews and merges.
The separate read-only `State ready to ship` check fails main until its notes
are consolidated. Shipping requires this check on the final main SHA, alongside
existing CI. This does not install a Coolify hook or change branch protection.

Overlay **081** adds only a startup pointer to upstream AGENTS.md. Its existing
coding rules remain intact. All policy, tests and instructions are additive or
existing BizRethink governance files. No application behavior, schema, dependency,
production setting or credential changes. Next unreserved overlay: **082**.

## Validation

Fresh worktree, own `npm ci`, Prisma generation and Node 24.20.0. Test-first
commit `fa9eec472` introduced the CLI contract before its checker existed
(10 failed / 4 passed); negative assertions were then strengthened. Test-first
commit `830ccb22b` includes a specific incomplete-fold regression: 1 failed /
16 passed against the intermediate uncommitted checker. Those counts describe
working-tree runs; the test-only commits do not contain an implementation.

Final focused suite: 17 tests. Owned type checking, changed-file Biome, YAML
parsing, skill validation and exact overlay matching/reverse application are
checked locally. GitHub PR checks and description carry final execution results;
no CI-status-only code push is needed. No local app build or browser run.

## Adoption and unresolved work

Issues were initially disabled, then verified enabled on 2026-09-12. Task #181
exists. New rules activate after review and merge; existing sessions must receive
an owner relay or explicitly reread the current instructions. Generic skills
adapt to each selected repository; other repositories were not modified.

#178 and #180 currently both include a #179 fold. This PR does not alter either
branch, fold #179 or claim that conflict is resolved. The reviewer/coordinator
must reconcile the existing fold assignments and land those existing PRs before
adopting this stricter author-state contract. The first consolidation should also
correct STATE.md's historical “every session ... updates it last” startup line
and record that the settled file is read together with unprocessed notes.

A fresh human-started adversarial review is required for the upstream/governance
change. This author never merges its PR or triggers a deploy. Deploy requests
remain one non-forced, non-waiting Coolify request per selected app after the
selected batch and final-main gates pass; they are never watched.
