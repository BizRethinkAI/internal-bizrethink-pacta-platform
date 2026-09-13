# MCA ancillary consent and capacity corrections

Author: **ancillary-consents-20260912**, direct Shwet assignment in
[task #192](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/192).
Branch `fix/mca-ancillary-consents` starts at merged main
`1813b1d72fb231593ddcb2cb0b2a55054ac7f040`.

## Owner's processor-letter decision

Split Funding Letters are processor-specific and often outside our ability to
change. The letter, its seven records, source text and findings remain unchanged.
Its conflicts with the FRPA's collection base, fee treatment and stopping rule
remain for a future, separately assigned review using the actual processor form
and accepted operating requirements. Deferral is not approval or a waiver.
The clause-library README records this durable operating constraint.

## What changed

Fourteen existing records become version 2: all eight Permission to Release
clauses, and the individual-report, communications and acknowledgment clauses
in each equipment agreement. All remain draft with null authors; the total
remains 211. The release cannot deem a merchant signer a guarantor. Reports
have identified individual authority, transaction, purpose and duration;
marketing consent is separate and optional, reasonable revocation methods are
preserved, and an equipment signature does not adopt payment duties beyond its
existing limited guaranty. Applicable adverse-action and furnishing rights are
spelled out. Purpose/variance notes now describe the revised wording.

The one-initial-report scope, its ending on the initial decision and revocation
of unused authority are explicit drafting choices, not universal statements of
FCRA requirements. The equipment provider remains distinct from the receivables
funder. Existing gates, field groups, slugs, ordering, commercial terms, FRPA
text and equipment twin divergences are unchanged.

The [correction record](../../research/mca-ancillary-consents-2026-09-12/README.md)
and manifest preserve source locations/hashes, the 14 before/after body hashes,
authority boundaries, decisions and actual-template/operational follow-up.
FTC/eCFR evidence from #180 is reused with its recorded hashes and checked
against the linked publications; direct U.S. Code reads returned 403 and are
not claimed verified. No complete state or FCC-order survey is claimed.

The retained release already has r2 individual-signature markup; the older
missing-line finding was implemented. The live fallback deeming a signer the
guarantor is removed. Neither markup nor this change proves production routing.
Historical source documents, source digests and review dispositions are intact.
The old eight-record release snapshot still checks complete legacy source
coverage; new drafting has its own boundary and identity regressions.

## Validation and next action

TDD observed **25 failures / 7 passing negative-detector controls** before the
rewrite. Focused tests cover the 14 clauses, both twins, original-source coverage,
approval/fingerprints, metadata, counsel/staff payloads and selection/numbering.
The first shared-consumer pass caught three FCRA citations formatted like
internal references; the wording was corrected and the guard retained. The final
focused selection passes **22 files / 1,250 tests**. Final CI evidence is recorded
in the task/PR without a status-only code push.

Exact-base [Playwright run 34719946377](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34719946377)
represents the unchanged application/dependencies/test configuration and supplies
the before gate. PR CI supplies after Playwright, broad tests/builds and separate
type checking. No duplicate broad local build or typecheck; no additional manual
browser sweep for the existing clause display. Formatting/source/link checks
accompany the focused tests.

Shwet starts one fresh independent legal-surface review. The author owns CI and
substantive fixes through green and does not merge or deploy. Actual document
rebuild, signature mapping, stored-template migration and operational report/
consent enforcement remain separately assigned work. Unnamed-author drafts stay
blocked from publication; old approvals are not transferred to the new wording.

## Other work remains with its owners

The MCA author retains #187/#190 integration ownership; those PRs' combined
origin counts must retain both state corrections. This PR does not touch their
origin tests or sources. A-08 / overlay 082 and safe outbound / overlay 083
remain with the security author. No overlay or migration is used here. Only
this branch's note is changed; the shipping session owns final consolidation.
