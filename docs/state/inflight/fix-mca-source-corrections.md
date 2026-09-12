# fix/mca-source-corrections — CT, FL and MO current statutory inputs

Owner authorized continuing after merging #174. Branch starts from merged main
`01e53dcca4cb7bab6a9a340cdcc795fd718819cc`, which also contains #173 / A-04 and
#175 / A-03. Scope is the three known statutory-source corrections identified
by the audit; ADR 0014 classification and the Virginia prescribed form remain
separate work. No production access, migration, merge or deploy is part of this PR.

## What changed and why

- **Connecticut:** `CT-CGS-36a-861-872.txt` explicitly consolidates nine unchanged
  base sections with full §§36a-868, 36a-870 and 36a-872 from the 2026 supplement.
  The header identifies which publication supplies each section and records both
  exact URLs, UTC retrieval times and raw-response hashes. This is an editorial
  consolidation, not a claim that the CGA served one combined document. The three
  replacement sections include their histories and the July 1, 2025 effective date.
- The CT obligation quotations now reflect the technical punctuation amendment,
  December 31 expiration / November–December renewal / $1,000 fee rule (including
  the late-year approval exception, other fees and nonrefundability), registration
  sanctions in §36a-872(a) and commissioner action in (b). `ct-penalties` retains
  its ID but now cites (b); new `ct-registration-sanctions` records (a). The
  non-form obligation count is 13. Cross-state notes and an FRPA **comment** no
  longer cite the superseded penalty sentence or claim identical CT/VA fee dates.
  Referenced §§36a-50, 51 and 52 are not themselves vendored; no enforcement or
  registration engine was added.
- **Florida:** current `FL-Stat-559.961-9615.txt` replaces `FL-HB-1353.txt`.
  It reproduces the six retained 2026 code sections and includes the 2024 change
  to §559.9611(9). All six exact retrievals are in the header. Disclosure
  requirements, row mappings and wording remain unchanged.
- **Missouri:** current `MO-RSMo-427.300.txt` replaces the SB 1359 omnibus extract.
  It includes subsection 4(10), the 2025 premium-finance exemption. The disclosure
  and its six requirements now correctly cite §427.300.3(2)(a)–(f), replacing
  incomplete bill citations. Source verification stays explicitly bounded to
  subsection 3. Prescribed labels, requirements, evidence and calculations are
  unchanged; the source's variable-payment agreement duty in 3(2)(e) remains
  material to the upcoming agreement-requirements review.

The CT digest and FL/MO source digests and verification dates moved after reading
the corrected versions and verifying the existing quotations/labels/content.
No clause body, authored status, author, disclosure layout, contract selection,
publication approval, user flow, schema or upstream file changed. The retired
FL/MO bill extracts remain in Git history; there are still 16 active text files.
The dated audit report/manifest/evidence are untouched so the before/after record
remains independently inspectable. A green source check is not legal approval or
proof that every later/implementing authority has been found.

## Validation and review

TDD on Node 24.20.0: all **seven new tests failed** against the pre-correction
sources. They compare the CT supplement sections and complete FL/MO current code
bodies with the official captures committed separately in #174, and check MO's
disclosure scope/citations. This catches the actual stale-source defects that
self-consistent old digests allowed through.

After correction, **180 tests across seven focused files passed**: the new
regressions plus `ct-va-statutes`, `provenance-honesty`, `content-states`,
`fl-content`, `sources-are-primary` and `source-origin`. This covers all obligation
quotations, source digests, scoped prescribed labels, primary-origin metadata and
existing disclosure content fixtures. Changed TypeScript formatting passes.
Local logs: `/tmp/pacta-mca-corrections-red.log` and
`/tmp/pacta-mca-corrections-green.log` (machine-local, not durable evidence).

The PR description and Checks will record final CI for the submitted head. CI
runs the comprehensive suites, builds and separate type checks, with the existing
Playwright workflow unchanged. No duplicate broad local suite/build/typecheck or
application browser session was run for these source/metadata changes. The
implementer opens the PR, monitors to green and leaves review/merge to the human;
no independent review agents were started.

Guard 5: GitHub confirmed #173, #174 and #175 merged and no open PRs at cleanup
ownership check. Their three stale notes are folded once into STATE and deleted.
The #173 additive upload-ownership migration prerequisite remains in that fold;
this PR neither applies it nor establishes whether the auth queue is deployed.

## Next session

Review/merge this bounded source correction. Then use the audit's explicit
authority gaps to perform targeted verification and build the complete
eleven-state agreement-requirements matrix. Distinguish agreement content,
prescribed exact wording, disclosure duties, prohibited terms, timing and
registration; an official source match alone does not classify a clause.

Virginia's October 2022 official prescribed-form correction is its own task,
using the retained PDF/extractions with visual/rendered validation. CT guidance
still predates the updated registration law. CA/NY consolidated rules, GA later
code history, CT guidance linkage, TX codified rules and missing underlying
statutes/implementing authorities retain the audit's qualifications.

Only after that evidence work should ADR 0014 backfill WhyThisClause and
ClauseVariance across **211** records. Keep authored clauses draft with null
authors. ADR 0011 guaranty placement, remaining template/form migration and
commercial interview answers are not completed by this source update.
