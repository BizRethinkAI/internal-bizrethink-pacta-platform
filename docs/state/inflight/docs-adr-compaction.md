# ADR compaction: index plus consolidated ADRs

Branch: `docs/adr-compaction`. Base: main `bf5557c4b`. A direct instruction
from the repository owner on 2026-09-15, who chose "index + consolidated
ADRs" over index-only and rewrite-in-place. It replaces closed PR #273.

## What changed

- **`docs/adr/README.md`:** the living index. It gives each ADR's current
  status, what supersedes it, and what to read.
- **ADR 0020:** consolidates the MCA decisions from 0008–0019 into one rulebook
  of about 290 lines, replacing about 1,650. It makes no new decision. It
  includes one merged closed-questions table, the directions not yet carried out
  and a corrections table.
- **ADR 0021:** Coolify auto-deploy is off and `main` deploys manually once per
  batch after the state gate (supersedes 0005's auto-deploy). The index is the
  one exception to append-only (amends 0001).
- **`governance.yml`:** the append-only guard excludes `docs/adr/README.md` and
  nothing else. Tested with throwaway commits: an edit to the index passes, and
  an edit to 0003 is still caught.

No existing ADR file changed. All links to ADR numbers stay valid.

## Verified for the new text

- Coolify `is_auto_deploy_enabled: false`, read on 2026-09-15.
- Main's ruleset allows merge commits only and requires Build App, Build Docker
  Image, E2E Tests and Validate PR title.
- `docker/start.sh` runs `prisma migrate deploy` before start.
- There are 68 overlay patches.
- The three party placeholders (`tenant-agnostic.test.ts`).
- The Texas OCCC notice record is `compelled`.
- The lombard-api wording in the merged ADR 0019.

**Not re-checked:** ADR 0007's AATL status (last confirmed 2026-08-29).

## For the next state consolidation

- Fold this note and #271's note.
- STATE.md still points MCA readers at ADRs 0008/0009 and lists "Coolify +
  Docker, auto-deploy from `main`" under decisions taken. Point these at
  `docs/adr/README.md`, ADR 0020 and ADR 0021.
- Outside this repo, the BizRethink master `CLAUDE.md` still says a push to
  `main` auto-deploys for every app. That is not true for Pacta and is not
  changed here.

## Validation

Documentation and one workflow pathspec change. No application code, so no
Playwright pair. CI runs Governance with the new guard.
