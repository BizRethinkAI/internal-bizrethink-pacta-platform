# feat/mca-admin-surface — making the MCA vertical reachable

**Branch:** `feat/mca-admin-surface`. Phase 2 of the MCA roadmap
([ADR 0008](../../adr/0008-mca-is-two-surfaces-not-one.md), sequencing per
[ADR 0009](../../adr/0009-counsel-is-parallel-not-a-gate.md) on
`docs/mca-counsel-sequencing`).

Exports `packages/bizrethink/mca/` from the package root and adds a read-only
admin page at `/admin/mca`.

## The problem this closes

`packages/bizrethink/mca/` was finished work that **nothing could import**:
eleven states, 21 test files, a provenance gate and fourteen instance
identities, none of it exported from `packages/bizrethink/index.ts` and with no
route.

The consequence was not tidiness. The owner looked at `/admin/lease-library`,
saw it had grown from 65 clauses to 81 with new jurisdiction sections, and asked
whether the MCA and lease libraries had been mixed together. They had not — but
the only thing keeping them apart was that `mca/` was unreachable.
**Separation by unreachability is not separation by design**, and the overlap is
real rather than theoretical: `US-FL` is a jurisdiction in BOTH libraries, so a
list keyed on jurisdiction would merge Florida's lease clauses into Florida's
disclosure statute with no type error at all.

## What the page shows

Per state, from `mca/surface/view.ts`:

- the statute or regulation the spec was transcribed from, its citation, the
  vendored file, and **the section anchors it is scoped to** — California's
  regulation prescribes at least six tables in one file and only the
  sales-based one is ours;
- `verbatimVerifiedAt` and `structureVerifiedAt`, with structure marked *not
  applicable* rather than *missing* on a content-only statute;
- whether the vendored source still hashes to the digest the dates were earned
  against, with both hashes shown when it does not;
- **the rows the checker can only read the LABEL of** — five of New York's
  eleven, four of California's ten, and every requirement on a content-only
  statute;
- sentences the regulation compels but does not word, which are therefore ours
  inside a row it otherwise closes;
- live `verifyProvenance` problems and the live `assertPublishable` verdict;
- an `assurance` level — `unverified` / `partly-verified` / `verified` — and
  **the reasons for it**, never empty.

Then two sections that are not per-state: what a checker run could not have seen
by envelope shape, and the eight open readings.

### There is no tick, deliberately

`partly-verified` is amber, not green, and nothing on the surface is currently
`verified`. A state with a current verification date and four rows whose
contents no check reads is not verified, and rendering it the same colour as one
that is would make the page's most common row its most misleading one.

`verified` is reachable — a synthetic form proves it — which matters, because a
classification with an unreachable value never discriminates.

## What it deliberately refuses to show

**No approval workflow, and no field one could be recorded in.** ADR 0008: the
lease library's promise is *"a clause reaches a third party only once an
attorney has approved the exact words below"*, which is coherent for text we
wrote and a category error for 10 CCR §914, whose words California prescribes
and whose rows it closes with "shall include only". An Approve button here would
let someone record an attorney's name and bar number against California's
sentence.

Enforced three ways, not just by not drawing the button:

1. `mca.tsx` shares no component with `lease-library.tsx` — reusing a clause row
   would import its approval affordance along with its layout;
2. a test asserts no key on a `ConformityEntry` matches `/approv|signoff|reviewer|barnumber/i`;
3. the nav entry is a second item beside Clause Library rather than a tab inside
   it.

**No fabricated envelope.** `instanceCoverage()` needs a filled disclosure and
the page has none. Inventing figures so a number could be displayed would be the
reassurance the rest of the page refuses, so the page reports the strictly
weaker thing that is true without one: which identities each *shape* of envelope
lets the checker decide, since `skipped` turns on document presence and on
nothing else. `coverageForContents()` in `instance/check.ts` and
`checkDisclosureInstance()` now share one skip-and-undetectable computation, so
they cannot drift into disagreeing about the same envelope.

