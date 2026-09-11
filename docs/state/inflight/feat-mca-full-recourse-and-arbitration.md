# feat/mca-full-recourse-and-arbitration

Three product decisions the owner took on 2026-09-11, authored into the FRPA
clause library. All three were left deliberately unauthored during the
2026-09-10 rewrite because they are product decisions rather than drafting ones,
and each was named as an open gap at the time — in ADR 0013, in
`every-fact-value-is-reachable.test.ts`'s `GAPS`, and in the code comments above
§9.2 and §7.11.

## What landed

**Five new records.** FRPA 100 → 105, all instruments 203 → 208. Counts moved in
`clauses/__tests__/frpa-coverage.test.ts`, `library.test.ts` and `surface.test.ts`
in the same commit, as ADR 0013 requires.

| record | number | gate |
|---|---|---|
| `frpa.full-performance-guaranty-9-2` | 9.2 | `guarantyScope === 'full-performance'` |
| `frpa.full-performance-guarantor-waivers-9-4` | 9.4 | same |
| `frpa.full-performance-joint-and-several-liability-9-5` | 9.5 | same |
| `frpa.full-performance-guarantor-acknowledgement-9-6` | 9.6 | same |
| `frpa.arbitration-7-26` | 7.26 | `disputeResolution === 'arbitration'` |

**One gate removed.** `frpa.contractual-statutes-of-limitations-7-19` becomes
`includeWhen: null`. See below.

## Decision 1 — the full-performance guaranty is four records, not a widened gate

§§9.4, 9.5 and 9.6 each cite §9.2 by number and each states something that is
**false** under a full-performance guaranty: §9.4 that bankruptcy creates no
liability "without independently proven conduct covered by Section 9.2", §9.5
that liability is "determined separately under Section 9.2", §9.6 that "Section
9.2 creates limited personal or entity liability". Redrafting the three to be
true under both values would mean deleting from the `limited-conduct` template
the sentences that make the limited guaranty limited — which is the one
better-than-market term in this document.

So each is an **exhaustive pair** in ADR 0013's §4.15/§8.2 shape: same section
number, opposite rule, mutually exclusive gates. `guarantyScope: 'none'` selects
neither, exactly as `renewalModel: 'none'` selects neither §8.2.

**§9.2's limited-conduct record is untouched**, including the insolvency,
business-failure, bankruptcy, avoidance and clawback exclusions.

## Decision 2 — arbitration is one new clause, and it points rather than restates

§7.26 carries the agreement to arbitrate, the place of any in-person hearing, who
pays the arbitrator, a bilateral-arbitration (class) limb, and the preserved
public-enforcement and regulator rights. It states **no forum rule of its own**:
§7.5 puts law and forum in the merchant's state and §7.24 claims priority over
any different forum provision, and a third rule on that subject is the defect
§7.5 was carrying.

VERIFIED against `mca/sources/VA-Code-6.2-2228-2238.txt`: **Va. Code
§6.2-2234(B)** — a covered contract may not require face-to-face arbitration
outside the jurisdiction of the recipient's principal place of business, and
*"The provider shall pay any arbitrators' expenses or fees or any other expenses
or administrative fees incurred in the conduct of the arbitration proceedings."*
Both are drafted nationally so that Virginia is satisfied by construction rather
than by a rider, which is the device §7.5 already uses for §6.2-2234(A).

## Decision 3 — §7.19 gets a mutual two-year period, and loses its gate

The period is **the owner's commercial decision of 2026-09-11**. It has no
verified source: memo entry 075 fixes no period, and the two-year figure appears
nowhere in this repository or in `lombard-contracts` except an orchestrator's
note. The clause comment says exactly that.

**The `courts` gate goes.** A limitation period applies in arbitration too, and
once the clause states an operative period rather than a disclaimer, its absence
from an arbitration template stops being a redundancy and becomes a hole — the
funder loses the term it just decided to have, in the forum where it matters
most. ADR 0013's diagnostic: `disputeResolution` answers *where a claim is
heard*, §7.19 answers *how long there is to bring it*. Different questions, so
the gate is misattributed rather than too coarse, and the fix is `includeWhen:
null` plus a cross-reference from §7.26.

## Blocked, and not ours to fix

**§6.1 nullifies the full-performance guaranty.** `frpa.events-of-default-6-1`
is ungated and says *"This Section controls any inconsistent term of this
Agreement"*. It also says a covenant breach that is not one of the three Events
of Default *"does not create liability for any Guarantor"*. A guaranty of every
representation, warranty and covenant is inconsistent with that sentence, and
§6.1 wins by its own terms.

`frpa/default.ts` is not this change's file. The conflict is pinned in
`__tests__/a-full-recourse-guaranty-is-still-a-purchase.test.ts` so it cannot be
mistaken for closed, and it needs an owner decision before a `full-performance`
template can be assembled coherently.

## Tests touched outside the two clause files, and why each was unavoidable

Two new files hold the new properties, both stated over the assembled document:
`clauses/__tests__/a-full-recourse-guaranty-is-still-a-purchase.test.ts` (51 of
62 assertions red before the bodies existed) and
`clauses/__tests__/an-arbitration-clause-is-one-forum-rule.test.ts` (23 of 31).
Every assertion in both was additionally checked by mutation.

Five existing files moved. **None had an assertion weakened to let code pass**;
each either records a count, or records a design decision the owner changed.

| file | what moved | why it could not stay |
|---|---|---|
| `clauses/__tests__/frpa-coverage.test.ts` | 100 → 105 | record count |
| `clauses/__tests__/library.test.ts` | 203 → 208 | record count |
| `clauses/__tests__/surface.test.ts` | 203 → 208 | record count |
| `clauses/__tests__/a-signature-for-merchant-is-not-a-guaranty.test.ts` | 100/203 → 105/208 | **a fourth pinned count**, not in the brief's list of three |
| `clauses/__tests__/a-default-judgment-needs-a-served-defendant.test.ts` | `BUNDLE` 4 → 3; `SHORTENS_LIMITATIONS` widened; one assertion retargeted | §7.19 left the bundle, and its "shortens no limitation period" assertion encoded the decision the owner reversed |
| `engine/__tests__/every-fact-value-is-reachable.test.ts` | `disputeResolution:arbitration` deleted from `GAPS` | its own docstring: *"Adding an arbitration clause makes this fail, and the fix is to delete a line from `GAPS`."* |
| `engine/__tests__/select-clauses.test.ts` | §7.19 asserted as **not** dropped; §7.26 asserted as added; one stale `KNOWN_GAPS` note corrected | it pinned §7.19 as part of the arbitration drop |

The widened `SHORTENS_LIMITATIONS` is the one worth reading twice. Left as it
was, it would have gone on asserting `false` — "this clause shortens no
limitation period" — against a clause that now shortens one, purely because the
two-year period is phrased "shall be brought within" rather than v4's "must be
commenced within". That is the vacuous green this package exists to refuse, so
the detector was widened to catch the new wording and the assertion retargeted
to the stricter property. The v4 control still fires on the one-sided one-year
clause.

**`clauses/facts.ts` still describes `disputeResolution` as deciding "four
clauses as one bundle", and it is three.** That file was out of scope for this
change and is not edited. It is the only prose left describing the old design.

**`docs/adr/0013`'s consequences section still lists `full-performance` as a
named gap.** ADRs are append-only, so it stays; a later ADR supersedes it.
