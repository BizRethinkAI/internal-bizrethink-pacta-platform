# chore/mca-source-verification — source audit before ADR 0014

Owner authorized verifying the repository's existing MCA source provenance and
versions before targeted legal research and the ADR 0014 backfill. Branch starts
from merged main `0c440a396c9b5f5c9161538358fc08ff120fdc80` (#172). This is a
documentation/evidence PR, not the clause-classification implementation.

## Durable result

The [audit report](../../research/mca-source-audit-2026-09-12/README.md) and
[manifest](../../research/mca-source-audit-2026-09-12/manifest.json) account for
**all 16 saved text files across 11 states**. The current clause count is 211;
ADR 0014's 219 is historical. Each file now has an exact newly retrieved
official URL, UTC retrieval time, raw-response hash, identified version,
whole-body comparison and separate currency assessment. Unknown original
retrievals remain unknown. Fourteen saved bodies match official publications;
both Virginia form extractions differ from the officially linked form.

Findings to carry forward:

- Connecticut's base volume matches the saved statute, but the 2026 supplement
  updates **three** sections: 36a-868 (technical punctuation), 870 (registration)
  and 872 (commissioner action). The August 2024 guidance still matches the
  official PDF; its registration discussion predates those statutory changes.
- Missouri 427.300 has a 2025 premium-finance exemption absent from the saved
  2024 omnibus act. Both Revisor versions are retained for comparison.
- Florida's saved Engrossed 1 text matches the enrolled act, but its depository
  institution definition was replaced in 2024. Current six-section text and the
  amendment PDF are retained. The other five sections and the other definitions
  match after documented publication normalization.
- Virginia's current regulator-linked October 2022 form changes a key label,
  related formula, estimated-payment qualification and layout. Save the
  supplied official PDF/extractions for a deliberate prescribed-form update;
  do not just bump the old digest/date.
- Utah's apparently 2022 chapter PDF actually includes the 2024 amendment and
  is still selected by the current index. Its 7-27-202(3) agreement-content duty
  disproves the old “Texas only” inference. The sources README is corrected;
  the historical Texas `.txt` preface is unchanged and subject to that correction.
- Kansas's source is introduced text. Its operative text matches the enrolled
  act and current code after section-title/reference normalization; preserve
  the Revisor's `(iii)`/`(B)` annotation rather than silently repairing it.

Current-source qualifications remain explicit for CA/NY consolidated regulations,
Georgia later code history, CT guidance-index linkage and Texas codified rules.
The full eleven-state agreement-requirements walk, missing underlying statutes
and implementing rules remain the targeted next research task. A source match
does not justify marking an uncited clause discretionary or compelled.

## Scope and verification

No original source text, production digest, verification date, clause status,
application code, database, source conformity rule or user flow was changed.
Thirteen evidence files include the two official PDFs needed to inspect the
Virginia form/Florida amendment visually and selected current statutory text.
The manifest records 46 relevant official document/index retrievals with TLS
verification enabled, including explicit qualifications for nontext portals.

Local validation is limited to artifact integrity: all sixteen originals still
match their base-commit hashes; all evidence hashes/byte counts and manifest
references resolve; source-body and enactment/code comparisons support the
reported matches; relative report links resolve. Original/form PDF pages and
Florida amendment markings were visually checked. No application browser,
full local build, broad local unit run or duplicate local typecheck was needed.
CI remains the final validation gate; record its result when available.

Guard 5 required folding the already merged #172 note into STATE and deleting
it. Its merge was confirmed via GitHub; this audit does not claim a deploy.
After this PR opened, the queue check found that concurrent **#173 / A-04** had
also folded #172. This PR adopts the A-04 author's exact STATE summary, keeping
the shared fold identical rather than introducing two competing narratives.
No #173 application change is included. The merge session should retain that
fold once and compact the next merged note as required by Guard 5. Audit PR:
[**#174**](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/pull/174);
its Checks and PR description carry the final CI result for the reviewed head.

## Collaboration agreement and next session

Keep full reading/history and detailed handoffs. Use one bounded coherent task
per PR, focused TDD for behavior changes, and let GitHub CI run comprehensive
final tests/builds/typechecks. Browser work is for meaningful rendered behavior,
not automatic ceremony for every text/documentation change. The owner reads the
PR and merges manually or explicitly starts review-and-ship; this implementing
session has no merge/deployment authorization. No independent review agents
were started by the implementation session.

Next: review this evidence, make the targeted source/conformity corrections,
close the listed authority gaps and build the eleven-state agreement-duty map.
Then backfill WhyThisClause/ClauseVariance across the 211 records, using the
accepted ADR model. Original drafting stays draft with null authors. ADR 0011
guaranty numbering/placement, template/form migration and the other commercial
interview gaps are still separate; this audit does not finish them.
