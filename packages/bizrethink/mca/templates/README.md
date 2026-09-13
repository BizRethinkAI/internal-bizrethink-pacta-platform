# MCA provider interview and reusable templates

`/admin/mca-templates` joins the existing MCA workspace and provides explicit
admin self-service access for the admin's own account. Granted team members use
`/t/:teamUrl/mca`; only team administrators/managers change provider policy.
This is an internal drafting release, not a merchant sending route.

The interview has three steps: actual provider identity and contacts; supported
programme choices/states; processor form and separate equipment/ISO counterparties.
There is no verified Lombard or Circular profile preset. The example profile in
`profile.fixture.ts` is synthetic test data and is never a UI default.

- `profile.ts` strictly separates policy from transaction facts. The authored
  net-card, processor-split, merchant-state/court bundle must be expressly
  confirmed; other collection/base/venue/dispute choices are rejected.
- `compile.ts` selects/renumbers operative clauses, inserts document helpers at
  their declared anchors, fills known provider variables and leaves future deal
  inputs blank. Interview-only guidance never enters contracts. The current
  catalogue and vendored statutory source bytes determine a stable fingerprint.
- Equipment offers produce separate lease/subscription candidate documents; the
  merchant's later election selects the applicable document. Individual-report
  instructions and ISO channel execution are separate events. They do not turn
  into merchant facts just because the provider offers them.
- The processor form/version/reference remains an external requirement with
  transaction-specific acceptance. Processor contradictions and actual form
  review remain outstanding; no generic Split Funding Letter is fabricated.
- `server-only/service.ts` stores immutable revisions and performs actual team
  access, manager writes, stale-editor rejection and separate internal-draft
  preview authorization. Profile/list endpoints do not return archived text.

The preview is assembled from the current canonical records and the saved
profile. A stale revision can be inspected as historical provider answers but
cannot be rendered until a new revision is saved. “Current” means unchanged
against local content/source records, not fresh legal verification or approval.
Every requirement still needs transaction applicability/calculation/delivery
checks. The compilation makes no new source-verification claim.

Provider generalization in this change: the FRPA identity uses supplied entity
type/formation jurisdiction/address instead of a Florida LLC assertion; four
unconditional equipment references use a generic equipment provider so a
no-equipment programme does not invent an affiliate. ISO company, rate and portal
are semantic fields. Changed records advance version and approval fingerprint.
Original extraction history and source documents remain unchanged; source-line
coverage uses historical ISO anchor values solely as an audit fixture.

Persistence/rollback: [ADR 0016](../../../../docs/adr/0016-mca-provider-template-revisions.md).
The [transaction interview](../transactions/README.md) fills a current saved
revision for an individual transaction and renders an unsigned internal review PDF. Do not create a native upstream Envelope template
as a shortcut around MCA approval, findings, disclosure or signing checks.
