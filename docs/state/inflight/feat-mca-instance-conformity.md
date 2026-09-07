# feat/mca-instance-conformity — checking the numbers, not the blank form

**Branch:** `feat/mca-instance-conformity`. Phase 1 of the MCA roadmap
([ADR 0008](../../adr/0008-mca-is-two-surfaces-not-one.md), plan in
`docs/state/inflight/docs-mca-roadmap.md` on `docs/mca-roadmap`).

Adds `packages/bizrethink/mca/instance/`. Nothing is exported from
`packages/bizrethink/index.ts` — that is phase 2, deliberately.

## The gap this closes

Everything in `mca/prescribed/` validates a BLANK TEMPLATE: spec-against-statute
and blank-form-against-spec. Every defect it has ever found lived in fixed prose.

Three REVIEW-01 blockers were not document defects. The widgets were correct and
correctly placed; the numbers written into them were wrong.

| blocker | what was wrong |
|---|---|
| `ca-funding-provided-is-gross-purchase-price` | row 1 carried $50,000, the gross Purchase Price, where §900(a)(1)(A) wants it net of prepaid finance charges — $47,105 |
| `ca-finance-charge-omits-withheld-fees` | row 3 carried $24,500, the factor spread alone, where §943(a) wants the spread PLUS every Reg Z charge — $27,395 |
| `ca-apr-understated` | row 2 carried 67.4% against a true rate near 175% |

## The design, and why not the obvious one

The obvious approach is to reimplement the arithmetic and compare answers. That
gives two calculators that drift, and no way to say which is right when they
disagree.

Instead this encodes **identities between the disclosed numbers** — relationships
that must hold on any filled form regardless of who computed the values.
Fourteen of them, each carrying verbatim statutory quotations (checked to exist
in the vendored source), our derivation kept in a separate field, and the
REVIEW-01 findings it does and does not catch.

**No rate is solved for anywhere.** Present value is strictly decreasing in the
rate, so the §955 / §600.4 tolerance band on the calculated rate inverts into a
band on the present value at two rates already known. The whole APR question
becomes two closed sums and two comparisons.

## What catches what

| blocker | caught by | needs a second document |
|---|---|---|
| gross purchase price | `amount-financed`, `itemization-agreement` | **yes** |
| omitted withheld fees | `finance-charge` | **yes** |
| understated APR | `apr-round-trip` | no |

**The first two are undetectable from the offer summary alone.** They move the
same $2,895 in opposite directions, so the one identity that needs no second
document — `closure`, total == financed + charge — cancels exactly. It fired on
the real sample only because the total was wrong as well. `instanceCoverage()`
names the blockers a given envelope cannot detect, and a test pins the blind
spot in the tree rather than in a report.

## Findings against the sources of truth

Report these; do not act on them from here.

1. **`DISCLOSURE-COMPUTATION-SPEC.md` is wrong that the states agree on
   tolerance.** 10 CCR §955(a)(1)-(2) say "below"; 23 NYCRR §600.4(a)(1)-(2) say
   "**above or below**". The spec says "where they differ, it is called out" and
   does not call this out. `lombard-platform`'s `withinSection955Tolerance` takes
   no jurisdiction argument, so California's rule is what New York gets —
   stricter than NY requires, so not unlawful, but one state's rule on another
   state's document.
2. **`lombard-platform`'s send-time assertions 1 and 2 are tautologies.**
   `disclosure-math.ts` assigns `fundingProvided = r2(purchasePrice + carried -
   prepaid)` and then asserts `r2(fundingProvided) !== r2(purchasePrice + carried
   - prepaid)`. Same for assertion 2. Neither can ever fire. Only assertion 3
   (the APR round-trip) can, which the spec itself says is "the one that
   matters" — but the spec asked for three and got one.
3. **The spec's Itemization table does not add up on our own deal shape.** It
   makes `amount_financed = amount_provided_total − prepaid_finance_charge` with
   `amount_provided_total` the sum of cash given directly, amounts on account and
   payoffs to others. On a $50,000 deal whose only deduction is a fee Lombard
   retains, those rules give $47,105 − $2,895 = $44,210, contradicting the
   spec's own §900(a)(1)(A) figure of $47,105. 10 CCR §956(b)(1)'s worked example
   resolves it — a fee appears on BOTH the paid-on-your-behalf line and the
   prepaid line — but only because that fee went to a third party.
