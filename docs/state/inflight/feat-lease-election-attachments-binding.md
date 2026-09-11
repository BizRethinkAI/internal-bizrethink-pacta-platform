# feat/lease-election-attachments-binding

The §83.595(4) early-termination election could not be made. Found by opening
the rendered addendum and asking what a signer would click.

## What was wrong

The two statutory options printed as the literal characters `[ ]`. No field, no
widget, nothing clickable. On the addendum's own terms — *"If neither is marked,
no early termination fee is agreed and Landlord's remedies are those in Fla.
Stat. §83.595(1)-(3)"* — the landlord lost the liquidated-damages remedy **by
default, on every lease, silently**. On the first real lease that is $13,800.

The clause's own note had already identified the requirement: *"two options and
a way to pick between them is what makes this an election at all."* The options
shipped. The way to pick did not.

## Why a test did not catch it

`election-form.test.ts` had a case called **"gives the tenant something to
mark"**. It asserted two `[ ]` literals in the clause TEXT and passed for as
long as they were there.

A bracket is a typographic character, not a field. The test pinned the
appearance of an election rather than the existence of one, so it stayed green
over a document in which the choice could not be made. **A green test pinning
the wrong thing is worse than no test** — it answers a question nobody asked,
convincingly. It now asserts the field, and `election-is-markable.test.ts`
carries it through to the extracted PDF.

## CHECKBOX rather than RADIO

RADIO is the semantically obvious choice for one-of-two and is **not
available through a placeholder**: a Documenso radio is one field carrying a
`values` array, `auto-place-fields` splits the token on commas, and
`parseFieldMetaFromPlaceholder` coerces only to string, boolean and number. It
would have to be patched onto the field row after `createEnvelope`.

Two checkboxes need none of that and are what §83.595(4) prescribes anyway —
the statutory form has two. A bare `{{CHECKBOX, rN}}` renders as one unlabelled
box (`document-signing-checkbox-field.tsx:52` supplies the default meta). The
cost is that both can be ticked; the paragraph above them says to mark one, as
the statute's own form does.

## The token is derived, never literal

A recipient index is POSITIONAL — `signature-blocks.ts:85` numbers signers
`r${index + 1}` over the party list. The live Picana matter is
`[landlord, tenant, landlord, tenant]`, so its tenant is **r2**; the fixture
lists both landlords first, so its tenant is **r3**. A hard-coded `{{CHECKBOX,
r2}}` in library text would be right for one lease and would put the election
in front of a LANDLORD on the next.

So `tenantElectionBox(parties)` derives it, beside the other party-derived
values, and `hydrateMatter` supplies it.

## And the signer can now open the governing documents

The receipt addendum has the tenant acknowledge receiving sixteen instruments
"and has had the opportunity to read them". A REVIEWER could open them; a SIGNER
could not — `lease-review.$token.attachment.$documentId` is scoped to a review
token and the signing view had no attachment route at all. The acknowledgement
was stronger than the delivery, for the one person it binds.

Documenso already renders an envelope's attachments beside the document being
signed (`document-signing-page-view-v2.tsx:172`) and hides the control when the
list is empty, which is why the gap was invisible: nothing ever populated it.

**Keyed on the matter, and both halves of that are forced.** `EnvelopeAttachment`
belongs to an envelope and carries one `data` string shared by every recipient,
so no per-signer token can go in the URL; and `createEnvelope` creates the
envelope and its attachments in the same call, so there is no envelope id yet to
put in one. The matter id exists first and survives a re-send.

That makes it a capability URL, and the `kind: 'hoa-governing'` filter is what
makes that acceptable — enforced in the route as well as in the link builder.
Every governing document is a public record already obtainable from the county
recorder. A `move-in-report` is photographs of the inside of somebody's home; it
stays on the review route, which is token-scoped and expires.

## Not in this PR

- **Heading orphans above the 800 threshold.** `hoa.amenity-access` is 1,307
  characters and stranded its heading on page 12. The fix is to bind the
  heading to the clause's FIRST PARAGRAPH, but `text()` renders a body as one
  node whose paragraph gaps are literal newlines, so splitting it changes
  spacing document-wide and needs visual verification across 29 pages.
