# STATE.md — where this repo actually is

**Every session reads this first and updates it last.** It is the only memory that
survives between sessions. It replaced a user-local `~/.claude/.../memory/`
directory on 2026-08-29 — that directory was invisible to anyone but one machine,
unversioned, and absent from PRs. This file is none of those things.

Record **current reality, not intent**. A stale STATE.md is worse than none,
because it is believed.

Durable rules live in [`engineering-standard.md`](engineering-standard.md).
Decisions and their reasoning live in [`adr/`](adr/). This file is for what is
true *right now*.

_Last updated: 2026-09-12_

---

## 2026-09-12 — eleven-state MCA agreement requirements (#179)

Research PR **#179** merged at `42394e5f3` after all 13 checks passed on
`4cf12aa5a`. Its E2E jobs used the existing docs-only exemption; they did not
run the browser suite. The source report and detailed records are in
[`research/mca-agreement-requirements-2026-09-12/`](research/mca-agreement-requirements-2026-09-12/README.md).
This is a walk of eleven dedicated commercial-financing schemes, including
26 California rules, 26 New York rules, fourteen Texas rules, four Virginia
rules and Connecticut guidance/enforcement cross-references. The manifest
records 113 HTTP attempts, twenty retained files and 27 unchanged references.
The historical #174 audit and application-source bytes remain unchanged.

Positive agreement duties: GA §10-1-393.18(e)(4), UT §7-27-202(3), KS
§75-784(b)(5) and MO §427.300.3(2)(e) require variable-payment methodology
in covered agreements; Texas §86.310(d) requires its conspicuous OCCC notice
and §86.312(b)(3) requires disclosed/contracted fees. Duties, prescribed
wording, prohibited terms and separate disclosures are distinguished.
California §§22806–22807 derive from 2025 SB 362, effective January 1, 2026.
CT's later employee-registration memorandum is not a disclosure-grace extension.

Currency limits survive: GA's full current Lexis body was blocked by CAPTCHA;
MO's declaration/rule history selecting the commencement branch is unclosed.
California consolidated rules state August 28, 2026 currency; New York states
October 31, 2023, supplemented by official amendment-index checks through
September 9, 2026 without a later Part 600 amendment identified. Utah's linked
FAQ is dated January 1, 2023 despite its 2026 upload path. Texas's current
portal labels §86.311(i)'s second item `(2)` where the adoption says `(B)`.
These are documented limits, not invented verification dates or equivalences.

Remaining source/form work: fix Utah application references from §7-27-201 to
§7-27-202; update California statutory references; correct the Virginia
prescribed form separately. UCC, federal law, guaranty, bankruptcy and case law
remain targeted clause dependencies. Research alone approves no clause.
ADR 0014 backfill is being implemented in
[`state/inflight/feat-mca-clause-metadata.md`](state/inflight/feat-mca-clause-metadata.md).
Missing collection/venue alternatives and the processor-acceptance deal-fact
move remain separate. The research retrieval workspace was
`/tmp/pacta-mca-requirements/`; durable evidence is committed in the report.

A-07 authored the #176/#177 note cleanup, reused unchanged from #178 head
`3874700da819d2606eb0198a6458d57b5d72a139` as research dependency `cede1f021`.
This section folds only this session's now-merged #179 note. No deployment
status is inferred from the merge.

## 2026-09-12 — merged signup policy and derived MCA numbering

**#169 / R-01** merged at `bcbec3c3b298ee28265a246e80fa7d2ba8407170`.
Signup reads one validated policy per request for the disabled, domain and
invitation gates. Unavailable/invalid/closed policy fails closed; a valid open
policy retains the existing env-domain fallback and DB-domain invitation rule.
Provider switches, invitation verification, rate limits and CAPTCHA are retained.
Overlay **074** records the upstream wiring. No schema, instance setting or
consumer change; a concurrent admin edit affects the next signup request.
The independent review found no blocking defect and all final PR checks passed.
#169 already folded #168; the duplicate #168 summary from #171 is consolidated
below without changing any finding disposition or dropping source/ADR follow-ups.

**#171 / ADR 0011 phases 1–4** merged at `8715848c25ba791e0fb4262840d069588bfcad97`.
The clause library stores identities rather than printed numbers. Selection
applies the existing gates, then derives consecutive section/clause numbers
and resolves same-profile clause/group references. Missing, duplicate and
malformed targets fail closed. Explicit structural reasons leave some records
unnumbered; seven alternative pairs share canonical reference identities.
The source funding grid contributes 30 existing widgets, and the existing
interest paragraph is separately citable: **FRPA 108 / entire library 211**.
All 209 original records, existing fields, provenance, examination links and
selection rules are retained. Ten ungated limitations name the separately
signed guaranty so a no-guaranty selection has no dangling reference.

Staff and counsel see the same compiled citations, visible field content and
labelled alternative examples. The default profile remains an example, with
the net settlement base unconfirmed. Slugs still identify findings and approvals.
Approval fingerprints include classification, fields, reference targets and gate
source; review fingerprints also cover ordering, example facts and referenced
instruments. Existing links/fingerprints become stale; no approvals are
migrated. Gate-source hashing can conservatively invalidate reviews across
compilation representations; create review links through the app runtime.

All authored clauses remain draft with null authors. This introduced no merchant
rendering, PDF assembly, publishing, sending or prescribed-disclosure change.
Separate work remains: guaranty numbering/placement (phase 5), templates
100/102/119–121 and sibling form migration, remaining labels, commercial
interview answers and counsel review. Future compound gates need explicit
review examples, and future merchant output must enforce publication approval.

No deploy has been requested for this queue. The review-and-ship session owns
this consolidation and the single final deployment after the remaining PRs
and final-main CI pass.

## 2026-09-12 — API-token team boundary (#170)

The integrated A-02 implementation keeps API credentials within their issuing
team. Owned `api-token-team-scope.ts` carries the token team through async work;
common single/bulk predicates AND that team outside creator/team-email access.
Invalid or conflicting scopes fail before dispatch. Human-session and same-team
permissions retain their existing behavior, including raw/Bearer compatibility
and legacy-token validation. Three Hono PDF paths establish the same scope.
The first delete lookup returns 404 for a foreign team before document deletion
or recipient self-hide, audit and webhook writes. Overlay **075** preserves
six production hooks and the two upstream tests' exact 404 expectations.

The original defect was independently reproduced; reviewed author head
`cf38530144d436c3d73c8ba82c631477908e8079` passed application CI. The combined
queue is validated by GitHub CI. No rate limits, token issuance changes,
consumer-repository edits or production queries were made. CircularPay's actual
reliance on the removed cross-team authority remains unknown. A-03 and other
audit findings remain separate decisions. Shwet waived the inherited comment
requesting a second reviewer; the independent review found no blocking defect.

## 2026-09-12 — recipient identity gates merged (#172 / A-05)

PR #172 merged at `0c440a396c9b5f5c9161538358fc08ff120fdc80` after independent
review and green final checks, including Playwright on integration head
`ff80cca0e`. Overlay **076** wires the owned recipient policy into signing,
metadata and PDF routes. Configured ACCOUNT identity is required independently
of signing ACTION factors; account-backed factors belong to the intended
recipient. Completion email codes remain bound to recipient and envelope.

The owner chose to preserve downloads after the signing deadline with identity
checks intact. Drafts and deleted unfinished documents are unavailable;
sender-hidden finalized copies remain available to their recipients. PDF
authorization precedes storage and conditional responses; private/no-store is
enforced. Deliberately link-only documents, QR capabilities and enabled direct
template previews keep their distinct existing access contracts. Preview
capabilities do not authorize ordinary document APIs.

Final author validation: **4,334 owned tests**, **287 shared-library tests**,
both TypeScript gates and **11 HTTP regressions** in the green final CI run.
No schema or instance-setting change. The A-04 author owns this single fold of
the now-merged A-05 note; no other PR was open when checked. Production shipping
remains owned by the separate review-and-ship session; this fold does not assert
that the merged queue is deployed. Remaining audit findings need separate
owner decisions.

## 2026-09-12 — template PDF ownership and presign boundaries merged (#173 / #175)

**#173 / A-04** merged at `2d20163f816c7c7f20461accb82b851e1883551f`.
Template copying authorizes every source before copying any. Existing attachments
require current envelope/team access; API credentials retain their issuing-team
boundary. Staged uploads have a server-recorded owner, optional verified team and
stored reference/content fingerprint. Receipts cannot override attachment access
or changed content. Retries and reuse remain allowed for permitted, unchanged,
unattached uploads. Historical unowned orphan uploads require re-uploading;
existing attachments need no guessed ownership backfill.

Overlay **077** preserves the three template-copy/browser-upload/multipart hooks.
The additive `BizrethinkPdfUpload` table is declared in owned schema additions;
migration `20260912130000_bizrethink_pdf_upload_ownership` must be applied before
the new app serves uploads. The implementing session did not apply a migration
to production. An older app can ignore the table, but rolling back the app restores
the authorization defect. No new public input, environment variable or dependency.

**#175 / A-03** merged at `7f679bbb1b86ada68018502d7317593eab4d3908` after
integrating #173. Presign verification checks JWT signature/algorithm/expiry,
current parent expiry, disabled issuer/organisation owner and current membership.
The minimal verified capability retains delegated team/resource/operation limits
without carrying the parent token hash. Legacy user-ID audiences work within the
parent team; omitted scope retains documented team-wide authoring and malformed
scope fails closed. Resource-scoped tokens cannot create unrelated documents.

All six create/update adapters receive the verified context; edit loaders and
nested mutations retain A-02's team boundary. Both PDF adapters put team/resource
predicates in the data query and force private/no-store before conditional cache
responses. Overlay **078** preserves 13 upstream files; the combined overlays
replayed to identical source across 15 affected files. No further schema change.
Author validation recorded 37 focused regressions, 4,488 combined owned tests,
287 shared tests and both type checks; the PR Checks are the execution record
for the separate HTTP regressions. A-06's assistant signature boundary is now
merged separately in #177, recorded below.

These merges do not establish deployment status. The MCA source-corrections PR
owns this fold: GitHub reported #173, #174 and #175 merged and no open PRs when
cleanup ownership was checked. It does not change either authorization feature.

## 2026-09-12 — MCA source audit merged (#174)

**#174** merged at `01e53dcca4cb7bab6a9a340cdcc795fd718819cc`.
The [report and manifest](research/mca-source-audit-2026-09-12/README.md) account
for all **16 original text files / 11 states**, with 46 official retrieval
records and 13 retained evidence files. Exact URLs, UTC times, raw-response
hashes, publication versions and comparison methods are recorded. Unknown
original retrievals remain unknown. Fourteen bodies matched identified official
publications; the two Virginia form extracts did not match the official linked
October 2022 form. The original source bytes, digests and verification dates were
unchanged in that audit. Its dated manifest describes that baseline, not later
source corrections. The reviewed audit head `94e483152` passed CI; Playwright
used the existing documentation-only exemption rather than running browser tests.

The audit found missing CT supplement sections 36a-868, 870 and 872, MO's 2025
premium-finance exemption and FL's 2024 depository-institution amendment. Their
current text was incorporated by #176, recorded below. Virginia needs a separate
prescribed-form correction covering a label, formula, estimated-payment wording
and layout; the official PDF and both extractions are retained for that work.
The August 2024 CT guidance still matches its official PDF but predates the
registration amendment. #179 later established the guidance-index linkage and
retained the associated enforcement sections and employee no-action memorandum.

The old “Texas only” inference is superseded: Utah §7-27-202(3) requires
variable-payment information in the agreement. Its current linked PDF includes
the 2024 amendment despite the 2022 URL. Kansas's introduced source matches the
enrolled/current operative text after documented normalization; retain the
Revisor's `(iii)`/`(B)` annotation. CA/NY consolidated regulatory currency, later
Georgia code history and Texas codified rules remain qualified. The complete
eleven-state dedicated-scheme review is now recorded in #179 below; targeted
clause-specific authorities remain open for ADR 0014 classification. Current clause count: **211**, not
ADR 0014's historical 219; authored clauses remain draft with null authors.

The agreed workflow keeps full reading and detailed handoffs, one coherent task
per PR and focused TDD. CI owns comprehensive final tests/builds/typechecks and
its existing Playwright gate. Application browser checks address meaningful
rendered behavior, not every source/text edit. Implementers monitor their PR to
green, then stop; a human merges or explicitly starts review-and-ship. Fresh
independent review for sensitive changes is human-started, not an additional
implementer-spawned review. ADR 0011 guaranty placement, remaining template/form
migration and commercial interview answers remain separate follow-ups.

## 2026-09-12 — current MCA statutory sources merged (#176)

**#176** merged at `d297c7332626ac144cbaf8e7906d577e4542da15`.
Connecticut's vendored source now explicitly consolidates the nine unchanged
base sections with full §§36a-868, 36a-870 and 36a-872 from the 2026 supplement,
including histories and effective dates. Its header distinguishes the two
official publications, exact retrievals and hashes; it is an editorial
consolidation. The obligation quotations now reflect the revised registration
renewal/fee rule, registration sanctions in §36a-872(a) and commissioner action
in (b). The non-form obligation count is **13**; `ct-penalties` retains its ID
but cites (b), and `ct-registration-sanctions` records (a). Cross-state notes
and an FRPA comment no longer repeat the superseded text. Referenced
§§36a-50, 51 and 52 were later retained as research evidence in #179; no
registration/enforcement engine exists.

Florida's six current code sections replace the HB 1353 extract and include
the 2024 amendment to §559.9611(9). Missouri's current §427.300 replaces the
SB 1359 extract, includes the 2025 premium-finance exemption and corrects the
six disclosure citations to §427.300.3(2)(a)–(f). Missouri verification remains
bounded to subsection 3; its variable-payment agreement duty in 3(2)(e) remains
material to the agreement-requirements review. Existing prescribed labels,
disclosure requirements, evidence, calculations and layouts are unchanged.

Digests and verification dates moved only after comparison with corrected
sources. There are still **16 active source texts**; retired bills remain in
Git history. The dated #174 audit, manifest and evidence retain their original
bytes and qualifications. Seven new regressions failed before correction;
180 tests across seven focused files then passed against the separately
retained official captures. Source agreement is not legal or publication
approval. No clause body, authored status, author, schema or upstream file changed.

The eleven-state dedicated-scheme matrix and further implementing authorities
are now recorded in #179 below, with explicit currency/access limits. Virginia's
October 2022 prescribed-form correction and clause-specific authority checks
remain open. CT guidance predates its registration amendment. ADR 0014 must use
the evidence and its qualifications when classifying the **211** records;
authored clauses stay draft with null authors. ADR 0011 guaranty placement,
template/form migration and commercial interview answers remain separate.

## 2026-09-12 — assistant signature boundary merged (#177 / A-06)

**#177** merged at `7f5ce5684caaa03a59b0fdc702ae6e33b60548f4`.
An assistant may prefill ordinary fields but cannot insert or remove another
recipient's SIGNATURE or FREE_SIGNATURE. The owned policy supplies the
authorized field owner/type/envelope predicates to all four conditional write
paths, so a concurrent reassignment cannot turn prefill into a signature edit.
Overlay **079** preserves three upstream hooks: both legacy helpers, including
their v2 embedded multi-sign callers, and the current v2 insert/uninsert route.
Legacy insertion checks before ACTION-factor validation. Rightful signing,
ordinary prefills, INITIALS and the existing v2 error code retain their behavior.

Test-first runs reproduced eight signature bypasses and sixteen concurrent-edit
failures before their respective fixes. All **45 focused regressions**, 131
existing recipient-auth tests, **4,541 owned tests / 206 files**, **287 shared
tests / 19 files**, both TypeScript gates and overlay replay passed. All 13
distinct CI checks were green for author head `4cf44cebbeb32ad1aabcd2a21ecaff02c328674f`;
the six new HTTP tests passed on their first attempts. Full E2E reported
**1,087 passed / 1 flaky / 59 skipped**; the existing pending-envelope order
test at `api/v2/update-envelope-items.spec.ts:298` passed on retry.

This establishes the merge and CI, not completion of independent adversarial
review or production deployment; those remain unverified by this author.
There is no A-06 schema/configuration change. A-04's additive upload-ownership
migration prerequisite above still applies to shipping the queue.

Shwet assigned the A-07 remediation session the single fold of #176/#177 notes.
The MCA research PR #179 reused A-07's exact three-file fold from #178 head
`3874700da` as dependency commit `cede1f021`; it did not author a second fold.
A-07 now includes that merged dependency without repeating it. #176's earlier fold of
#173/#174/#175 is retained unchanged except for the now-completed follow-ups
identified above. A-07 is approved and tracked in its own in-flight note;
later audit findings still require individual owner decisions.

## 2026-09-12 — eleven-state MCA agreement research merged (#179)

**#179** merged at `42394e5f3ab6c85079a4328b9971fa19a835223b`.
The [report, section register and source ledger](research/mca-agreement-requirements-2026-09-12/README.md)
separate agreement-content duties, prescribed disclosure wording, conduct and
prohibited terms. The dedicated schemes for all eleven states were read, with
26 CA rules, 26 NY rules, 14 TX rules, four VA rules and CT enforcement/guidance.
The manifest records **113 HTTP attempts / 20 retained evidence files / 27
unchanged source or evidence inputs**; browser observations are separate from
HTTP provenance. Original #174 evidence and application source inputs are unchanged.

The report identifies variable-payment agreement-content duties in GA, KS, MO
and UT, plus TX's prescribed OCCC services-contract notice and contractual
support for fees/charges. Those findings replace the old "Texas only" premise
without classifying every clause as required or prescribing our authored words.
Registration, disclosure delivery, signatures, priority and prohibited conduct
remain separate from required agreement text. The research changes no clause
body, approval status, application behavior or schema.

Source limits remain explicit: CA's publisher cutoff is August 28, 2026; NY's
is October 31, 2023, supplemented by the documented official amendment-index
search through September 9, 2026, which identified no later Part 600 amendment.
The current CT index links its 2024 guidance, which cannot override the later
registration statute. Texas's current portal and complete adoption packet were
read; §86.311(i)'s `(2)` versus `(B)` publication discrepancy is retained.
Georgia's full current-code body remains blocked by the publisher CAPTCHA;
visible section history and 2024–2026 legislative summaries are corroboration.
Missouri's rule-dependent commencement history remains unestablished: do not
hardcode an unconditional date. Utah's regulator FAQ is dated January 1, 2023,
despite its 2026 upload path; that path is not a new legal effective date.

Next MCA work is ADR 0014's two metadata fields and clause-specific backfill of
the **211 actual records**, using targeted UCC/contract/usury/guaranty/bankruptcy/
E-SIGN/NACHA/case-law authority where needed. Silence in a dedicated scheme
does not prove a clause discretionary. Draft/null authors, lawful commercial
options and the fact partition remain. Queued corrections: UT disclosure
citations from §201 to §202 and CA's changed statutory references. Virginia's
prescribed-form mismatch remains a separate PR; the three missing facts and
`processorSplitAccepted` fact move remain separate owner decisions.

The research author recorded local hash/link/section-count validation; current
CI evidence belongs to #179's Checks and description. This fold records its
verified merge, not a new legal approval or application validation. #178 was
the only open PR when Guard 5 identified #179's merged note, so the A-07 session
owns its single fold and removal. No research implementation or source evidence
is changed by the fold.

## Where things stand

Pacta is an **additive fork of `documenso/documenso`** — a document-signing
platform running at `sign.pacta.ink` on Coolify, manually deployed from `main` (auto-deploy verified off on 2026-09-12).
Production holds **450 documents and 34 templates**: real, signed, customer
contracts. Treat every production action accordingly.

**Pacta now hosts a second tenant.** Until 2026-08-31 every production
organisation was BizRethink's own; `lombard` is the first outside one. That
changes the blast radius of instance-wide changes — see *Lombard tenancy* below.

All customisation lives in `packages/bizrethink/` plus **42 overlay patches**,
which are the only sanctioned way to modify upstream files (plus the paths declared in `overlays/BIZRETHINK-OWNED.txt`, which were never upstream). Upstream is merged
weekly by `.github/workflows/upstream-sync.yml`. See
[ADR 0002](adr/0002-additive-fork-over-hard-fork.md).

