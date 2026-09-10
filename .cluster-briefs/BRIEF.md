# Standing brief — rewriting FRPA clauses

Every drafting agent reads this first, then its own `.cluster-briefs/<name>.json`.

## The premise is settled. Do not re-derive it.

Read `docs/adr/0012-the-baseline-document-is-input-not-specification.md`,
especially **Questions that are closed**.

`Lombard_FRPA_v4` is **not** the specification. It is a rebranded, AI-generated
form built from a poorly-drafted MCA source; it carries 254 review findings;
outside counsel on 2026-09-09 rated it 18 Critical / 52 High and proposed REPLACE
IN FULL on 93 of 101 clauses under *"Do not approve this FRPA for merchant use in
its present form"*; **no merchant has ever signed it.**

You are **drafting, not transcribing.** Do not preserve fidelity to v4. Do not
argue for it. Both transcription guards — `bodies-match-the-document`'s body
assertions and `frpa-coverage`'s line-accounting — are already retired.

Also read `packages/bizrethink/mca/clauses/README.md` (rules 1 and 4–8 bind; 2
and 3 were replaced) and `packages/bizrethink/mca/clauses/types.ts`.

## The owner's two decisions

1. **The memo's text is the BASE; adapt where needed.** Start from
   `memo_replacement`. Rewrite where it assumes v4 structure we are changing, or
   where it conflicts with a sibling clause. **Explain every departure.**
2. **Cite authority, flagged UNVERIFIED.** Where your reasoning rests on a case
   the memo cites — Richmond Capital 246 AD3d 585, Apollo Funding 241 AD3d 1508,
   NewCo 250 AD3d 1641, LG Funding, Principis, Grafton — record it in the clause's
   **code comment** marked UNVERIFIED. **Never put a case citation in a clause
   body.** Nobody has pulled these from the official reporters.

## What the spine cluster already settled — draft against this

Eight clauses were rewritten first because everything depends on them:
`frpa.holdback-explainer`, `frpa.granting-clause`, `frpa.definitions`, §§2.1,
2.2, 2.3, 2.4, 2.6. Read them before you draft.

**`Card Receipts` is the one settlement base**, defined once in
`frpa.definitions`: net card settlement actually payable to Merchant, after
refunds, chargebacks, separately identified taxes and gratuities payable to
others, and the processor's own lawful charges and reserves. **`Receipts` and
`Daily Receipts` now mean Card Receipts.** If your clause says either word,
re-read what it now means before you touch it.

**`Purchased Receipts`** = the Specified Percentage of Card Receipts, i.e. what
was sold. **`Remaining Balance`** never includes a fee. **`Completion Threshold`**
is defined in §2.6.

Eight cross-references the spine hands over. If one is yours, it is your job:

1. **§6.2.1 versus the definitions — a deliberate contradiction.** The definitions
   say the Specified Percentage does **not** increase on an Event of Default;
   §6.2.1 raises it to 100%. **`default-remedies` owns the resolution.**
2. **§4.1 versus §2.6.** §4.1 adds Appendix A fees to the Remaining Balance; §2.6
   says it never includes a fee. **`fees-and-money` owns it.** §6.3's 25%
   enforcement-cost cap is untouched — what moved is collection through the
   sweep, not the entitlement.
3. **§5.17 versus §2.4.** §5.17 still forbids adding an account. **`representations`.**
4. **§§3.1–3.4 reconcile against a base that moved under them.** Re-read every
   deadline and credit mechanic against the new definitions. **`reconciliation`,
   and do this first.**
5. **§4.10 / UCC-1.** The grant is narrower than §4.10 reads. Flag it; the
   collateral description on any live filing needs re-checking.
6. **Exhibit A must be re-drafted to §2.3's specification** — settlement base,
   percentage, reference, contact, stop instruction; one aggregate cap; no fixed
   minimum, no default increase, no account debit. **`miscellaneous`.**
7. **§7.16** is load-bearing for §2.4's interruption remittance. Do not narrow it
   without saying so.
8. **§4.15's cascade** now cascades on a purchase-only Remaining Balance.
   **`renewal-positions`.**

## Drafting standards — non-negotiable

- **Party placeholders are exactly three**: `{{funder}}`, `{{equipmentAffiliate}}`,
  `{{processor}}`. There is **no `{{merchant}}` and no `{{broker}}`** — *Merchant*
  and *Buyer* are document-defined terms. `__tests__/tenant-agnostic.test.ts`
  pins this; run it.
- **Keep `«N»` widget markers** exactly where the current body has them.
- **Plain operative drafting.** Short sentences. Defined terms capitalised and
  defined once — in `frpa.definitions`, not in your clause. No "for the avoidance
  of doubt" padding.
- **Do not invent commercial values.** No percentages, dollar figures or day
  counts unless the current body or the memo already fixes them.
- Keep every clause's `examinedBy`. Rule 1 is unchanged and matters more now.
- `source` stays `{ kind: 'attorney-drafted', author: null }`. These are
  unreviewed until an attorney approves them; `assertPublishable` enforces it.
- If your brief marks a clause `action: include-when` with a `fact`, the clause
  is **selected or not by that fact** — draft the text and set `includeWhen`.
  **`selectClauses` must still select every FRPA clause for `LOMBARD_FACTS`**;
  if your gate breaks that test, the gate is wrong, not the test.

## Deliverables

1. Clause bodies rewritten in place under `packages/bizrethink/mca/clauses/frpa/`.
2. A code comment above each: what was wrong, what changed, any DEPARTURE from
   the memo and why, any UNVERIFIED authority. Match the density already there.
3. A test written **first** for the property your cluster is responsible for,
   red before your bodies exist.
4. `npx vitest run packages/bizrethink/mca` and
   `npx tsc --noEmit -p packages/bizrethink/tsconfig.typecheck.json` — green.
   Any red is yours to fix; **never edit a test to make it pass.**
5. A written report: what changed and why, every departure, every cross-reference
   a later cluster must honour, and anything you could not resolve.

## Constraints

- **Edit only the files your cluster's clauses live in.** Other agents are
  working in this checkout on other files at the same time.
- Do not commit, push, open a PR, or touch `docs/STATE.md`.
- Do not touch clauses outside your brief.
- Report what you verified versus what you assumed, separately.
