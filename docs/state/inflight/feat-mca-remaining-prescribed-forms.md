# feat/mca-remaining-prescribed-forms — the last four prescribed forms

**Branch:** `feat/mca-remaining-prescribed-forms`. Phase 3 of the MCA roadmap
(`docs-mca-counsel-sequencing.md`). Writes only inside
`packages/bizrethink/mca/`.

## What this closes

Four documents were published to Pacta with no spec, which is the state the
eleven state disclosures were in before #101 — the state in which California's
offer summary shipped carrying New York's phrasing:

| document | authority | spec |
|---|---|---|
| CA Itemization of Amount Financed | 10 CCR §956 | `ca-itemization` |
| NY Itemization of Amount Financed | 23 NYCRR §600.17 | `ny-itemization` |
| CA Lease Financing Disclosure | 10 CCR §915 | `ca-lease-financing` |
| NY Lease Financing Disclosure | 23 NYCRR §600.14 | `ny-lease-financing` |

## The four are not one kind of thing, and the machinery does not transfer

**The lease disclosures are `PrescribedForm`s** and fit the existing shape —
fixed row count, exact labels, prescribed third-column sentences, every row
closed with "shall include only". Two things §914/§600.6 do not have:

- §915(a)(7) and §600.14(g) say the Term row "shall include **no information**
  in the third column". `PrescribedRow.thirdColumnEmpty` and a check for it are
  new; the old checker returned early on `verbatim: null` and could not see a
  row that must be empty.
- §915(a)(8) / §600.14(h) **combine the first column of the seventh and eighth
  rows**. Neither shipped document does — see Divergences below.

**The itemizations are not `PrescribedForm`s at all**, and forcing them into
that shape would have been wrong in three independent ways:

- §956(a) / §600.17(a) require a document "substantially similar in form …
  **including at a minimum**". There is no prescribed row count, so the
  `row-count` divergence would be a false positive on every form.
- No row is closed with "shall include only". §956(c)(4) / §600.17(c)(4)
  expressly permit a statement of assumptions **below** the required items, and
  §956(a)(3) requires each third-party payee on a **separate line** — so the
  number of lines is a property of the deal, not of the regulation.
  `checkFormConformity`'s positional row alignment breaks the moment a deal has
  two payees.
- §956(c)(3) / §600.17(c)(3) say the disclosure **need not be signed**. Our
  forms carry no signer placeholder for that reason; it looks like an omission
  and is not.

So `prescribed/itemization.ts` is a second checker with its own divergence
kinds. The prescribed descriptions are matched as an **in-order subsequence**,
which is what "including at a minimum" means, and extra lines are accepted by
construction — with a test that pins the acceptance so a later tightening shows
up as a red rather than as a silent narrowing.

What it adds that nothing else has: §956(a)(4) and (a)(6) require each computed
line to carry "a reference to how the amount was calculated". The reference is
a claim about **line positions**, so it goes stale the instant a payee line is
added. `cross-reference` checks the numbers named in the parenthetical against
the numbers of the lines actually being summed.

**No overlap with `instance/`.** `instance/identities.ts` already holds
`itemization-internal` and `itemization-agreement`, which check the numbers.
This checks the blank document. Numbers there, structure here.

## Divergences found in the shipped documents

Reported, not fixed. No template published, no upload.

1. **`Lombard_NY_Lease_Disclosure_v1` drops a word from a prescribed
   sentence.** 23 NYCRR §600.14(c)(3) prescribes "… finance charges you pay,
   **and** the periodic payments you make, and the anticipated cost …". The
   document has "… finance charges you pay, the periodic payments you make, and
   the anticipated cost …", which is California §915(a)(3)(C)'s sentence
   structure with New York's word swapped in. The row is closed by
   §600.14(c) with "shall include only". Same class as the defect that shipped
   in templates 104/105 and the same direction: one state's phrasing inside the
   other state's document.

2. **Neither lease disclosure combines the Prepayment first column.**
   §915(a)(8) and §600.14(h) both say the first column of the seventh and
   eighth rows "shall be combined and shall include the following language:
   'Prepayment'". The DOCX for both contains **no `vMerge` at all** — the
   eighth row simply has an empty first cell. The sibling
   `Lombard_CA_Disclosure_v1` does merge (two `vMerge` elements), so the lease
   generator did not carry the merge across.

   **Weighed honestly, this is small.** The lease tables have no borders at all
   (no `tblBorders`, no `tcBorders`), so the eighth row's first column prints
   as blank space under "Prepayment", which is what a combined cell looks like.
   The divergence is in the file, not on the page. Reported at that weight.

