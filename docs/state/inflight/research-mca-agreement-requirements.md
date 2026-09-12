# MCA agreement requirements — research handoff

Branch: `research/mca-agreement-requirements`

Started from main `01e53dcca4cb7bab6a9a340cdcc795fd718819cc` after the owner
merged PR #174 and authorized continued source verification before ADR 0014.
PR #176's CT/FL/MO source corrections were still open at the start. They are now
merged and included in this branch's integrated main base `7f5ce5684`.

## Scope

Read the eleven dedicated commercial-financing statutory schemes and their
disclosure rules, record agreement-content duties separately from prescribed
disclosures, and identify the specific authorities needed for the clause-level
ADR 0014 backfill. Preserve source URLs, versions, retrieval evidence and limits.
No application behavior, clause text, approval status or schema change.

The owner relayed the other session's coordination decision: A-07 owns the
merged #176/#177 state-note cleanup. This session did not author another fold.
It reuses A-07's exact three-file documentation change from PR #178 head
`3874700da819d2606eb0198a6458d57b5d72a139` in isolated dependency commit
`cede1f021`, because the existing CI Guard 5 rejects stale notes on every PR.
`git diff --exit-code` against A-07's three paths passed before committing.
No A-07 application/test/overlay change is included. The branch had first
fast-forwarded to main `7f5ce5684` after #176/#177 merged.

## Research completed

Review surface:
[`docs/research/mca-agreement-requirements-2026-09-12/README.md`](../../research/mca-agreement-requirements-2026-09-12/README.md).
Its companion section register covers all eleven dedicated statutory schemes,
26 California rules, 26 New York rules, 14 Texas rules, four Virginia rules,
Connecticut's enforcement cross-references and relevant regulator guidance.
The manifest records 113 HTTP attempts, 20 retained evidence files and 27
unchanged repository inputs/evidence files. Browser observations are separate
from HTTP response provenance.

- Retrieved the complete current California Division 9.5 (now §§22800–22807)
  and all 26 sections of 10 CCR §§900–956. The consolidated publisher states
  currency through August 28, 2026. New §§22806–22807 derive from 2025 SB 362,
  effective January 1, 2026; they are not in the old disclosure-rule PDF.
- Retrieved all 26 sections of the public consolidated 23 NYCRR Part 600.
  Its express currency date is October 31, 2023; the DFS index still links its
  2023 adoption. All twelve Article 8 sections are retained separately. Official
  Register annual indexes for 2023–2025, the first half of 2026 and every weekly
  issue July 1–September 9 were checked; no later Part 600 amendment identified.
- Established the current Connecticut DOB index's link to the August 1, 2024
  guidance and retrieved the October 17, 2024 employee-registration no-action
  memorandum. The later statute controls over old registration guidance.
- Retrieved the complete Texas 14-rule adoption packet and accessed the current
  SOS code portal, including the substantive contract and automatic-debit rules.
  The portal labels the adoption packet's §86.311(i) second item `(2)` instead
  of `(B)`. This publication discrepancy is recorded without an equivalence claim.
- Retrieved Georgia's official 2024, 2025 and 2026 general-statute summaries.
  The legislature's public Lexis search confirms §10-1-393.18 and its enactment
  history, but a CAPTCHA prevented reading the full code section there.
- Utah's current regulator index links a FAQ that expressly says there are no
  disclosure-format rules/templates. Its PDF is dated January 1, 2023 despite
  the 2026 upload path. This is not a new 2026 legal effective date.
- Found an existing Utah application citation defect: disclosure requirements
  are in §7-27-202; `content/statutes/ut.ts` currently cites §7-27-201.
- Recorded positive agreement duties in GA §10-1-393.18(e)(4), KS §75-784(b)(5),
  MO §427.300.3(2)(e), UT §7-27-202(3), TX §86.310(d) and §86.312(b)(3).
  Prohibitions, disclosure delivery, signatures, fees, priority, registration,
  broker conduct and records remain distinct from required contract wording.
- Read Virginia's complete rule chapter: separate prescribed form and updated
  signed form at early payoff/refinance. The local form mismatch remains open.

## Explicit limits

- Georgia: public Lexis section history was visible, but full code hit CAPTCHA;
  no full current-body comparison. Official 2024–2026 Title 10 summaries add
  limited corroboration, not closure.
- Missouri: current statute and registration/amendment pages verified, but the
  declaration/rule history selecting §427.300.7's commencement branch is not
  established. Do not hardcode an unconditional date from this report.
- California publisher cutoff August 28, 2026; New York publisher cutoff
  October 31, 2023 supplemented by the documented amendment search. No invented
  updated publication dates.
- General UCC/contract/usury/guaranty/bankruptcy/E-SIGN/NACHA/case-law issues
  remain clause-specific research dependencies, not grounds for inferring that
  unexplained clauses are discretionary.

Temporary retrieval/extraction workspace: `/tmp/pacta-mca-requirements/`.
No original #174 audit evidence or application source hashes are overwritten.

## Validation and remaining work

Local artifact validation passed: 20 retained evidence hashes, 27 unchanged
source/evidence hashes, unchanged prior-audit manifest, all local links, eleven
state headings, 26 CA rules, 26 NY rules and twelve NY statutory sections.
Positive agreement-duty citations were checked against the complete bodies,
including GA/UT's different subsection numbering and Texas's 15 prohibited
practice items. No application files, source inputs or previous audit changed.

Remaining: open the research PR and wait for CI. The only inherited changes are
A-07's unchanged cleanup dependency; the research is new files plus this note.

After human review/merge: implement ADR 0014's two metadata fields and backfill
211 actual clauses using these findings and targeted clause-specific authority.
Preserve draft/null authors, lawful commercial options and the fact partition.
Utah citation and California statutory-reference fixes are explicitly queued.
The Virginia prescribed-form correction stays a separate PR. The three missing
fact values and `processorSplitAccepted` deal-fact move remain separate work
unless the owner combines them deliberately.

## Agreed validation and ownership

Focused document/source checks locally. No broad local application tests,
build/typecheck or application browser checks for this research-only change.
The existing CI and Playwright gates remain unchanged. Green PR CI is the
completion gate. The implementing session leaves the PR unmerged for the human.
No independent review agent is spawned. All 211 MCA clauses remain draft with
null authors; this research does not approve a clause or a commercial position.
