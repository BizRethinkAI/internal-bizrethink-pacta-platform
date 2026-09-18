# fix/mca-entities-reachable — two live-use defects in the MCA workspace

Both were found by using the feature rather than by reading it, and neither has
anything to do with what the builder produces. They are about reaching it.

## 1. The only access control was not scoped to anything

`/admin/mca-templates` offered one button, "Enable my provider interview
access", and it wrote `{ feature, scope: 'user', scopeId: <admin> }`.

A user-scoped grant is not scoped to an organisation. `getFeatureAccess`
returns `true` for **every** `organisationId` it is asked about while such a row
exists, so that one button turned the MCA builder on for every team the admin
belonged to, with no way to pick one. `resolveFeatureAccess` has understood
`scope: 'organisation'` since the lease builder; nothing had ever written it.

What changed:

- `setAccess` takes an optional `organisationId` and records the grant against
  that organisation instead. The organisation must be one the admin belongs to —
  instance admin remains permission to opt **in**, not permission to switch a
  feature on inside a customer's account.
- `access` returns `grants`: every team the person belongs to, each with
  `allowed`, the `source` that decided it, that organisation's own row, and the
  other teams the same toggle moves. It still returns `teams`, the permitted
  subset, which is what the workspace navigation links to and what the route has
  always returned.
- `describeTeamGrants` in `server-only/feature-access.ts` is the pure function
  behind both, tested in `feature-access.test.ts`. The page shows the same
  resolution the loaders run, so a toggle cannot disagree with the route it
  points at.
- The admin page lists every team with a toggle each. The account-wide button
  stays, relabelled to say what it does.

Two cases the toggles have to be honest about, and are tested for:

- **A toggle that looks broken.** While the account-wide grant is set it
  outranks every organisation row in both directions, so the per-team toggles
  are inert. Each row says so rather than leaving an admin to conclude the
  control does not work.
- **One toggle, two teams.** Grants are recorded per organisation because that
  is what the resolver reads; teams are what a person recognises. A row whose
  organisation holds other teams names them.

## 2. Nothing linked to the entities page

`grep -rn mca-entities` matched only the route file. `/t/<team>/mca-entities`
had no link from anywhere in the app, so the only way in was to know the URL —
and a template cannot be created without an entity first.

- The MCA workspace header carries an **Entities** link, and its empty state
  ("No entities yet…") is now a link to `?new=1` rather than a sentence.
- The entities page carries a back-link to the templates workspace.
- Both route loaders return `teamUrl`.

## Validation

- `feature-access.test.ts` — 20 tests, 6 of them new, written red first.
- `mca-provider-templates.spec.ts` now grants access through the **per-team**
  toggle rather than the account-wide button, and reaches the entities page by
  **clicking the link** instead of typing the URL. A test that types the URL
  cannot notice that nothing points at the page, which is how defect 2 survived.

### Local typecheck is not a verdict here

`npx tsc -p packages/bizrethink/tsconfig.typecheck.json` reports four errors in
`provider-templates.tsx` — `grants` missing from the query result, and
`organisationId` rejected by the mutation input. Both are the worktree
`node_modules` artifact: this worktree's `node_modules` is a symlink to the main
checkout's, so `@bizrethink/customizations` and `@documenso/trpc` resolve to the
**main checkout's working tree**, which does not carry this branch. The tRPC
client type is therefore built from the old `access.ts` and `set-access.ts`. The
errors name exactly the two fields this branch adds and nothing else. CI is the
verdict.

## Not done here

- The organisation-scoped grant is offered only for `mca-builder`. Internal
  draft previews (`mca-clause-draft-rendering`) remain account-wide; that lock
  guards unreviewed legal text reaching paper and narrowing it is a separate
  decision, not a UI change.
- Nothing about what the builder prints. #326 (the fee schedule is collected and
  never printed) and #327 (cover page and running head) are still open and both
  gate first publication.