4. **The sample instance's estimated payment cannot be the disclosed split of
   the disclosed income.** $496.66 per business day is ~$10,785 a month; at the
   disclosed 15% split that implies ~$71,900 of monthly card income, not the
   $15,000 the APR row states. Not one of the three blockers; surfaced as
   undetermined because §942(a) lets minimum payments and true-ups move it.
5. **The weekday phase moves the calculated APR by 3.1 points.** The form states
   that payments fall on business days but not which weekday the first lands on,
   and carries no funding date. That is more than §955(a)(2)'s quarter point.
   The platform's `disclosedAprFrom` floors the rate it computed on one implicit
   phase; on this deal a Monday-phase figure (175.10%) would be an
   *overstatement* under a Thursday phase (171.96%), which California does not
   forgive.

## Not touched, deliberately

- `provenance/` and `lease/` — another session is in `lease/`.
- `lombard-platform` — read, not depended on, not modified.
- `packages/bizrethink/index.ts` — export is phase 2.
- Nothing published to Pacta.

## CI: E2E is blocked by another branch's migration, on the shared runner

**Not caused by this PR, and not fixable from it.** Every other check is green
(Governance, Lint, Build App, Build Docker Image, CodeQL, Analyze ×2, npm audit,
Validate PR title). E2E fails before a single test runs:

```
- Drift detected: Your database schema is not in sync with your migration history.
  [*] Changed the `BizrethinkLibraryReview` table
    [+] Added column `jurisdiction`
- The following migration(s) are applied to the database but missing from the
  local migrations directory: 20260906230000_library_review_jurisdiction
  We need to reset the "public" schema at "127.0.0.1:54320"
npm error code 130
```

`20260906230000_library_review_jurisdiction` belongs to
`feat/library-jurisdiction-visible`, the concurrent lease session's branch. Its
CI ran on the same self-hosted runner at 00:33–00:35 and left the migration
applied in the runner's **shared** development database. `prisma migrate dev`
then refuses on any branch that does not contain that migration, blocks for
confirmation, and is killed — exit 130, which is SIGINT, not a test result.

Same cause as the pre-existing typecheck error below: `additions.prisma` and
`lease-builder-router.ts` are mid-flight on that branch.

**This blocks every branch that lacks the migration, not just this one.** Two
ways out, neither of them mine to take: merge `feat/library-jurisdiction-visible`
to `main` and rebase this branch onto it, or reset the runner's dev database.
Owner's call.

The run before the drift appeared (00:37) did execute the suite: 8 flaky and one
real failure, `[BULK_ACTIONS]: can cancel multiple pending documents`, a
`[role="status"]` toast not appearing within 5s. Three of the four bulk-action
tests failed or flaked in that same run while the other session's CI was
occupying the runner. Nothing in this PR is imported by the application —
`packages/bizrethink/index.ts` is unchanged and no overlay is touched, so no
application code path can reach `mca/instance/`. Recorded rather than dismissed:
it wants one clean E2E run to confirm, which is not available until the drift is
cleared.

## Pre-existing red, not mine

`npx tsc --noEmit -p packages/bizrethink/tsconfig.typecheck.json` reports one
error in `server-only/trpc/lease-builder-router.ts` (`jurisdiction` missing on a
`BizrethinkLibraryReview` create). **It is present on `origin/main` with this
branch stashed** and belongs to the lease vertical. Not fixed here.

## Open

- The five readings in `UNRESOLVED_READINGS` are counsel questions, none
  actioned: the term unit, the direction of the (a)(3) relative test, the
  weekday phase, the carry-renewal term, and which Itemization line carries a
  fee the financer keeps.
- `NOT_CHECKED` in `instance/limits.ts` enumerates fourteen things a filled form
  can still be wrong about. Phase 2 surfaces it beside the findings; nothing
  forces a human to read it today.
