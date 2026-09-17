# feat/mca-publish-action — publishing is something a person does

**Stacked on `feat/mca-registration-surface` (#307)**, which also edits
`provider-templates.tsx`.

The publication path was complete and had no trigger. This adds one: a button on
the provider template page, with the gate's refusals shown in place.

## Why a button and not an endpoint

ADR 0023 makes publication the control point — once a recipe becomes a template
in the funder's team, the existing API can send it and nothing of ours
intervenes. So it is the last moment anybody chooses, and the actor should be a
named person in the audit trail `createEnvelope` already writes, not a token.

## Refusals are shown before the button, not after it

`publicationStatus` runs the same rule `publishMcaTemplate` enforces —
`mcaPublicationRefusals` over the package `mcaPublishablePackageFor` builds — and
returns it rather than throwing.

**It does not re-implement the gate.** A screen that disagreed with the gate
would be worse than no screen, because it would be believed.

A control that only explains itself once pressed teaches people to press it and
read afterwards. Every refusal is listed with the clause or binding it belongs
to, so the fix is findable.

Today that list is every clause in the package, for want of a counsel approval.
That is the designed state, not an unfinished one.

## Publishing needs ADMIN or MANAGER, asserted in the service

ADR 0016 restricts provider **policy** to a programme's managers because it is
the funder's programme. Publishing is the act that puts that programme in front
of a merchant, so it cannot need less.

The check is in `publishMcaTemplate`, not in the route — a second caller must
not be able to reach it without passing the same check, and **a screen is not a
permission**. The button is only rendered for `canWrite`, which is convenience,
not enforcement.

## A local typecheck failure that was not real

`tsc` reported that `publicationStatus` and `publish` do not exist on the tRPC
client. They do. This repository's worktrees share one `node_modules`, and
`@bizrethink/customizations` symlinks to the **main checkout** — so the client
type was inferred from `main`'s router, which has no such routes.

Proved rather than assumed: repointing that symlink at this worktree clears the
errors, and it was restored afterwards. Worth writing down, because the same
shape has now produced three misleading local results this week — a stale Prisma
client, missing Playwright types, and this — and each time the instinct to
"fix" the code would have been wrong.
