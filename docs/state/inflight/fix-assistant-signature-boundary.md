# fix/assistant-signature-boundary — approved A-06

Shwet approved A-06 on 2026-09-12 after verification against merged main
`01e53dcca4cb7bab6a9a340cdcc795fd718819cc` (includes #173, #174 and #175).
Fresh worktree `/private/tmp/pacta-a06-assistant`, own npm ci and Prisma
generation on Node 24.20.0. Shared checkout belongs to #176's
`fix/mca-source-corrections` session.

This branch reserves overlay **079**; next unreserved is **080**. PR #176
already owns the single fold of merged #173/#174/#175 notes. A-06 does not
duplicate that fold. Cross-session messaging is unavailable; coordination
goes through Shwet and the PR notes.

Integration dependency: the exact #176 head
`000f599d12523ae7849ef452f3be6a8e7d80b7f5` is included in this branch without
editing its implementation or state fold. Review and merge #176 first, then
A-06. The A-06-only review range starts at that head; its upstream overlay
contains only A-06 changes. Main was still `01e53dcca` at integration.

Approved scope: an assistant must not insert or remove another recipient's
SIGNATURE or FREE_SIGNATURE through legacy or current field adapters. Preserve
ordinary assistant prefill and rightful-recipient signing. Legacy helpers also
serve the existing embedded multi-sign flow; keep that compatibility while
enforcing the same signature boundary regardless of envelope version.

Test-first reproduction: **8 failed / 21 passed** on unchanged production code.
Real legacy helpers and the composed v2 tRPC route run against synthetic database
boundaries. Both signature types are wrongly insertable/removable by an assistant
on v1 and v2; rightful signing, ordinary prefilling, the existing v2 prohibition,
and field-selection restrictions pass. The test TypeScript gate passes.

The owned policy rejects another recipient's two signature types, then returns
the authorized field's owner/type/envelope predicates for assistant writes.
Three upstream adapters consume that policy; all four transaction update paths
retain those predicates. A concurrent reassignment/type change cannot turn a
permitted prefill into a signature change. The existing v2 INVALID_REQUEST code
is retained. Non-assistant behavior and ordinary field types, including INITIALS,
retain the upstream policy; an assistant's own assigned signature stays allowed.

Additional TDD: **16 race tests failed / 29 passed** before conditional writes.
All **45 A-06 regressions** plus **131 existing recipient-auth tests** now pass;
the owned TypeScript gate passes including the six new HTTP tests. On the final
combined tree, the full owned suite (**4,541 tests / 206 files**), lib suite
(**287 tests / 19 files**), owned and full Remix types, and formatting pass.
The six HTTP tests were discovered locally; execution is performed by CI, not
the local database. Overlay 079 exactly matches its three upstream files,
replays byte-for-byte against the dependency base and passes reverse-apply
checking. All policy lives in the owned module. There is no A-06 schema or
configuration change. The #176 dependency files remain byte-for-byte unchanged.

Current CI evidence will be recorded in the PR description and Checks, rather than treating this
committed snapshot as live CI state. No schema, configuration, production access,
credential lookup, merge or deployment is part of A-06. Independent auth/upstream
review must run in a fresh human-started session; this author never merges its PR.
