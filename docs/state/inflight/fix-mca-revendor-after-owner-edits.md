# fix/mca-revendor-after-owner-edits — the digests broke, exactly as designed

**Branch:** `fix/mca-revendor-after-owner-edits`. **PR:** #TBD.

`lombard-contracts` #10 applied five owner-decision edits to four of the six
documents. This is Pacta following them.

## The mechanism fired for the first time

Pacta does not read the `.docx` files. It keeps its own vendored `.txt` copy and
a digest of that copy, so **nothing here knew the documents had changed** — the
digest hashes our copy, and our copy had not moved.

Re-vendoring is what breaks it, and the break is the point. Four digests failed
at once, and the red named the seven clauses whose words had moved:

| | |
|---|---|
| `frpa.cross-collateral-9-3` | §9.3 → `[Reserved]` |
| `frpa.confidentiality-4-8` | the three-year term |
| `equipment-lease` / `subscription` `.governing-law-and-venue` | §3.15C's assignee, **both twins** |
| `iso-pra.commission-rate` | §A.1's cancellation sentence |
| `equipment-lease` / `subscription` `.indemnification` | §3.11's cap, **both twins** |

Every body was re-read from the re-vendored text, **never retyped** — the whole
point of the digest is that the library follows the document, and hand-editing a
body to match would be the library asserting words somebody typed.

`frpa.cross-collateral-9-3` keeps its slug although its heading is now
`[Reserved]`. Slugs are identity and approvals key on them; renaming would
orphan any approval recorded against it.

## What the mechanism did NOT catch, and why that matters more

**§3.11's cap was invisible to every assertion in this package except the
digest.**

`bodies-match-the-document` asks whether OUR text is in the document, and
containment succeeds either way: append a sentence to a clause in the `.docx`
and the shorter stored body is still contained in the longer one. The twin check
passed too, because both sides gained the same sentence in their own vocabulary.

The FRPA has a coverage test — *is anything in the document missing from the
library?* — and it would have caught it. The twins and the ISO PRA did not,
because that test was written where the problem was first found rather than
everywhere it could occur.

**So coverage now runs over all six instruments**, and a test asserts that it
does — a seventh instrument arriving with no coverage would otherwise be the
same silence again.

## Running it found eleven clauses that were never imported

Same fault as the FRPA's granting clause, same cause: **the import keyed on
numbered headings**, so text the document does not number came out as nothing.

- **Equipment Lease and Subscription**, four each — the parties paragraph, the
  total-payments estimate, the billing sentence, and the all-caps
  read-before-signing legend.
- **ISO PRA**, four — the parties paragraph, both WHEREAS recitals and the
  consideration sentence.

**One of those recitals carries a REVIEW-01 finding.**
`iso-recital-funding-not-processing` has the locus *"Second WHEREAS recital;
§1.1 Appointment"*, and until now it was recorded only against §1.1 — because
the recital did not exist in the library to attach it to.

The library is **204 clauses**, not 192.

## Twin pairing needed a second key

The new clauses have no number, so pairing by number broke. Pairing by slug
suffix alone does not work either: §3.7 and §3.14 are deliberately named
differently in the two documents, so their suffixes differ while their numbers
match. Each key covers what the other cannot, and the pairing uses number where
there is one and slug where there is not.

Two vocabulary additions fell out of it, both real: `LESSEE` → `SUBSCRIBER` for
the all-caps legend, and an eleventh inconsistency — the parties paragraph, where
the Equipment Lease calls itself "Equipment Lease Agreement" and the Subscription
calls itself "Subscription Agreement" rather than "Equipment Subscription
Agreement". Same asymmetry as §4.7.

## The merge-order trap, and how it was closed

#132 and #133 touch no file in common, so git merges both without a murmur —
and `main` goes red. #132's `__tests__/surface.test.ts` asserts **192** clauses;
this PR makes the library **204**. A clean merge is not a safe one.

#132 landed first, this branch merged `main`, and the four assertions were
reconciled to 204 here. Worth naming as a shape rather than an incident: two
PRs that share no file can still share a NUMBER, and nothing in the tooling
looks for that.

## Still outstanding

**The five Pacta templates are still stale.** Re-vendoring changed nothing a
merchant sees; templates 100, 102, 119, 120 and 121 still carry the pre-#10
wording, so an FRPA sent today still contains §9.3 and an Equipment Lease still
has an uncapped §3.11. Regenerating the PDFs is next; **republishing is the
owner's action, through the UI.**
