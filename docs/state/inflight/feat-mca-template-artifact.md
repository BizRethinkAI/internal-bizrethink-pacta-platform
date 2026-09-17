# feat/mca-template-artifact — everything that must be true before upload

**Stacked on `feat/mca-preview-endpoint` (#301) → #300 → #297 → #295.**

`buildMcaTemplateArtifact(snapshot, instrument, revision)` returns a template
ready to upload, plus the facts the publication record must keep: the widget
names as published, the signer placeholders upstream will make, and the signing
parties in order.

## The order is the whole thing

| | |
|---|---|
| 1. render | markers where a caller prefills, `{{SIGNATURE, rN}}` where a party signs |
| 2. inject | an AcroForm widget over every marker |
| 3. **extract** | read the signer placeholders — **before** painting |
| 4. paint | cover the token text, so a signer does not see `{{SIGNATURE, r1}}` behind their own signature |

**Reverse 3 and 4 and the fields still appear**, because painting leaves the
text in place. So the mistake is invisible until somebody reads a sealed
document. The lease vertical shipped a pilot with
`{{SIGNATURE, r1, width=160, height=44}}` behind every widget and had to learn
this; `white-out-signing-tokens.ts` carries that scar, and this reuses it rather
than writing a second one that can drift.

**Verified as a spike before writing any of it**, because it was the one part
that could not be reasoned out: inject, then extract, then paint — widgets
survive the paint (annotations are not page content), and upstream's extractor
still finds the same fields in the painted file.

## Pure on purpose

No storage, no database, no envelope. This is where the risk is — two PDF
libraries, an annotation layer and a paint pass — so it is the part that can be
tested without mocking the world. The shell that uploads, creates the envelope
and writes the record is thin by comparison; the same split
`createEnvelopeFromMatter` uses for the lease.

## Caught by the type gate, again

`PlannedSigner` is exported from `field-plan.ts`, not `recipient-contract.ts`.
A type-only import is erased before vitest sees it, so all six tests passed
against an import that does not resolve. That is the third time in this batch
the type gate has caught something green tests could not.

## Not in this change

Nothing calls it. The publication shell — gate, upload, `createEnvelope(TEMPLATE)`,
`recordMcaPublication` — is next, and `assertMcaPackagePublishable` stands in
front of it and refuses everything until counsel approves clauses. That is
correct and is the point.
