# feat/mca-clause-approval — per-clause approval and the counsel review link

**PR:** _(filled on push)_ · **Branch:** `feat/mca-clause-approval` · Opened 2026-09-08

The MCA clause library gets the two things `/admin/mca-library` shipped without:
an attorney's approval recorded per clause, and a tokenised read-only link that
sends one agreement to counsel without giving them an account. They are one
piece of work because they share the fingerprint — the link pins the words that
were sent, the approval pins the words that were approved, and both are the same
hash of the same clause.

Prompted by [ADR 0009](../../adr/0009-counsel-is-parallel-not-a-gate.md), which
names "generalise the review link" as explicit work and removes counsel
engagement as a blocking phase.

## What landed

| | |
|---|---|
| `mca/clauses/approval.ts` | the fingerprint, lapsing, the admission reading, the findings hold, and `approvedMcaClause` — all pure |
| `mca/review/link.ts` | token usability, TTL, staleness — the review link's rules, scoped by **instrument** |
| `mca/review/readable-agreement.ts` | what counsel reads: one agreement, grouped, verbatim |
| `mca/server-only/clause-approvals.ts` | the only place the database meets the library |
| `mca/server-only/library-page.ts` | everything `/admin/mca-library` renders, in one read |
| `mca/server-only/trpc/clause-library-router.ts` | `approve`, `share`, `revokeShare`, `openLibrary` — `adminProcedure`, no organisation |
| `BizrethinkMcaClauseApproval`, `BizrethinkMcaLibraryReview` | migration `20260908120000_add_mca_clause_approval` |
| `/admin/mca-library` | approval form per clause, counsel-link panel; loader-fed, revalidated on every mutation |
| `/mca-clause-review/:token` | the reviewer's page. Read-only, and it takes no findings |

## The four decisions worth arguing with

**1. An approval supplies one fact: the author.** `approvedMcaClause` returns
the clause with `source.author` filled from the approval and hands it to
`assertPublishable`, which then says what it always said. There is no second
list of publish conditions here and there must not be one — a parallel gate is
a gate that can disagree with the first, and the one that disagrees quietly is
the one that ships the clause. Pinned by a test that approves a `statute`-sourced
clause and watches it stay unpublishable for want of a verification date.

**2. `sortKey` is excluded from the fingerprint; `instrument` is in it.**
Excluded because lapsing an approval over a reordering trains a reviewer to
re-approve without reading. Included because the Equipment Lease and the
Subscription number their clauses identically, and "approved in the other twin"
is the sign-off this library most needs to be unable to inherit. `source` is
excluded too, for a mechanical reason: an approval fills in `source.author`, so
fingerprinting it would make every approval invalidate itself the instant it was
applied.

**3. Outstanding findings hold an MCA clause — same answer as the lease, reached
differently.** The lease's findings are written through its review link and
answered on its library page; the loop closes inside the product. MCA's come
from two adversarial reviews of the *documents* and their dispositions live in
`lombard-contracts` manifests. There is no button in Pacta that answers one, and
`lease-builder-router.ts` warns that "a guard that cites work the person cannot
reach is a dead end they will route around".

It blocks anyway, because the work *is* reachable — just not from here. The
refusal names the finding ids and says to record the disposition in the manifest
and re-vendor. A guard that names the file is a handoff, not a dead end. The
alternative — a second, Pacta-side disposition register competing with the
manifests — is refused for the reason `mca/README.md` refuses a second
calculator: two registers drift, and when they disagree there is no principled
way to say which is right.

**Today this holds 73 of 192 clauses.** That is the mechanism working, and it is
mostly REVIEW-02's `unrecorded` findings — that review kept its dispositions in
prose, so "unknown is not done" counts them.

**4. The review link is generalised in shape, not merged into one table.** ADR
0009 names two lease-bound things. Both are addressed:

- the `jurisdiction` column becomes `instrument` on the MCA row, because an MCA
  deal is a set of documents and a link carries one agreement. `McaJurisdiction`
  and `ClauseJurisdiction` stay separate types and neither column ever holds the
  other axis;
- the rendering moves from `lease/review/readable-lease.ts` to
  `mca/review/readable-agreement.ts`, which groups and does not transform —
  the `«N»` markers stay, because they are printed in the contract a merchant
  signs and stripping them would show counsel a document we do not publish.

**What was NOT done, and this is the honest half.** The two verticals still have
two tables. `BizrethinkLibraryReview.token` is globally unique and the lease's
`openLibrary` resolves a token and nothing else — no discriminator, no scope
check — so an MCA link stored in that table would open the *lease* library. The
approval table has the same problem one level down: it is keyed by `clauseSlug`
alone, which is what `mca/clauses/README.md` rule 7 records as having hidden one
attorney approval behind another. Merging means a `library` discriminator on
both tables **and** a filter on every existing lease query, in a file another
session is working in. The MCA models are shaped so that merge is a data
migration; it belongs to whoever owns both verticals at once.

## What could not be verified

- **No local database** (`docs/STATE.md`, *Blocked*). The migration has not been
  applied anywhere, no approval row has ever been written, and neither page has
  been rendered. Everything asserted here is asserted about pure functions and
  about the files that wire them together.
- **The admission guard fires on exactly one clause today.** Only ISO PRA §2.6
  carries a non-empty `appliesInStates` (California and New York). On the other
  191 the permissive reading applies and any admission is accepted. That reading
  is provisional and changes in one function if counsel says otherwise.
- **A finding attached AFTER an approval does not lapse it.** `examinedBy` is
  deliberately outside the fingerprint — it is evidence about a clause, not
  words in it — so a new outstanding finding shows on the row and blocks the
  *next* approval without disturbing the standing one. The lease library has the
  same gap. Closing it means fingerprinting the examination record, which would
  also lapse every approval whenever a register is re-derived.
- **Counsel's own findings have nowhere to go in this product.** By decision (3)
  above, not by omission — they come back the way REVIEW-01's and REVIEW-02's
  did and are recorded in `lombard-contracts`. If that proves wrong in practice
  the fix is a register here, and it should be argued for rather than added.
- **Nothing was published to Pacta and no template was uploaded.** The counsel
  link is a page in this application; sending it is a person copying a URL.

## Still open

- Merging the two review tables behind a `library` discriminator (above).
- Whether an approval by an attorney admitted in one of a clause's states counts
  for the others. `statesNotCovered` reports the gap on the page; nothing acts
  on it.
- Whether the permissive reading of an unscoped clause survives counsel.
