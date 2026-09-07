# feat/north-carolina-clauses — the second jurisdiction

**PR:** [#114](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/pull/114).

Branched from `038eef66c`, the head of `feat/library-jurisdiction-visible`
(#111), because both touch `lease/clauses/library.ts` and the two were meant to
merge together. **#111 merged into `main` while this was being written**
(`7c9e7a62e`), so the stack resolved itself — `main` has been merged in and this
is now an ordinary PR against it.

---

## What landed

North Carolina, as **17 clauses of its own plus the 36 portable ones it
inherits**. Two commits, and the first is a bug fix that had to go first.

| | Florida | North Carolina |
|---|---|---|
| Own clauses | 28 | **17** |
| Portable (shared, not copied) | 36 | 36 |
| Total in a lease's library | 64 | **53** |
| Compelled by statute | 6 | **1** (federal lead paint) |
| Interview questions | 70 | **54** |
| Interview steps | 15 | **13** |

Tests **1199 → 1261**. Typecheck clean in both `packages/bizrethink` and
`apps/remix`.

## The verdict: was a second state cheap?

**The clause library, yes. Emphatically.** 17 new clauses and **zero** of the 36
portable ones duplicated. Under the pre-#110 labelling — every clause marked
`US-FL` — it would have been 53 clauses, 36 of them second copies needing a
second attorney in a second state to approve text that turns on no state's law.
The reclassification paid for itself on its first use, and
`clause-jurisdictions.test.ts` now asserts that number so the next state can be
measured against it.

**The interview, no.** See *What is still Florida's* below. The split covers
clause **variables** and nothing else, by construction, and the cost is
measurable: four questions duplicated purely because an `InterviewField` holds
one `statute` note and the two states cite different law; four more questions
that are dead in North Carolina and one of them shows a Florida citation.

**The rule packs, not at all** — and this is the one to plan for. See
*Not in this PR* below.

## Commit 1 — the latent bug, fixed first

`libraryFor()` landed in #110 and was wired into `buildLeaseDocuments` and the
two counsel surfaces. **Four other call sites went on reaching for the Florida
module's whole export**, and while Florida was the only state with clauses the
two were the same 64 objects, so nothing could be wrong. Each is wrong
differently the moment a second state exists:

- `matter.validate` — validates a North Carolina lease against Florida's clause
  set. The brief named this one.
- **`createEnvelopeFromMatter`** — the one that matters most, and it was not in
  the brief. It runs the **attorney-review gate** over Florida clauses and then
  renders North Carolina ones, twenty lines apart in the same function. The gate
  and the document stop describing the same lease, and an unapproved North
  Carolina clause passes a check that never looked at it.
- `leases.$id.tsx` — tells the landlord which clause each answer lands in,
  computed from the wrong state.
- `clauseLibrary.approve` — the **opposite** case. It now says `ALL_CLAUSES`,
  because staff must be able to record an approval against a clause of any
  jurisdiction; scoping it would make North Carolina unapprovable.

The rule for deriving a lease's jurisdiction was also written by hand in three
files and missing from a fourth. It is `jurisdictionForProperty` now, once, and
the fallback is a named constant that **records that it is fail-open**: a
Georgia property gets Florida's radon disclosure. That was already true; it is
now a documented default with a test on it rather than something to discover
from a rendered lease.

## Commit 2 — North Carolina

### What North Carolina does NOT get, and why

Nine Florida clauses do not travel, each because a Florida statute is the only
reason it exists:

| Florida clause | Why North Carolina has no analogue |
|---|---|
| `maintenance.shift-single-family` | **The important one.** Fla. §83.51(2) expressly lets a lease shift duties on a single-family home or duplex. **N.C. §42-42(b) permits that only by a *subsequent* written contract "supported by adequate consideration other than the letting of the premises"** — a lease is neither. The shift cannot live in the lease at all. |
| `maintenance.tenant-repair-threshold` | Same subsection, same answer. A $150 repair threshold in the lease is a shift of §42-42(a)(2)/(4) duties. |
| `maintenance.storm` | Built on the §83.51(2) allocation and gated on the same property types. |
| `maintenance.pool-safety` | Ch. 515, Fla. Stat. North Carolina has no lease-facing pool provision. |
| `termination.early-election` | §83.595(4) is a Florida election with a prescribed addendum. |
| `term.non-renewal-notice` | §83.575's 30–60 day reciprocal notice. §42-14 governs periodic tenancies and says nothing about a fixed term. |
| `notices.electronic-delivery` | §83.505's signed addendum. **North Carolina needs none** — its notices clause simply permits e-mail. One clause where Florida needs two. |
| `disclosure.radon` / `disclosure.flood` | §404.056(5) and §83.512. Neither exists in North Carolina — see the statutory walk below. |
| `cdd.assessments` | Ch. 190 community development districts are a Florida creature. |
| `deposit.statutory-notice` | §83.49(2)(d)'s verbatim all-caps disclosure. North Carolina prescribes no legend. |
| `access.annual-inspection` | Framed on the §83.56(2) cure, which has no North Carolina equivalent. |
| `hoa.cure` | §720.305(1). |

### North Carolina clauses with no Florida analogue

- **`fees.litigation-nc`** — §42-46(e)–(i). The same shape as the §83.67(5) find:
  a remedy available **only "pursuant to a written lease"**. A North Carolina
  lease that omits it has silently given up four things — the complaint-filing
  fee, the court-appearance fee, the second-trial fee and attorneys' fees — and
  nothing would ever have said so.
- **`default.notices-nc`** — reserves a right of reentry. **§42-26(a)(2) makes
  summary ejectment for a non-monetary breach available only where the estate
  has ceased "according to the stipulations of the lease".** A North Carolina
  lease with no forfeiture stipulation has no ground at all beyond unpaid rent
  and holding over. Florida needs no equivalent; §83.56(2) supplies it by
  statute.
- **`deposit.escrow-notice-nc`** — §42-50's trust-account-or-bond regime, and
  the out-of-state-account-requires-a-bond rule that has no Florida counterpart.

### The divergence guard

Seven pairs are pinned as **must never be merged**, each asserting the two texts
differ *and* that each carries its own state's distinguishing phrase — so a
future deduplication fails loudly rather than at signing. Borrowed from the MCA
vertical (10 CCR §914 vs 23 NYCRR §600.6).

| What | Florida | North Carolina |
|---|---|---|
| Where the deposit is held | 30 days from **receiving the money** (§83.49(2)) | 30 days from **the beginning of the lease term** (§42-50) |
| Returning the deposit | 15/30 days from the tenant **vacating** (§83.49(3)(a)) | 30 days from **termination AND delivery of possession**, plus a two-stage 30/60 accounting Florida has no equivalent of (§42-52) |
| Landlord's repair duty | may be altered for a single-family home (§83.51(2)) | arises only on the tenant's **written** notice; not alterable in the lease (§42-42(a)(4), (b)) |
| Alarms | "Nothing makes Tenant responsible for repairing a device" | tenant **reimburses** a disabled or damaged alarm (§42-44(a2)); landlord has **15 days** (§42-42(a)(5)) |
| Landlord's entry | closed list, 24 hours, 7:30–8:00 (§83.53) | **no entry statute exists**; the lease is the whole of it |
| Property left behind | §83.67(5) **takes** relief from the storage duty, with a legend | §42-25.7 **disclaims** — distress is contrary to public policy |
| Waiver | must carve out §83.56(5) — accepting rent **waives** | says nothing about rent; §42-26(c) runs the other way and lives in the default clause |

Two dollar-for-dollar traps worth naming: **both states say "30 days" twice
about a deposit and not one of the four means the same thing**, and the alarm
pair reads as a formatting difference while reversing who pays.

### What the statutory walk found

Chapter 42 read end to end, plus a full-corpus search of the General Statutes
(all 396 chapters) and 21 NCAC 58, verified against ncleg.gov on 2026-09-06:

> **North Carolina compels no lease text at all.** Nothing says a residential
> lease "shall contain" anything. No radon, mould, flood, bedbug, asbestos or
> methamphetamine lease disclosure exists. "Radon" appears **once** in the
> entire code and is sale-side (§47E-4(b)(6)). There is **no landlord-identity
> requirement** — §42-44(c1) is a safe harbour against a duty the State never
> created. There is **no entry-notice statute**.
>
> The all-caps legend and the escrow-identity disclosure people expect to find
> are in **Chapter 42A**, which governs vacation rentals and is excluded from
> Article 5 by §42-39(a1).

So the compelled count for a North Carolina lease is **one**: the federal lead
disclosure, arriving on the portable tier. Asserted, not described.

## What is still Florida's — the honest cost

`interview-florida-leak.test.ts` measures and **pins** it, so it can shrink but
not grow.

- **Four questions are dead in North Carolina** — `earlyTerminationOffered`,
  `electronicNoticesElected`, `hasCdd`, `nonRenewalNoticeRequired`. Each gates a
  Florida-only clause; a North Carolina landlord answers and nothing changes.
  Three of them **display a Florida citation**.
- **`propertyType` cites Fla. Stat. §83.51(2)** to a North Carolina landlord. It
  is shared and required, so it cannot simply be marked.
- **Two step intros** (`property`, `review`) frame themselves as Florida's.
- **Four questions duplicated** (`ncDepositInstitution`,
  `ncDepositInstitutionAddress`, `ncNoticeName`, `ncNoticeAddress`) that could
  have been shared, purely because an `InterviewField` holds **one** `statute`
  note.

**Root cause.** The derived marking in `interview-jurisdiction.test.ts` is
correct and self-maintaining, and it can only see clause **variables**. Facts
and money fields decide which clauses are *selected*, so no clause lists them
and the rule sees nothing — it actively **forbids** marking one, because a
marking it cannot verify goes stale.

**Deriving fact markings from `includeWhen` source text was tried and
rejected**: it marks `propertyType` as Florida-only and removes a required
question from North Carolina's interview, because every clause branching on the
property type happens to be Florida's.

The real fix is a design change — per-jurisdiction teaching on a field, and a
marking mechanism that can read `includeWhen` safely. Not in this PR.

## Not in this PR

- **The rule packs, and this is the finding to plan for.** `validateAnswers` is
  called with `US_FL` at six sites and **`RulePack`'s TYPE is Florida-shaped**:
  fields for a deposit-return deadline, an entry-notice floor, an early-
  termination cap. It has nowhere to put North Carolina's late-fee ceiling (the
  *greater* of $15 or 5% of rent), its deposit ceiling by tenancy type
  (§42-51(b)), or its two-stage 30/60 accounting. **So a North Carolina lease is
  still numerically validated against Florida**, which would flag its lawful
  30-day deposit deadline as exceeding Florida's 15. The clause library
  generalised; the rule-pack type did not. Left as its own change rather than
  guessed at, because these figures *block* a send.
- **Nothing enforces §42-46's late-fee cap.** The cap is recited in the clause
  text where a landlord reads it; a landlord who enters more gets a lease that
  states the limit and then exceeds it, with nothing objecting. Same root cause.
- The utility-billing gap (see below).
- Any migration, review-link scoping (#111), or NC-specific PDF layout.

## Decisions I made that you did not specify

1. **North Carolina slugs end in `-nc`, and it is load-bearing.**
   `loadClauseApprovals` keys approvals by slug alone and keeps only the newest
   row per slug, so a Florida and a North Carolina `deposit.return` sharing a
   name would let one state's approval hide the other's — the second clause
   reading as unapproved forever, nothing red. The fingerprint would still
   fail-closed, but the row would be invisible. Florida's slugs stay unsuffixed;
   a third state suffixes.
2. **`fees.litigation-nc` is always included, with no election.** Every figure
   is a statutory maximum, a lease that reserves the fees can still decline to
   charge them, and a lease that omits them cannot later choose to. The §83.67(5)
   lesson. An election is a reasonable follow-up.
3. **North Carolina is now an option on the counsel share form.** #111 wrote
   "adding the second is one entry and one `<option>`". Without it the 17 new
   clauses could never be sent for review, and attorney review is the critical
   path. Strictly beyond "not in scope: making NC selectable in the UI".
4. **Whole-library tests were repointed from the Florida module to
   `ALL_CLAUSES`** — `library-invariants`, `clause-jurisdictions`,
   `why-this-clause`, `interview`, `interview-jurisdiction`, and three prose
   scans. **This was not cosmetic:** with them left as they were, all 17 North
   Carolina clauses were exempt from every invariant — unique slugs, section
   order, dangling supersedes, the pinned citations, the publish guard — and the
   whole suite was green. That is this repo's characteristic failure, arriving
   in the same commit as the feature it guards.
   - Merging the two module maps by spread **silently dropped Florida's
     `maintenance`, `boilerplate` and `useAndRemedies`**, because both states use
     those names. Caught on the first run; the map is prefixed now.
   - `final-polish`'s "forwarding address stated once" is now **per
     jurisdiction**, because both states have a deposit-return clause and they
     can never co-occur. Scoped rather than relaxed to a count.
5. **`venueCounty` lost the word "Florida" from its label** and is asked in both
   states. Not decided here — the derived test computed it and failed until the
   marking came off.
6. **North Carolina's interview is 54 questions over 13 steps against Florida's
   70 over 15** — measured, not estimated. Two steps disappear entirely
   (`maintenance`, whose only questions are the Florida repair threshold, and
   `disclosures`, whose three are the §83.512 flood answers). Two deposit
   questions vanish because §42-52 fixes both deadlines where Florida's
   §83.49(3)(a) sets maxima the landlord chooses under. The only place a second
   state made the product *shorter*.

   *(An earlier draft of this note asserted 76 and 69. Both were invented and
   neither was measured. Recorded because a number nobody checked is precisely
   what the STATE.md clause-count correction on `main` was about.)*
7. **`seedMatterFromProperty` now seeds the North Carolina notice fields from
   the same two property columns as the Florida ones.** They are separate
   questions because the teaching differs, but they are the same fact and the
   property already holds it. Seeding only the Florida pair would have made a
   North Carolina landlord retype what the product knows — the exact redundancy
   that hid the §83.505 defect.
8. **`deposit.permitted-uses-nc` was written and then dropped.** §42-51(a) is a
   closed list and enumerating it is protective, but North Carolina neither
   requires it nor has a Florida clause it replaces, so it failed the scope rule.
   Recorded here rather than silently omitted.

## Questions for counsel

Nothing below was guessed at in the clause text; each is a place where the
clause states what the **parties agree** and asserts nothing about the law.

1. **Does §42-50's trust-account duty reach advance rent?** Chapter 42 has no
   advance-rent concept — unlike Fla. §83.49(1), which names it expressly.
   `deposit.advance-rent-nc` promises to hold it alongside the deposit, which is
   the conservative arrangement, and claims nothing about the Act.
2. **Does §42-51(b)'s ceiling (two months' rent above month-to-month) count
   advance rent toward the deposit?** If it does, a lease taking two months'
   deposit plus a last month's rent may exceed it.
3. **Is a lease-body minor-repair threshold a §42-42(b) shift?** We assumed yes
   and gave North Carolina none. If it is not, the Florida clause could travel.
4. **Is a private pool at a single-family rental a "public swimming pool" under
   §130A-280?** North Carolina gets no pool-safety clause on the assumption it
   is not.
5. **May all three §42-46 administrative fees be *reserved* together**, given
   §42-46(h)(1) permits charging and retaining only one per complaint?
   `fees.litigation-nc` reserves all three and states the limit.
6. **Does §42-46(l) require anything of our generic `insurance.renters`
   clause?** It bars designating a carrier and caps the admin fee at $50/yr. Our
   clause does neither, so we believe not.
7. **Utility billing — a named gap.** Where a landlord bills for water, sewer,
   electric or gas under §42-42.1 and §62-110(g)–(j), NCUC Rules R18-7(g),
   R22-7(g) and R24-7(g) impose requirements at or before signing, and R18-6(a)
   caps the administrative fee at $3.75 and bans RUBS. **No clause covers this**,
   because the interview records who *pays* a utility and not whether the
   landlord *bills* for one. Flagged rather than omitted.
8. Still open from #110: **does an approval of a portable clause travel between
   states?** `PORTABLE_APPROVAL_TRAVELS` is the one line that changes.

## Verified by rendering, not only by unit test

`buildLeaseDocuments({ ..., jurisdiction: 'US-NC' })` over the Picana answer set:

    DOCS 3        Residential Lease | Pet Addendum | House Rules
    CLAUSES 40    numbered 1 … 12.x, sections in document order
    FLORIDA CLAUSES IN AN NC LEASE: 0
    MISSING       exactly the 7 new North Carolina variables the Florida
                  fixture cannot answer — nothing renders as a raw {{token}}

"Green tests do not mean complete code" is this repo's own lesson; the document
assembling, numbering and containing no Florida clause is the part a unit test
would not have caught.

## Verification

    cd packages/bizrethink && npx vitest run                # 1259 passed
    npx tsc --noEmit -p packages/bizrethink/tsconfig.typecheck.json
    cd apps/remix && npx react-router typegen && npx tsc --noEmit -p tsconfig.json
    npx biome format packages/bizrethink                    # the blocking CI check

Root `npm test` still cannot run on the workstation — Node 26 vs the repo's 22.

## Still true

Every North Carolina clause is `status: 'draft'`, `attorney-drafted` with
`author: null`. **Nothing here has been read by a lawyer**, and the publish
guard keeps all 17 unsendable to a third party. The library is now unreviewed in
two states instead of one.
