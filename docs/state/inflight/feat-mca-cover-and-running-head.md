# feat/mca-cover-and-running-head — the presentation half of #276 (#327)

Stacked on `feat/mca-appendix-a-fees` (#326), which it shares the renderer with.
It cannot merge before that one.

A published document opened mid-clause. It now opens with a cover and carries
the document's name at the head of every page after it.

## Read off the reference, not invented

`~/github/lombard/lombard-contracts/PDFs_Lombard/Lombard_FRPA_v4.pdf` is the
paper this is modelled on: a rule across the top, the title large, a short rule
beneath it, a metadata block reading PREPARED BY / DOCUMENT TYPE /
CONFIDENTIALITY against a vertical rule, and a confidentiality line at the foot.
The page after the cover carries the document name at the head, a rule under it,
and a dark box with PAGE and the number.

**ADR 0026: all of it comes from the entity.** `templates/profile.ts` is gone,
which is one of the four premises of #276 that no longer hold. The reference's
logo has no equivalent for a generic entity, so the entity's legal name sits
where the wordmark does — correct for a builder that serves many funders.

## The cover is not page 1

The reference numbers the page after the cover as PAGE 1. react-pdf counts the
cover, so the footer and the page box both render `pageNumber - 1` of
`totalPages - 1`. A cover that counted itself would put every page reference one
out against the paper this is modelled on.

The cover is its own `Page` element, which is also what keeps the running head
off it: a `fixed` element repeats on every page of the `Page` it belongs to, so
a cover inside the body page would carry the head it exists to precede.

## Which face a thing is set in is a testability decision

`McaSansBold` does not survive `@libpdf/core` — it is why `Execution` reads back
as `EDecution` and `BUYER` as `B U x E R`. `McaSans` does, as the existing
footer shows.

So **the running head is `McaSans`**, not the reference's bold. A running head
nothing can read back is one nothing can verify rendered, and it would also
defeat a text search for the document's own name. The cover's display title may
stay bold because the metadata block states the same facts in a readable face.

## A defect the text tests could not see

The cover title hyphenated: **"Future Receivables Purchase Agree- ment"**.

`@libpdf/core` rejoins the halves on extraction, so `expect(cover).toContain(
'Future Receivables Purchase Agreement')` **passed while the cover was wrong**.
It was found by rendering a sample and looking at it, which is what #327's
completion criteria asks for and why that criterion is there. Disabled per
`Text`, as the fee schedule and the lease renderer do.

Worth keeping in mind for the rest of the presentation work: a text assertion on
a PDF proves the characters are present, not that they are set the way anyone
would want to read them.

## Validation

Six tests, red first: the cover names the entity, names the document, says it is
confidential, carries no clause text, every page after it carries the running
head, and the cover is unnumbered with the body starting at 1.

3,729 tests in `packages/bizrethink/mca`; lint clean. A sample was rendered and
compared against `Lombard_FRPA_v4.pdf` page by page.

**The four local typecheck errors are not this branch** — all in
`provider-templates.tsx`, #330's file, because this worktree's `node_modules`
symlinks to the main checkout, still at `f92abea55`, before #330 merged.

## Not done here

- No logo. There is no entity logo in the data model, and inventing a field for
  one is a separate decision.
- The itemization's grid and the plain-language explainers remain out of scope,
  as #327 says.
- This does not turn publishing on. `assertMcaPackagePublishable` still refuses
  every package while no clause carries a counsel approval.
