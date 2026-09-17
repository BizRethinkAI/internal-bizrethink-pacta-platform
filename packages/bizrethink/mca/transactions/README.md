# Using a saved MCA provider template

Open a current provider revision in `/t/:teamUrl/mca`, choose **Use this
template**, enter the transaction facts, preview the filled draft and download
an unsigned PDF review copy. `/t/:teamUrl/mca/draft` is a separate page so it
works with the existing team layout. The provider recipe remains reusable;
a deal can be saved and reopened (ADR 0022), and an unsaved one is still cleared
on reload. A saved deal holds the ANSWERS only: reopening recompiles the
documents from the template revision it names, so it cannot carry stale wording
forward, and deleting one removes the row rather than flagging it. Downloading creates a
local review copy, not a stored document, Envelope, signature request or delivery.

## Boundaries implemented

- Both the filled-preview mutation and PDF POST resolve the saved revision on
  the server, reject disabled accounts, recheck live team membership, `mca-builder` and the distinct
  `mca-clause-draft-rendering` permission, and reject stale source fingerprints
  and older revisions for new transactions. Neither accepts a client snapshot.
- Provider identities, contacts, processor form reference and policy cannot be
  overwritten by transaction fields. The provider interview now also accepts
  an optional servicing phone and equipment credit-dispute address; an old
  profile without them remains readable, with missing values visibly blank.
- Flat semantic bindings keep one supplied value consistent across placements.
  Money is a nonnegative decimal with at most two fractional digits; dates are
  calendar dates. There is no APR, finance-charge or other second calculator.
  Calculated figures remain supplied values needing external calculation review.
- Document identifiers accept a designated EIN or a masked personal identifier;
  deposit-account identifiers must be masked. No full SSN slot is introduced.
  Values are bounded plain single-line text with no template directives; each
  repeated group has at most ten entries. The PDF endpoint requires JSON and
  stops reading at 600,000 bytes, including requests without Content-Length.
  Inputs never travel in GET URLs. Every response is private/no-store.
- Actual merchant equipment election chooses lease, subscription, cash purchase
  or no equipment. No-equipment/lease/subscription cannot deduct equipment at
  FRPA funding or add deferred equipment to purchased receipts. Cash purchase
  retains a blocker for the separately authored sale agreement and invoice.
- FRPA, equipment lease and subscription guarantors are separate collections.
  An entity guarantor needs its own representative and capacity. Individual
  report instructions produce one Permission to Release copy per person and
  reporting agency, with separate business and individual execution locations.
  The optional ISO channel agreement retains its own counterparties.
- No input can assert a signature, signed date, actual processor acceptance,
  permissible purpose or legal approval. Every output remains `internal-draft`
  and `readyToSend: false`, even if all required draft inputs are supplied.

The PDF renders all selected legal text, numbered clauses, separate reusable
fields and blank execution locations. Every page is marked as an internal draft;
the final worksheet is expressly **not a statutory disclosure**. It identifies
remaining legal/finding approval, actual nexus/applicability, supplied calculations,
prescribed forms, delivery, processor acceptance and signing work. Provider-offered
states are candidate requirements, never a determination of merchant nexus.
Registration and operational obligations are not cleared by assembling a draft.

## Field and source provenance

Six new empty-body field groups hold separate party execution capacities and
identified individual-report instructions. They are draft, have no named legal
approver and have **no fabricated REVIEW-01/02 examination**. The reusable view
labels them review pending and names the source provisions/reviews through
`derivedFrom`; legal text still requires a real recorded examination. This narrow
field-only case cannot admit unexamined prose or a published unapproved record.
The catalogues now hold 210 numbered clauses and 25 reusable records (13 field
groups, 10 document blocks and two interview-only guidance records).

The #194 ancillary-consent candidate is integrated as an attributed code/research
prerequisite, without its author's state note or a claim that its PR was merged.
The underlying instructions and credit-reporting limitations come from that
existing review. No new Utah/California citation or statutory-source verification
is asserted here. The original extraction manifest and source files remain intact.

Current merchant notice, equipment notice/dispute and report-preamble placeholders
use semantic keys. FRPA guarantor notices point to each guarantor's own block,
instead of sharing one global contact pair across several guarantors. Each changed
record advances version. These changes and the final layout need fresh independent
review before merge and legal approval before merchant use.

## Verification and rollback

Focused tests exercise input restrictions, instrument separation, report copies,
server-resolved revisions, HTTP denials and bounded reads. The real PDF test checks
page marks, text, page bounds, heading attachment and absence of AcroForms. It uses
the existing PDF.js parser; the alternate libpdf extractor misdecoded a subset font
on the worksheet while PDF.js and Poppler agreed with the rendered page.

The fixed page-number footer intentionally has no inherited numeric lineHeight;
long-document pagination reproduces [React-PDF issue #3452](https://github.com/diegomura/react-pdf/issues/3452)
otherwise. Body line spacing has an explicit font size, and the heading shares a
wrappable text node with its first paragraph. Long clauses remain complete.

Playwright covers opening a saved recipe, actual field/guarantor input, stale
preview prevention, private PDF download, unchanged saved revisions and direct
endpoint restrictions. Parent #210 supplies the unchanged before-flow CI baseline;
this PR's full CI supplies the after-flow gate. No local application build is used.

There is no migration, new upstream patch, finance calculator, report pull,
processor integration, production-profile preset, native signing or send route in
this change. Disable either feature grant to stop drafting. Reverting this PR
removes transaction use without deleting provider templates; changed catalogue
fingerprints require explicit new revisions rather than silently reusing approval.
