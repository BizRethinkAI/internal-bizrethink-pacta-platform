# A deal survives a reload

Author: `mca-output-fidelity-20260916`. Base: main `a615747ab`.
Reserves migration `20260917010000_add_mca_deal_drafts` and **ADR 0022**.

## Durable behavior

A transaction lost everything on reload, which made the builder unusable for
work that takes more than one sitting. A deal can now be saved, reopened and
deleted, scoped to one team.

**What is stored is the answers, never the assembled document.** Reopening
recompiles from the template revision the deal names, so a saved deal cannot
carry stale wording forward and there is no archived copy to be mistaken for an
executed one. [ADR 0022](../../adr/0022-mca-deals-are-saved-inputs.md) records
the decision and amends ADR 0020 §6.3, which called filling stateless.

- `BizrethinkMcaDeal`: team, organisation, template, **the revision filled
  against**, label, version, input, actors, timestamps. Additive migration; one
  table, two indexes, no existing row touched.
- **Compare-and-swap on save.** Two people editing one deal is a conflict to
  report, not a last write — these are contract figures.
- **Saving needs membership and `mca-builder`, but not ADMIN/MANAGER.** Provider
  policy is the funder's programme and its managers' to change; filling a deal
  is the ordinary work of whoever holds the grant. Rendering still needs the
  separate `mca-clause-draft-rendering` grant.
- **Deletion is real** — the row goes, with no tombstone holding the same data
  under a flag. A draft holds a merchant's details for a deal that may never
  happen.
- **A list never carries answers**: the projection omits `input`.
- Saving changes no guard. `readyToSend` stays `false`, and every blocker —
  including #283's venue conflict — runs on the saved input exactly as on typed
  input, which a test pins.

## What this costs, stated plainly

This puts merchant details at rest in Pacta's database for the first time in
this vertical: business identity, contacts, funding figures and masked
identifiers. The mitigations are that the input schema refuses unmasked personal
identifiers and unmasked account numbers, that rows are tenancy-scoped, and that
deletion deletes. The lease vertical already stores its answers the same way.

No signature, signed date, processor acceptance or approval can be stored,
because the fill contract refuses them as input.

## Validation

TDD: 13 service assertions failed with no module, then passed.

- `mca` suite: **107 files / 3,463 tests pass**.
- A browser scenario fills, saves, **reloads to an empty form**, reopens and
  confirms the answers return, then deletes and checks the row count is zero —
  and asserts the stored row contains the merchant name but no clause text.
- One test of mine was wrong and is fixed: it asserted a list omits `input` by
  reading the mock's return, which tests the mock. It now asserts the projection
  the service actually sends.
- Local typecheck is clean for these files once module resolution points at this
  worktree; the `saveDeal` errors seen otherwise are the shared-`node_modules`
  artifact, which I confirmed by rebuilding resolution locally rather than
  assuming. CI is the gate.

## Not in this change

No merchant path, no send, no retention policy or expiry, and no moving a saved
deal onto a newer template revision — that last is a different act with
different consequences for the wording it compiles to.