3. **`pipeline/extract_disclosure_rows.py` cannot extract a lease
   disclosure.** It drops any row whose first cell is empty or reads `term`
   (`if label.lower() in ('', 'term', 'amount'): continue`). Both are prescribed
   rows under §915 — the Term row, and the eighth row's empty continuation — so
   the extractor silently returns 6 rows from an 8-row table. The lease
   fixtures here were produced by a variant of that script; the fix belongs in
   `lombard-contracts` and has not been made from this session.

## Still open, and not resolvable here

- REVIEW-01 `lease-disclosure-assumes-a-purchase-option-the-subscription-does-not-grant`
  is a **blocker, status open, decides: owner**. Both lease templates are
  published and being held unsent. The specs here say what §915 and §600.14
  prescribe; they say nothing about whether the transaction is lease financing
  at all, which is the open question.
- The registry has no transaction-type filter. `transaction` is recorded on
  every prescribed form and itemization, and `prescribedFormsForTransaction`
  filters on it, but `ContentStatute` does not carry it — settling the scope of
  the seven content-only acts means reading seven statutes, which was not done
  and is not guessed at here.

## CT / VA — the gap is closed, except for one fact about practice

Both statutes were obtained from their **official publishers**, fetched over
verified HTTPS, tag-stripped and otherwise untouched, and vendored:

| file | publisher | source |
|---|---|---|
| `sources/CT-CGS-36a-861-872.txt` | Connecticut General Assembly | `https://www.cga.ct.gov/current/pub/chap_669.htm` |
| `sources/VA-Code-6.2-2228-2238.txt` | Virginia Law Portal (DLAS) | `https://law.lis.virginia.gov/vacode/title6.2/chapter22.1/` (11 per-section pages) |

`statutes/ct-va-obligations.ts` holds 31 verbatim quotations — the complete ten
items of §36a-863, the complete nine of §6.2-2231, and every prohibition,
signature rule, registration duty and enforcement provision the package had been
asserting. `__tests__/ct-va-statutes.test.ts` re-matches each against the
vendored bytes on every run and checks that every `satisfiedBy` names a row the
form actually has.

**Three corrections the primary text forced**, each previously asserted from
secondary material and each wrong:

- the Act is in Conn. Gen. Stat. **chapter 669**, not 668 (668 ends at
  §36a-644);
- Virginia's chapter runs **§6.2-2228 to §6.2-2238 and stops** — §6.2-2239 and
  §6.2-2240 belong to an unrelated chapter on virtual currency kiosk operators;
- **§36a-869 is not flat three-day irrevocability.** The same sentence that
  creates the window carries two carve-outs (underwriting information; the
  recipient's request), and §36a-869(b) lets the offer say it is a preliminary
  review only. The package had been carrying the guidance's stronger reading.

A fourth, which was a conflation rather than an error of fact: **Connecticut has
no confession-of-judgment ban.** §36a-868 bars prejudgment-remedy waivers;
§6.2-2234(C) is Virginia's confession-of-judgment ban. A negative control
asserts the word "confession" appears nowhere in the Connecticut Act.

**What still rests on the Department's characterisation: one thing.** §36a-867
opens the reciprocity door only if *"the Banking Commissioner determines"* that
another state's law meets or exceeds Connecticut's. Whether such a determination
exists is a fact about the Department's practice, and the guidance's statement
that none has been made cannot be verified against any statute. That is what
keeps Virginia's form out of Connecticut, and it is now the only load-bearing
secondary claim in the package.

Both forms' `transaction` moved off `unread-statutory-scope` on the Acts' own
words — §36a-861(1) and §6.2-2228 — so that value is now unused and kept
deliberately, as the honest choice for a twelfth state whose statute we do not
hold.

**Not done, and recommended next:** encoding CT and VA as `ContentStatute`s
alongside their prescribed forms, so the ten and nine statutory items get the
same `requires`/evidence treatment the seven content-only states already have.
The obligations file records the mapping; it does not run the content checker
over it.
