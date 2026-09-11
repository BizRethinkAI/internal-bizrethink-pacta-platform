# feat/mca-events-of-default-pair

**Based on `feat/mca-full-recourse-and-arbitration` (PR #164), not on `main`.**
That branch authored the full-performance §9.2 this change exists to make
coherent, and it is where the pin being retargeted lives.

`frpa.events-of-default-6-1` was **ungated**, so it was in every template, and
it decided the guaranty from inside Section 6. It is now an exhaustive pair on
`guarantyScope`.

## What landed

**One new record.** FRPA 105 → **106**, all instruments 208 → **209**. It adds a
RECORD and no SECTION: both records are §6.1 on the page they appear on, and
every assembled document holds exactly one.

| record | number | gate |
|---|---|---|
| `frpa.events-of-default-6-1` | 6.1 | `guarantyScope !== 'full-performance'` (was `null`) |
| `frpa.full-performance-events-of-default-6-1` | 6.1 | `guarantyScope === 'full-performance'` |

Counts moved in **four** files in the same commit —
`clauses/__tests__/frpa-coverage.test.ts`, `library.test.ts`, `surface.test.ts`
and **`a-signature-for-merchant-is-not-a-guaranty.test.ts`**. The fourth is the
one that is easy to miss: it is a file about the execution grid that pins the
counts to prove §9.1 did not add a record. Its comment now names itself as the
fourth pin so the next change does not have to rediscover it.

## The defect

§6.1 ended *"This Section controls any inconsistent term of this Agreement and
of any document incorporated into it, subject to mandatory law"*, and four
sentences earlier said a breach that is not an Event of Default *"does not
create liability for any Guarantor"*. An Event of Default is one of three kinds
of misconduct. So §6.1 said a guarantor answers for those three and nothing
else, **whatever Section 9 says** — the narrow guaranty, imposed on every
template by a clause twenty pages from the guaranty.

#164's `frpa.full-performance-guaranty-9-2` reaches a covenant failure *"whether
or not that failure is an Event of Default"*. Under the old §6.1 that was text
the document then overrode: the wide guaranty a funder bought was nullified by
Section 6.

## The shape, and why it is not a gated sentence

ADR 0013 rejects limb granularity in terms, and deleting the denial outright
would take it from the `limited-conduct` template, where it is not a defect but
the product's one genuinely better-than-market term. So: same section number,
two records, opposite rules, mutually exclusive gates, **exactly one selected
for every value of the fact** — the §4.15 / §8.2 / §§9.2–9.6 shape.

`guarantyScope: 'none'` takes the **narrow** record, which is where this pair
differs from §§9.2–9.6 (they select neither). A funder with no Guarantor still
needs an Events of Default clause, and the denial is trivially true where there
is nobody to deny. That closed a row in `every-fact-value-is-reachable`'s
`NO_CLAUSE_OWED` register — `guarantyScope:none` is now backed by a clause and
its line is **deleted**, not left standing.

## What replaced the guarantor sentence

Everything else in the two bodies is byte-identical, asserted as a
reconstruction rather than as a diff: the limited body with the one sentence
swapped **is** the full body, so an edit to either that is not carried to the
other is red without anybody remembering there are two.

> *"A breach that is not an Event of Default may support proportionate lawful
> relief for proven direct loss under Section 6.2; it does not make the
> uncollected Purchased Amount payable and does not suspend Merchant's rights
> under Section 3. **Where Section 9.2 guarantees the covenant breached, a claim
> against a Guarantor is limited to that same proportionate lawful relief for
> that same proven direct loss, on the same proof, and is brought only as
> Section 9.2 permits; no breach of this Agreement, and no Event of Default,
> makes the uncollected Purchased Amount payable by a Guarantor.**"*

It **caps and points; it never grants.** That is the house pattern §§4.10, 4.12,
6.2, 6.3, 7.4 and 7.9 already use — every one of them reaches a Guarantor by
limiting a claim and routing it to §9.2. A §6.1 that granted would be a second
guaranty living outside Section 9, which is exactly what
`personal-liability-is-section-9-only.test.ts` exists to catch. **No concession
was needed in that file**, and that is a measured claim: mutating the sentence
to *"a Guarantor shall be liable for the uncollected Purchased Amount on
demand"* turns that file red.

**The bankruptcy / insolvency / business-failure carve-out is unchanged in both
records**, v4's own words including its reach to *"any liability of any
Guarantor"*, and is asserted against `source-documents/Lombard_FRPA_v4.txt`
rather than against a retyped copy. A guaranty that pays when the business
simply fails is the strongest single argument that the transaction was a loan.
That is drafting judgement, recorded in the code comment, not a funder
preference — every market form guarantees covenants while still excluding
business failure.

## The pin, retargeted

`clauses/__tests__/a-full-recourse-guaranty-is-still-a-purchase.test.ts` carried
a block titled *the conflict this change could not close*, written to go red the
day this was fixed. It is **retargeted, not deleted**, and it is stricter:

| before | after |
|---|---|
| one named clause still contains the denial | **no clause of the assembled wide document** contains it — stated over the set |
| — | the wide document holds exactly one §6.1, and it is the full-recourse record |
| — | the **narrow** document still contains the denial, and so does a `none` document |
| §9.2's wide record reaches a non-default breach | unchanged, kept |

One row of the same file's *three ungated sentences* table also moved, because
the clause carrying *"Buyer bears the risk that Purchased Receipts may never
arise"* in a wide document is now the full-recourse record. A new assertion
checks the narrow half says it too, which that row never asked.

## Found by the retargeted pin, and NOT fixed: §6.4

The set-level version of the pin reported `frpa.required-notifications-6-4` on
its first run. It is **ungated** and says *"A failure or delay in giving a notice
under this Section … does not create liability for any Guarantor."*

Read against a guaranty of every covenant, that carves §6.4's own notice
covenant out of the guaranty. It is **not the same defect** — §6.1's denial was
joined to a control clause and reached every covenant, while §6.4's reaches one
section, and §9.2 forbids a clause that *expands* the Guaranty rather than one
that narrows it. But a wide template guarantees every covenant except §6.4's,
and **nobody decided that.** Recorded as a named concession with a reason in the
test, reachable so it fails if it stops matching. **It is an owner decision, not
this change's.**

## Tests

**23 tests red before the record existed**, under the repo's own vitest
(4.1.9), across two files: 20 in the new
`clauses/__tests__/one-section-6-1-per-document.test.ts` and 3 in the retargeted
pin. Green now: **2639 tests, 67 files.**

Four mutations, each turning the suite red, so the greens are evidence:

| mutation | what went red |
|---|---|
| widen the full gate to `!== 'none'` | 6, including the engine's *one clause per section number* and the by-name citation check |
| the full record guarantees the money | 5, including `personal-liability-is-section-9-only` |
| drop the carve-out from the full record only | 3, including the vendored-source check |
| edit the not-a-default list in the narrow record only | 2, including the reconstruction |

**The by-name half is asserted here because `select-clauses.test.ts` cannot see
it.** That file resolves `Section N` tokens; §6.1 is also cited as *"an Event of
Default"* and *"Events of Default"* across five modules, and a gated §6.1 is a
new way for those to dangle. The new file checks, for every value of the fact,
that more than five selected clauses cite §6.1 one way or the other and that
exactly one §6.1 is in the document.

## Still open, and each is the owner's

- **§6.4's carve-out**, above.
- **No cure period for a non-default covenant breach reaching a guarantor.**
  §6.1's ten Workdays run on conduct that would otherwise be an Event of
  Default; §6.2 gives *"at least ten (10) Workdays to cure"* for a non-default
  covenant breach. Neither is a period this record may set, and inventing one
  would be a commercial value nobody decided. #164 recorded the same gap above
  §9.2.
- **`examinedBy` over-claims**, unchanged from the rest of the rewrite: the new
  record carries §6.1's findings because it is the same section, and no review
  has read this body. `source` is `attorney-drafted` with `author: null` and
  `status: 'draft'`, so `assertPublishable` refuses it.
- **No render path**, so nothing here can reach a merchant.
