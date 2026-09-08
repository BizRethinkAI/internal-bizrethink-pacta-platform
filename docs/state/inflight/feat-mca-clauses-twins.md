# feat/mca-clauses-twins — the Equipment Lease and the Subscription, and the check that they cannot diverge

**Branch:** `feat/mca-clauses-twins`, stacked on `feat/mca-clauses-spine` (#126).
**PR:** #TBD.

Fifty-two clauses: the Equipment Lease Agreement's twenty-six and the
Subscription Agreement's twenty-six. Three of six instruments are now imported.

## Why these before the FRPA's ninety

Because the twin was the mechanism the spine had not proved, and finding out it
was wrong on twenty-five clauses is cheaper than after ninety depend on the
type. It was wrong.

## The design changed, and the documents are why

**`instruments` was plural so that a clause published in two agreements could be
stored once and be unable to diverge.** That is not what these documents are.

The Subscription is the Equipment Lease with its vocabulary swapped — REVIEW-02
established that and it holds — but the swap was made **by hand and is not a
function**. Inside §3.2 alone, `leased` becomes `you subscribe for` in one
sentence and `subscribed for` in the next. `this Lease` becomes `the
Subscription` four times in §4.2 and §4.3 and `this Subscription` everywhere
else. A substitution table with per-clause exceptions is not a substitution
table, and generating one document's words from the other's would mean the
library asserting sentences no document contains — the one thing this package
exists to prevent.

**So both documents' clauses are stored, and the relationship between them is
asserted instead of generated.** `twins.ts` holds the vocabulary and the
divergence register; `applyTwinVocabulary` is called by tests and by nothing
that produces text for a reader.

**Which leaves `instruments: McaInstrument[]` with no user.** Every clause in
the library names exactly one. The motivating case turned out not to need it,
and this repo has a documented lesson about scaffolding built against a guess.
It is deliberately NOT narrowed in this PR — #126 is open and unmerged, and
churning its type for no functional gain is the wrong trade — but it is a real
open question, and the FRPA import is when to settle it: if 90 more clauses
each name one instrument, the array should become a field.

## What the check actually catches

REVIEW-02: *"a fix applied to one and not the other is a divergence nothing
checks for."* Four assertions, cheapest first:

1. **The two number their clauses identically** — a clause added to one document
   and not the other is the likeliest form the divergence takes, and catching it
   needs no text comparison at all.
2. **Every clause not declared divergent agrees word for word** once the
   vocabulary and its exceptions are applied.
3. **Every declared divergence still diverges** — without this the register goes
   write-only and a resolved difference sits in the list for ever.
4. **No vocabulary entry is dead.** An entry that never fires reads as evidence
   the documents use a word they do not.

## Five real differences, and four of them are one fact

| | |
|---|---|
| §3.5, §3.6, §3.7, §3.8 | **title.** It can pass to the customer under the Equipment Lease and cannot under the Subscription |
| §3.4 | **collection.** A different mechanism, not different words |

§3.4 is the one to read first, because it is not about title and is easy to miss
in a document that looks like a vocabulary swap. The Equipment Lease bills a
fixed amount to the customer's merchant processing account and **subordinates
that billing to an affiliate's future receivables purchase agreement**,
suspending while the specified percentage stands at one hundred percent. The
Subscription invoices by email, takes no automatic debit without a separate
written authorisation the customer may withdraw, and says nothing about the FRPA
at all.

§3.6 is the sharpest of the four: the Equipment Lease says the nominal purchase
option **creates a security interest rather than a true lease** and reserves the
right to file a financing statement; the Subscription says the transaction shall
be treated as a lease and claims a first lien only if a court finds Article 2A
does not govern.

## Ten places the swap was applied inconsistently

Recorded as `TWIN_VOCABULARY_EXCEPTIONS`, and it is a finding rather than a
workaround. None is a difference of substance:

- **§3.2 renders one verb three ways** — `to subscribe for`, `you subscribe
  for`, `subscribed for` — where the Equipment Lease uses `lease` and `leased`
  throughout. §3.1 uses a fourth, `subscribe` with no preposition.
- **§4.2 and §4.3 say `the Subscription` where §4.5 says `this Subscription`.**
  Small to read past; less small in a personal guaranty, whose whole subject is
  which obligations are guaranteed.
- **§3.12 loses the capital** — `this subscription` — in the sentence that
  terminates the agreement.
- **§4.7 drops `Equipment` from the executed document's own name**, where §3.16
  keeps it (`Equipment Subscription Department`).

## The examination gap, which is the finding worth acting on

The register settles who read what, and it is not what Phase 0 says:

| | read by | findings |
|---|---|---|
| Subscription | **REVIEW-01** | 21, all `sub-` |
| Equipment Lease | **REVIEW-02** | 12, all `el-` |

Phase 0's table credits the *Equipment Lease* with thirteen examined clauses.
Every one of those findings carries a `sub-` prefix and a Subscription document.
**REVIEW-01 never read the Equipment Lease.**

REVIEW-02 checked ten of its twelve findings against the twin and said so in the
finding itself. **Nobody has gone the other way.** Twenty-one REVIEW-01 findings
were raised against the Subscription and have never been checked against the
Equipment Lease — including `sub-crossdefault-imports-frpa-default`,
`sub-payment-guaranty-defeats-commitment-3` and
`sub-no-collection-channel-unbounded-setoff`, all of which touch §3.4 and §3.12,
where the two documents genuinely differ.

They are recorded on the Subscription clauses where they were raised and are
**not** copied onto the Equipment Lease, because copying them would assert an
examination that did not happen. Closing that gap is a review, not a code
change, and it is the next thing worth someone's attention on this corpus.

## Still open — unchanged from #126

1. **Where the agreement builder lives** — Pacta, or `lombard-platform`.
2. **`/admin/mca` summary honesty** — the "15 of 15" banner.
3. **Counsel: who, when, budget.**

And one new: **should `instruments` stay an array?** See above; decide at the
FRPA.

## Not done, on purpose

- No `includeWhen`, no `variables`, no approvals, no surface. Unchanged.
- §4.1 *Guarantor Information* is imported with an empty body, because that is
  what the document holds — a block of AcroForm widgets under a heading. Kept
  rather than dropped so the twin's clause count is the document's.
- Nothing published, no template edited, `client-circular-payments-platform`
  untouched.