**No writes of any kind.** The route resolves no organisation and touches no
database. The specs are now deep-frozen in `registry.ts`, so a write to `status`
or to a verification date throws rather than succeeding — three tests assert it.

## Every check able to fail

Proven by mutation, 21 mutations run against `mca/`. Each was applied, the
suite run, then reverted. All produced red **except** two, which were then
fixed:

| survived | why | what changed |
|---|---|---|
| deleting the `assertSingleLibrary` call from `conformitySurface` | `entryFor` only ever stamps `MCA_LIBRARY`, so the guard passes vacuously and removing it changes nothing observable — the exact shape of the two assertions in this package that filtered on non-existent `Divergence` kinds and were green for a day | the guard now returns a branded `CheckedLibrary`, the only cast to which is inside it, so `ConformitySurface.library` cannot be assembled without calling it. Verified: deleting the call is now `TS2322` |
| removing `publishGate` from the assurance reasons | `verifyProvenance` already runs `assertPublishable` and reports each problem under `kind: 'publishable'`, so it was duplicated | dropped from the reasons and kept as its own displayed field, so no reason survives the deletion of the check that produced it |

Two mutations that survived my **first** attempt were assertion weaknesses
rather than implementation ones, and the assertions were strengthened:

- a spec mutated to `draft` went unnoticed because the surface is built at
  module scope, so the "before" snapshot was taken after the write. Replaced
  with the freeze, asserted directly.
- the envelope-shape tests counted skipped identities without naming them, so
  making `prepaid-total` trivially satisfiable did not move any number. They now
  pin the exact identity ids per shape.

And one implementation error the tests caught before I noticed it: Kansas and
Missouri came out `verified`, because I had treated a *prescribed label* as
though it were prescribed *wording*. It is not — a Kansas form can carry all six
statutory headings and say the wrong thing under each one.

## Scope taken beyond `packages/bizrethink/mca/`

Granted for this phase: `packages/bizrethink/index.ts`, the new route, and the
admin nav. Two further files were touched that the brief did not name, both
because CI requires them:

- `overlays/BIZRETHINK-OWNED.txt` — declares `admin+/mca.tsx` and
  `app/utils/bizrethink-mca-conformity.server.ts` as ours. Governance guard 1
  fails on any `apps/` file not declared or patched, and this is the established
  mechanism (`lease-library.tsx` is listed the same way).
- `overlays/README.md` — records the nav edit under overlay 047, which is the
  inline overlay that owns `admin+/_layout.tsx`'s `NAV_GROUPS`.

A third arrived with the build fix: `apps/remix/app/utils/bizrethink-mca-conformity.server.ts`,
which is the only way to keep `node:fs` out of the browser bundle (see below).

`packages/bizrethink/lease/` was not touched. No component was moved out of it.

**A concurrent session is in `packages/bizrethink/mca/` on phase 3** (the four
remaining prescribed forms, plus the CT and VA statutes). This branch changes
`registry.ts`, `instance/check.ts` and `provenance/source-text.ts`, so expect a
conflict in `registry.ts` where their new specs meet this branch's
`deepFreeze`. Nothing here is incompatible with that work — the surface derives
its entries from `MCA_DISCLOSURES`, so their four forms will appear on the page
without any change to this code.

## The build broke, and why it is worth recording

The first push went red on `Build App`, in the **client** bundle:

```
"join" is not exported by "__vite-browser-external",
imported by packages/bizrethink/mca/provenance/source-text.ts
```

`conformitySurface()` reads the vendored statutes off disk, so its module graph
reaches `node:fs`, `node:path` and `node:crypto`. The route imported it and used
it only in the `loader`, on the assumption that the React Router plugin's
dead-code elimination would keep it out of the browser build. **It did not** —
and relying on an optimisation for correctness was the mistake, not the missing
optimisation.