**Current upstream base: 2.16.0** (synced 2026-08-13, 142 commits, PR #16).

Live features include per-org SMTP, DB-backed instance config for
signing/storage/AI/SSO/Stripe, SaaS billing tiers with trials, and per-org
branding.

**There are two verticals, and this file is mostly about one of them.**
Everything below describes the **lease builder**, which is the finished product.
The **MCA vertical** (merchant cash advance) is the second, is mid-build, and its
architecture is recorded in ADRs rather than here:

- [ADR 0008](adr/0008-mca-is-two-surfaces-not-one.md) — it is *two* surfaces with
  two release paths: **conformity** (does a disclosure meet a state's statute)
  and **the agreement** (our clauses, our contract). They share one provenance
  gate and nothing else.
- [ADR 0009](adr/0009-counsel-is-parallel-not-a-gate.md) — counsel is a parallel
  track, not a prerequisite. `assertPublishable` gates text reaching a *third
  party*, not text being written. Building the clause library is unblocked.

Where it stands, **2026-09-10**:

| | |
|---|---|
| Conformity surface | **built** — `/admin/mca`, instance conformity (#112), 7 content statutes (FL GA KS LA MO TX UT), prescribed-form conformity, CT/VA primary text sourced, source strength and reading age on every card (#134) |
| Clause library | **built** — `packages/bizrethink/mca/clauses/`, **203 clause records across all six instruments**, every one carrying an examination record |
| The FRPA | **rewritten in full, 2026-09-10** — all **100** records authored from the counsel memo and the 254 findings, under [ADR 0012](adr/0012-the-baseline-document-is-input-not-specification.md) and [ADR 0013](adr/0013-a-funder-profile-describes-the-funder.md). **Unreviewed:** every record is `status: 'draft'` with `author: null` and zero counsel approvals exist |
| The other five instruments | **NOT rewritten** — Equipment Lease, Subscription, ISO PRA, Split Funding, Permission to Release. A merchant signs **five of the six**, and two of them undo the FRPA's protections in the same envelope. See *The day of 2026-09-10* |
| Selection engine | **built** — `selectClauses`, `instrumentsFor`, `McaFacts` with a Lombard profile. Eleven facts; **three still gate nothing** |
| `/admin/mca-library` | **built** (#132) — per-clause approval (#135), a `From counsel` section (#140) |
| Counsel review link | **built** — `/mca-clause-review/:token`, scoped by instrument, with a derived briefing (#139) and a findings box (#140) |
| Agreement builder | **not started — and it is still the deliverable.** [ADR 0011](adr/0011-the-mca-clause-library-is-a-library.md) settles its shape |
| Interview / Section 1 | **not started.** The merchant and funding grid is captured nowhere in Pacta |

**That paragraph used to read "the library is text with provenance, not an
engine — there is no `includeWhen`, no `variables`, no selection."** Two of the
three arrived on 2026-09-10: `includeWhen` gates clauses on `McaFacts`, and
`selectClauses` / `instrumentsFor` turn a funder profile into a document.
**`variables` is still absent**, and its absence is now load-bearing — it is why
§7.5 could not be split on `venueRule` (see *The day of 2026-09-10*).

**There is still no render or assembly path.** Nothing in `mca/` turns selected
clauses into a document, which is the only reason unreviewed text cannot reach a
merchant. `assertPublishable` **reports, it does not refuse** — it returns early
on anything not `published`, and both surfaces call it on a hypothetical. **The
first thing the render path must do is fail closed on it**, test written first.

## In flight

**Live work now lives in [`docs/state/inflight/`](state/inflight/), one file per
pull request.** Reading the current state means this file plus every note in
that folder. The table below is history and stays until compaction.

**Nothing is open.** #152 through #158 all merged on 2026-09-10.

**Eleven in-flight notes were folded into this file and deleted on 2026-09-10** —
the second compaction, and **it had re-accumulated in one day.** Every one
belonged to a merged PR: #145, #146, #147, #149, #150, #151, #152, #153, #154,
#155, and the first compaction's own note. **The folder is now empty but for its
README**, which is the first time that has been true.

**The governance gate was green throughout, again**, and this is the second time
that has been recorded. `governance.yml` checks that a PR *touches* a state file
and that STATE.md carries no conflict markers. It cannot check whether a note's
PR has merged, or whether a claim in this file is still true. It did not catch
that this file said the MCA migrations had *"never been applied anywhere"* six
days after they were applied — the owner did.

| PR | What | State |
|---|---|---|
| #26 | Lease party list + sending wired | Open. Base of the lease stack. |
| #27 | Property form, Census address lookup, market-fact suggestions | Open, stacked on #26. |
| #3 | `default-deny GITHUB_TOKEN` scope in CI workflows | Rebased 2026-08-29 |
| #4 | AATL signing setup plan (DigiCert + GCP Cloud HSM) | Rebased 2026-08-29. AATL confirmed still live. |

Merged 2026-08-29: **#18** (engine, clause library, renderer, signing handoff),
**#21** (route), **#22** (preview link), **#23** (custom clauses + interview
definition), **#24** (multi-step interview UI), **#25** (four Florida statutory
gaps found by adversarial review).

**The lease builder is now reachable and usable.** `/t/:teamUrl/leases` renders a
15-step, 70-field interview over **64 clauses**, with a live findings panel, a PDF
preview, a custom-clause editor and — as of #26 — a working Send. Both gates
remain shut: `BizrethinkFeatureAccess` grants access only to user 3, and every
clause sits at `status: 'draft'`, which renders only for an organisation holding
the `lease-clause-draft-rendering` grant.

**The pilot lease lives in a personal organisation, not the company's.**
29090 Picana Ln is a personal rental. The lease names four natural persons and
the company appears nowhere in it — it was simply created in the wrong
organisation. Moved 2026-09-06 to `org_nkzrmhochvhmbwnt` (`/o/personal`), team
`prabhat`, by `scripts/one-off/2026-09-06-move-picana-to-personal.sql`.

Four things had to move, and the two that were nearly missed are the
instructive ones. `BizrethinkDocument` carries its **own** `organisationId`,
and `documents.list/update/remove` authorize on that column alone without
checking the property belongs to the caller — so the 15 HOA documents would
have stayed the company's, silently, since a member of both organisations sees
no difference. And `BizrethinkLeaseMatter.teamId` is passed straight to
`createEnvelope` by `matter.send`, so moving only the organisation would have
filed the signed envelope back inside the company at the one moment that is
expensive to undo.

The `lease-clause-draft-rendering` grant was **transferred, not copied**. After
the move the company organisation holds no lease work, and leaving it granted
would recreate exactly the drift that migration `20260829100000` was written to
remove.

**That migration's comment is now stale and CANNOT be corrected.** It names
`org_wzsyehzolibvnxal` as "the single organisation that actually holds
lease-builder work", which stopped being true on 2026-09-06. Prisma checksums
applied migrations, so editing the file — even to add a comment — fails every
subsequent `migrate dev` with "was modified after it was applied". Learned by
doing it and watching CI go red in 45 seconds. An applied migration is a record
of what ran; when it goes out of date, the correction belongs here, not there.

The move was safe only because nothing had been signed — `envelopeId` was NULL
and the organisation had zero envelopes. **There is no code path to move an
envelope between teams.** Anything similar must happen before the first send.

## 2026-09-11: an anonymous admin hole, an election nobody could make, and the twins

### #160 — every admin page was readable by anyone, and our own pages happened to dodge it

**A-01, critical, live in the deployed build.** Documenso puts the admin
authorization check in exactly one place — the admin **layout** loader. Under
React Router 7 single-fetch, a request for

```
/admin/<page>.data?_routes=routes/_authenticated+/admin+/<page>
```

runs **only that leaf route's loader and skips every ancestor**, so the layout's
check never executes. **Eight upstream admin leaf loaders returned their data to
anyone, unauthenticated, with no signup, password or token.** The worst is
`documents.$id` — full envelope detail including recipients, fields, signatures
and **signing tokens**, across both tenants; `site-settings` leaked the CAPTCHA
secret in plaintext; `users._index` every user's email and role.

**The fork's own admin pages were already safe** — `mca`, `mca-library` and
`lease-library` self-gate with `isAdmin`. That is luck, not design: an upstream
weakness our overlay pages happened to dodge.

Closed by `requireAdminLoader` (owned) plus overlay **073**, one guard line in
each of the eight. **404, not 403 or a redirect**, so it does not confirm the
route exists.

### #161 — the §83.595(4) election could not be made, and a green test said it could

The two statutory options printed as the literal characters `[ ]`. No field, no
widget, nothing clickable. On the addendum's own terms — *"If neither is marked,
no early termination fee is agreed"* — **the landlord lost the liquidated-damages
remedy by default, on every lease, silently.** On the first real lease that is
$13,800.

**`election-form.test.ts` had a case called "gives the tenant something to mark".
It asserted two `[ ]` literals in the clause TEXT and passed for as long as they
were there.** A bracket is a typographic character, not a field. The test pinned
the *appearance* of an election rather than the existence of one.

> **A green test pinning the wrong thing is worse than no test** — it answers a
> question nobody asked, convincingly.

Found by **opening the rendered addendum and asking what a signer would click**,
which is the same way the counsel-surface defects were found the day before.
`CHECKBOX` rather than `RADIO` because a Documenso radio cannot be expressed as a
placeholder, and §83.595(4)'s own statutory form has two boxes.

### #163 — the twins stopped undoing the FRPA in the same envelope

A merchant signs five of the six instruments. §4.3 of the Equipment Lease and
Subscription guaranties — **signed by a natural person** — said service was
effective *"upon such mailing… irrespective of whether a signed certified mail
return receipt is returned"*, next to a waiver acknowledging the cost of
litigating may exceed the amount at stake. Beside it, exclusive Pasco County
venue, a jury waiver, a class waiver, a one-sided one-year limitation, and the
nonreliance representation FRPA §7.22 had just deleted.

**Those are the four defects §§7.5, 7.10, 7.11 and 7.19 were rewritten to
remove**, re-imposed on the same person by the documents next to the one we
fixed. Neither adversarial review nor the counsel memo read them in this role.

**A REVIEW-02 fix was deliberately not followed**: *"Conform 4.3 to FRPA 7.12"* —
which is the v4 text the FRPA rewrite had deleted as the defect.

**No divergence was declared in `twins.ts`, and that is the result.** All five
sections are vocabulary-neutral so the bodies are identical; declaring one
divergent would have let `twins.test.ts` pass with **one** document fixed.

### #162 and #164 — the two-question model, and the decisions that needed making

[ADR 0014](adr/0014-two-questions-every-clause-answers.md): every clause records
**why it is here** (`compelled` / `implements` / `discretionary`, ported from the
lease library and rendered to counsel) and **whether the funder chooses**
(`offered` naming the fact, or `fixed` with a required note). The four `fixed`
reasons are the ones the rewrite produced — misattributed, no-alternative,
unwritable, load-bearing — so the six refused gates stop being prose scattered
through the corpus.

**Decision 3 is a correction of the drafting session.** It proposed a third test,
*"is Pacta willing to sell both options?"*, and the owner rejected it: *"we are
not selling options, we are a SaaS provider."* The codebase already said so —
`governance.yml` bans `you should` / `we recommend` from user-facing strings.

**Counsel stopped seeing the findings**, which ADR 0012 decided on 2026-09-10 and
nobody implemented. `outstandingFindings` is removed from the payload rather than
hidden. #164 then authored the full-performance guaranty, an arbitration clause
and §7.19's two-year period — all previously named gaps.

### The §6.1 pair did not reach main, and the PR says MERGED

**#165's base was `feat/mca-full-recourse-and-arbitration`, not `main`.** The base
was merged to main first, then #165 was merged into that branch — by then already
landed. **Its commits went nowhere, and the PR shows green and closed.** Caught
by `git merge-base --is-ancestor` in post-merge verification; nothing else would
have. **#166 recovers it**, carrying the same delta with no content change.

> Landing a stacked PR's base first is **not sufficient**. A stacked PR whose
> `baseRefName` is not the default branch must be retargeted to main after its
> base lands, or merged into its base *before* that base goes to main. Checking
> `baseRefName` on every PR — not body text saying "stacked on" — is the guard.

### #164 and #166 — full recourse, arbitration, and §6.1 becomes a pair

**§§9.4–9.6 got their own records rather than a redraft.** Each has one sentence
that is false under a wide guaranty and is exactly what makes the narrow one
better than market — §9.6 literally tells the signer *"Section 9.2 creates
limited personal or entity liability"*. Redrafting them true-under-both means
deleting them, which strips the `limited-conduct` template of its protections.

**§7.19's gate was misattributed and went.** `disputeResolution` answers *where*
a claim is heard; §7.19 answers *how long there is to bring it*, which is the
same in both forums. **That changed because of the owner's decision**: while the
clause merely disclaimed, its absence under arbitration was a redundancy; the
moment it states an operative two-year period, a gated §7.19 hands the
arbitration template **no period at all**.

**§7.26 points rather than restates.** It fixes no governing law and no court
venue, and a test asserts the set of clauses fixing either is *identical* under
both values of the fact — so a sentence sneaking in later goes red even if it
agrees with §7.5 today. **Va. Code §6.2-2234(B)** was read from the vendored file
and both its sentences are re-matched against those bytes on every run.

**§6.1 is now an exhaustive pair on `guarantyScope`** (#166). It was ungated, so
it was in every template and decided the guaranty from inside Section 6 — a wide
§9.2 was text the document then overrode. The bankruptcy / insolvency /
business-failure carve-out is **word-identical in both records**: a guaranty that
pays when the business simply fails is the strongest single argument that the
transaction was a loan. Under full recourse a guarantor can be reached for a
non-default covenant breach, but **only for §6.2's proportionate relief for
proven direct loss, never the uncollected Purchased Amount.**

### Two merge hazards that cost real time, both now guarded

**A stacked PR's base landing first is not sufficient.** #165 was merged into
`feat/mca-full-recourse-and-arbitration` *after* that branch was already on main.
**Its commits went nowhere and the PR shows green and closed.** Caught only by
`git merge-base --is-ancestor` in post-merge verification. **Check `baseRefName`,
not body text saying "stacked on"** — retarget to main once the base lands.

**Two PRs green alone can be red together, and `main` was red for it.**
`strict_required_status_checks_policy` is `false`, so a branch need not be
current. #163 and #164 edited the same test file on different lines; git merged
them silently and **no CI run ever executed their union**. The casualty was a
count pin at 203 after five records had been added.

**There are FIVE count pins, not four.** `frpa-coverage`, `library`, `surface`
and `a-signature-for-merchant-is-not-a-guaranty` are where you would look — that
fourth was itself found by an agent and reported as one nobody had listed. **The
fifth is buried inside a service-of-process sweep**, which is why three separate
agents searched for "the pinned counts" and three found four. The reasoning is
left in that file so the next reader does not re-derive why a test about service
knows how many clauses exist.

### #168 — the register records one memo rejection

The review register now pins `lombard-contracts`
`58974ca1eead7fb6135ed8378475b8b53d5ecca6`. PR #168 changed only
`fair-market-value-recital-self-refuting` from `open` to `rejected`;
REVIEW-01 now has 30 open and 2 rejected entries, and the library surface
reports 37 outstanding findings. The tests identify both rejected findings
and keep four other memo-mentioned findings from being silently rejected.
A rejected disposition removes a finding's approval hold; it is distinct
from a review's own `refuted` status, whose five entries remain unrecorded.
No cancellation-fee disposition was recorded.

PR #168 also folded the notes from #164 and #166. Their durable content is
already above; the fold of #168's own note does not repeat those folds.

### Owed

**ADR 0012's *"six findings the 2026-09-09 memo refuted"* is wrong**, and ADRs are
append-only so it needs a superseding line. The memo's paragraph is headed
*"Earlier findings that should not be repeated as written"* and names those six
topics accurately — but **one of them refutes a finding.** Two read a document
already fixed, two deny propositions no finding makes, and one rests on a false
premise (*"the missing Permission to Release"*, vendored twice). **It matters
because `rejected` stops blocking approval**: recording all six would have
unblocked five clauses on a misreading.

The source manifest note for
`frpa-4-8-may-impede-a-merchant-complaint-to-a-regulator` still says
"No document change made." PR #168 records that change-note 16 changed the
text under a sibling finding. Correcting that note and deciding the remaining
counsel question are still owed to the source-owning session; no disposition
is changed by this state fold.

The #168 source handoff also identifies sibling `lombard-contracts` PR #13
as the merge needed to put `58974ca` on that repository's main. This Pacta
queue does not perform or certify that sibling merge.

## The day of 2026-09-10: the FRPA was rewritten, and the suite around it was not

**#152.** All **100** FRPA clause records authored, across ten agent runs, each
writing its property as a **failing test before any body existed**. 2476 tests.

The premise, settled in [ADR 0012](adr/0012-the-baseline-document-is-input-not-specification.md):
`Lombard_FRPA_v4` is a rebranded, AI-generated form carrying **254 findings**,
rated by outside counsel on 2026-09-09 at **18 Critical / 52 High** with REPLACE
IN FULL on **93 of 101** clauses, and **never signed by any merchant**. It is
input, not specification. *"If that document were sound there would be no
vertical to build."*

### The finding that outranks the rewrite

**A merchant signs five of the six instruments. Only the FRPA was rewritten.**

`instrumentsFor(LOMBARD_FACTS)` returns all six. The Equipment Lease and
Subscription guaranties — signed by a **natural person** — impose exclusive Pasco
County venue, a jury waiver, a class waiver, a one-sided one-year limitation, the
nonreliance clause §7.22 deletes, and:

> *"upon such mailing, service shall be effective **irrespective of whether a
> signed certified mail return receipt is returned**"*

**Service effective on mailing, receipt irrelevant.** Worse than the v4 §7.12 the
memo rated Critical, and those are the same four defects §§7.5, 7.10, 7.11 and
7.19 were rewritten to remove. They entered Lombard's suite **on 2026-09-10**,
through the `equipment` fact fix. **Neither review nor the counsel memo read them
in this role.** `iso-pra.confidentiality` bars disclosure to any third party with
**no carve-out for a regulator, a court, or the broker's own lawyer**;
`iso-pra.governing-law` mandates arbitration in Pasco County.

Found only because the last cluster stated its property over **every instrument**
rather than the FRPA.

### The Critical, answered on the paper

*Does the product work at all?* `Lombard_Payzli_Split_Funding_Authorization_v2`
has **one signature widget and one date widget, both Seller's, and no processor
acceptance block.** §2.3's duty on Buyer to obtain written acceptance before the
Purchase Date has nowhere on the paper to be discharged, so
`processorSplitAccepted: false` is not a record-keeping gap — **it is what the
form makes inevitable.**

### Six memo premises proved false

The memo is drafting input, not authority. **Four of the six were repeated by the
orchestrator in a cluster brief before an agent checked them.**

| premise | truth |
|---|---|
| §8.2 "the memo contradicts itself on Carry" | The text is marked `DELETE — entire current clause` |
| Permission to Release "is missing" | Vendored twice; eight clauses here. Its §4 sources the FCRA written instructions to a guarantor signature line **the form does not have** |
| Appendix A "fee table not supplied" | A completed nine-row grid. A bank-account change costs **$75 and is also an Event of Default carrying $5,000**, while §2.4 permits it with approval not unreasonably withheld |
| Virginia venue is §6.2-2236(A) | **§6.2-2234(A)**. §6.2-2236 has no subsection (A) and is not about forum. The wrong number was in **four** places in this repo |
| §7.19's "two-year period" | Exists nowhere but the orchestrator's own note |
| §9.1 "no substantive field block is visible" | The block is there. The record's **body** was empty |

### Four routes to guarantor liability, all closed

§9.2's scope; **§7.21**, which made a guarantor indemnify Buyer for *"any act or
omission by any ISO"* — unlimited liability for a broker they never chose, **which
the memo does not raise**; `frpa.execution`'s binding recital; and **§9.1**, where
the execution grid holds one non-repeating block **with no capacity line** while
§9.5 makes *"the persons or entities constituting Guarantors"* jointly liable.

**Every one was found by an assertion stated over the SET. None by reading a
clause.** `«37»` is labelled "Social Security Number" and prints a full SSN into
the body of the agreement; §9.1 now requires a masked identifier and **the form
still renders the full number** — the test asserts the disagreement.

### Three fidelity guards retired, one property gained

`bodies-match-the-document`, `frpa-coverage`'s line-accounting, and
`selectClauses` completeness all asserted fidelity to v4. Replaced by
**cross-reference coherence** across nine funder profiles, which went red on real
defects completeness structurally could not see — §7.1 carving out a §4.15 that
`concurrentPositions: false` had deleted, and §004 citing a deselected §8.2.

**The digest assertion survives all three retirements.**

### The rule that stopped being re-derived

[ADR 0013](adr/0013-a-funder-profile-describes-the-funder.md): **a fact may only
gate a whole clause, and its values must partition the clauses it gates.**
Diagnostic — *if two limbs bind different parties or answer different questions,
the fact is misattributed, not too coarse.*

**Six clusters refused a gate their brief asked for and every refusal was right**
(§4.11, §5.16, §4.3, §4.1, §7.1, §7.5). The last exposed a missing field rather
than a limb problem: **`venueRule`'s funder-state arm cannot be drafted, because
`McaFacts` has no field naming the funder's state.**

### Also landed

**#150** fact coverage, **#151** ADR 0012, **#153** signup hardening, **#154**
lease association and district, **#145–#149** runbook corrections and the first
compaction.

### #155 — the Dependabot alerts, and keeping them patched

`npm audit --omit=dev` **20 → 6** (0 critical). Overlay **072**.

**What actually ships was checked in the running production container, not
assumed.** All six *critical* alerts are `next` RCE advisories, and **`next` is
absent from the Pacta image** — it belongs to `apps/docs` and `apps/openpage-api`,
neither of which is deployed. Upstream had fixed none of the 32: its current
lockfile (v2.18.0) carries the same versions, so waiting for the weekly sync
would not have helped.

**The durability half is the part that is easy to miss.** The weekly sync takes
upstream's lockfile wholesale, so a fix living only in the lockfile is reverted
by the next sync. Direct deps therefore have their ranges raised in
`package.json`; transitive ones use root `overrides`. **`npm` does not apply an
override to a package already in the lockfile**, so the runbook now runs
`npm update qs morgan joi fflate` after `npm install` — simulated both ways, and
without that line four floors regress. `dependency-security-floors.test.ts` reads
the root lockfile and fails if any floor drops, so a sync PR that loses one goes
red instead of shipping.

**Six accepted, with reasons in `ACCEPTED`:** `deepmerge-ts` via `@prisma/config`
(forcing v8 risks breaking `prisma migrate deploy` at container start) and
`ts-deepmerge` via `@anatine/zod-openapi`. **Their Dependabot alerts stay open
until someone dismisses them on GitHub — the owner's call, not done.**

**The npm-audit gate stays advisory**, because `npm audit` cannot allowlist an
accepted advisory and a blocking gate would fail every PR. **The master
`~/github/bizrethink/CLAUDE.md` still describes it as "blocks high+", which is
false** — that file is outside this repo and was not edited. Another instance of
exactly what this compaction is about.

### Settled by #154 — do not re-raise

Two adversarial-review findings on the lease sources were **withdrawn after
being tested against the statutes**, and neither is a defect. They are recorded
here because a withdrawn finding is exactly what gets raised again by the next
reviewer who reads the register and not the reasoning.

- **The deposit clock.** The review said Fla. Stat. **§83.49(3)(a)** runs from
  *termination of the rental agreement*. It does not — *"Upon the vacating of
  the premises for termination of the rental agreement."* **The trigger is
  vacating.** `deposit.return` was already right, and the proposed change would
  have **started the clock before a holdover tenant was out**. Unchanged.
- **The pool alarm.** The review wanted §515.27 restored with an *"all openings /
  85 dB A"* standard. The 2026-09-03 statutory walk had already ruled **chapter
  515 imposes no lease disclosure duty**. `requiredBy: 'Ch. 515'` is correct and
  stays: **`requiredBy` means *implements***, which `why-this-clause.ts` keeps
  deliberately distinct from *compelled*, exactly as `access.entry` implements
  §83.53(2). Unchanged.

**This section exists because the first draft of this fold dropped it**, reducing
#154 to four words in the line above. The two findings above are the single most
re-raisable thing in that note, and compaction is how they would have been lost.

### Still open, and each is the owner's

- **The five unrewritten instruments.** The largest open exposure in the vertical.
- **Is this an arbitration product?** All three SEC-filed market forms pair
  arbitration with a class waiver; this corpus has a bare class waiver and no
  arbitration clause — the weakest of the three positions. Deliberately undrafted.
- **`guarantyScope: 'full-performance'`** — deliberately unauthored; that profile
  assembles an identity grid and two service waivers with no guaranty between them.
- **`settlementBase`** is `net` and **nobody has established which base Lombard
  prices on.** It reaches every state disclosure.
- **The memo characterization needs a superseding ADR.** #168 records the one
  rejection described above; the earlier proposal to reject six findings is
  superseded, and must not be treated as authorization for five more.
- **`examinedBy` over-claims on every rewritten clause.** A third `ReviewId` would
  **not** fix it — the memo read the same old text. What is missing is provenance
  for the *current body*.

## The same day, in the lease vertical: #157 and #158

### A heading printed at a page foot with its body overleaf, in five places

**Found by looking at the rendered pages. Every unit test passed while the
document was doing it**, which is the only way this class of defect is ever
found.

`cfffbd641` bound a heading to its body only where the clause was under **420
characters**, on the reasoning that a long body fills the page under its own
heading anyway. The rendered lease disproved it: `hoa.compliance` is 732
characters, and page 10 ended with **two stacked headings and no body under
either**. A section head could strand itself the same way, because it was emitted
as a sibling of the clauses it introduces.

**Threshold 420 → 800, chosen by measurement.** A sweep of
420/600/700/800/1000/1200/3000 against the real lease; 800 is where orphans reach
zero with the mildest gap. The section head now renders **inside the first
clause's bound unit**, so a break cannot separate a section title from the clause
it introduces.

**Why not simply bind everything — this is the part that will be re-proposed.**
The first attempt raised the threshold to 3,000, reasoning that the white space
is identical either way since a bound clause that does not fit moves whole and
leaves the same gap. **That is wrong for large blocks.** An unbound clause
*splits* across the break and fills the page; a bound one cannot. At 3,000 the
all-caps §83.49 disclosure jumped whole and left **page 5 two-thirds empty** —
trading five orphans for a worse defect.

**Two traps for the next PDF assertion, both of which made the guard pass on
broken code before they were found:**

- **`pdfjs` joins a heading's number and text with ONE space.** The patterns were
  written against `pdftotext -layout`, which pads to column position, so `\s{2,}`
  matched nothing — *including the five real orphans*.
- **Section heads are tracked**, so they reach `pdfjs` letter-spaced —
  `"7 U T I L I T I E S"`.

`regression-tests/heading-orphans.test.ts` asserts no page ends with a heading,
and was verified by reverting the fix: it reports exactly the five real orphans.
**The renderer is the lease vertical's only; MCA has its own path.**

### `sortOrder` does not default to 0 in practice — a correction

An earlier reading of `BizrethinkDocument.sortOrder Int @default(0)` concluded
that uploads land at 0 and always need manual reordering. **It is wrong.**
`attachLeaseDocument` sets `sortOrder: (last?.sortOrder ?? -1) + 1`
(`attach-document.ts:116`), so **an upload appends and the schema default never
applies.**

**The belief came from a grep that missed `server-only/`, and was only disproved
by uploading a file and looking.** Recorded because the same inference is easy to
make again from the schema alone. `governing-document-editor.tsx` does not expose
`sortOrder` though `documents.update` accepts it, so a deliberate reshuffle still
needs a write; gaps are harmless, as `describeDocuments` numbers by position.

### One-offs are committed as what ran

#157 records four guarded `UPDATE`s already applied to production for 29090
Picana Ln, per the convention `2026-09-06-move-picana-to-personal.sql` set: **an
applied migration is committed as a record of what ran, not as something to run
again.** One of the four re-dated a document from 2018-03-26 to 2020-01-31 —
which matters because **the receipt addendum the tenant signs recites that date**,
so a wrong date is a wrong recital in an executed document. Nothing was
destroyed; the archive step set `archivedAt` only.

## The week of 2026-09-07 → 09-09: the MCA clause library was built

**Twenty in-flight notes folded here and deleted**, per the convention in
CLAUDE.md. #145's note stays until it merges. This is synthesis, not
concatenation — several notes list as *open* things a later note settled, and
those are marked below.

### What landed, and what each one was actually for

`#124` Georgia had been "verified" against a **secondary and truncated** capture
of `law.justia.com` — subsection (a)'s definitions were missing, so *"advance
fee"*, the term the broker prohibition turns on, was defined nowhere in what we
held. Its card was indistinguishable from California's. `#137` then gave the
other nine sources a `Publisher:` line, deliberately **not** a `Retrieved from:`
one: the deep links were never recorded and are unrecoverable, and inventing a
URL would be worse than admitting the gap.

`#126` `#128` `#130` `#131` built the corpus, one instrument at a time, and the
census was wrong three times on the way — the Payzli addressee line that was not
a clause, the Subscription Agreement missing entirely, and the FRPA's §6.1/§6.2
limbs. `#133` re-vendored after owner edits and found **eleven clauses never
imported at all**, taking the library from 192 to **204**.

`#129` found `outstandingFindingsFor` reporting **more than twice** the real
backlog: it filtered on `status === 'survived'`, which answers *"was the finding
right?"*, not *"has anybody done anything about it?"* REVIEW-01's manifest holds
205 findings, **166 already `implemented`**. The error ran in the direction that
makes the corpus look worse than it is, which is the direction that gets a
mechanism ignored.

`#132` made the library reachable; `#134` put source strength and reading age on
every conformity card and stopped calling a state *verified* when only our own
digest still matched. `#135` added per-clause approval pinned to a content
fingerprint, and the tokenised counsel link. `#138` parameterised clause bodies
by tenant role, which is what turned a client's paperwork into a product.
`#139` gave counsel a briefing instead of 101 unexplained paragraphs; `#140`
gave them somewhere to write back.

`#141` `#142` `#143` are toolchain: `.node-version` 24 and committed generated
output, the upstream **2.17.0** sync (36 commits, 177 files), and a lockfile
refresh. `#144` is [ADR 0011](adr/0011-the-mca-clause-library-is-a-library.md).

### Settled — do not carry these forward as open

Older notes list all four; each was closed by a later one.

| Was open in | Settled by |
|---|---|
| Where the agreement builder lives | [ADR 0010](adr/0010-agreement-builder-lives-in-pacta.md) — **Pacta assembles**; `lombard-platform` keeps computing the numbers |
| `/admin/mca` summary honesty — the "15 of 15" banner | `#134`. **No state reaches `verified`**, and the page says why |
| Whether `instrument` should be an array | `#130` — singular. Across 204 clauses **not one names a second**; `twins.ts` asserts the two documents' agreement instead of generating it |
| Owner decisions 5 and 6 | Applied in `lombard-contracts/change-notes/18` |

### The lessons that cost something

**A finding attaches to a clause by judgement, never by matching its locus
string.** REVIEW-01's `§A.5` is the shipped v2's **A.4**, because the fix that
review produced deleted a section above it. A string match would have been wrong
exactly where the review had been acted on. The FRPA is the checked exception —
v4 was locked before both reviews — and `FRPA_LOCUS_EXCLUSIONS` pins the seven
numbers that do not resolve so the exception cannot widen.

**Eight REVIEW-01 findings name FRPA §6.5, which does not exist.** It was deleted
outright by that review's own fix. The library would have pointed an attorney at
eight live findings against a section that is gone.

**Two registers drift, so there is one per origin.** Findings from the two
adversarial *document* reviews live in `lombard-contracts` manifests; findings
counsel writes on a review link live in `BizrethinkMcaLibraryFinding`. Both pages
label which origin a finding came from. **REVIEW-02 has no manifest** — its
dispositions are prose — so every one of its findings reads `unrecorded`, and
unknown is counted as outstanding. That is most of the **73 of 204** clauses the
approval gate currently holds.

**An empty clause body was a deliberate choice before it was a defect.** `#128`
records importing §4.1 *Guarantor Information* with an empty body *"because that
is what the document holds — a block of AcroForm widgets under a heading"*, and
files it under **Not done, on purpose**. ADR 0011 reframes the same pattern at
the FRPA's §9.1 as a defect, because an outside reviewer hit it and could not
review the guarantor execution block. Both readings are in the record: the
coverage test asks whether every *line* is in a clause and nobody asked whether
every *clause* has content.

**A guard that cites work the reader cannot reach is a dead end they route
around** — so the approval gate's refusal names the finding ids and the manifest
file to record them in. A guard that names the file is a handoff.

**`outstandingFindingsFor` returned `[]` for a missing register**, making an
unreadable file and a clean clause indistinguishable to the approval gate. It now
takes an availability flag and refuses outright. On the counsel page the same
defect was worse — an absent register rendered as "no findings" to the attorney
acting on it.

### Still open, and each is the owner's

- **Counsel: who, when, budget.** Parked at the owner's request. Does not block
  the build ([ADR 0009](adr/0009-counsel-is-parallel-not-a-gate.md)), and the
  backlog accrues either way.
- **A second tenant's documents do not exist here**, so `#138`'s "checked against
  two real documents" property is available and unexercised. Circular Payments'
  set would exercise it.
- **CT and VA record no retrieval.** Two of eleven sources do (Georgia, Texas);
  the rest name a publisher only. Separately, the memo of 2026-09-09 says
  Connecticut's renewal moved to a **December 31 expiry with November–December
  filing**, while our vendored §36a-865(c) still reads *"by the fifteenth of
  September"*. **One of them is wrong and it has not been resolved.**
- **The five Pacta templates (100, 102, 119–121) have not been republished** since
  the owner edits of `change-notes/18`.
- ~~**No local database**, so the MCA migrations have never been applied
  anywhere and neither `/admin/mca-library` nor the counsel page has ever been
  rendered locally.~~ **CORRECTED 2026-09-10. This was false when written and was
  believed.** The migrations were applied on 2026-09-08 and `/admin/mca-library`
  returns HTTP 200. The owner caught it. Most of this vertical is still verified
  as pure functions and typechecking, which is a standing choice — but *"has
  never been rendered"* was a claim about the world that nobody re-checked.
- **ADR 0011 is decided and unimplemented.** Six phases; 1 and 2 (`kind`,
  `field-group`) close §9.1 and unblock the interview.

## The week of 2026-09-01 → 09-07: the lease product's build finished

**28 in-flight notes folded here and deleted**, per the convention in CLAUDE.md.
This is the settled narrative; the notes were the working record.

### What now exists

A landlord picks a property, answers an interview that asks only what that
state's law supports, and gets a lease assembled from a jurisdiction-split
clause library. A tenant reviews it by token and comments per clause. An
attorney reviews the library by token and records findings that hold a clause
until answered. None of it can reach a third party, by design.

**The jurisdiction architecture, in four PRs.** Approvals carry
`clauseJurisdiction` + `barJurisdiction` and `admissionBlocks` refuses a
mismatch (#89). The library splits `generic` / `US` / `US-FL` / `US-NC` and
`libraryFor()` selects portable ∪ one state (#93). The interview marks fields
per jurisdiction — DERIVED from which clauses consume them, so it
self-maintains (#94) — and the builder reads the property's state (#100).
Made visible in both UIs, with review links scoped per jurisdiction (#111).

**North Carolina proved the architecture, and only half of it** (#114). 17 own
clauses, **zero of the 36 portable ones duplicated** — under flat labelling that
would have been 53 clauses with 36 second copies each needing a second attorney.
But the interview did NOT generalise: the derived marking sees only clause
variables, so facts, money fields and teaching prose are invisible to it and
four questions are dead in NC. And `RulePack`'s *type* is Florida-shaped, so an
NC lease is still numerically validated against Florida's limits. Pinned in
`interview-florida-leak.test.ts`; the rule packs are unfixed and block sending an
NC lease.

**Counsel review became possible** (#103, #107). The counsel page was 145 lines,
one query, zero mutations — an attorney could read 64 clauses and say nothing.
Findings now record through the token and **block approval** until answered.

**The clause library moved to `/admin/lease-library`** (#99) and is labelled
"Lease Clauses" (#116) — it is instance content, not a customer's, and
`clauseLibrary.list` proved it by ignoring `organisationId` for data entirely.
Leases reached the main nav (#117, overlay 069), gated by a READ of
`canAccessLeaseBuilder` rather than a copy of the rule, so the nav cannot
disagree with the route's 404.

### Two production defects found and fixed

**A cross-tenant write.** `answerFinding` keyed its update on a caller-supplied
`findingId`; `assertAccess` proved only that the caller belonged to the
organisation they NAMED. Any authenticated user could answer another tenant's
finding — 39 organisations, 35 distinct owners in production. Now `updateMany`
scoped by `review.organisationId`.

**An invisible footer on every lease PDF ever produced.** See the react-pdf entry
under Watch out for.

### The pilot lease was in the wrong organisation

29090 Picana Ln is personal; the lease names four natural persons and the
company appears nowhere in it. Moved to `org_nkzrmhochvhmbwnt` / team `prabhat`
by `scripts/one-off/2026-09-06-move-picana-to-personal.sql`. **Four things had to
move, not two:** `BizrethinkDocument` carries its OWN `organisationId` and the
document procedures authorize on that column alone, so 15 HOA files would have
stayed the company's — invisibly, since a member of both organisations sees no
difference. And `BizrethinkLeaseMatter.teamId` goes straight into
`createEnvelope`, so moving only the organisation would have filed the signed
envelope back inside the company. Safe **only** because nothing was signed:
there is no code path to move an envelope between teams.

### The pattern that cost the most time

**Shipping a mechanism with no caller, and describing it as working.** It
happened three times in one week, by three different sessions:

- `interviewFor` (#94) — the jurisdiction-aware interview, called from nowhere
  until #100.
- `findingsBlock` (#103) — "a finding holds the clause until answered", written
  in four places, true in none until #107.
- `clauseJurisdiction` / `barJurisdiction` (#89) — written by a migration and
  read by nothing until #111.

Each passed CI. Each read as finished. **A test that the mechanism exists is not
a test that anything calls it** — the guards that now exist assert the wiring,
not the function.

The sibling failure is **a fix that is right for a reason that is wrong**: a
comment citing Tex. Fin. Code §398.051(a)(9)–(a)(10) where the duplication is at
(a)(8)–(a)(9). Nothing fails; the next reader inherits a false statement about a
statute. Same class as `STATE.md` carrying "52 clauses" for weeks — a Picana
render count used as the library size.


## Blocked

- **AGPL §13 needs an attorney's eye, and it is not a CI question.** Raised
  2026-08-31 while diagnosing the runner; it turned out to be orthogonal to it
  and more urgent.

  ADR 0003 line 29 and `CLAUDE.md` both record the obligation as *"dormant
  while we do not distribute modified versions"*. That is
  **distribution-triggered reasoning**, which is GPL's test. **AGPL §13 is
  triggered by remote network interaction** and requires Corresponding Source
  to be offered *prominently, from the running program, to the users
  interacting with it*.

  **What is true of the deployed app, verified:** no source-offer link renders
  anywhere a signer goes. Overlay 056 deliberately removed the one
  "Built on the Documenso open-source core" sentence, reasoning that the
  attribution "still lives in the marketing site's About + Security pages" —
  but that is `internal-bizrethink-pacta-web` (pacta.ink), a **separate
  property signers never visit**. The signing routes under `_recipient+`
  render no footer at all.

  **Repo visibility is not the lever.** A public repo signers were never
  pointed to does not discharge §13, and source can be offered while the repo
  is private. So the runner's public-repo decision does not turn on this.

  **Scale:** 118 distinct signer emails, 729 recipients, 468 envelopes.

  Two questions genuinely for the attorney, not for us: whether the deployed
  build is "modified" in the copyright sense, and whether signers count as
  users interacting remotely. If both hold, the obligation is live now.

  **The remedy is NOT simply "add a link", and I recorded that wrongly first
  time.** Two things make it bigger:

  - A link is only cheap **while the repo stays public**. Under the private-repo
    option it would 404 for exactly the 118 people it is owed to, and §13 asks
    for source offered "through some standard or customary means of
    facilitating copying" — so going private would need a separate mechanism: a
    public mirror of the deployed source, or a tarball endpoint served by the
    app.
  - **Corresponding Source must match the RUNNING build.** A link to a repo
    that drifts from what is deployed is not Corresponding Source, so whatever
    the mechanism it has to track releases. That is a small ongoing obligation,
    not a one-time change.

  **Therefore the ordering matters: ask the attorney BEFORE committing to the
  private-repo move**, because the answer changes the work. It does not change
  which runner option is safest — private still wins on security — only the
  sequence.

## Blocked

- **Lease builder cannot reach a third party** until a Florida attorney reviews
  the clause library. That is deliberate and enforced in code, not by memory.
  **64 clauses** — 58 `attorney-drafted, author: null`, meaning drafted by a
  language model and reviewed by nobody, and 6 transcribed statutory text. Zero
  approvals exist in production, so nothing in the library is reviewed.

  *(Corrected 2026-09-07, verified against `FL_LIBRARY` and a read-only prod
  query. The file had said 52 for weeks. **52 is the number of clauses that
  RENDER for the Picana matter** — one property, one set of answers — and it had
  been copied into three places as though it were the size of the library. A
  count that depends on a matter is not a fact about the library, and the two
  drifted apart the moment a clause was added that Picana does not select.)* `reviewedBy`, `verbatimVerifiedAt` and
  the `assertPublishable` guard all exist and are all currently set by nobody;
  the planned review loop writes into them.

  **The attorney is the critical path, not a background task.** Library review
  is a professional engagement with counsel retained for it. The mechanism is
  built and waiting, and as of 2026-09-06 actually wired: `/admin/lease-library`
  mints a review link, counsel records findings against individual clauses,
  `approve` refuses while one is outstanding, and staff answer them on the same
  admin page. It was inert until then — see *The finding mechanism was built and
  never plugged in* below.

  *(An earlier version of this entry named a specific person and worked through
  a conflict analysis. That was a passing thought that got written down as
  though it were a decision, and it was never one. Removed 2026-09-06 rather
  than corrected, because a file people trust for "where things stand" should
  not carry speculation in the same voice as fact.)*
- **No local development database.** Ports 5432 and 54320 are both closed and the
  only credential on the machine is `PACTA_PROD_DATABASE_URL`. Every Prisma query
  in `packages/bizrethink/server-only/` is unit-tested and has **never executed
  against a real Postgres**.
- ~~**`npm test` cannot run on the workstation.**~~ **RESOLVED 2026-09-09.**
  The workstation is on Node 24.20.0 — Homebrew's Node 26 uninstalled and
  `node@24` linked in its place — and the full suite runs locally again. CI takes
  `v24.x` from `.github/actions/node-install`'s default, so both are on 24 and
  the inversion is over.

  Three things this bullet asserted were wrong even while it was true in
  substance, and each is the same failure: **asserting a version without opening
  the file that decides it.** It is `fs.rmdirSync`, not `fs.rm`
  (`zod-prisma-types/dist/classes/directoryHelper.js:25`); the removal lands
  **after 24**, not at 26 — measured here, 24.20.0 succeeds with a `DEP0147`
  warning and 26.0.0 throws; and CI was on **24**, not 22, from the moment the
  composite action's default moved. An external survey reading `node-version:`
  out of the workflow files reported "pacta CI runs Node 20" and had to retract
  it, for the same reason: the version lives in a composite action's `default:`
  that no caller overrides.

  **Still unguarded:** `engines.node` is `">=24.0.0"`, an open upper bound that
  admits the versions where this breaks. `.node-version` (24) is what actually
  pins it, and only for tools that read it.

## Decisions taken

Reasoning lives in [`adr/`](adr/); this is the index of what is settled.

- **Additive fork, not a hard fork** — [ADR 0002](adr/0002-additive-fork-over-hard-fork.md)
- **Documenso, not DocuSeal** — [ADR 0003](adr/0003-documenso-over-docuseal.md). Five working days were lost to the wrong premise; the lesson is in the ADR.
- **Instance config in the database, never Coolify env vars** — [ADR 0004](adr/0004-db-backed-instance-config.md)
- **Coolify + Docker, auto-deploy from `main`** — [ADR 0005](adr/0005-coolify-hosting.md)
- **npm, not pnpm** — [ADR 0006](adr/0006-npm-over-pnpm.md), a deliberate deviation from the house standard
- **AATL trust via DigiCert + GCP Cloud HSM** — [ADR 0007](adr/0007-aatl-via-digicert-gcp-hsm.md). Confirmed still live 2026-08-29.
- **Pacta is a product brand, not a legal entity.** No DBA filing; the Stripe statement descriptor `PACTA*BIZRETHINK` solves the customer-facing need.
- **`main` allows merge commits.** `required_linear_history` is off on purpose — squash or rebase would destroy upstream-sync ancestry.

## Next

Sequenced 2026-08-29 as four tranches. A, and the sending work that had to
precede it, are in flight as #26 and #27.

1. **Land #26 and #27.**
2. **The review loop — DONE 2026-08-29** (#31, #32). Domain, schema, server
   layer, the reviewer's tokenised route and the landlord's comment panel.
   Attorney comments block the send until dispositioned; tenant comments never
   do; dismissal requires a written reason and is append-only. Outstanding:
   the dismissal reason is not yet written into the ENVELOPE audit trail —
   upstream's audit-log type is a closed Zod enum, so that needs its own
   overlay PR with its own fragility rating. Sending a lease to a lawyer and sending it
   to a tenant are the same mechanism pointed at different people, and the
   platform has **no commenting primitive at all** — `RecipientRole` is
   CC/SIGNER/VIEWER/APPROVER/ASSISTANT and the only channel back from a
   recipient is `rejectionReason`. Decided: attorney comments **block sending
   until dispositioned** (accept / edit / dismiss-with-reason); tenant comments
   **never block**, because a tenant comment is a negotiating position, not a
   defect report; dismissal reasons are written into the **executed document's
   audit trail**, not the matter history, because the envelope log is sealed
   alongside the signed PDF while matter history is mutable.
3. **Library sign-off — BUILT 2026-08-29** (#34). Per-clause approval recorded
   in `BizrethinkClauseApproval` and overriding the code's `status`, because
   the library is TypeScript and a reviewing attorney cannot edit it.

   **The safety property is that an approval LAPSES.** It is pinned to a
   fingerprint of everything a signer reads — body, heading, version, and the
   condition selecting the clause — so editing a clause returns it to
   unapproved rather than silently inheriting sign-off on words nobody read.
   `sortKey` is deliberately excluded: lapsing over a reordering would train a
   reviewer to re-approve without reading.

   **It records, it does not sign.** The landlord enters the approval under the
   attorney's name and bar number; `approvedByUserId` records who typed it, and
   those differing is the honest description. A signature by the attorney is a
   different feature and pretending otherwise would be worse than not having it.

   The four `verbatimRequired: true` statutory clauses get a distinct prompt:
   approving them confirms the wording matches the statute as published, which
   is what `verbatimVerifiedAt: null` has been recording the absence of.

   **Still needs an actual attorney.** The mechanism is built; nobody has
   approved anything.
4. **Guardrails — BUILT 2026-08-29** (#35). Non-waivable-area scan over the
   seven areas Florida reserves (§83.47 waiver and liability, §83.67 utilities,
   access and removal, §83.51(1) building codes, §83.682(5) servicemember) plus
   answer-contradiction checks on pets and the monthly-rent figure.

   **Two tiers, and the distinction is the design.** Explicit waiver formulas
   block; subject-matter proximity only warns — a clause that RESTATES a
   protection must not be blocked for mentioning what the statute governs, or
   people learn to ignore the mechanism. A negation before a match flips it:
   "Tenant does not waive any rights" warns, while "Landlord shall not be
   liable", whose *not* is part of the waiver formula itself, blocks.

   It reports the statute and the exact words matched, and stops. **A regex is
   not entitled to a verdict on a specific provision.**

   **AI clause drafting — BUILT 2026-08-30** (#40). Vertex confirmed as the
   right provider for this app (Claude is the fallback), so no Anthropic
   provider was added.

   Describe a term in plain English, get a clause back to edit. **It proposes
   into the editor and never inserts** — the draft is appended as an ordinary
   customer-authored clause and goes through the same guardrails as a typed
   one. The output shape has nowhere to put a verdict (no `enforceable`, no
   severity; unknown keys are dropped), and prose stating a legal conclusion
   about its own clause is REJECTED rather than shown, with a message saying
   why so the landlord can rephrase.

   **No SDK.** A `fetch` against the documented REST endpoint: a dependency
   lands in upstream's lockfile and must be reconciled every weekly sync,
   which is a recurring cost for one POST.

   **The AI config was simplified to a provider and a key.** It had asked for a
   GCP project ID, a location AND an API key — credentials for two different
   products at once, since the Gemini API takes a key alone while Vertex proper
   needs a service account. At least two fields could never have been
   load-bearing, and none were: the model was **forward scaffolding added
   2026-05-01** for an upstream AI feature that never shipped, and its own
   commit says "NO upstream consumer reads these vars yet". Nothing read it
   until the clause drafter. Gemini and Anthropic are both supported, Claude
   being the house fallback. `/admin/ai` now has a **Save and test connection**
   button, which every other instance-config page already had.

   **The lesson:** scaffolding built against a guess about someone else's
   roadmap sat unused for four months and shaped a UI around the wrong
   product. YAGNI applies to config schemas too.

   **Not configured in production.** `BizrethinkInstanceAiConfig` has no row at
   all; the feature fails closed and says so, pointing at `/admin/ai`.
5. **Deferred:** paid property data. Blocked on a spending decision and worth
   six manual questions per property until then — see *Property data* below.
6. Close the remaining documentation lie (`scripts/apply-overlays.sh`).

## Watch out for

### react-pdf compounds `lineHeight` once per page — and `patches/` is how that is held shut

Every lease PDF over ~13 pages died with `unsupported number:
-2.2127632876551446e+22`. That value is exactly `Math.fround(1.5 * 11 * 7 ** 25)`:
`lineHeight` is the only non-idempotent style handler, a unitless ratio resolves
by multiplying by `fontSize`, and `@react-pdf/layout` re-runs the resolver on the
already-resolved tree ONCE PER PAGE, so it grows as `fontSize ^ pageCount` until
it passes pdfkit's 1e21 ceiling.

**The variable is PAGES, not content.** 13 rendered, 14 crashed. Hours went into
clause length and an orphan-control character threshold — both dead ends, because
both left the document at 14 pages. It also explains the file's folklore about
six of eight typefaces "crashing react-pdf": wider metrics, more pages, over the
ceiling.

It also fixed a live bug nobody knew about: **every lease PDF shipped before
2026-09-06 had an invisible footer on every page**, its translate degrading to
-4.5e20 by page 13.

Held by `patches/@react-pdf+layout+5.2.0.patch`, applied by `postinstall`.
**The filename pins an exact version**, so a dependency bump silently drops it.
`UPSTREAM.md` now has a `patches/` section; the guard is
`packages/bizrethink/regression-tests/react-pdf-lineheight-compounding.test.ts`.
Upstream, current in 4.9.0: https://github.com/diegomura/react-pdf/issues/3277

### Overlay numbers are a shared namespace

Two sessions independently claimed 069 on 2026-09-07. Different files, no
functional conflict — but overlay numbers are how `UPSTREAM.md` says what to
re-apply after a merge. Renumbered to 070. **Check `ls overlays/` before
claiming a number**, especially when more than one session is working.

**This repo's characteristic failure is silence, not breakage.** Everything below
passed, or appeared to:

- **STATE.md union-merges, and that has a silent failure mode.**
  `.gitattributes` sets `docs/STATE.md merge=union`, because the governance
  guard requires this file on every PR and concurrent branches therefore
  collided by construction — three times on 2026-08-31, always two different
  sections at the same anchor with nothing actually in dispute.

  Union merge keeps BOTH sides of a conflicting region and leaves **no marker**.
  For added sections and bullets that is exactly right. For a CORRECTED entry it
  is not: if one branch fixes an entry while another touches the same lines, you
  silently keep the fix *and* the thing it corrected, sitting next to each
  other. Several entries here were corrected rather than appended on
  2026-08-31, including one that reversed its own recommendation.

  **So after any merge touching this file, read the result.** A section
  appearing twice, or an entry contradicting the one below it, is union merge
  and needs a human. The conflict-proof alternative — one note file per change
  under `docs/notes/` — was considered and passed over for the one-liner.
- **Do NOT stack pull requests in this repo.** It has now lost work twice, the
  same way both times. A PR whose base is another branch merges into THAT
  branch, and if the base PR merges into `main` first at an earlier commit, the
  stacked PR's content is stranded on a branch whose PR reads MERGED. It looks
  like success from every angle: both PRs green, both marked merged, nothing
  red anywhere — and the code is simply not on `main`. Cost: five commits in
  #26/#27 (recovered in #28) and all of #32 (recovered in #33). **Sequential
  PRs to `main` only.** With auto-merge on and a 20-minute gate there is no
  longer a reason to stack. Always verify a merge landed by checking the FILE
  on `main`, never by trusting the PR's MERGED badge.
- **CI runs on the homelab. TWO GATES HAD TO BE OPEN, and only one is
  obvious.** `ci-runner-01` (Proxmox VM 102, `10.10.10.41`, 8 cores, org-level
  for BizRethinkAI and lombardpay, outbound-only) gives 4 Playwright workers
  where a 2-core `ubuntu-latest` gave 1.

  It hung for an hour on the runner group's **`allows_public_repositories`**,
  which is `false` by default on every group GitHub creates and is a SEPARATE
  gate from `visibility: all` despite reading like a synonym. This repo is
  public, so it matched the label, found no eligible runner, and queued
  forever.

  What makes opening that safe is the second gate: the repo's fork-PR policy is
  now **`all_external_contributors`**, so an outside PR executes nothing here
  without explicit approval. **Do not loosen it** — the runner sits on the LAN
  with docker-group access, on the same Proxmox node as the production Coolify
  control plane. Chosen over making the repo private, which would have dragged
  in the AGPL §13 question below.

  **`matrix: [1]` is the END STATE, not a step down.** One instance processes
  ONE job at a time, and extra instances share the same 8 cores — they add
  concurrency, not CPU, so two parallel shards would get 2 workers each rather
  than 4. Real shard parallelism needs a **second runner VM**. Never raise the
  matrix without adding hardware first.

- **Two CI experiments that produced nothing, both worth not repeating.**
  Building once and sharing across 8 shards removed 25 min of duplicated
  compute and moved wall clock **0.1 min** — the build simply moved from inside
  the shards to in front of them. A GitHub 4-core larger runner was
  provisioned, reported `Ready`, and every job sat **queued for 30 minutes**
  with none assigned: larger runners are gated by the Actions **spending
  limit**, which defaults to $0. **Entitlement is not schedulability.**
- **A slow gate gets bypassed, and that is a design failure, not a discipline
  one.** The E2E suite took ~50 minutes of wall clock on every PR, which on a
  solo-maintained repo means it does not get waited for. PRs #26 and #27 were
  merged mid-flight for exactly this reason and **five commits were lost** —
  the governance fix, the statutory-notice fix, the STATE update and all of
  Tranche A — because #26 merged at its first commit and the PRs then closed.
  Recovered in #28. Two fixes landed 2026-08-29: repo-level **auto-merge is now
  enabled**, so `gh pr merge <n> --auto --merge` merges a PR the moment it goes
  green with nobody watching; and the suite is **8 shards instead of 4**.
  Sharding is balanced by test COUNT, not duration, and specs are distributed
  in sorted order — so the slow browser flows in the back half of the alphabet
  all landed on shards 3 and 4 (31 min) while 1 and 2 finished in 10.
- **A `cancelled` E2E job is not a pass.** It reports neither. The gate has gone
  dark twice this way — the warp runner, then the 60-minute cap. Guards now pin
  the runner, the cap (≥90 min) and `TURBO_LOG_ORDER: stream`, because without
  streaming turbo buffers output and discards it on kill, making "slow" and
  "hung" indistinguishable.
- **Upstream syncs drop features silently.** The 2026-08-13 audit found three
  (admin org-delete, signing-page branding, signup flags). Nothing was red.
- **A free-text answer prints exactly as typed.** The occupancy clause read
  "The following people are authorised to occupy the Premises:
  {{authorisedOccupants}}". A real answer was "daughters and father" — which
  identifies nobody, and, because the clause listed only that field, left the
  SIGNING TENANT off the list of people allowed to live in their own home. The
  question said "who is authorised to occupy it" and the load-bearing word,
  *named*, sat mid-sentence in the help. Fixed in #41: the tenants are named
  automatically from the party list, naming anyone else is optional, and there
  are two clause variants so a household with nobody extra does not print
  "together with ." **Where the SHAPE of a free-text answer matters, show an
  example in the control — a label alone did not carry it.**
- **Asking twice for the same fact hid a correctness bug.** The interview asked
  `landlordNoticeEmail` and `tenantNoticeEmail` by hand, after the same
  addresses had been entered against each signer. The redundancy was the
  visible symptom; the real defect was that §83.505 requires a valid email
  address for EACH party, and one singular `tenantNoticeEmail` cannot represent
  two tenants — the addendum named one and the second had elected nothing, and
  it rendered perfectly because one field had one value. Now derived from the
  party list, which already holds one address per person and refuses two people
  sharing one. Fixed in #39. **When a form asks for something it already
  knows, check whether the duplicate can even represent the real answer.**
- **A clean merge can silently revert a feature.** Resolving #38 against #37:
  both touched `interview/steps.ts`, #38 having MOVED two fields that #37 then
  edited in place. Git resolved it by keeping #38's moved copy — which was the
  older text, so `address: true` quietly vanished and the address lookup on
  that field stopped existing. Nothing conflicted, nothing was red, 523 tests
  still passed. **After resolving a conflict, check that the other side's
  change is still present, not just that the file compiles.**
- **A failed query must never blank a page.** The review step returned `null`
  whenever validation produced no data, which removed the findings, the
  "send for review" panel and the Send button together, with no explanation.
  Sending a lease to a lawyer is exactly what you would do when something is
  wrong with it, so that path cannot be gated on the checks succeeding. Fixed
  in #37.
- **A one-sided bound is a bound that is missing.** Found in production
  2026-08-29: the only real matter carried `depositReturnDays: -124`. Every
  statutory check in `validate.ts` compared in one direction only
  (`returnDays > 15`), so a negative sailed through and the lease would have
  told a tenant their deposit is returned within minus 124 days, with nothing
  objecting. `graceDays` and `monthlyUsd` had no check at all. The fix is not
  more `if`s — bounds now live in a `COHERENCE_CHECKS` table, and a test
  enumerates the numeric leaves of a real answer set and fails when one is
  missing from it. Fixed in #36.
- **Green tests do not mean complete code.** On 2026-08-28 a clause module was
  imported and never added to the library array: seven clauses missing from every
  lease, 286 tests still green, `noUnusedLocals` off so nothing complained.
- **vitest strips types without checking them.** A fixture missing required
  fields passes green while feeding `undefined` into every predicate. Run
  `npm run typecheck:lease --workspace=@bizrethink/customizations`.
- **Four BizRethink admin pages live in upstream's `admin+/` directory** —
  `ai`, `signing`, `storage`, `sso-providers`. Each was added by its own
  overlay-phase commit and none exists upstream; they sit there because that is
  where the admin layout and nav are. All four are declared in
  `overlays/BIZRETHINK-OWNED.txt`, one by one rather than as a glob, because
  that directory is overwhelmingly upstream's and a wildcard would exempt
  twenty of their files to cover four of ours.
- **A permanently-red guard hides every guard behind it.** The `Governance`
  workflow's fork-discipline check decided "is this upstream?" by path, so it
  failed on **every** lease-builder PR — #21, #23, #24, #25 and both open ones —
  and each was merged over the failure. Remix resolves routes by filename, so a
  route we write *must* live in `apps/remix/app/routes/`; those files were never
  upstream. Fixed 2026-08-29 by declaring ownership in
  `overlays/BIZRETHINK-OWNED.txt`. Two further real failures were sitting behind
  it, invisible, because `bash -e` stops a job at the first failing step: the
  advice-language guard (the §83.49(3)(a) notice quotes statutory wording the
  guard bans) and this very STATE.md check. **Never merge over a red guard —
  fix it or delete it.**
- **The first version of that fix was itself wrong.** Converting a glob to a
  POSIX regex in `sed` needs a bracket expression containing `]`, which sed
  misparsed; the result exempted only half the declared paths and would have
  silently hidden real upstream edits. A filter that over-exempts is worse than
  the bug it fixes. It is Python now, and verified against adversarial
  near-misses (`lease-something.tsx`, `lease/nested/deep.tsx`).
- **Two documented controls do not exist.** The master `CLAUDE.md` cites a
  `security.yml` npm-audit gate blocking high-severity findings, and
  `scripts/apply-overlays.sh`. Neither is in the repo. `security.yml` is added by
  this PR; the `apply-overlays.sh` claim still needs resolving.
- **System service accounts are load-bearing.** `deleted-account@` and
  `serviceaccount@sign.bizrethink.ai` look like scaffolding. They are the
  orphan-envelope receiver and the impersonation block. Hiding them in the admin
  UI is fine. Deleting them breaks user deletion and risks loss of signed
  contracts.

## Open threads

### Sixty-three clauses were labelled Florida; twenty-seven of them are

Every clause said `jurisdiction: 'US-FL'` except the lead-paint disclosure.
Measured against the only question that matters — *would this text still be true
in another state?* — the split is **35 generic, 1 federal, 28 Florida**.

Adding North Carolina under the old labelling would have duplicated those 35 per
state: a second `general.severability`, a second set of house rules, a second
`pets.addendum`. Each copy would then have needed approving separately, by an
attorney in each state, for text that turns on no state's law.

**The classification is a pinned slug→jurisdiction map, not a pattern** — the
same technique as `library-invariants`, and for the same reason: a pattern gets
widened by whoever it inconveniences, and one already was. Adding a clause now
forces an edit to the pin, which forces someone to answer the question.

**Nothing an approval pins to moved.** The diff is 35 changed lines, every one a
`jurisdiction` value; no slug, body, heading or version changed. Verified by
filtering the diff.

**Except that it did, and this is why the sequencing mattered.**
`clauseFingerprint` includes `jurisdiction`, so reclassifying lapses the
approval on every clause it touches. There are zero approvals recorded, so the
cost today is nothing. Done after counsel signs the Florida baseline, it would
have silently lapsed thirty-five of them.

Files have not moved yet. The guard is what makes that safe, so it goes first.
### A delegated field read as a broken template to the person being asked

The Pet Addendum in the PDF sent to the tenant said:

> Tenant may keep only the following animals at the Premises: `{{permittedPets}}`.

The standing rule that produced that is right and stays: a missing value never
renders as empty, because a gap where a repair threshold belongs reads as a
finished lease with no threshold, while a raw token reads as unfinished and the
send is refused.

**A delegated field is the one case where the reasoning inverts.** The landlord
is never going to answer it — they deliberately handed it to the tenant — and
the tenant is exactly who downloads the PDF. So the token appeared in the
addendum sent to the person being asked about their own pets.

Now `[to be completed by Tenant]`: legible as a blank awaiting an answer, and
impossible to mistake for a term of the lease. **It is still reported missing**,
so the send gate does not move — making it readable must not make the lease look
answerable.

Threaded `matter.delegatedFields → RenderLeaseInput.delegated → buildClauseText
→ interpolateClause`, and verified against the live matter rather than a
fixture.


### An approval recorded a bar number but never which bar

`BizrethinkClauseApproval` captured `approvedByBarNumber` and nothing about the
admission it belonged to. Nothing could have objected to a Florida attorney
approving a North Carolina clause — and with North Carolina chosen as the second
state, that stops being hypothetical.

**Done first because there are zero approvals recorded.** Today it is two
nullable columns; after counsel signs anything it is a migration with rows to
backfill and no source for the missing values.

`admissionBlocks(clauseJurisdiction, barJurisdiction)` returns a sentence rather
than a boolean, because the caller shows it to whoever is recording the approval
and a guard that says only "blocked" is one people route around. Checked before
the fingerprint: an admission mismatch is a fact about the person, so reloading
will not fix it and saying so first is the more useful order.

Both jurisdictions are STORED, not derived. A clause's jurisdiction can move in
a later library version; the row records what was true when the attorney signed
off.

**The generic tier is treated permissively and provisionally.** Federal and
generic clauses depend on no single state's law, so any US admission covers
them. That reading is in the counsel brief as an open question; if the answer is
no it changes in one function.

This is step 1 of the lease product plan, and the first thing on the critical
path to a second state.


### Four clauses said things Florida does not permit, and one certified itself

Two independent adversarial reviews of the Picana lease. Every finding was
checked against the statute text before being accepted — **one was rejected on
that check**, which is why the new tests pin what the statute says rather than
what a reviewer said about it.

- **`general.waiver`** said acceptance of a payment with knowledge of a breach
  is not a waiver. §83.56(5) says the opposite: accepting rent with actual
  knowledge WAIVES the right to terminate or sue for that noncompliance, and
  §83.47(1)(a) voids a term purporting to waive what the part confers.
- **`access.entry`** let the landlord show the premises to an "insurer".
  §83.53(1)'s list is closed — purchasers, mortgagees, tenants, workers,
  contractors. Checked; "insurer" is not in it.
- **`deposit.held`** named the institution and the interest status: two of the
  three things §83.49(1)(a) requires. The account must also be SEPARATE and not
  commingled.
- **`deposit.advance-rent`** never said where the advance rent sits. §83.49(1)
  opens *"as security for performance of the rental agreement **or as advance
  rent**"* — both are held the same way.

**And the one that was ours to be embarrassed by.** `hoa.lease-requirements`
read *"require this Lease to include the following, **and it does**"*. On the
real lease that list included "the entire Lot and the associated garage" and
"no more than two parking spaces", and **neither appeared anywhere else in the
document**. The lease certified compliance it did not deliver, on the one
document an association manager reads against the declaration.

"and it does" is a claim about every other clause, which no single clause can
see. The requirements are now agreed AS TERMS, so the lease contains them by
construction rather than by assertion.

**Rejected:** a review claimed §83.49(3)(a) runs from "termination of the rental
agreement". It keys on vacating, and the verbatim statutory notice in the lease
itself says "AFTER YOU MOVE OUT". A weaker version of the point survives — our
wording omits the statute's "for termination of the lease" — and is not fixed
here.


### Green tests, dead production: the fonts were never in the container

Every lease PDF returned **500** after the font PR deployed. `ENOENT` on
`/app/apps/remix/build/server/hono/packages/bizrethink/lease/render/fonts/
SourceSans3-Regular.ttf` — a directory that has never existed.

Two things compounded. The bundler rewrites a module's own location to the
**bundle's** directory, so a path resolved beside the renderer pointed into
`build/server/hono/...`. And the runtime image copies only `apps/remix/build`,
tailwind-config, patches and the prisma schema — **`packages/bizrethink` is not
in the container at all**, so no path could have worked.

**The risk was named and then waved away.** The proposal listed "the files must
be present in the Docker image" as a risk; the README I wrote answered it with
"they are inside `packages/`, so they already would". That was an assertion, not
a check, and the Dockerfile disproves it in twenty seconds of reading.

Fonts are now base64 in `font-data.ts`, generated by `scripts/inline-fonts.mjs`.
react-pdf accepts a data URL directly. Bytes travel in the bundle and cannot be
in the wrong place.

**No render test could have caught this**, because what differs between laptop
and container is the filesystem underneath. The guard that can is structural:
`lease-document.ts` must contain no `import.meta.url`, no `readFileSync`, no
`fileURLToPath`. Verified to fail when a path is put back.

The lesson generalises past fonts: a test that renders proves the code works
**here**. Only a test about the code's shape proves it cannot depend on where
"here" is.


### The lease now carries its own typefaces, and six of eight faces crash trying

A standard-14 face is named by the PDF, not carried in it, so every viewer
substitutes its own metrics. A signed lease was therefore not guaranteed to
render as it was signed, and PDF/A rejects such a file — awkward for a platform
doing CAdES signing with long-term validation.

**The compliance risk that blocked this was retired by test, not by argument.**
The Phase 0 note said embedded/subset fonts encode text differently and can
defeat `page.findText()`, which is how `{{SIGNATURE, rN}}` becomes a signature
field. `placeholder-roundtrip.test.ts` passes with the fonts embedded and
subset. That note named the test as the gate; the gate opened.

**Then the renderer refused most of the candidates.** Source Serif 4 — the face
in the approved mockup — crashes with `-2.2127632876551446e+22`, and so do PT
Serif, Spectral, Newsreader, Libre Baskerville and Lora. Only Tinos and EB
Garamond survive. Removing *every* border in `lease-document.ts` does not help,
so the clipBorder theory recorded in that file does not explain this case. The
cause is not understood.

Tinos was taken because it is **metric-compatible with Times**: not one line
break moves, 25 pages before and after, and none of the pagination that file
works to control is disturbed. EB Garamond is the better-looking choice and was
declined — shipping a reflow that works for a reason nobody can name is how a
lease that will not render gets found by a tenant.

So the correctness is banked and the appearance is left alone. **The open
question is bigger than fonts:** six of eight faces break a renderer that works
only because of the exact content it is given. Any future clause edit is the
same experiment.

One loose end: `pdffonts` still shows an unembedded `Helvetica` that no style
here asks for — a react-pdf internal fallback.
### Every new review link was born stale

Mint a fresh token, open it, and the reviewer is told **"the lease has changed
since this link was sent"** before anyone has touched anything.

The answer set is hashed twice: once when a link is ISSUED, and again every time
the reviewer's page asks whether the lease has moved. Both call `hashAnswers`,
and both wrote out the field list **by hand**. When `documents` was added to the
comparison side for the receipt addendum, it was not added to the issue side, so
the two could never match.

The fix is not to add `documents` to the second copy. It is that there is no
second copy — `create` now calls `currentAnswersHash`, and a guard asserts
`hashAnswers` is called exactly once in the router.

**Links minted before this fix stay stale**, because their stored hash was
computed without documents. Revoke and re-issue after deploy.

Also: the "Show N revoked links" disclosure was a bare `<button>`, which is
inline-block, so the parent's `space-y` never applied and it shared a line with
"Send it for review" — overlapping it.


### Orphaned headings, and why `minPresenceAhead` is still unusable

Five clause headings printed alone at a page foot with their body overleaf —
a title above a third of a page of white. `minPresenceAhead` is the idiomatic
fix, and the pagination note in `lease-document.ts` already said it was
unusable.

**It rendered the Picana lease perfectly.** Zero orphans, 25 pages, no
inflation. Then the suite failed: `unsupported number: -2.2127632876551446e+22`
out of pdfkit, on the render-lease and envelope-input fixtures. The existing
note was right, and a sample of one nearly overruled it.

What works instead: bind the heading and its body in one `wrap: false` node —
but ONLY where the clause body is short (≤420 characters). `wrap: false` on a
large node is the same crash, and a bound unit taller than the text area can
never be placed at all. Long clauses keep the old behaviour, which is also
where an orphan matters least, because a long body fills the page under its own
heading.

Clause-level orphans went 5 → 0. Two SECTION heads still orphan; their first
clause is too long to bind, and without `minPresenceAhead` there is no way to
pull a heading forward. Bounded by the renderer, not by effort.

`orphans` and `widows` on `Text` are also inert in this build — set both to 2
and the two single-line carries did not move.
### Revoking is not deleting, and nobody could tell if a link had been opened

Two gaps on the review panel, both visible on the Picana matter: four revoked
duplicate links stacked above the one live one, and no way to know whether the
tenant had ever opened any of them.

**Opened was simply not recorded.** `BizrethinkLeaseReview` had no such column
and the token loader wrote nothing, so a landlord could not distinguish a link
the reviewer had held for a week from one that never arrived. Now
`firstOpenedAt` / `lastOpenedAt` / `openCount`, written by the public `open`
procedure — not awaited into the response and never allowed to fail the read,
because a reviewer must not see an error over a counter.

It says **opened**, never "read". Mail scanners and link previewers fetch links,
and a landlord told the tenant "read" the lease would rely on it. Opened is what
is known.

**Deleting is deliberately narrow.** A revoked row is the record that this
document went to this person on this date, pinned to the answer set as it then
stood — the answer to "you never sent it to me". Comments hang off it too. So
`deletionBlockers` refuses anything that carries evidence: still live, ever
opened, returned, or commented on. What remains is the double-submit duplicate,
which is what a landlord actually wants gone. Every reason is returned at once
rather than one obstacle at a time.

The clutter that deletion does not solve is solved by hiding: revoked rows now
collapse behind "Show 4 revoked links".


### The page count that could not see 155 pages

Counting pages by scanning raw bytes for `/Type /Page` read the 418-page,
54 MB move-in inspection exactly, and four other real PDFs besides. It reported
**nothing** for the Estancia master declaration — 155 pages — because that file
is linearised and its page objects live in **compressed object streams**, where
no such marker survives in the plain bytes.

It failed safe (null, never a wrong number) but on the largest and most
important document in the set, which is the failure mode worth noticing: the
scan works on everything you casually test and misses the optimized file
somebody actually sends you.

`@cantoo/pdf-lib` was already an `apps/remix` dependency, used by the signing
pipeline, and settles it — 155 pages in ~40 ms, the 418-page scan in ~400 ms. So
the cheap scan stays as the fast path and a real parse runs only when it returns
null. The parse lives in the ROUTE, not the documents package, so a package of
pure lease logic does not take on a PDF parser. A parse failure is not an upload
failure: the file still stores and the receipt omits the extent.

**The extent sentence was written twice and the two disagreed** — the addendum
said "1 page", the editor said "1 pages" for the same one-page file. One
`pageLabel` now, used by both.


### Two ways of counting "outstanding", and the field that fell between them

The step rail counts interview fields that are **required and visible**. The
Review page lists `missing` — variables the **selected clauses** could not fill.
Those are different questions, and `conditionObjectionDays` answered them
differently: required on the step, so every lease was badged "1" on step 7
forever; but its clause is only selected once a condition report is attached, so
Review never mentioned it.

A landlord saw a step that would not clear and a Review that never said why. The
fix is to stop asserting it up front — the clause already declares the variable
required, so attaching a report turns a blank window into a blocking finding at
the moment it starts to mattering. Same shape as the delegated pet question,
which is the pattern that already worked.

Worth keeping in mind for any future question that only matters once something
is attached: `required: true` on the step is a claim about EVERY lease, and the
clause's own `variables` is the place to make a claim about the leases where the
clause actually appears.


### Documents a human uploaded, as opposed to documents we generate

Everything in the lease package was assembled from clauses. A recorded
declaration and a photographic condition report are not: they exist before the
lease does, and no amount of drafting produces them. There was no way to attach
a file to anything.

**The constraint that shaped the design.** Upstream's `EnvelopeAttachment` is
`z.enum(['link'])` — a URL, never bytes — so anything inside the signing package
has to be an `EnvelopeItem` the signer scrolls. The real move-in inspection for
29090 Picana Lane is **418 pages and 54.7 MB**; a declaration and its amendments
run to a few hundred more. Putting those in front of a signer buries the lease.

So the envelope gets one generated page naming each document, and the files are
read alongside it. That page is the point, not a consolation: the lease binds the
tenant to the governing documents, and a tenant who was never given them has the
obvious answer.

**What the RentCheck report showed.** Its last page reads *"Inspection reviewed …
Jack Lipstein, Property Manager, Signed on 1/6/2025"*. **The tenant never signed
it.** A condition record attested only by the landlord's own agent is the
landlord's account of the property, and §83.49(3)(a) gives thirty days to claim
against the deposit on the strength of it. The capture was already good; it
stopped one signature short, which is exactly the thing this product does.

**Where each kind hangs, and why it matters.** Governing documents belong to the
PROPERTY — they outlive every tenancy, and next year's lease receipts the same
instruments with nobody re-uploading. A condition report belongs to the MATTER:
hung on the property it would be receipted into every later lease as though the
incoming tenant had agreed the outgoing tenant's scuffs. `assertDocumentPlacement`
refuses the wrong pairing rather than trusting the caller.

**One loader, not a fourth thing to remember.** Utilities are read live from the
property and four call sites had to pass them; one once forgot, and a reviewer
read a lease whose utility clause said "none" on both sides. Documents would have
made that a second field at four sites, so `loadPropertyContext` assembles the
shape and every renderer calls it. The guard test moved with it — it used to
assert each route mentioned `propertyUtilities:`, which caught the original
omission but by spelling, and would have been one field behind from today. It now
asserts the routes call the shared loader and do **not** query the property
themselves.

Documents also feed `currentAnswersHash`: attaching an amendment after a link
went out changes the list the receipt names, and a reviewer who approved the
shorter one approved something else.

**Our own upload route.** `/api/files/upload-pdf` caps at 50 MB — a limit that
exists because those files go through the signing editor, where every page is
rendered for field placement. Chris's report is 54.7 MB, so it would have been
rejected, and raising that ceiling would relax the editor's guard for everyone to
fix a problem the editor does not have. `api+/bizrethink.lease-document.ts` takes
multipart with its own 128 MB limit.

Page counts are read off the file, never typed: the count's whole job on the
receipt is to let a signer confirm the document they opened is the one the page
names, and a typed figure would be the landlord's claim about the file rather
than a fact of it. Verified exact on four real PDFs including the 418-page one.


### A guard was weakened to admit the thing it was built to catch

`library-invariants` required `requiredBy` to cite `Fla. Stat.` or `U.S.C.`. It
rejected two new HOA clauses carrying a Pasco County recording reference. The
response was to **widen the regex** to accept `Instr#` and `OR x/y`, with a
confident comment explaining that a recorded covenant compels too.

The premise was true. The conclusion was wrong: **a covenant compels the OWNER,
not the LIBRARY.** The guard was right and got moved.

That is the failure worth remembering — not the pollution, which was one clause,
but the reflex to treat a red guard as an obstacle rather than a finding.

### What the boundary actually is, and how the library already knew

Every hard-coded figure in the library traces to a statute — 30/60 days from
§83.575, 15 from §83.49(3)(a), 3/7 from §83.56. Exactly one did not: `two`
parking spaces, from one declaration in one community, rendered for every
Florida property with `hasHoa`. `hasHoa` means the property has AN association;
it says nothing about what THAT association demands.

> **The clause library is Florida law, not one property.** Text may be fixed only
> by a statute, a regulation, or a court-approved form. Anything fixed by a
> private instrument is data, and reaches the lease through a variable.

An audit found five violations, four of them mine and one written the same day
the rule was being discussed:

- `hoa.lease-scope` — hard-coded a parking cap, a demised-premises rule ("the
  entire Lot and the associated garage" — a condominium has neither), and the
  assertion "The governing documents require", of every association.
- `hoa.amenity-access` — carried a comment saying *"NOTHING OPERATIONAL IS NAMED
  HERE ON PURPOSE"* while stating one declaration's filing list, its deadline,
  and its suspension of the OWNER's own access. A landlord elsewhere would have
  surrendered an amenity right they still held.
- `maintenance.storm` — ungated, asserting a pool and an association on every
  property.
- `maintenance.pool-split` — hard-coded "at Landlord's cost" with no variable,
  and `pool-safety.test.ts` **pinned** it. `lawn-split` had been refactored away
  from exactly this defect in v2; the pool clause was still v1.
- `maintenance.pool-safety` — told a signed lease the feature was *"required by
  Chapter 515, Florida Statutes"*, a thirty-section chapter cited whole, while
  `why-this-clause.ts` records that Ch. 515 imposes no lease duty at all.

All now variable-driven or gated. The HOA requirements follow the `{{yardDuties}}`
pattern: the landlord reads their own declaration and states what it requires,
and the library supplies the frame.

### Enforcement is a pinned map, not a regex

`requiredBy` is now pinned slug-by-slug. Adding one forces an edit to the pin,
which forces the conversation — and there is no pattern left to widen. A second
tooth rejects any bare quantity in a clause selected only by `hasHoa`, which
catches "two parking spaces" without anyone needing to know where it came from.

Both were verified by reintroducing the exact original violation and watching
them fail.

**The pin found something on its first run.** `deposit.statutory-notice` carried
`citation: §83.49(2)(d)` and `requiredBy: §83.49(3)` — the same subsection error
corrected days earlier, fixed in one field and missed in the other.


### A recorded covenant compels a lease term, and the model did not know it

The Estancia declaration's Ninth Amendment (Instr# 2021271188, OR 10509/675,
recorded 16 Dec 2021) rewrote Article XI §36 (Leases). Three of its
requirements are not advice — §36(b) says every lease **shall** contain them:

```
(b)(ii)   only for the entire Lot and associated garage
(b)(iii)  no more than two parking spaces, INCLUDING the garage
(b)(iv)   the tenant is bound by and subject to ALL of the obligations
          of the Owner under the Declaration
```

Our clause said the tenant "shall comply with" the governing documents, which
is narrower than standing in the owner's shoes. The parking cap appeared
nowhere at all — on a house with a two-car garage that is the entire allowance,
nothing on the driveway, and a tenant would have discovered it from a towing
notice.

**`library-invariants` rejected the new clauses**, because `requiredBy` demanded
`Fla. Stat.` or `U.S.C.` — the model assumed only legislation can compel a lease
term. It cannot. A recorded covenant runs with the land and compels exactly as a
statute does. The invariant was narrower than the world, and now accepts a
recording reference while still refusing a bare assertion.

### Never write the managing agent into a lease

The Community Amenity Guidelines (January 2020) route tenant amenity access
through a New Tenant Profile form filed with **Evergreen Lifestyles Management**
and a **$25** fee. The association is now managed by CMG.

The RULE survived the change of agent — approval is still required. Every
operational detail around it did not: the form's name, the fee, the address, the
email. A lease naming any of them would have been wrong on the day it was signed
and wrong again at the next change of manager.

So `hoa.amenity-access` names none of them, and a test asserts the absence of
"Evergreen", "CMG", "$25" and "New Tenant Profile" specifically. It says what is
durable: approval is the association's, on whatever process they require from
time to time, and it is not guaranteed by the Lease. Who pays the fees is asked
rather than assumed.

**Two gates, not one.** §36(d) also bars a tenant from the common areas until
the landlord has filed the tenant's details and the signed lease — so the
landlord has a deadline (the date of occupancy) whose consequence lands on the
tenant. And §36(e) suspends the landlord's own access for the term; the
Guidelines confirm the cards are actually deactivated.

**The general shape:** when a document tells you a rule and also tells you who
administers it, only the first belongs in a contract.


### The page said what a clause was, never why it was there

The clause library showed `parties.recital · v2 · parties · Unapproved`. True,
and useless — nothing on it distinguished a disclosure Florida compels from a
house rule somebody invented on a Tuesday. A reviewer had no way to know where
to spend an hour.

The provenance was already reaching the page. The router sent `sourceKind`,
`citation`, `verbatimRequired` and `codeStatus`; the page's own type declared
only slug, version, section, heading, body and requiredBy, **so it received all
of it and dropped it**. A display gap, not missing data.

Each clause now says which of three things it is, from the statutory walk:

```
COMPELLED      a statute requires this text in a lease   (6 of 57)
IMPLEMENTS     gives effect to a statute that regulates
               conduct — the statute did not dictate the words
DISCRETIONARY  ours. No statute requires it.
```

Plus how hard the statute prescribes, and whether the text has been read off the
statute book and when. `whyThisClause` lives in the library rather than the UI,
and `fl-mandatory-coverage.test.ts` now reads the same list, so the compelled set
has one source. The version it replaced was assembled from recollection: it
cited §83.49(3) for the all-caps disclosure — that is the claim notice, the
disclosure is (2)(d) — and had never heard of §83.67(5).

**The number worth keeping visible is the discretionary one.** Most of a lease is
not statute. A test fails if it ever drops below thirty, because that would mean
drafting had quietly reclassified itself as law.

### A library that could be approved but never sent

The approval form asks for an attorney's name and bar number. The page sat
behind `_authenticated+`, and `approve` calls `assertAccess`, so the only way to
get a lawyer to it was to add them to the organisation as a user. Meanwhile the
product had had exactly this mechanism for tenants since the reviewer page
shipped.

`clauseLibrary.share` mints a token; `/clause-review/:token` renders the library
with its provenance and no account. Three things carried over from the
lease-review link, all of them lessons rather than design:

- **Revocable from the start.** The tenant link shipped without revoke and had
  to be retrofitted after two live links for the same person existed.
- **`libraryFingerprint` pins the library as sent**, so a reviewer opening it
  days later is told the text moved rather than discovering it.
- **One error for absent, revoked and expired.** A reviewer cannot act on the
  difference, and distinguishing them confirms to anyone holding a guessed token
  that it once existed.

**Read-only, deliberately.** Recording an approval stays inside the organisation,
where it is attributable to someone who signed in. Sending a link should not be
the same act as granting write access.

The page leads with the thing neither page said before: these clauses were
drafted in-house, no attorney has reviewed them, and only six of fifty-seven are
compelled by statute.


### One element of six, and a remedy left on the table

**The federal lead disclosure is six things.** 40 C.F.R. §745.113(b) and
24 C.F.R. §35.92(b) both require a contract to lease target housing to include
the Lead Warning Statement, the lessor's disclosure of KNOWN paint and hazards,
a list of records provided, the lessee's acknowledgment of the pamphlet, an
agent statement, and signatures certifying accuracy. **We shipped the first.**

42 U.S.C. §4852d(b)(3) provides TREBLE damages, so an incomplete disclosure is
not a lesser version of a complete one. And the clause fails safe to INCLUDE
when the build year is unknown — which made completeness the difference between
a safe default and a treble-damages default.

**EPA and HUD no longer agree on the Warning Statement.** EPA added "known" in
November 2024 (89 FR 89458); HUD's §35.92(b)(1) still carries its 1999 text
without it, confirmed against the official govinfo CFR annual edition. We follow
EPA — later in time, tracks §4852d(a)(1)(B)'s "any known lead-based paint", and
being narrower it satisfies HUD's substance. That reasoning is ours and is a
counsel question, not a settled point.

Deliberately NOT included: 40 C.F.R. §745.110(a)'s ten-day inspection
opportunity runs to PURCHASERS only. It is a common drafting error and would
promise something the regulation does not require.

**§83.67(5) was a remedy we were not taking.** The statute relieves a landlord
of the §715.104 duty to store and dispose of property a tenant leaves behind —
but only where the lease says so, and only where it carries a prescribed legend
"printed or clearly stamped". §83.67 appeared nowhere in the library, so the
whole statutory storage process applied to anything left behind.

The legend is a safe harbour, so the wording has latitude; it is reproduced
exactly anyway, because there is no reason to spend it.

**This is the shape a statutory walk finds and a clause review cannot.** Not a
clause that is wrong — a clause that is absent, and whose absence costs
something. Three adversarial reviews of our own text found neither of these,
because there was nothing there to read.


### A clause whose defect was that it existed

House rule 4 read *"No water-filled furniture may be kept at the Premises."*
§83.535 says **"No landlord may prohibit a tenant from using a flotation bedding
system"** that complies with the building code. Void under §83.47(1)(a), with
§83.47(2) damages exposure for including it — and it was on a lease already out
to a tenant.

**No review of our own clauses could have found it.** Three adversarial passes
read that rule and had nothing to say, because the rule is well drafted. Its
defect is that it exists. Only walking the statute — asking of each section
"does this constrain what a lease may say?" rather than "is our clause right?"
— surfaced it.

The statute also runs the opposite way to how the rule assumed: the tenant's
flotation-insurance duty and the loss-payable clause to the owner arise BY
STATUTE. Banning the bed forfeited a protection rather than creating one. The
rule now recites what §83.535 already gives.

### The third one-option election

§83.505 prescribes TWO MIRRORED ELECTIONS — landlord and tenant — each with two
checkboxes, its own designated address and its own revocation sentence. Ours
asserted both parties had elected: *"Landlord elects to receive notices by email
at: X"*. A tenant who did not want e-mail had no way to say so, and a party who
never chose was recorded as having chosen.

That is the third clause found with one option where the statute prescribes two,
after §83.595(4). **The pattern is ours, not Florida's:** offered a choice, we
rendered the branch we expected instead of the choice. Worth checking for
directly the next time a statute prescribes a form.

Not cosmetic — without a valid addendum, e-mail service of a §83.56(3) three-day
notice is invalid, and the corrected §83.49 disclosure now cross-references this
section.

### What the statutory walk found, and what it corrected

Walking Ch. 83 Part II end to end, plus the adjacent Florida chapters and the
federal set, produced a required-clause list built independently of what we had.
Diffing our 57 against it:

**Compelled and present:** §404.056(5) radon, §83.50 landlord address, §83.512
flood (correctly a separate document), §83.49(2)(d) deposit disclosure.

**Compelled and short:** lead paint. 40 C.F.R. §745.113(b) and 24 C.F.R.
§35.92(b) require six elements — warning statement, lessor disclosure of known
paint, records list, lessee acknowledgment, agent statement, signatures. We have
the first. §4852d(b)(3) provides treble damages. Not triggered by a 2018 build,
live for the library.

**Optional but unlocks a remedy, and missing:** **§83.67(5)** — relief from the
§715.104 duty to store abandoned property, available only if the lease carries a
prescribed legend "printed or clearly stamped". §83.67 appears nowhere in the
library. Also §83.575(2), whose liquidated damages need a landlord notice 15 days
before the notification period listing all fees.

**Two of my own claims were wrong.** Chapter 515 is **sales and construction
only** — §515.33 runs to buyers from contractors, and "lease", "tenant" and
"rent" appear nowhere in it. No section imposes any duty on a landlord letting a
pool home; our Ch. 515 clause is sound risk practice, not law, and it should
never have gone to counsel as a compliance question. §553.885 CO alarms is a
building-code duty tied to construction, with no contract obligation.

Also confirmed conduct-only, so no clause is needed: Ch. 720, §68.065, SCRA,
FHA reasonable accommodation, and VAWA — which does not reach private unassisted
rentals at all. §83.425 preempts local disclosure ordinances, so the state list
is the complete list.

**§83.49(2) exempts a landlord who rents fewer than five dwelling units.** The
disclosure corrected the day before may not bind this landlord at all — though
§83.49(1) and (3) have no such exemption and do. Correcting the text was right;
not checking applicability was not.


### An election with one option is a term

§83.595(4) prescribes a separate addendum in "substantially the following form",
and that form has **two checkboxes** — agree, and do not agree. We shipped only
the first. A document offering one option is not a choice.

The earlier review raised this as a question for counsel. Reading the statute
settled it: the two boxes are in the prescribed form, plainly. The remedy of
failing is severe — no election means no liquidated damages, and the landlord
falls back to §83.595(1)-(3) actual damages with a duty to mitigate. On the live
matter that is $13,800.

"Substantially" gives the WORDING room. It does not give the STRUCTURE room:
two options and a way to pick between them is what makes it an election at all.

### Two provisions demand exact words; four were marked as if they did

Verified by reading each provision's introducing phrase:

```
§83.49(2)(d)  "Contain the following disclosure"      VERBATIM
§404.056(5)   "shall contain the following language"  VERBATIM
§83.49(3)(a)  "substantially the following form"      safe harbour
§83.505       "substantially the following form"      safe harbour
§83.512       "substantially the following form"      safe harbour
§83.595(4)    "substantially the following form"      safe harbour
§68.065(4)    "substantially as follows"              safe harbour
```

The flood disclosure was marked `verbatimRequired: true` and is not. The
distinction decides what a diff MEANS: for the two verbatim provisions any
difference is a compliance failure; for the rest it is drift worth reviewing.
Marking everything verbatim makes every amendment look like an emergency, which
is how a signal gets ignored.

Lead paint stays verbatim and deliberately UNVERIFIED: HUD's 24 C.F.R.
§35.92(b)(1) and EPA's 40 C.F.R. §745.113(b)(1) were duplicative for 28 years
until EPA added "known" in November 2024 and HUD did not conform. One canonical
string is now non-conforming to one agency. That is counsel's call.

### The rule pack now records when it was last read off the statute

All nine figures compared against §83.49(3)(a), §83.53(2), §83.575(1) and
§83.595(4) on 2026-09-02 — all correct, now that the entry figure is fixed.
`verifiedAt` sits on the pack with the URLs and a pointer to the Legislature's
own table of section changes, `SecChangesTab{YY}.pdf`. Effective dates are not
on the statute pages; they live in the session law at laws.flrules.org.

§83.575(1) turned out to carry a reciprocity condition — a lease requiring
tenant notice must also require the landlord to give notice under §83.56(4) —
and our clause already satisfied it.


### The verbatim test compared our copy to our copy

`statutory-disclosures.test.ts` asserted that `RADON_STATUTORY_TEXT` equalled a
hardcoded string in the test file, under a comment calling itself *"the actual
compliance control, not a formatting test."* Both strings were written from the
same memory. It could catch an accidental edit and nothing else — and what had
actually happened was that the original was wrong.

The §83.49 deposit notice carried a source comment admitting it was
**transcribed from an executed lease, not read off the statute book**. Reading
the statute showed the transcription was of the PRE-2025 text. Ch. 2025-16
(HB 615), effective 1 July 2025, rewrote the disclosure to permit notice *in
person, by mail, or by e-mail in accordance with §83.505*. Ours still said MAIL,
opened "YOUR LEASE" where the statute says "YOUR RENTAL AGREEMENT", and dropped
WRITTEN from two places. §83.49(2)(d) says *"Contain the following disclosure"* —
no "substantially" — so this was a live compliance defect on a lease already
out to a tenant, governing $13,800.

The citation was wrong too: we cited §83.49(**3**), which is the notice of
intent to impose a claim, a different document that only needs to be in
substantially the prescribed form. The all-caps disclosure is **(2)(d)**.

Radon was fetched and compared word for word: identical. Both now carry
`verbatimVerifiedAt: '2026-09-02'` — a field that had existed since the library
was written and had **never been set on anything**. Four remain honestly null,
and a test pins that count so it cannot drift.

**Two things worth carrying forward.** Only **two** Florida provisions require
verbatim text — §83.49(2)(d) and §404.056(5). Everything else prescribes
"substantially the following form", which is a safe harbour, so a diff against
the statute is drift rather than a compliance failure; the library marks six as
verbatim and four of those are over-strict. And the Legislature publishes
`leg.state.fl.us/Statutes/SecChangesTab{YY}.pdf`, a section-by-section table of
what each session changed — the whole change-detection story in one file.

**The general shape:** a test that never leaves the repository cannot verify
anything about the world. Pin the source and the date it was read, not just the
string.


### The advance rent had no way home

Advance rent was defined as covering "the final month of the term" and barred
from any other month. Termination on sale said prepaid rent is "dealt with under
the sections of this Lease governing them" — and the only such section,
`deposit.return`, governs THE DEPOSIT and never mentions advance rent.

So on any early end — the landlord selling, or the tenant paying the §83.595(4)
fee — there was no final month for the money to cover and no clause returning
it. Read literally the landlord kept $6,900 earmarked for a month that would
never exist. On the live matter that is exactly the sum at stake.

Fixed at the source rather than with a refund: advance rent now covers **the
last month of Tenant's occupancy** rather than the final month of the *term*.
However the tenancy ends there is always a last month for the money to land on,
so nothing is stranded — and it matches what tenants already assume they are
paying for, and what this landlord's previous tenants actually did. The refund
sentence survives for the narrow case where a tenant never occupies a final
month at all.

**The three pots.** The landlord's working model was that the two-month early
termination charge simply *was* the advance rent plus the security deposit —
nobody writes a cheque. That is one obligation short of the law: the deposit is
§83.49 money securing performance, and pre-converting it into a fee waives the
tenant's notice, itemisation and objection rights under §83.49(3), which
§83.47(1)(a) voids and §83.47(2) makes fee-shifting. It also double-counts,
because advance rent applied to a month the tenant lived in is rent earned, not
damages.

Structure chosen: the §83.595(4) fee is **payable on the termination date**, the
deposit goes back (or is claimed against) under §83.49, and the advance rent
covers the last month occupied. The addendum now says all three in terms.

Four smaller contradictions went with it, all found by reading the RENDERED
document rather than the clause sources:

- House rule 10 banned installing any "exhaust fan" while clause 10.3 *requires*
  extractor fans when bathing. Now window-mounted units only, with a carve-out
  while the central system is down — a broken AC in a Tampa August should not be
  a lease breach.
- The forwarding-address duty was stated three times in near-identical words.
  The duplicate detector keys on `asserts` tags, not content, so three different
  tags made it blind. Stated once now, where the deposit is returned.
- Renters insurance asked the tenant to name the landlord an "interested party",
  which is not a designation carriers issue. Evidence of cover gates possession,
  so a carrier's refusal would have blocked move-in.
- The pet addendum printed "a pet fee of $0.00 and pet rent of $0.00 per month"
  — two obligations to pay nothing. Split into two variants on a derived
  `hasPetFees`, the same shape as the yard gates.

And one of mine: the addendum-prevails sentence was concatenated without a
space (`applies to it.This Addendum`). A test now asserts no clause runs two
sentences together.


### A link you could mint but never take back

`review.create` issues a fresh token every time, so a landlord who edited the
lease could always send a NEW link. Nothing could kill the OLD one — it stayed
live until its expiry, months out, whatever happened to the deal. Wrong
recipient, changed terms, a tenancy that falls through: the link kept working.

Worse in the UI: two live links for the same person rendered as **two identical
cards** — same name, same email, same "Link live until", same Copy button —
separated only by list order (`createdAt desc`). Copying the wrong one sends a
reviewer a lease that has already moved on, which is exactly the failure the
staleness banner exists to catch after the fact.

`review.revoke` closes rather than deletes: the row carries the reviewer, the
issue date and any comments already returned, and a delete would orphan those
comments. `isReviewUsable` already rejected any status but `open`, so closing IS
the revocation and it beats the expiry date rather than waiting for it. A
`returned` review cannot be revoked — that would hide work the landlord still
owes an answer to, rather than retract a link.

The list now names the current link and marks the rest superseded.


### Splitting rent from charges, and only half doing it

The statutory-notices clause was changed to say that sums other than the monthly
rent are Other Charges and not rent — so a disputed $45 could not be swept into
a three-day notice. Six other clauses went on calling their own charge
"additional rent": the late fee, the returned-payment charge, the association
fine pass-through, the association cure cost, and the pet fee and pet rent.

Rendered together the lease said of the same $150 both *"as additional rent"*
and *"Other Charges and are not rent"*. A document that contradicts itself about
what counts as rent is worse than either version alone, because the
contradiction resolves against the drafter.

**It was invisible to every test and to the clause library.** The change and the
contradiction lived in different files, and nothing compared them. It was found
by rendering the real matter end to end and reading the output — not by reading
the diff.

One clause keeps the phrase: the §83.595(4) addendum reproduces prescribed
statutory language. The guard excludes that slug explicitly rather than by
pattern, so tidying cannot reach it.

**The general shape:** a phrase that defines a term is not confined to the
clause that defines it. After changing what a word means, grep the library for
the word.


### The E2E gate hid 888 results behind one flake

`maxFailures: process.env.CI ? 1 : undefined` aborts the run on the first
failure. With `retries: 4` a flaky spec has already burned five attempts before
it counts — and then ends the suite. PR #67 reported:

```
  4 failed        (find-documents team-visibility cluster)
  6 interrupted
888 did not run
183 passed
```

The change under test was entirely inside `packages/bizrethink/lease/` and no
lease spec failed, but the result was indistinguishable from a real regression.
Three occurrences on 2026-09-02, each costing a ~25-minute re-run. Overlay 067
raises the cap to 25.

**A caution about reading these logs.** Twice I reported the failing specs as
`admin-search` / `delete-organisation` and both times that was wrong — those
names appear in the log's test *listing*, not its failure summary. The actual
failures are in the `4 failed` block near the end. Grep for that block, not for
spec paths.

The underlying flake is **not** fixed and its recorded root cause is now
suspect: the assertions fail `Expected: 3 / Received: 0`, which is a team query
returning nothing rather than the wrong thing, and that does not obviously fit
the counter-contention explanation in FORK-TESTING.md. Reproducing it needs the
built app; the local build is blocked by a Node version mismatch (CI expects 22,
this machine runs 26).
### A repealed statutory figure, defended by its own tests

§83.53(2) required TWELVE hours' notice before entry until the 2013
landlord-tenant act raised it to twenty-four. The old number sat in
`rule-packs/us-fl.ts`, in that file's doc comment, in the clause file header,
and in two assertions in `validate.test.ts` — five places agreeing with each
other and none agreeing with the statute. The blocking validator fired only
BELOW the figure, so it blessed 12 on every Florida lease the product generated.

It survived because the checked-in fixture uses 24. **The fixture was safe and
the live matter was not**, so no test ever saw the wrong value. Fixing it turned
two green tests red, which is the tell: a test that defends a number is only as
good as the number.

Three more of the same shape landed with it:

- `monthsBetween` returned 11 for the twelve-month example written in its own
  comment. Term length gates the §83.512 flood disclosure, so a plain one-year
  lease shipped without a statutory document and nothing said so. It now counts
  whole months to the day AFTER the end date, which makes every boundary case
  fall out on its own.
- The §83.47(1)(b) `waiverSignals` matched the formulas a drafter reaches for
  when they know they are allocating liability, and missed the one they reach
  for when they do not. **"at their own risk" was in our own pool clause**, and
  `scanCustomClauses` never ran over the library anyway.
- Chapter 515 appeared nowhere. A grep for `515`, `barrier` and `drowning`
  across the whole lease package returned nothing, on a product whose pool
  clause disclaimed liability instead of naming the safety feature.

**The general shape:** a comment next to a constant is not evidence. Where a
number encodes a statute, the test should assert the figure itself, not a lease
that happens to use it.


### A textarea and an input disagreed about being white

`Input` carries `bg-background`; `Textarea` carries `bg-transparent`. On a white
card the difference is invisible, which is why it survived every review. Every
textarea on the reviewer page sits on a **tinted** panel — the amber "only you
can answer" block and the muted comment composer — so the tint showed through
and two of the three answer fields read as part of the panel while the
single-line field beside them was crisp white. A tenant would have seen it
before we did; the user did, on the live page, about to send the link.

Both primitives are upstream, so the background is set at our call sites. The
guard asserts every `<Textarea>` on that page carries its own opaque background,
so a third one added later cannot quietly inherit the panel.

**The general shape:** a primitive that looks correct on the background it was
designed against is not correct on ours. Check the primitive's own defaults
before assuming a component is neutral.


### A bare anchor only scrolls when the hash CHANGES

The jump list looked correct — matching ids, no duplicates, target at y=2733 —
and a first click worked. Measured in the browser: hash `#section-5`, scrollY 0,
click section 5, **scrollY still 0**. Once a reader has visited a section,
clicking it again is a no-op, and because the rail is sticky and always on
screen, clicking the same entry after scrolling away is the natural thing to do.

The jump handles its own `scrollIntoView` now, with `replaceState` — a jump
within one document is not a place in the reader's history, and `pushState`
would risk a router location change that scroll restoration could undo.

**My first hypothesis was `<ScrollRestoration>` and it was wrong.** Loading the
page with the hash already in the URL works fine. Reading the live DOM in a
browser found the real cause in minutes; reasoning about the framework would not
have.

### One colour, one meaning

Amber marks work the reader still owes. Red means something went wrong. The
required asterisk measured `rgb(255,0,0)` while the rail dot beside it was
amber — the same fact in two colours. `text-destructive` is now absent from the
reviewer page; the two `Alert variant="destructive"` uses (dead link, failed
submit) are real errors and stay.

### The CSP eats unnonced `<style>` elements, silently

Both lease pages shipped their design as a `<style>` element carrying scoped
custom properties. The element reached the browser and the browser **refused
it**: this app serves a nonced `style-src-elem`
(`apps/remix/server/security-headers.ts`). The markup rendered, the class names
were in the DOM, and **every one of them was inert** — the pages looked
untouched while the diff said otherwise, and the tests passed because they were
asserting class names rather than outcomes.

**Utilities cannot fail that way.** They compile into the app's own stylesheet,
which is served with the nonce it expects. Dark variants written out, because
`dark:` here is a class strategy (`&:is(.dark:not(.dark-mode-disabled) *)`), not
a media query.

The design tests now assert the OUTCOME, and the first of them is *"never
styles itself through an unnonced style element"*.

### Three kinds of constraint, three appearances

Navy for a statutory bound the answerer may not cross. Green for a suggestion
they may take or leave. Amber for work still owed — and amber appears nowhere
else. All three were grey dashed boxes, so the interview could not say which was
which, and **which constraints come from Florida and which come from the
landlord is the one thing a lease builder must communicate**.

`owed` excludes booleans (false is an answer) and optional fields, and marks the
control with a ring: `[&_input]:` takes a single utility, not a class list.

### Three kinds of constraint, three appearances

A statutory bound is a limit the answerer may not cross. A suggestion is a
number they may take or leave. An unanswered required field is work still owed.
All three rendered as grey boxes with dashed borders — so the interview had no
way to say which was which, and **which constraints come from Florida and which
come from the landlord is the one thing a lease builder must communicate.**

Navy for the law, green for help, amber for work owed — scoped to the route,
same pattern as the reviewer's page. Amber appears on outstanding work and
nowhere else; a page that marks everything cannot mark one thing.

`owed` excludes booleans (false is an answer, not a blank) and optional fields.

**Why these are tests:** the failure they guard is not broken markup. It is
shipping the structure of a design and reporting it as the design, which
happened on the reviewer's page and again here.

### The builder tells you where you are, and what an answer becomes

Thirteen chips wrapping over two rows showed the landlord where they were and
**nothing else** — not which steps were finished, not which still wanted them.
A sticky rail carries the same thirteen as a list with a per-step count of
required answers still missing, computed from the live answers. Every step
stays reachable out of order.

**Each question now says which clause it becomes.** `clauseIndexForFields`
reads the mapping that already existed implicitly — every clause declares the
variables its body interpolates — the other way round. Recomputed from the
SELECTED clauses on every render, because numbering is derived from what
survives selection and a cached reference would point at a number the lease
does not contain. Absent where the clause is not selected.

The statute chip carries the accent now rather than the same grey as
everything else. It is the difference between a form and a lease builder and it
was the quietest thing on the page.

Design proposal:
https://claude.ai/code/artifact/873784f0-2697-490b-9fa6-3a2ef1ffd619
### Shipping the architecture and calling it the design

The reviewer page landed with the right information architecture — clauses in
the page, comments anchored to them, a fixed send bar — and **none of the
design that had been proposed and approved**. No rail. No serif. The app's
stock green Alert as the loudest thing on the page. A comment control hidden
with `opacity-0`, which does not release its box, so every clause carried a band
of dead space and the page read as half-loaded.

It was reported as done. It was half done.

**None of it was a platform limitation.** A route we own can carry its own
scoped custom properties and its own class names; the app's tokens are built
for a dashboard and this is a reading surface. A **system serif stack** rather
than a webfont, deliberately: this page opens from an email, on an unfamiliar
domain, often on a phone, and blocking the first paint of a legal document on a
third-party font request is a poor trade for a specific face.

Guarded now — `readable-lease.test.ts` asserts the serif, the rail, the reserved
action colour, and the absence of `opacity-0` on the comment control.

### The reviewer reads the lease, instead of a button

It used to be *"Open the lease"* — the signing PDF in another tab. So a reviewer
read in one window and, in the other, typed a clause name **from memory** into a
free-text box captioned "Which clause? (optional)". Unvalidated, unlinked, and
handed back to the landlord as whatever string arrived. They also saw
`{{SIGNATURE, r2, width=160, height=44}}` inside the document they were being
asked to comment on.

The data was always there: `buildLeaseDocuments` returns every clause with its
number, heading and interpolated text. `toReadableSections` groups it the same
way the PDF groups it — so the reader's contents and the printed contents cannot
disagree — and strips the signing tokens.

**A comment is written ON a clause, so it carries that clause's slug.** Nothing
is typed. A general comment about the whole document is still possible, which is
what `clauseSlug: null` always meant and the UI never offered.

Built from the same `buildLeaseDocuments` the landlord's preview and the signed
envelope use, guarded by test — a reviewer commenting on a document nobody is
signing produces a record of approval that was never given.

Design proposal, from which this was built:
https://claude.ai/code/artifact/97ed2cc3-d6da-4bff-a704-04ba3f60b6d1

**Also:** the send bar is fixed, because a button at the foot of 43 clauses is a
button nobody finds, and "sending closes this link" belongs where the sending
happens. The Pacta mark carries app-header weight — a reviewer arrives from an
email on a domain they have never seen.

### The lease opens with the deal

Page 1 is the particulars — key terms and the money due at execution. Page 2 is
the contents. The agreement starts on page 3. The convention is the UK Model
Commercial Lease's prescribed-clause table and the US "Basic Lease Information"
page; the shape was the landlord's idea and it is better than what was there.

**The particulars RESTATE, they do not replace.** Term and rent stay operative
clauses — a fact that lives only in a table is a fact that has only been
described. They are derived from the same `money` and values the clauses
interpolate, and **a test asserts the rent in the summary is the rent in the
clause**, because "$0.00 here and $6,300 there" is the defect this product
exists to prevent and a summary page reintroduces exactly that shape.

**For the attorney (Q7):** whether the particulars need a governing-conflict
line, and whether they are contractual or descriptive.

### react-pdf 4.9 has no working page-break control

Five mechanisms, one failure — `break`, `minPresenceAhead`, `wrap: false` on a
large node, a bordered node meeting a break, and any rule in the FLOWING body
(border, painted View, stretched or pinned width). Each makes it emit an
undefined coordinate (`-2.2e+22`) and render **nothing at all**.

What survives: rules in ABSOLUTE chrome (running head, footer), rules inside
small `wrap: false` blocks that never split, and **`Page` boundaries**. So the
three-page structure is three `Page` components, not one Page with breaks.

The cost, accepted deliberately: `subPageNumber` counts within a `Page`, so the
folio uses the document-wide counter. Identical in the signed documents, which
render one instrument each; continuous in the combined reading copy.

**Section heads are marked by weight and space, not a rule** — for the same
reason. That is a legitimate setting; it was not a free choice.

### The execution page

Ontario form 2229E's pattern: group by role, two cells across, signature over a
rule, printed name beneath, date inline. Four signers went from most of a page
to about 160 points, and the widgets are now 228pt apart horizontally, so the
no-overlap invariant holds by construction rather than by luck.

`{{NAME}}` is gone — it autofills from the recipient and printed each party's
name a second time. The pre-printed caption is what identifies the party
whether or not anybody signs.

Tokens keep the long `width=`/`height=` spelling: 200pt in a 204pt column,
verified with 0 wrapped. Four points is thin, and shortening it needs an
overlay-034 change, which is its own PR — this one touches no upstream file.

### The E2E gate was red a third of the time, and it was arithmetic

Prisma's default `connection_limit` is `num_cpus * 2 + 1` **per client**, and it
reads the MACHINE — the same trap as Playwright's `calculateWorkers()`. Moving to
the 12-vCPU homelab runner took it from 5 to 25 at the same moment sharding went
8 → 1, collapsing eight databases into one:

| | cores | pool/client | workers | peak |
|---|---|---|---|---|
| GitHub, 8 shards | 2 | 5 | ~2 | ~10 per DB |
| homelab, 1 shard | 12 | **25** | **15** | **~375** |

against `postgres:15`'s default `max_connections=100`. Main went from 0 failures
in 7 runs to 4 in 13 after that change, always in the connection-hungry specs.
Pinned `?connection_limit=5` on the E2E job's `NEXT_PRIVATE_DATABASE_URL` — a
file we own, so no overlay.

### The placeholder test counted tokens instead of comparing them

A token that WRAPS is still found: `@libpdf/core` joins page lines with `\n`,
`[^}]` matches it, the bbox becomes the union of both lines. So it still counted
as one, still parsed as `SIGNATURE/r1`, overlay 034 still forced 160×44 — and the
widget sat several points off with **every assertion passing**. Now set equality
on the token strings, plus an explicit no-newline check, plus
`hyphenationCallback` on the placeholder `Text` so the built-in en-us hyphenator
cannot split `height=44}}`.

Latent today, because tokens are set one per line at full measure. It stops being
latent the moment signatures go into columns.

### `minPresenceAhead` does not work in react-pdf 4.9

It is documented as exactly keep-with-next and it is what the review recommended.
Setting it on the section row — with or without `wrap: false` — makes react-pdf
emit a degenerate coordinate out of `clipBorderBottom` (*"unsupported number:
-2.2e+22"*) and **no PDF renders at all**. Bisected: removing it alone turns the
suite green.

So an orphaned heading is still possible. Fixing it needs a react-pdf upgrade or
the heading and its first paragraph in one unbreakable View — and that wants a
rendered proof, not a green suite.

### Two facts in one value, again

`hasNamedOccupants` was derived from whether the names box was empty, so
*"nobody else lives here"* and *"the tenant has not told me yet"* were the same
stored state. Asked explicitly now. A delegated question that never comes back is
also reported on Review — non-blocking, because blank IS a lawful answer there
that selects a different clause.

### The reviewer's page carried no brand

`_recipient+/_layout.tsx` renders its header only when `sessionData?.user`
exists, and a reviewer is never signed in — so a link a landlord emails to a
stranger arrived with nothing on it. **The tab title was already correct**
(the route sets its own meta and the child wins); it was the logo that was
missing. Corrected an earlier claim of mine that the tab said "Documenso".

### The lease PDF got a typographic pass

The constraint is unchanged and load-bearing: **standard-14, non-embedded fonts
only**, because `page.findText()` is how signature placeholders are located and
an embedded or subset face defeats it. So no custom typeface — but the
standard-14 set has seven usable faces, which is enough.

Times for the instrument, Helvetica for the apparatus around it (running head,
section labels, table columns, footer), so a reader can tell the agreement from
the furniture. Beyond type: a cover block that names the parties, a contents
table with dotted leaders, clause numbers hanging in their own column instead of
running into the heading, a running head on every page, ruled money table, and a
signature section that starts with a rule.

Margins went 64pt → 90pt. The old measure was ~98 characters, which is most of
why the body read as an undifferentiated slab.

**What must not move:** the page's base font size stays 11 and placeholder
`Text` carries no style. `LINE_TEXT_HEIGHT` in signature-blocks.ts is measured
against it, and the sized widget's reserved leading is computed from it — style
the placeholder and every signature widget shifts off the line it was measured
for. The placeholder round-trip test is the guard.

### A delegated question is not a skipped one

Ticking "ask the tenant" does not fill the field, so `missing` still reports it —
and the review panel listed it in red beside the landlord's own unanswered
questions with nothing to tell them apart. It still blocks, correctly, but it now
says *"asked of the tenant, not yet answered"* rather than sending the landlord
to answer something they have already dealt with.

### Two of tier 3 were mechanical, four are the attorney's

**Fixed here.** §83.49(1) attaches to money taken as security **or** as advance
rent, and both notices gated on `depositHeldUsd > 0` alone — so a
last-month's-rent-only lease held the tenant's money with no disclosure and no
depository notice, the omission §83.49(3)(a) punishes by forfeiting the right to
claim against it. And `termination.early-election` read `pay ${{...}}` while the
`usd` formatter emits its own symbol, rendering **`pay $$4,600.00`** in the one
paragraph §83.595(4) prescribes. A library-wide test now forbids a currency
symbol in front of any `usd` variable.

**Sent to the attorney** — the memo is published at
https://claude.ai/code/artifact/f90c0aeb-fb52-401a-81d2-696b7d2a2ba8 (private until
shared from the page).
These are not "is this wrong" but "what should it say instead", which is
drafting:

1. `general.waiver` states the opposite of §83.56(5) — accepting rent with
   knowledge of a breach **does** waive the right to terminate for it.
2. Answering "no pets" produces a lease silent on pets, under an integration
   clause making the document the entire agreement.
3. `fees.administrative` has `includeWhen: null`, charging lockout and
   key-replacement fees on condo and multi-family, where §83.51(2) makes locks
   and keys a landlord duty that may not be shifted.
4. `disclosure.lead-paint` carries `requiredBy: 42 U.S.C. §4852d` but holds only
   the Lead Warning Statement, not the three further items 24 C.F.R. §35.92(b)
   requires.

Also for her, carried from tier 3: `hoa.compliance` characterises fine
reimbursement as **additional rent**, making non-payment a §83.56(3) three-day
ground, and `hoa.cure` extends that to cure costs.
### A one-shot link has to say what it needs before it closes

`review.submit` closes the link in the same transaction. So on the reviewer's
page: `required` was dropped when the router mapped `askedFields`, nothing
marked a mandatory answer, and nothing checked completeness — a tenant could
leave `tenantPreTermAddress` blank, the link died, and the landlord had to
issue a fresh review for an answer nobody had told them was mandatory.

A draft comment with a clause reference and an empty body was also silently
discarded, while the button still offered to "send back with no comments".

Both now block the send and say why. Asked fields also honour their own `kind`
— everything rendered as a textarea, so a single-line answer could carry
newlines into the lease.

### Conflict resolution reverted a fix, again

Taking `origin/main`'s side on the `statutoryInput` extraction silently undid
the entry-hours fix that lived in the literal main had extracted. Caught by
grepping for the change afterwards, not by the merge.

**The rule stands and is worth re-reading every time:** after resolving a
conflict, verify BOTH sides' changes are still present. A clean merge is not
evidence that nothing was lost.

### A tenant's returned answers could be destroyed in silence

The interview seeds every answer into React state once at mount and writes the
whole set back on each step change. It is not the only writer:
`applyTenantAnswers` writes a tenant's returned answers into the same `values`
column. A landlord with the page open when the tenant returned their review link
wiped what they sent on the next click of Next — unrecoverably, and against the
delegation control's own promise that *"you see what they wrote before anything
is sent"*.

**Refused, not merged, and not resynced.** Merging by key would not help: the
stale copy holds the SAME keys with the answers as they were before the tenant
filled them, so a merge overwrites with blanks just as surely. Resyncing would
throw away whatever the landlord had typed. A lost update must not be settled by
guessing which writer mattered — `saveStep` now carries `expectedUpdatedAt` and
refuses a write built on a stale read.

Recovery is a **full page reload**, not `revalidator.revalidate()`: state is
mount-seeded and nothing resyncs it, which is the defect itself.

### A failed save was invisible

`saveStep.error` was rendered nowhere, and `goTo` awaited the mutation with no
catch while every caller was `void goTo(...)`. The page did not move, the
rejection went to the console, and the caption still read *"Progress saves as
you move between steps"*. Now shown, and the step deliberately does not advance.

### Checks that ran against constants, not answers

- **§83.53(2) entry hours.** Both entry times are free text and the rule pack
  was handed `earliestHour: 9, latestHour: 18` — hardcoded. "6:00am" to
  "11:00pm" produced zero findings. `parseHour` reads what was typed; an
  unreadable answer falls back INSIDE the window, because citing a statute at
  someone for a typo is worse than missing one.
- **`prorationMethod`'s `showWhen`** read `facts.prorationApplies`, computed
  server-side in `hydrateMatter`. The browser never has it, so the question
  could never appear and a mid-month lease used the seeded default.
- **`propertyTypeLabel`** was a snapshot taken at matter creation while
  `propertyType` stays editable — correcting condo to single-family left the
  clause reading *"The Premises are a condo. As permitted by §83.51(2)…"*. Also
  `.replace('-', ' ')` printed *"a single family"*.

### A draft with no start date crashed every read

`deriveFacts` split `money.term.startDate`, which the seeder writes as null on
purpose. Absent dates now derive nothing rather than zero.

### A reviewer must read what gets signed

`buildLeaseDocuments` emits the lease PLUS one document per addendum and per
standalone disclosure, and the envelope uploads every one. Both the landlord's
preview and the reviewer's copy did `rendered.find(d => d.key === 'lease')` and
returned that alone — so an attorney read one document while up to seven were
signed, including the two Florida requires to be separate instruments.

`renderLeaseForReview` concatenates them into one file **for reading only**.
Signing is untouched: the envelope still gets distinct items, because §83.512
and the addenda's own signature blocks make that separateness load-bearing.
Asserted by extracting every placeholder from each signed document and
requiring all of them in the reviewer's copy.

### Gates that lived only in the advisory query

`validate` is a query. Nothing forces a client to call it, and its cache is
enabled only on the review step. Three things had that shape:

- **`validateAnswers`** — the eight blocking statutory rules — ran nowhere else.
  Its input is now built by one `statutoryInput()` so query and mutation cannot
  drift, and the mutation re-runs it.
- **`sendBlockers`** never compared answers to `review.answersHash`. Disposition
  every comment, change the rent, send — with the attorney's approval attached
  to a document that no longer exists. Now blocks on a **returned attorney**
  review whose hash has moved. (`ReviewStatus` is `open | returned | closed`;
  the type system caught a first attempt that tested for `'submitted'` and
  would have been silently never true.)
- **`unreviewedClauses`** was computed and dropped from both totals while
  `createEnvelopeFromMatter` throws on exactly that condition — "nothing
  blocking", then a hard failure naming raw slugs.

`hashAnswers` now covers the property's utilities, via one `currentAnswersHash()`
shared by both callers. They are read live, so editing a utility row moves a
lease already out for review.
### No lease had ever been sendable

An adversarial review (four passes, 45 findings) opened with this: `readyToSend`
was false for **every lease ever built through the product**, for two reasons,
and no answer a landlord could give would clear either.

- **`effectiveDate`** sat in `DERIVED_VALUES` — so no step asked for it — and
  nothing derived it. The only assignment in the repo was a checked-in fixture.
- **`startDate`** is asked with `target: 'money'`, so it lands in
  `money.term.startDate`, while `term.fixed` declares it as a required VALUE.

**The test written to catch exactly this compared by field NAME and ignored
`target`**, so a money-targeted answer falsely satisfied a value variable, and
membership of `DERIVED_VALUES` was accepted as proof of derivation. Both now
checked properly, plus a test that renders the reference matter and asserts
nothing in `DERIVED_VALUES` is left outstanding.

`effectiveDate` turned out not to need deriving at all: `general.execution`
already says *"The effective date is the date of the last signature"*, so two
always-on clauses were fixing it two different ways. The recital no longer
states a date.

### A toggle may not sit on a step it can renumber

`petsPermitted` was the last field of the FLOOD step and gated the PETS step
declared before it. Switching it on inserted a step at the index the answerer
was standing on — the page silently became "Pets" with two flood questions
unanswered behind them. The Pets step is always visible now and asks the
question itself.

### `missing` is the renderer's vocabulary, not the landlord's

The review panel printed `parties.recital: effectiveDate` in monospace.
`describeMissing` turns each entry into the question and its step — and where
nothing asks for the variable, says so, because telling someone to go and
answer it sends them hunting for a question that does not exist.

### Deriving an answer is not a reason to hide it

Removing the two free-text utility boxes was right — they were a second,
editable copy of what the property records. It left step 4, *"Utilities and
insurance"*, showing only insurance, with nothing anywhere in the interview
saying what the lease would print about utilities.

Step 4 now shows the derived allocation read-only, with a link to the one place
it can be edited. Guarded by `regression-tests/interview-step-content.test.ts`,
which also refuses their return as answerable fields.

**The general rule, worth keeping:** every field in this interview shows its
consequence at the moment it can still be changed. That is the premise the
whole thing rests on, and it does not stop applying when an answer becomes
derived.

### AI in the lease builder: one place, deliberately

`ai.draftClause`, on step 12 (*Your own clauses*), is the only AI call in the
product. It drafts prose the landlord then owns, and everything it writes goes
through `scanCustomClauses` against the §83.47 non-waivable list.

It is not offered for the yard rows, and the reason is structural rather than
squeamish: the job NAMES are a constant the code already holds — now offered as
*"Start from the usual Florida list"* — and the only other column is the
allocation, which is the one genuine decision on that step. A pre-filled
`doneBy` reads as agreed.

### `<SelectItem value="">` throws, and only once a row exists

Radix reserves the empty string — setting a Select's VALUE to `''` clears it
and shows the placeholder, so an ITEM may not claim it. It is a runtime throw
inside the item, so the yard editor's "Not decided" option passed review,
passed 666 tests, and rendered fine on every lease that had no yard rows. The
first press of **Add a job** on a lease with none was a full-page 500.

`''` is still the right value in the DATA — an unassigned job is a real state
and `unassignedYardTasks` keys off it. The sentinel exists only at the Radix
boundary. Guarded by `regression-tests/radix-select-empty-value.test.ts`, which
checks the mapped-options shape as well as the JSX literal.

### Utilities are read live from the property, not copied at creation

Two free-text boxes on step 4, `required`, seeded once at matter creation. A
lease created before its property had utilities recorded therefore held two
empty required boxes **that adding the utilities to the property afterwards
could not reach** — and the two boxes could be edited into disagreeing with
each other, which is the defect the property rows were introduced to remove.

Derived in `hydrateMatter` from the property's rows now, on every read, and no
longer asked. Unlike the party list nothing here is order-dependent or signed
positionally, so there is no reason to freeze a copy — the trade is that
editing a property's utilities changes what a DRAFT will print. A sent lease is
unaffected: its PDF is already in the envelope.

**Three render paths, and the reviewer's is the one that hides.** The
landlord's preview and the router sit together; `_recipient+/lease-review.
$token.document.tsx` does not, and it would have handed a lawyer a lease
reading "none" on both sides while the landlord's preview read correctly. All
three are now guarded by test.

### Lombard tenancy — first outside tenant

Stood up 2026-08-31 for Lombard Pay's contract e-signing, driven from the
`lombard-platform` session. Production now carries:

- **Organisation `lombard`** (`org_tfvwxmvbtyhumbba`), **team `lombard-api`**
  (id 40). The slug is exact and load-bearing — Lombard's client defaults to it.
- **Webhook** `ccpmq3h3r4e756ua0ng16pnln` → `app.lombardpay.com/api/webhooks/pacta`,
  all seven document events, plain `X-Documenso-Secret`. Test Connection passed.
- **16 templates, ids 61–76** (FRPA, Payzli split-funding, subscription,
  permission-to-release, ISO PRA, and eleven state disclosures).

**The org claim is `bizrethink`, applied by SQL, not by the admin UI.** New orgs
are created on the `pro` claim by the SaaS signup path, which caps teams at 1 and
leaves `unlimitedDocuments` false — the team creation had already failed once
against that cap. The admin UI's inherited-claim panel is **read-only**, so the
claim was set directly on `OrganisationClaim`, and `BizrethinkOrganisationBilling.
bizrethinkInternal` was set true so the trial-expire cron skips the org. Overlay
001/002's route-everything-through-BIZRETHINK only covers the org-creation paths
that predate the billing work. **Any future outside tenant needs the same two
writes** or it silently degrades to free-plan limits.

**Templates must be uploaded through the UI, one per template.** Documenso does
not expose the auto-place primitive over REST: the UI's `createEnvelope` parses
`{{SIGNATURE, r<n>}}` out of the PDF text layer, bootstraps placeholder
recipients, positions the fields and whites the markers out of the stored PDF,
all in one transaction. Reproducing that in SQL means reimplementing placeholder
geometry, and a wrong row set looks healthy until a signer opens a broken
envelope. After upload, `publish-to-documenso.mjs sync` emits the specs the
consumer reads. Every new template was verified against its source-era
counterpart on recipient and field counts before being handed over.

**Contract sources are Lombard's, not ours.** They live in
`~/github/lombard/lombard-contracts` (copied from the read-only BizRethink
Contracts library, which was not modified). Regeneration removed all
CircularPayments/MFG branding from PDF *contents* — it is baked into cover
pages, footers and recitals, so clone-and-retitle was never viable — and stripped
the ACH-debit collection machinery per Lombard's ADR 0019, leaving `[Reserved]`
stubs rather than renumbering, so the disclosures' cross-references stay valid.

**Deleting a document is a HARD delete unless it is COMPLETED**, and it takes
the audit trail with it. `delete-document.ts` branches on status: completed
envelopes are soft-deleted (`deletedAt` set, row and object survive), while
**DRAFT and PENDING envelopes are destroyed** by `prisma.envelope.delete`. The
`DOCUMENT_DELETED` audit row written immediately beforehand cascades with the
envelope — the code says so itself — so nothing survives to show the document
ever existed. `cancelDocument` (`POST /api/v2/envelope/cancel`, `{envelopeId,
reason}`) is the primitive that voids without destroying; it refuses anything
not `PENDING`, so it is not idempotent. This cost Lombard real data: every
voiding path on their platform routed through `/document/delete`, so
served-but-unsigned state disclosures were hard-deleted, and the loss is not
countable from here because the audit rows went too. Fixed on their side
(lombard-platform PR #128).

**Two Pacta items are queued behind a counsel answer**, recorded here because
they are ours and are currently written down only in Lombard's repo: a
**four-year retention floor** that refuses deletion of any envelope served to a
recipient (California 10 CCR §952(d) appears to require four-year retention of
every disclosure presented to a recipient — unconfirmed), and retiring
`/document/*` in favour of `/envelope/*`. Neither should be built before
counsel confirms the duty is real; a guard's value is that it encodes a
specific rule.

**Nothing here is cleared for a real signer.** Open gates, all owner/counsel:
states of organization for both Lombard entities (currently the working text "a
Florida limited liability company"), prescribed-form literals for all eleven
disclosures unverified against the vendored `state-disclosures/regulatory-source/`
PDFs, hardcoded economics, NY-law choice, subscription affiliate cross-default,
guaranty breadth, arbitration-vs-courts inconsistency. `processor2` is
deliberately **not** built: its source is vendor-authored and immutable, so it
needs fresh authoring, and its entity assignment is contested.

### Lease builder (29090 Picana Ln)

Internal-tool-first by decision: build the real architecture, ship it gated, defer
the attorney until the tool is validated. Still **not** in scope: pricing work,
additional states, or the org-level clause library. The interview UI and
custom-clause editor were in that list and are now built (#23, #24).

Prod carries a `BizrethinkFeatureAccess` table and a grant for user 3, applied
2026-08-28. The code that uses it is now merged.

**The root defect this feature exists to fix**, for anyone picking it up: the
2026 Zillow lease had one `securityDeposit` field carrying two different facts —
money *held* from a prior tenancy versus money *collected* at signing. Entering
$6,300 double-charged; entering $0 misstated. `money/derive.ts` splits them, and
the summary table can no longer disagree with page 22.

**Sending was unreachable by construction until #26.** `landlordNames` and
`tenantNames` are required variables on the opening clause and sit in
`DERIVED_VALUES` — nobody types them — and nothing derived them. The only place
they were ever populated was a hardcoded fixture, so tests were green while every
real lease reported two permanently-missing variables and `readyToSend` could
never be true. The party list simply did not exist in the product.

**Two silent invariants around signers.** Emails reach `createEnvelopeFromMatter`
as `Record<name, email>`, so two signers sharing a name collapse to one entry and
one receives the other's link; two sharing an email get two links to one inbox.
Both create a valid envelope and produce a lease countersigned by the wrong
person with no error anywhere. `validateParties` rejects both. **Party order is
load-bearing** — placeholders are numbered positionally and resolved by index, so
nothing may sort or regroup that list.

### The interview's shape

Reordered 2026-08-30 (#38) after a real run through it. **The landlord and the
§83.50 notice details now live on the PROPERTY**, not on each lease — none of it
changes between tenancies and it was being re-typed every time.

**Copied into a matter at creation, never referenced live.** A lease that read
its party list from the property row would have its signers silently rewritten
whenever that row was edited, and party order decides where signature fields
land — a lease countersigned by the wrong person, with nothing red anywhere.

**The interview now opens with "Who is renting it".** It used to open with a
property step in which six of eight answers already came from the property
record — a screen confirming facts nobody had been asked for, standing in front
of the question a landlord actually arrives with. That step still exists as
*Confirm the property*, placed immediately before Maintenance because
`propertyType` decides which duties Florida permits a lease to shift. Close
enough to matter, late enough not to be a toll gate.

Seeding runs on the server: the party list is who signs, and a browser does not
get to assert it.

### Editing and deleting

Added 2026-08-31 (#44), because neither existed: a property could be created
and never corrected, and a draft lease could be started and never removed —
trying the interview out for ten minutes leaves several.

**A property may be edited freely, and that is safe because of the seeding
rule** (see above): a lease copies what it needs at creation and never reads
back, so correcting a typo cannot rewrite the signers or address on a lease
already drafted, still less one out for signature. Archiving is soft, since
leases reference a property by id.

**Only a draft with no envelope may be deleted.** `canDeleteMatter` allowlists
`draft` rather than denylisting the sent states, so a status invented later is
refused by default instead of becoming quietly deletable. Its reviews and
comments are deleted in the same transaction — they carry no foreign key, and
an orphaned comment is not just clutter: `sendBlockers` treats one whose review
is missing as BLOCKING, precisely so deleting a review cannot erase an
objection.

### AI providers

`/admin/ai` has **Save**, **Save and test connection**, and **Test saved
connection**. The last tests what is stored without writing — before it, an
admin verifying a working config had to re-submit the form to check it. It is
disabled while the key box has text in it, because that text is not saved yet
and testing would report on the old key while the page shows the new one.

The key field reveals what has been **typed**, never what is stored: the saved
key is encrypted at rest and the server only ever tells the page `hasApiKey`.
A secret that never reaches the browser cannot leak from it, and that is worth
more than being able to re-read it.

**Anthropic rejects `temperature`.** The current Claude models return
`400: \`temperature\` is deprecated for this model` rather than ignoring it, so
sending it fails the whole request. Gemini still honours it and keeps 0.2. The
intent — a lease clause is not the place for invention — now rests on the
prompt's fixed JSON shape and on `parseClauseDraft` discarding anything that
strays.

This was found only because the error surfacing landed first: before that it
read as a bare 400, which is every failure at once.

Gemini and Anthropic, each authenticating with a key alone. Configured at
`/admin/ai`, which has a Save-and-test button.

**A failure must say which failure it was.** The first version reported only the
HTTP status, so a wrong model name, a revoked key, a key from the wrong product
and an exhausted quota all read the same — which is precisely the hole a
working Gemini key and a failing Anthropic key fell into on 2026-08-30. The
provider's own `error.message` is now surfaced.

Narrowly, and this is the constraint: **Gemini takes its key in the URL**, so
only that one field is read, never the raw body, and the key is redacted from
it afterwards in case the provider quoted the request back. Redaction has a
16-character floor — with a short key the guard rewrote "The API key was not
accepted" as "The API [redacted]ey was not accepted", mangling messages while
protecting nothing. Real keys are 39–100 characters.

### Asking the tenant directly

Added 2026-08-30 (#42). A landlord can mark a question "ask the tenant instead";
it appears on the tenant's review link and the answer writes back into the
lease. Three fields qualify today — `authorisedOccupants`, `permittedPets`,
`tenantPreTermAddress` — all things a tenant knows and a landlord would
otherwise guess and then correct by email.

**This is the most dangerous surface in the lease builder.** It is an
unauthenticated endpoint, reached with a link, writing into a document destined
for signature. The rules, all in `interview/tenant-answers.ts`:

- **The field definitions are the authority.** The allowlist is computed from
  `tenantCanAnswer` on every read. The stored `delegatedFields` column is only a
  SELECTION from it — a wrong or tampered list cannot widen what may be written.
- **No money field, ever**, whatever it declares. Asserted across the whole
  interview by test.
- **No field a statute constrains**, for the same reason: that answer has legal
  consequence and is the landlord's to give.
- Strings only, trimmed, empty means unanswered, capped at 2000 characters.
- Only a `tenant` review may write; an attorney link carries no questions and
  so may not write answers either.
- A matter that is no longer `draft` is never touched — a sent lease must not
  move under its signers.

### Property data

Settled 2026-08-29 after checking what "national, fast, free" actually buys.
**Free national data does not include the field that matters.** `yearBuilt`
decides whether the federal lead-paint disclosure fires (42 U.S.C. §4852d), and
the free tiers that carry it cap at ~5 properties (RentCast) or cost ~$299/mo
(ATTOM). Zillow retired its public API in 2021 and prohibits automated access;
third-party wrappers resell scraped data, which is not a foundation for a legal
documents product.

So: the **US Census geocoder** (free, no API key, US government data) normalises
the address and derives the **county**, which sets venue. `yearBuilt` and
`propertyType` stay asked, and "unknown" includes the disclosure rather than
skipping it — a fail-safe an API guess would defeat.

On blur, not per keystroke: it is a lookup, not a typeahead. Verified live before
being designed around; the test fixture is a real captured response, because two
things about the real shape would not have been guessed — the match returns ALL
CAPS, and `addressComponents` carries no house number at all (`fromAddress`/
`toAddress` are the block range).

### An association violation now has somebody to cure it

`hoa.compliance` made the tenant FORWARD a notice and REIMBURSE a fine. It
never said who performs the cure, or by when. The real sequence would have run:
notice arrives 26 Aug naming dead palm fronds with a 9 Sep cure date, tenant
forwards it inside 48 hours exactly as required, nothing is trimmed, the fine
lands. The lease worked as written.

`hoa.cure` (new, gated on `hasHoa && hasTenantYardDuty`) keys the deadline to
**the association's own date**, not to the moment the tenant forwards — the
association emails the owner directly, so a tenant who bins the letter cannot
move the deadline. In exchange the landlord owes a reciprocal duty to pass on
what he receives directly.

Its last sentence is the load-bearing one: under **Fla. Stat. §720.305(1)** the
association's remedy runs against the parcel OWNER. Allocating palm trimming to
a tenant is an arrangement between landlord and tenant — it gives the tenant no
standing with the association and moves nothing off the owner.

`hoa.compliance` → v2: "any notice received from the association" became
"received at or posted on the Premises". Association post is addressed to the
owner and delivered to the house the tenant lives in; the old wording invited
opening it (18 U.S.C. §1702).

**For the attorney:** `hoa.compliance` already characterises fine reimbursement
as *additional rent*, which makes non-payment a §83.56(3) three-day ground.
`hoa.cure` extends that to cure costs. Her call, not ours.

### Yard duty is rows, and the router had a second derivation

`landlordProvidesLawnService` was one boolean with the whole allocation
hard-coded in the clause: landlord mows, tenant waters and trims. A landlord
whose split ran the other way could not express it, and turning the toggle off
did not give a different split — it gave **no clause at all, and an unallocated
yard**. The 2026-08-26 Estancia violation notice (dead palm fronds, 14-day cure)
is what that costs.

Rows now, in `BizrethinkLeaseMatter.yardTasks`, one `doneBy` each, three duty
lists derived from the one array. Per LEASE, not per property — the electric
co-op does not change between tenancies, who cuts the grass is negotiated with
the signer. An unallocated row **blocks the send**, in `validate` and again in
the send mutation.

**Found on the way:** the tRPC router still had its own copy of the answer
derivation, the exact duplication `matter-answers.ts` was written to be the
only copy of — its own doc comment claimed the router had been converted. It
had not. A derived value added to one and not the other means the landlord
previews one document and the signers receive another. The router now delegates
to `hydrateMatter`, guarded by a source-level test.

### Notice addresses are POSTAL, and the copy said otherwise

The §83.50 field read "The address must be given in writing", which is true of
an email address too — so it invited being filled with one. It cannot be: the
§83.49(3)(a) notice this lease prints verbatim says the landlord "MUST MAIL YOU
NOTICE, WITHIN 30 DAYS AFTER YOU MOVE OUT", and that the deposit must be
returned outright if that mailing is not timely. An email address there is
somewhere a statutory notice cannot be sent.

**Email is additive, never a substitute.** §83.505 permits it only under a
signed addendum — the "Deliver notices by email?" election on step 1 — and that
addendum names each party's address separately.

### Utilities live on the property

Added 2026-08-31 (#50). They were two free-text boxes on the interview, and a
real answer went in as a hand-typed numbered list with company names and phone
numbers — all of it property data retyped every lease.

Structured rows on the property, `[{ service, provider, phone, paidBy }]`, and
**both clause variables render from that ONE list split by payer**, so a
utility cannot sit on both sides or vanish from both. Seeded as text and still
editable per lease: a tenancy where the tenant takes over the trash is an
ordinary variation, and the property record should not be edited to describe
one lease.

Prose with a serial comma, not a numbered list — the clause interpolates it
mid-sentence ("Tenant shall arrange and pay for the following directly with the
supplier: …"). An empty side renders "none" rather than leaving a dangling
colon.

**No provider auto-lookup.** [NREL's Utility Rates API](https://developer.nlr.gov/docs/electricity/utility-rates-v3/)
is free and returns the ELECTRIC utility from a lat/lon, which the Census
geocoder already gives us — but water, sewer and trash are municipal with no
national dataset, and no source carries phone numbers. One row of four, so it
was not worth building.

### The UPL line, now structural

A field carrying a `statute` shows the bound and the citation and may **never**
carry a suggested value — suggesting a number on a statutorily-constrained field
is advising on the statute. A field with no statutory bound may state a market
fact, phrased as an observation ("most leases use…", never "we recommend…").
Both halves are asserted by test, including a required attributing word, so the
rule cannot be eroded by a copy edit. Only three fields qualify today; inventing
market statistics to fill more would be worse than an empty box.

### The finding mechanism was built and never plugged in

PR #103 shipped every piece of counsel's finding loop — the
`BizrethinkLibraryFinding` table and its migration, `recordFinding`,
`answerFinding`, `listFindings`, `outstandingFindings`, `findingBlockers`, and a
per-clause textarea on the counsel page. Each piece worked and each was unit
tested. **Nothing called anything.**

- `outstandingFindings` and `findingBlockers` had no caller outside their own
  test file.
- `approve` never read the findings table, so a clause carrying an unanswered
  defect report could be approved with no obstacle whatsoever.
- `listFindings` and `answerFinding` had no UI caller at all. A finding landed
  in a table no page read and nobody could answer.
- Counsel could not see the finding she had just recorded. The box cleared, the
  page said "Recorded", and a reload showed nothing.

Four places asserted the control anyway — the migration comment, the
`findings.ts` docstring, the counsel route's header, and the in-flight note —
each saying a finding *"blocks that clause until answered"*. None of it was
true. This is the repo's characteristic failure exactly: a change that fails by
being **absent**, passing CI because every unit was tested in isolation and no
test asked whether anything used them.

Wired 2026-09-06. `approve` now refuses on `findingsBlock`, between the
admission check and the fingerprint check; `/admin/lease-library` lists and
answers findings; the counsel page reads back her own via a token-scoped
`openFindings`. The prose above is now true, so it stands as written.

**The migration comment cannot be corrected in place.** Prisma checksums applied
migrations, and editing `20260906210000_library_findings/migration.sql` — even a
comment — fails every later `migrate dev` with *"was modified after it was
applied"*. Its claim was false for the three days between #103 and this entry;
it is true now, and the record of that gap lives here instead. **Never edit a
file under `packages/prisma/migrations/` that has already been applied.**

A second defect surfaced while wiring: `answerFinding` keyed its `update` on the
caller-supplied `findingId` alone. `assertAccess` proved the caller belonged to
the organisation they *named*, which said nothing about who owned the finding —
a cross-tenant write, and Pacta has hosted a second tenant since 2026-08-31.
Now an `updateMany` scoped by `review.organisationId`, refusing when nothing
matched rather than reporting success.

### Paused elsewhere

- **Sentry triage** — replay-burn investigation paused pending Sentry MCP config.
  The insight was: fix errors, not replay rates.
- **Stripe (Pacta sandbox)** — paused at "choose pricing model". One Stripe
  account per legal entity, not per product; this one is the Server Baba Inc
  umbrella.
- **Pricing** — Free / $35 Pro / $199 Business / Enterprise, approved 2026-05-10.
  Parked for the lease builder until it becomes a product.

## Cross-repo

- `client-circular-payments-platform` consumes this platform for contract
  signing. **Do not edit it from a Pacta session** without explicit per-change
  consent; document a handoff instead.
- Its 17 contracts use an AcroForm widget pipeline (`«N»` markers). **Do not
  propose converting them to native `{{...}}` placeholders** — it was tried and
  does not work. Fix the seal flow or the send-helper instead. This does not
  apply to newly generated PDFs, which have no AcroForm layer.
- `lombard-platform` consumes this platform for contract signing via team
  `lombard-api` — the first outside tenant. Same rule as CircularPayments: **do
  not edit it from a Pacta session** without explicit per-change consent. Its
  contract sources are `lombard-contracts`, which is Lombard-owned; the
  BizRethink Contracts library on the Desktop stays read-only. See *Lombard
  tenancy* above.
- `infra-gitops` manages the VPS fleet Coolify runs on.
