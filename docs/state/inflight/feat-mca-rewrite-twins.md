# feat/mca-rewrite-twins — the Equipment Lease and the Subscription

**Status:** branch only. Not pushed, no PR, nothing published to Pacta.

Rewrites **ten clause records — five sections in each of two documents** —
because finishing the FRPA made these dangerous rather than safe.

`instrumentsFor(LOMBARD_FACTS)` returns six instruments, and both twins are
among them whenever `equipment !== 'none'`. So the same natural person, in the
same envelope, signed the rewritten FRPA and then signed a personal guaranty
saying *"upon such mailing, service shall be effective irrespective of whether a
signed certified mail return receipt is returned."* **Fixing the FRPA and
shipping these unchanged is worse than not having fixed the FRPA, because it
looks addressed.**

## What changed

Both twins, identically. §3.14, §3.15, §3.16, §4.3, §4.4.

| § | was | is |
|---|---|---|
| 3.14 | subordinates insider debt until *"the obligations due to us are paid and satisfied in full"* and releases subrogation to the Equipment — the whole agreement, including the payments §4.2 says the Guarantor does not owe | both limbs tied to the obligations §4.2 guarantees; subrogation deferred rather than released, and restored on payment of fair market value under §4.2(a) |
| 3.15 | Florida law, **exclusive** Pasco County venue, and three one-sided provisions under the same caption | law and forum in the customer's own state; mutual self-limiting jury waiver; no class waiver; no shortened limitation period; Article 9's mandatory perfection and priority rules preserved |
| 3.16 | *"Notices sent to the Lessee's last known address … shall constitute effective notice"* | notice at an abandoned address is not effective; the address duty loses its consequence; notices and legal process separated by name |
| 4.3 | nonreliance representation, inconvenient-forum waiver with the cost recited first, service effective on mailing | service left to the procedural law of the court; the three mechanisms denied by name; §7.22's replacement for the nonreliance sentence |
| 4.4 | one-sided jury waiver, class-participation waiver, one-year limitation, all against a natural person | the same three answers as §3.15, word for word, so the guaranty and the agreement cannot drift the way §3.14 and §4.2 did |

**No new divergence was declared and `twins.ts` was not edited.** All five
sections say the same thing in both documents, all eleven
`TWIN_VOCABULARY_EXCEPTIONS` still fire, and the divergence register stays at
the five it had — every one of which is about title or the collection mechanism
and none about a dispute. Declaring a rewritten clause divergent would have made
`twins.test.ts` green with one document fixed; `the-twins-cannot-undo-the-frpa`
asserts that it was not done.

## The test came first

`packages/bizrethink/mca/clauses/__tests__/the-twins-cannot-undo-the-frpa.test.ts`,
written before any body existed: **34 assertions red, 30 green** (the 30 being
the detector controls in both directions, the twin-parity assertions — green
because both documents were identically defective — and the FRPA-consistency
regression guards). Deleting the two entries from the `CONCEDED` register in
`a-default-judgment-needs-a-served-defendant.test.ts` made **3 more** red, for
**37**. All 37 are green now; the whole MCA suite is **2626 passed**.

The property is stated **over the set of both documents**, because the defect is
never in one clause: venue is fixed in §3.15 and recited in §4.3, and the jury
waiver, the class waiver and the one-year period each appear **four times** —
twice per document, in two live templates.

## Two tests outside the two directories were edited, and why

Both were unavoidable and neither weakens an assertion.

1. **`a-default-judgment-needs-a-served-defendant.test.ts`** — its `CONCEDED`
   register named both §4.3 records with owner *"UNASSIGNED. No cluster
   follows."* Its own rule is that an entry fixed elsewhere fails the file until
   deleted. Deleted, the sweeps now run unfiltered over all 203 clauses, and the
   finding is preserved as a comment.
2. **`coverage.test.ts`** — `linesNotAccountedFor` requires every line of the
   vendored `.docx` to appear in a clause body. After the rewrite it required
   the defect. **Retired for the two twins only**, on ADR 0012's authority and in
   the exact shape of `frpa-coverage.test.ts`'s retirement; it still runs for the
   ISO PRA, so it can still be red. Neither cheap silencing was used — the eleven
   lines per document were *not* declared non-clause (that passes by
   construction, and they *are* clauses), and `bodiesVerifiedAt` was not nulled.
   The source digest assertion is untouched and still guards the `.docx`.

The unaccounted lines were **exactly eleven per document, the same eleven in
both, and nothing else** — which is independent evidence the rewrite touched
what it meant to.

