# fix/assistant-signature-boundary — approved A-06

Shwet approved A-06 on 2026-09-12 after verification against merged main
`01e53dcca4cb7bab6a9a340cdcc795fd718819cc` (includes #173, #174 and #175).
Fresh worktree `/private/tmp/pacta-a06-assistant`, own npm ci and Prisma
generation on Node 24.20.0. Shared checkout belongs to #176's
`fix/mca-source-corrections` session.

This branch reserves overlay **079**; next unreserved is **080**. PR #176
already owns the single fold of merged #173/#174/#175 notes. A-06 does not
duplicate that fold. Cross-session messaging is unavailable; coordination
goes through Shwet and the PR notes. Refresh main before publishing.

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

Implementation is in progress. Current CI evidence
will be recorded in the PR description and Checks, rather than treating this
committed snapshot as live CI state. No schema, configuration, production access,
credential lookup, merge or deployment is part of A-06. Independent auth/upstream
review must run in a fresh human-started session; this author never merges its PR.
