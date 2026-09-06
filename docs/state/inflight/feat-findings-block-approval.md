# feat/findings-block-approval — the finding loop, actually connected

**PR:** #TBD. Step 0 of the counsel-review plan: make what #103 shipped work.

## What was inert, and how it was proved

PR #103 built the whole mechanism and wired none of it. Each claim below was
checked by grep across `packages/bizrethink` and `apps/remix` before a line was
written:

| Thing | Callers found |
|---|---|
| `outstandingFindings` | its own test file, nothing else |
| `findingBlockers` | its own test file, nothing else |
| `approve` consulting findings | none — no reference to the table at all |
| `listFindings` | none |
| `answerFinding` | none |
| counsel reading her own findings | none — write-only page |

Doubly inert, as it turns out: `20260906210000_library_findings` has not reached
production. Prod holds **0 approvals, 0 reviews, and no findings table** — the
last applied migration is `20260905200000_approval_jurisdiction`. So there is no
data to migrate and nothing to backfill.

Four places asserted the control anyway. That is the point of the exercise: the
prose was written as though the wiring were implied by the mechanism.

## What now calls what

- **`approve` refuses.** `findingsBlock(findings)` returns a *sentence* naming
  each outstanding finding and where to answer it, matching `admissionBlocks`.
  A boolean would be a guard people route around.
- **`/admin/lease-library` reads and answers.** `listFindings` grouped by
  clause, outstanding groups first, oldest first inside a group. Answering
  requires text, enforced on the button as well as by the procedure. The clause
  row carries an "N findings outstanding" badge and the approval form is
  disabled with the reason shown, so the refusal is not discovered after typing
  a name, a bar number and a jurisdiction.
- **The counsel page reads back.** New token-scoped `openFindings`, refetched
  after each record, showing whether staff answered and what they said.

## Decisions

**Where the guard sits.** After `admissionBlocks`, before the fingerprint
check. Admission is a fact about the person that nothing in this flow fixes, so
sending them to answer a finding they could never approve past is wasted work.
The fingerprint check says "reload and read it again" — a second reading
followed by a second refusal is the same waste pointed the other way.

**The block is not scoped to `clauseFingerprint`.** A finding against wording
that has since moved still blocks. Scoping it to the current text would mean
editing a clause silently cleared every finding against it: as fast to bypass as
to satisfy, which is the failure the both-halves answer rule already prevents.

**A new procedure rather than a field on `openLibrary`.** Recording a finding
has to refetch whatever displays it, and `openLibrary` carries 52 clause bodies
— re-downloading the entire library to render one line. `openFindings` is also
the narrower read: scoped by `reviewId`, no input but the token, so a token
holder sees what came in on their own link and cannot ask for anything wider.
Attribution stays where `recordFinding` put it — on the review row.

**The guard's scope matches `listFindings`.** Both org-scoped. An approval is
instance-wide, so an argument exists for blocking on every organisation's
findings, but staff can only list and answer their own — and a guard citing work
the person cannot reach is a dead end. The durable fix is the one the admin
loader already names: drop `organisationId` from `BizrethinkLibraryReview`,
which is a migration and belongs in its own change.

## Found while wiring

`answerFinding` keyed its `update` on the caller-supplied `findingId` alone.
`assertAccess` proved the caller belonged to the organisation they *named*,
which said nothing about who owned the finding — a cross-tenant write, and Pacta
has hosted a second tenant since 2026-08-31. Now `updateMany` scoped by
`review.organisationId`, throwing `NOT_FOUND` when nothing matched rather than
reporting success. Its return shape changed from `{ id, answeredAt }` to
`{ answered: true }`; safe, because it had no caller.

## Verified

Failing tests first: 21 red across `findings.test.ts` (`findingsBlock is not a
function`) and the new `findings-wiring.test.ts` (16 wiring assertions), then
green. **1112 tests / 107 files pass**, up from 1089 / 106. Both typechecks
clean, including `react-router typegen && tsc` in `apps/remix`. `biome format
packages/bizrethink` clean. Fork-discipline guard reports no upstream files
touched — both routes are declared in `overlays/BIZRETHINK-OWNED.txt`.

## Deliberately not done

- **No schema change and no migration.** Everything needed already existed.
- **Jurisdiction display, `libraryFingerprint` scoping and
  `BizrethinkLibraryReview` untouched** — later steps in a plan not yet
  approved.
- **The migration comment is not corrected in place.** Prisma checksums applied
  migrations; editing one fails every later `migrate dev`. Its claim is true as
  of this PR anyway, and the record of the gap is in `docs/STATE.md`.
- **No notification when a finding is recorded.** Staff learn of one by opening
  the admin page. Email is a real gap and a separate change.
- **`docs/state/inflight/feat-counsel-findings.md` left alone.** It is another
  PR's note, and its claim is true now.
