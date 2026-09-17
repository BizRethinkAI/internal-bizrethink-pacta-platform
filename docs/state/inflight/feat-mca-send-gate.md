# The gate a recipe must pass before it becomes a template

Author: `mca-output-fidelity-20260916`. Base: main `a615747ab`.
Independent of #287; they touch different files.

## Durable behavior

`mca/publish/publishable.ts` answers one question: may this package be published
as a template? Today the answer is always no, and the gate says why, clause by
clause.

**The control point is publication, not sending, and this PR was re-pointed
after the owner corrected me.** A funder's platform sends by calling
`POST /api/v2/template/use` against a template already in its team — no MCA code
is in that path, so gating "send" would gate nothing. ADR 0016 had already said
it: an unapproved recipe must not become a sendable template merely because the
interview was completed. `docs/design/mca-template-publication.md`, added here,
scopes the path this gate guards.

**It inverts `assertPublishable`'s default, deliberately.** That function
returns early on anything not `published`, which is right for a report and wrong
for a gate: an unapproved clause passes a check that only asks whether published
text is sound. Here every clause must be provably publishable — a current
approval matching the exact words, clean provenance, no admission or findings
hold — and silence is never consent.

**Every unknown refuses.** A missing approval, an approval whose fingerprint has
moved, an unreadable review register, an outstanding blocker, a missing required
input, an unanswered counsel finding. The cost of a wrong "yes" is a merchant
signing text no attorney approved.

`mcaPublicationRefusals` returns the list for a screen;
`assertMcaPackagePublishable` throws, for callers that must not be able to
ignore it. A gate that only returns
a list is a gate somebody forgets to read.

**Approvals arrive as a `Map`, not an object.** A plain object answers for its
prototype, and a truthy non-approval is exactly the shape that gets past a gate.
That bug shipped in `usStateCode` in #283 and a review found it; here the class
of mistake is absent rather than guarded against.

## Why it has no caller yet, which is the part to argue with

ADR 0004 records what forward scaffolding cost this repo: config built against a
guess sat unused for four months and shaped a UI around the wrong product. This
PR adds a module nothing calls, which is that shape.

It is deliberate, and ADR 0020 §3.2 is the authority: *"The first thing a
merchant send path must do is fail closed on it, test written first."* Building
the gate while **nothing is approved** means it ships shut and is already in the
way on the day approvals exist — rather than being written later, under
pressure, by whoever wants to send something.

It is not scaffolding against a guess: every input it takes exists today, and the
positive path is exercised rather than hypothetical.

## Validation

TDD: 11 assertions failed with no module, then passed.

- **The gate can say yes.** A package whose every clause carries a current
  approval returns no refusals. A refusal-only gate would be untestable — the
  package's own rule is that a green assertion is evidence only if it could have
  been red, and the same holds inverted.
- Refusals are pinned for: no approval, stale approval, a standing blocker, a
  missing input, an unanswered counsel finding, an unreadable register, an empty
  package, and a prototype-shaped slug.
- `mca` suite: **107 files / 3,461 tests pass.** Typecheck clean for the module.

## What the scope document establishes

- Publication is scriptable from inside Pacta. The runbook's "manual UI upload"
  binds external REST callers; `extractPdfPlaceholders` and
  `createEnvelope(TEMPLATE)` are reachable in-repo, and the **lease vertical
  already publishes this way**.
- The renderer needs a second mode. Today's output carries an `INTERNAL DRAFT`
  banner and deliberately has no placeholders; only `{{...}}` placeholders become
  Documenso fields, and an AcroForm widget can never be signer-written.
- Field labels are an interface contract: the funder's platform prefills by
  label, so a rename breaks a caller we do not deploy.
- The two blocking questions were answered the same day and are recorded as
  **ADR 0023**: the Pacta builder becomes the only producer of MCA agreement
  templates, and Pacta owns the record of what was published, exposed over the
  API rather than kept in a JSON file in a third repository. Parity with the
  documents in use comes before the first publication, because
  `lombard-platform` prefills by label and a renamed label breaks a caller this
  repository does not deploy.

## Not in this change

No envelope, no recipients, no signing, no publication. Internal drafts are
untouched and stay available while unapproved — the gate is for merchant-bound
output only, and wiring it to the draft path would break what ADR 0009 protects.
