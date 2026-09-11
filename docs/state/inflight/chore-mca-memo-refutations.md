# chore/mca-memo-refutations — the memo refutes one finding, not six

**Branch:** `chore/mca-memo-refutations`. Register data plus its assertions.
Paired with `lombard-contracts` commit `58974ca`, which this pins as `_commit`.

## Why the bar was certainty, not plausibility

A finding marked `rejected` **stops blocking approval**
(`outstandingFindingsFor` → `findingsHold`). Mark the wrong one and a clause
becomes approvable that something already found should be holding — silently, and
nobody notices until it reaches a merchant. Five candidates were left alone.

## ADR 0012 is wrong, and precisely how

It records *"six findings the 2026-09-09 memo refuted"*. **The transcription is
accurate; the characterisation is not.** The memo's paragraph is headed **"Earlier
findings that should not be repeated as written"** and names exactly those six
topics. *Should not be repeated as written* is not *refuted*.

**One of the six refutes a finding.**

| memo sentence | what it actually does |
|---|---|
| *"factor rate alone is not a contradiction"* | **Refutes** `fair-market-value-recital-self-refuting`. §2.1's text is byte-identical to REVIEW-01's quotation, so nothing about the document changed — which is what makes this a rejection rather than staleness. **Recorded.** |
| *"The actual §4.8 expressly allows…"* | **Reads a document already fixed.** The carve-out was added by `change-notes/16` **after** REVIEW-02 raised it. The memo's own word is *"stale"*. The finding was true when written. |
| *"…not an enumerated §6.2.1 trigger, **although** §6.2.5 separately grants broad processor direction"* | Same shape — §6.2's lead-in now gates §6.2.1 to five enumerated defaults, which **is** the implemented fix. And the "although" preserves the finding's consequence. |
| *"A secured-party DBA is not automatically a fatally defective filing"* | **Denies a proposition no finding makes.** Ours says the repository *records* no d/b/a; it never calls a filing defective. |
| *"Contractual email service is not automatically a confession of judgment"* | Same. `service-without-notice-vs-commitment-9` never mentions email, and the memo **agrees** the waivers should go. |
| *"…may lawfully reside in the **missing** Permission to Release"* | **False premise.** Vendored twice. And the nearest finding already says what the memo says, about a different question. |

**Also found, not listed in ADR 0012, and not recorded:** the memo refutes §4.14's
cancellation-fee finding — but says it is *"not established"*, not false, and
agrees the clause is silent. **An absence-of-proof claim is not a refutation.**

## Refuted ≠ rejected

`status: 'refuted'` (5 findings, all `unrecorded` — correct, no manifest names a
withdrawn finding) is a **review withdrawing its own work**. `disposition:
'rejected'` (now 2) is a finding that **survived its review** and was disposed of
later. Neither rejection is this session's judgement: one is the owner reversing
a pricing change, one is the memo.

## What changed

`REVIEW-01-manifest.json` in `lombard-contracts` — one entry, `open` → `rejected`,
with a note quoting the memo. No new status, field or file.

Here: the register regenerated (6-line diff), `dispositions.test.ts` counts
updated with reasons **plus** a new `byDisposition.rejected` assertion that never
existed — so the count could previously drift silently — **plus** a test naming
the rejected finding and asserting the four the memo also names are **not**
rejected. `surface.test.ts` outstanding 38 → 37.

**No assertion was weakened.** The two count changes are accompanied by a test
that names ids rather than totals.

## Owed

- **ADR 0012's sentence is now known to be wrong.** ADRs are append-only, so it
  needs a superseding line in a later ADR. ADR 0014 would have been the place;
  it merged before this landed.
- **`frpa-4-8-may-impede-a-merchant-complaint-to-a-regulator` carries
  `"note": "No document change made."` and that is false** — change-note 16 made
  one, under the sibling finding. The counsel *question* may still be open, so
  `open` is arguably right; the note is not. Correcting it is a disposition
  judgement, not a memo refutation.
