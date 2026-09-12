# Lombard profile

Apply to the owner's repos beneath `~/github/lombard/` or in `lombardpay`.
Read the owned repo's `docs/STATE.md` first, then the applicable Lombard parent
and repo `CLAUDE.md`/`AGENTS.md`. Current instructions govern; this profile is
a routing aid, not a replacement for them.

- Keep Lombard's context separate from BizRethink. Do not import Pacta's stack,
  overlay, in-flight-note or business conventions.
- One session owns one repo. Review and prepare that repo in isolated worktrees;
  route sibling-repo edits and shipping to their owning sessions. A request to
  cover several repos is not itself an express override of that boundary.
  Read-only dependency inspection can support a coordinated handoff. Do not
  edit BizRethink's porting source from a Lombard session.
- `docs/STATE.md` records durable decisions, hazards, people-blockers and
  commitments. Do not put PR status, queue progress or facts available from
  `git`/`gh` there. Keep this skill's execution ledger outside the repo.
- The web/platform application contract belongs to `lombard-platform`.
  Contract changes require its ADR and coordinated notes in both repos' state
  files. Each owning session makes its own edits.
- Contract name, product-model or merchant-vocabulary changes must reach the
  `lombard-web` session. Before reviewing affected public copy, read the current
  `lombard-contracts/CONTRACT_INDEX.md` and relevant platform product ADR; do not
  rely on a handoff older than a day. Coordinate the required state note/message.
- Apply the parent's exact language rules and carve-outs when reviewing copy,
  contracts and identifiers. Do not invent legal conclusions or waive specialist
  review. Use repo-relative build specifications under `docs/reference/`.
- Discover each owned repo's actual tests, branch rules and deployment mapping.
  A contracts/docs repo may have no Coolify app. Do not infer that it should
  deploy because another Lombard repo does.
