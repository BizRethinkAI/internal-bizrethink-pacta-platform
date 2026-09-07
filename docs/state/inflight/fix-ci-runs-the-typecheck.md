# fix/ci-runs-the-typecheck — the type gate was never wired to CI

**Branch:** `fix/ci-runs-the-typecheck`.

## What was wrong

`packages/bizrethink/tsconfig.typecheck.json` has existed since the lease
builder. It is invoked by **no workflow and no turbo task**. The only npm script
naming it, `typecheck:lease`, is called by nobody.

So the gate ran when someone remembered to run it by hand.

Nothing else in CI covers it. `vitest` strips types without checking them, so
the unit suite goes green on code that does not compile, and `biome` is a
linter, not a type checker — and its own step is `continue-on-error` anyway.

## Why it matters, with the case that proves it

On 2026-09-06 two assertions in `mca/__tests__/ca-conformity.test.ts` filtered
on `Divergence` kinds that do not exist — `'row-mismatch'` and
`'text-divergence'`. Both filters returned `[]` whatever the form said, so both
assertions passed vacuously, and they were reported as evidence that the
California form conformed.

`tsc` found them instantly, the first time the package was actually
typechecked — by hand, days after they were written, and only because an
earlier invocation had pointed at a path with no tsconfig, printed an error and
**exited 0**.

This step is what stops that depending on anyone remembering.

## The change

One step in `governance.yml`, **blocking**, before the advisory lint:

```yaml
- name: Typecheck (bizrethink)
  run: npx tsc --noEmit -p packages/bizrethink/tsconfig.typecheck.json
```

Calls `tsc` directly rather than the npm script. The config covers `lease/` and
`mca/` since 2026-09-06, so the name `typecheck:lease` is now wrong; renaming it
is a separate change, and not depending on the name avoids doing both at once.

Verified passing on current `main` before adding it, so this turns on a gate
that is already satisfied rather than one that starts red.

## Found by

The phase-3 MCA agent, which hit the gap while checking its own work and handed
it back rather than editing `.github/workflows/` outside its scope.

## The pattern

Fourth of the same shape this week: a check that exists, reports success, and
does nothing. `git grep -E '\b…'` on macOS matching nothing; `sed -i` without an
argument silently not editing; a YAML loader accepting duplicate keys; and a
type gate wired to no runner. Each looked exactly like a pass.
