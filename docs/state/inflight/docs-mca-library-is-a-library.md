# docs/mca-library-is-a-library — the clause library was transcribing a document

**Branch:** `docs/mca-library-is-a-library`. Documentation and one vendored
source. **No code changes, no `.docx` edited, no Pacta template republished.**

## Why

An outside counsel memo on the Lombard FRPA (AI-assisted, 101 clause entries,
2026-09-09) was reconciled against the library clause by clause. Three defects
came out of that, and all three have the same cause.

**Every structural question in this library was answered by "whatever the .docx
does."** Numbering, whether a form grid is a clause, what `[Reserved]` means,
whether an explainer belongs in the body — each was inherited rather than
decided. That is rule 3 of `clauses/README.md` and it is enforced as an
invariant by `frpa-coverage.test.ts`.

The base document is `CircularPayments_FRPA_v4.docx` — a form written for a
different funder and rebranded. It was **input**. The library has been treating
it as **specification**.

### The three defects

- **§9.1 has `body: ''`.** The document prints a six-field, six-widget grid
  (`«35»`–`«40»`); because it is a table, `frpa/index.ts` declares it non-clause;
  because §9.1 is a heading, a clause record exists anyway. Coverage passes —
  every *line* is accounted for — and counsel could not review the guarantor
  execution block at all. Nobody wrote the converse assertion: **does every
  clause have content?**
- **Four `[Reserved]` rows** are shown to an attorney with approval state and a
  finding box while being permanently unapprovable.
- **Four Funding Terms explainers are unnumbered** only because the source left
  them unnumbered.

### The correction, in two rounds

Two drafts of the ADR got the diagnosis right and the remedy wrong the same way
— a `retired` clause kind, then a per-document-version placement map. Both still
assumed the library's job is to produce *one funder's document*. The owner's
framing settled it: the interview's questions decide whether a deal uses ACH or
a personal guaranty, so **not every MCA clause goes into every agreement**, and
that is what the library is for.

`lease/engine/select-clauses.ts` had already said it: numbering is *derived from
what survives selection*, **"and a clause that drops out leaves no gap."** That
sentence is the whole answer to `[Reserved]`.

## What landed

| | |
|---|---|
| `docs/adr/0011-the-mca-clause-library-is-a-library.md` | the decision, the model, a six-phase migration |
| `packages/bizrethink/mca/sources/TX-7TAC-86-310-313.txt` | the Texas implementing rules, retrieved from the Texas Register |
| `packages/bizrethink/mca/sources/README.md` | why that file settles a question about every other state |

### The ADR, in three claims

1. **This library is v1.** Lombard's v3/v4 is a document lineage in
   `lombard-contracts`. There is no "FRPA v5" here.
2. **Nothing is deleted for being unused.** §2.5's ACH text stays as a clause
   nobody currently selects — Lombard is split-only; the next funder may not be.
3. **Numbering is emitted at assembly.** `McaClause.number` goes. No placement
   map, no gaps to reserve.

Plus `kind` (`clause` / `field-group` / `explainer`), `placement`, and the
lease's `includeWhen` / `variables` / `supersedes` / `asserts` over an eleven-key
`McaFacts` derived from what the clauses actually branch on.

**The interview is per TEMPLATE, not per deal** — a per-deal interview puts a
human in the loop on every funding, which is what ADR 0010's automation exists
to prevent. Template facts produce a template; `lombard-platform` fills widgets
and selects nothing.

### The Texas source, and why it changes the template count

`TX-Fin-Code-Ch-398.txt` does **not** carry the OCCC complaint notice — that
file's own header said the implementing rules were 7 TAC Chapter 86 Subchapter C
and we never fetched them. Every claim about the notice rested on a citation
rather than on text, and the provenance gate would have been right to refuse a
Texas variant built on it.

Now vendored, and it settles a question about the other ten states:

| kind of rule | states | variant needed? |
|---|---|---|
| **Must NOT contain** — §398.055 (COJ voids the contract), §36a-868 (no PJR waiver), §6.2-2236(A) (no forum outside Virginia) | TX, CT, VA | no — a base form that omits them is compliant everywhere at once |
| **Must CONTAIN** — 7 TAC §86.310(d), the OCCC notice verbatim | **TX only** | yes — one clause |
| Separate disclosure document | the other eight | no — a different surface |

