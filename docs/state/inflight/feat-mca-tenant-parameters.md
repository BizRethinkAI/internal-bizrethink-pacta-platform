# feat/mca-tenant-parameters — the clause library becomes a product

**Branch:** `feat/mca-tenant-parameters`. **PR:** #TBD.

The library named one client in 22 clause bodies, in an instrument id, in every
slug of that instrument, and in an `entity` field on every instrument record.
It does not now.

## What was wrong

**It was Lombard's paperwork, not a clause library.** Pacta already serves two
MCA clients. An interview run against the library as it stood would have
produced Lombard documents and nothing else — which makes an interview, an
engine and a template builder pointless.

The lease builder is the pattern this vertical was told to follow in the first
line of its handoff, and it does not make this mistake: **28 of its 52 clause
bodies carry `{{landlordNames}}`, `{{tenantNames}}`, `{{propertyAddress}}`.** A
lease library tied to one property would be useless for the same reason.

## Why the drift happened, so it is not repeated

Both libraries were built from real executed documents. They diverged on
copyright.

The **lease** clauses were RE-AUTHORED from a requirements inventory of two
executed leases, because their prose belongs to Zillow and to First In's forms
vendor — `provenance/types.ts` makes copying it unrepresentable in the type.
Re-authoring produces placeholders for free.

The **MCA** documents are ours, so verbatim import was available and taken. Then
the verification built on top of it — `bodies-match-the-document`, the digests —
made verbatim look mandatory. **It is mandatory for the import. It was never
mandatory for the library.** Every check passed while the library quietly became
single-tenant, which is why nothing caught it.

## The fix, and why verification gets stronger rather than weaker

`twins.ts` already showed the shape: store the general form and ASSERT the
relationship to a specific document, rather than storing the specific document.

- Clause bodies carry `{{funder}}`, `{{equipmentAffiliate}}`, `{{processor}}`.
- A **tenant record** holds one client's names and one client's documents —
  including the file, its digest, and the date its bodies were read.
- The document check resolves the tenant's names **first**, then matches against
  **that tenant's** document.

So the assertion is no longer "our text is in the file". It is **"the general
form, filled in for this client, is the paper this client signs"** — a claim
about the parameterisation as well as the words. When a second client's set
arrives, every clause is checked against two real documents, and a clause that
only fits one of them fails immediately.

## Three roles, because the corpus has three

| role | Lombard's value |
|---|---|
| `funder` | Lombard Capital LLC — the FRPA's Buyer |
| `equipmentAffiliate` | Lombard Pay LLC — the equipment lease/subscription party |
| `processor` | Payzli |

`funder` and `equipmentAffiliate` are deliberately **not** one role. They are two
different legal entities, and REVIEW-02 raised that one of them *"appears
nowhere authoritative"* — collapsing them would have quietly resolved a question
somebody still has to answer.

## The rename the document itself demanded

The instrument was `payzli-split-funding`, with slugs `payzli.*`. **FRPA §1.5:
*"A separate Split Funding Authorization (Exhibit A) shall be executed for each
Approved Processor identified above."*** Lombard's own contract treats the
processor as a variable — one authorization per processor — and the library had
made one processor the identity of an instrument. Now `split-funding`, with the
processor a party role.

## What moved off the instrument record

`entity`, `sourceDocument`, `sourceDigest` and `bodiesVerifiedAt` were all on
`INSTRUMENTS`. "The Future Receivables Purchase Agreement" is a kind of
document; *"`Lombard_FRPA_v4.txt`, hashing to `e236a2…`, whose bodies were last
read on 2026-09-08"* is a fact about one client's paper. They live on the tenant
now. `mca/README.md` rule 4 had already said this for disclosures — *"tenant is
another axis … folding them together breaks the property that makes adding a
state safe"* — and the clause library had broken it in spirit while obeying it
in letter.

## Verified

- **0 of 204 clause bodies name a tenant** (was 22).
- 2961 package tests pass; `tsc -p tsconfig.typecheck.json` clean; `biome format`
  clean.
- `cd apps/remix && npm run build` green — the full `typecheck && react-router
  build`, not bare `react-router build`.

## What this unblocks

The interview and the engine. Both were about to be built against a library that
hardcoded one client, which is the expensive order — the engine is precisely the
thing that would have baked the assumption in. Same shape of decision as ADR
0010, one level down.

## Still open

No second tenant's documents exist here yet, so the "checked against two
documents" property is available and unexercised. Circular Payments' set is what
would exercise it.
