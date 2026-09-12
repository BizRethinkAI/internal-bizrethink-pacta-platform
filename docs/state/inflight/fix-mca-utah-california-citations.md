# Utah and California MCA statutory references

Author session: **ut-ca-citations-20260912**. Shwet directly assigned this scope;
[task #185](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/185)
holds the assignment and live handoff. Branch `fix/mca-utah-california-citations`
starts at merged main `1813b1d72fb231593ddcb2cb0b2a55054ac7f040`.

## Result

- Utah disclosure findings and provenance cite §7-27-202(2), with the correct six
  paragraph references and §202(3) for methodology in the agreement. §201 is
  registration. Disclosure rows, evidence and calculations are unchanged.
- Utah's source header records the September 12 audit's official PDF retrieval.
  The complete body independently matches the audit's original body hash. The
  digest advances for the header and the verification date for the corrected
  reading. The existing surface now reports its official publisher; the origin
  count becomes 14 of 15 disclosure specs. This does not upgrade content assurance.
- California's current Financial Code §§22800–22807 are retained as a separate
  active source. SB 362's January 1, 2026 numbering is explicit: §22805 estimated
  APR, §22806 pricing communications, §22807 enforcement. The state-rider metadata
  now cites the specific §22806(b) duty, and the stale unverified comment is gone.
  Its original §22806 pricing citation was substantively correct.
- The regulation's published §953(b) reference remains untouched. California's
  three prescribed-form specs still use the regulation. All 211 authored clause
  bodies, versions, gates, fields, draft/null-author status and examination
  records remain unchanged.

The [correction record](../../research/mca-utah-california-corrections-2026-09-12/README.md)
contains exact source URLs, retrieval times and hashes, source-reuse details,
the section mapping, implementation choices and validation. Existing research
manifests and captures remain immutable; only the active sources advance.

## Validation and handoff

Twelve targeted regressions failed first. The final focused selection passes
**9 files / 251 tests**, including coverage, provenance, source classification,
the conformity surface and clause metadata/fingerprints. Changed TypeScript
formatting and source-integrity checks pass. Broad local builds/tests/typechecks
are left to CI under the merged efficiency policy.

The exact base has successful executed Playwright evidence:
[run 34719946377](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34719946377).
PR CI supplies the after-change Playwright, complete build/test and separate type
gates. The author owns failures through green on the final PR head; final results
will be recorded in the PR/task without another code push.

The precise California metadata change lapses old approvals for that state-rider
assessment and can invalidate review links covering it through existing
fingerprints. No DB migration, dependency change, stored-template rewrite or
production action occurs. No additional manual browser sweep is needed for the
existing rendering, covered by the focused surface tests.

Next: Shwet starts one fresh independent legal-surface review, then merges by
hand or explicitly delegates shipping to a fresh session. The implementing
session does not merge or deploy. The assigned shipping session consolidates
this note; this author does not edit STATE.md or other notes.

Virginia's prescribed-form correction remains next separate source work.
Georgia's current full-code access, Missouri's commencement history and the
ancillary agreement/option/template queue remain unresolved as recorded in the
earlier requirements report and settled state. No deployment status is inferred
from the prior batch or from this implementation.