So Lombard's count is **base + Texas**, not eleven of anything. That reframes the
memo's "conservative national form" recommendations as **variant elimination**:
merchant-state venue is what makes Virginia need no variant.

§86.313 came with it and is sharper than the memo's summary — automatic debits
require a perfected **first-priority** interest in all accounts receivable, and
"automatic" expressly includes a recipient handing over more than one prewritten
check.

## The memo, split

All 101 entries classified by what each fix actually is:

| | count |
|---|---|
| Rewrite the words — defective under every template | 58 |
| Rewrite, then gate — a real defect *and* a fact-gated scope | 23 |
| Not a rewrite — a fact | 12 |
| No change / Pacta-side | 8 |

`disputeResolution` is the clearest case: the memo proposes deleting four
separate clauses (§§7.10, 7.11, 7.19, 7.20) and they are **one fact with two
authored answers**, neither of which we hold cleanly today.

## What could not be verified

**No test was run when this PR was opened.** `node_modules` in the checkout was a
Linux tree — rollup and esbuild resolved to `@esbuild/linux-arm64` on a darwin
host — so `npx vitest` could not start. CI was the check.

> **CORRECTED 2026-09-09, after the PR merged.** This paragraph originally said
> the Linux tree was *"the staleness the #143 lockfile merge warned about"* and
> that `npm install` was the fix. **Both were wrong, and the diagnosis is worth
> keeping visible because it was confidently stated three times before it was
> checked.**
>
> #143's warning was that three package *versions* moved. That is unrelated. The
> lockfile changed **zero** platform entries and still listed all 43 Darwin
> packages. The actual cause was eight `docker run -v "$PWD":/app -w /app
> node:24-alpine3.23 … npm install` invocations against this exact checkout, the
> first at 04:30:34 UTC on 2026-09-09; the Linux binaries were born **six seconds
> later**. Docker here is Colima, whose generated Lima config mounts `~` writable,
> so a container install rewrites the Mac's `node_modules` in place.
>
> Repaired 2026-09-09 with `npm ci` on Node 24.20.0 followed by
> `npm run prisma:generate` — after which **48 files / 1889 MCA tests pass** and
> both typechecks exit 0 on darwin/arm64. So there was no Mac-specific defect from
> the 2.17.0 upgrade either; the tree was the only casualty.
>
> The mechanism and the recovery are now in
> [`UPSTREAM.md`](../../../UPSTREAM.md) under *Never install from a container into
> this checkout*.

The change is three documentation files plus one vendored `.txt`, so there is no
behaviour to test — but the claim is "nothing runs locally", not "the suite is
green".

**Nothing reads the new source yet.** No `MCA_DISCLOSURES` spec names
`TX-7TAC-86-310-313.txt`, so `sources-are-primary.test.ts` does not currently
check it. Giving the OCCC notice a clause with an `includeWhen` is phase 3 work.

**The header should classify `official-publisher`** — the retrieval URL is on
line 6, inside `HEADER_LINES = 40`, and `www.sos.state.tx.us` matches
`source-origin.ts`'s `.state.xx.us` pattern. Asserted by reading the regex, not
by running it.

## Two corrections recorded rather than deleted

The ADR keeps both wrong turns visible, because each is the kind a later reader
would make again: a `retired` clause kind (wrong — nothing has shipped, so a
lifecycle describing text leaving production describes a history that did not
happen), and a per-version placement map (wrong — still a fixed document, just
relocated).

Also corrected: an earlier claim that deleting the `[Reserved]` rows "would erase
the record that a dangerous clause was removed on purpose." It would erase
nothing. The record was never in Pacta — it is in `lombard-contracts/change-notes`,
a different repository, with no link from the clause. Checking that turned up a
better finding: **§2.5 and §7.14 were removed with no change note recording when
or why**, and the memo's Texas analysis turns on that removal.

## Still open

- The `McaFacts` list is accepted; the eleven have not been written as code.
- Whether the 101 bodies are rewritten before or after the engine.
- Whether `bodies-match-the-document` narrows to the selected set or goes.
- The FRPA gets the engine first (owner, 2026-09-09).
- §2.5 and §7.14 contradicted each other in v3 — the gated backstop and a blanket
  debit authority over any account the merchant ever opens. Only §2.5 returns.
- `recipientStates` is the one fact that is a property of the *merchant* rather
  than the product. It works at template time only because `lombard-platform`
  already picks state-specific contracts. The seam to watch.