## Handed back, not done here

**The `.docx` files in `lombard-contracts` still print all twenty-two of those
lines.** The library and the documents now disagree, deliberately. Conforming
them is a form change in that repository — and a re-vendor and a digest re-stamp
here afterwards. Nothing was published to Pacta and no session was messaged.

Also for `lombard-contracts`: **`el-4-3-...`'s proposed fix is superseded.** It
says *"Conform 4.3 to FRPA 7.12: service complete on actual receipt or on return
as refused or undeliverable"* — that is v4's §7.12, which the `disputes-service`
rewrite deleted **as the defect**. The manifest entry is `open` with "No document
change made", so nothing was built on it, but it should not be implemented as
written.

## Open, and each belongs to somebody else

- **`lease-disclosure-assumes-a-purchase-option-the-subscription-does-not-grant`**
  — blocker, open, owner's. 10 CCR 915 and 23 NYCRR 600.14 prescribe a Total
  Payment Amount that assumes a purchase option; the Subscription's §3.7 grants
  none. Platform is holding templates 117/118. Untouched, and §3.7 is a declared
  divergence.
- **§3.9** — `sole-and-exclusive-remedies-points-at-an-empty-set` and
  `excludes-personal-injury-and-omits-the-carve-out-3-11-has`, both HIGH, both
  open. Not fixed: REVIEW-02's own fix needs a commercial value (a replacement
  period) this session may not invent, and it says the exclusivity question
  should go to counsel.
- **§4.5** — `fcra-authorisation-runs-to-a-different-entity-than-the-frpas`.
  REVIEW-02's fix moves it into FRPA Section 9, which is outside these two
  directories.
- **§4.6** — the guarantor consents to recorded and automated calls *"on my
  behalf and on behalf of Lessee"* with no recital of authority to bind the
  entity. Same shape as the §4.4 finding, one clause later. Reported, not
  redrafted.
- **`equipment-lease.parties` and `subscription.parties`** carry *"a Florida
  limited liability company"* in the body — a tenant fact baked into a clause,
  which `tenant-agnostic.test.ts` does not catch because it looks for names.
- **Conspicuousness.** Capitals were dropped from the jury waiver on FRPA
  §7.10's rule. No vendored authority fixes what is required. Now an open
  question on three documents rather than one.
- **`examinedBy` over-claims**, as on every rewritten FRPA clause. Every record
  still carries its REVIEW-01 / REVIEW-02 examinations, and those reviews read
  text that no longer exists.

## Verified, and not

- **VERIFIED**, `mca/sources/CT-CGS-36a-861-872.txt`: Conn. Gen. Stat.
  §36a-861(6)(E) excludes a person who extends or brokers *"a lease, as defined
  in section 42a-2A-102"*, which is what REVIEW-02 relies on to say §36a-868 does
  not reach these documents.
- **UNVERIFIED, and it cuts one way for one twin only.** §42a-2A-102 is not
  vendored and nobody here has read it. Article 2A's "lease" excludes a
  transaction creating a security interest, and the **Equipment Lease's own §3.6
  says it creates one "rather than a true lease"** while the Subscription's §3.6
  says the transaction *"shall be treated as a lease"*. So REVIEW-02's exclusion
  may reach one document and not its twin. The drafting sidesteps it: neither
  document gives up notice, a judicial hearing or a prior court order.
- **Va. Code §6.2-2234(A) does NOT compel merchant-state venue here.** It is
  vendored and it says what `facts.ts` says it says — but it governs
  *sales-based financing*, and an equipment lease is not sales-based financing.
  The reason for the move is the narrower one stated in the test: one envelope
  should not send one signer to two courts under two laws.
- **The "two-year period" was checked again** in `lombard-contracts`, in both
  review registers and in the memo material this repo holds. It is still
  nowhere. No period was invented.

## Gates

`npx vitest run packages/bizrethink/mca` — 66 files, 2626 passed.
`npx tsc --noEmit -p packages/bizrethink/tsconfig.typecheck.json` — clean.
`npx biome format packages/bizrethink` — clean but for `font-data.ts`'s
pre-existing size info.

**Pre-existing and unrelated:**
`packages/bizrethink/regression-tests/trpc-schema-parity.test.ts` fails to import
on `main` as well (an error inside
`packages/trpc/server/organisation-router/update-organisation-settings.types.ts`).
Confirmed by stashing this branch's changes and re-running. Not touched.
