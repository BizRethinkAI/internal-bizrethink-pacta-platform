# feat/mca-preview-before-creating — the document before the decision

**Stacked on `feat/mca-entity-is-the-template` (#317).**

ADR 0026 made creating a template exactly two choices — an entity and a
document type. The owner's shape for it is *entity + type + preview*, and the
preview half was the piece still missing: it existed as a button you pressed
**after** the template was created.

## What it does

`previewProspectiveMcaTemplate` compiles the document those two choices would
produce, **without saving anything**. `previewMcaTemplate` beside it needs a
saved template and a revision to name; this needs neither, because there is
nothing named yet.

**Writing nothing is the property worth having**, and the test asserts it
directly rather than trusting it: a preview that quietly created the template
would leave a funder holding paper they were only considering. Revision 1 is not
a draft — `publishMcaTemplate` publishes against a named revision and the review
pipeline treats every one as a record.

## Two things it deliberately does not do

**It does not work around the compiler's refusal.** Asking for a document the
entity's programme does not run fails, visibly, in the preview panel. Showing
one anyway would advertise a template the builder would then decline to create.

**It does not lower the permission.** It renders authored legal text, so it
needs the same draft grant the saved preview needs — checked BEFORE the entity
is read, so a caller without it learns nothing about which entities exist.

A test distinguishes the two grants rather than withholding both at once: the
builder grant opens the vertical, the draft grant allows legal text to be
rendered, and the first version of that test passed for the wrong reason
because the mock refused both.

## The E2E asserts the part that matters

Not that a preview appears, but that **no row exists while it is on screen**.