Fixed with `apps/remix/app/utils/bizrethink-mca-conformity.server.ts`. The
`.server.ts` convention is the mechanism that actually guarantees it: the plugin
replaces such a module with a stub in the client build. The route now takes its
TYPES from `@bizrethink/customizations` (erased) and `JURISDICTION_NAMES` from
`@bizrethink/customizations/mca/jurisdictions`, a pure data module with no
imports at all.

Verified locally, not just in CI: `node_modules/@bizrethink` and
`node_modules/@documenso` were symlinked into this worktree so the build would
resolve against it, and `react-router build` then completed both bundles —
client 4827 modules, SSR 1323. The failing CI run died at 4845. The client chunk
for the route contains **zero** occurrences of `node:fs`, `readFileSync` or
`existsSync`; the string `mca/sources/` in it is UI copy.

## THE PAGE WILL BE EMPTY IN PRODUCTION — this is the one thing to act on

`docker/Dockerfile`'s runner stage copies `out/json/`, `patches`,
`apps/remix/build`, `apps/remix/public`, `packages/tailwind-config`,
`packages/prisma/schema.prisma` and `migrations`. **`packages/bizrethink/mca/sources/`
is not among them.** In the container those regulations do not exist at any
path, so every digest check will fail to find its file.

`provenance/source-text.ts` was changed so this **degrades honestly instead of
crashing**: the sources directory is resolved lazily, `__dirname` is reached
only behind `typeof` (it is *undeclared*, not merely absent, in an ESM bundle —
a bare reference would have thrown at module load and taken the server with it),
and an unresolvable directory yields `MissingSourceError` rather than an
exception at import. The page then renders all eleven states as **SOURCE
MISSING / Not verified**, which is the truth in that environment and exactly
what this package says a verification date without evidence is worth.

But it means the page does not do its job in production until the vendored
statutes reach the runtime. Two ways, neither of them mine to take:

1. **An overlay on `docker/Dockerfile`** adding the sources to the runner stage.
   That is an upstream file (already patched by overlay 003), so it needs a
   patch, a fragility rating and the adversarial review the standard mandates
   for `overlays/*.patch`.
2. **Embed the sources as modules** so they are bundled — roughly 700 KB of
   string literals in the server bundle, including a 339,000-character Missouri
   omnibus bill.

Option 1 is smaller and keeps the sources as files, which is what
`sources/README.md` says they are for. **Owner's call; nothing done here.**

## What could not be verified here

**No browser has loaded `/admin/mca`.** The bundles build and the route
typechecks, but nothing has rendered it, and the E2E suite does not visit it.

**The three prescribed readings were not previously structured.** Only the five
`UNRESOLVED_READINGS` existed in code. The three from #108 were prose in
`docs/state/inflight/feat-mca-provenance-gate.md` and in ADR 0009. The first two
transcribe directly. The third — "Kansas's prescribed label" — is named in ADR
0009 with no detail, so its content was reconstructed from `containsLabel` in
`provenance/source-text.ts`: the label check tolerates a bare 1–3 digit token
between the words of any prescribed label, because the vendored Kansas bill
carries a printed line number inside the phrase `"estimated 14 payments"`.
**If that is not the question that was meant, the reading is wrong and should be
corrected — it is my reconstruction, not a record.**

**Nothing published to Pacta**, no template changed, no other session messaged.

## Open, unchanged by this PR

- The eight readings. Making counsel parallel (ADR 0009) does not shrink the
  backlog; two of them change verdicts.
- `NOT_CHECKED` in `instance/limits.ts` — fourteen things a filled form can
  still be wrong about — is **still not on this page.** It belongs beside a
  findings list, and there is no findings list here because there is no
  envelope. It remains reachable only from a test.
- The four unencoded forms (CA/NY Itemization, CA/NY Lease Financing) and the
  CT/VA statutes are phase 3 and are not represented here at all — the page
  shows what is encoded, and says nothing about what is missing from the
  library. A reader cannot tell from this page that four published Pacta
  templates have no spec.
