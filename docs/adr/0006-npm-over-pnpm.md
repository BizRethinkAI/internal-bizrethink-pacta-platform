# ADR 0006 — npm, not pnpm, in this repo

- **Status:** Accepted (retrospective — records existing reality)
- **Date recorded:** 2026-08-29
- **Decision date:** ~2026-04-29

## Context

The BizRethink house standard prefers pnpm. Upstream Documenso uses **npm
workspaces**, and its lockfile, Dockerfile, CI actions and turbo configuration
all assume it.

## Decision

**Use npm here**, deviating from the house standard deliberately.

## Consequences

Switching would mean deleting `package-lock.json`, generating a
`pnpm-lock.yaml`, and rewriting the Dockerfile and CI install steps — then
**re-resolving that divergence on every weekly upstream sync, forever**. The
package manager touches exactly the files upstream changes most often.

The cost of the deviation is that this repo differs from its siblings, which is a
small tax on context-switching.

One real friction it does create: `packages/bizrethink/package.json` declares its
own dependencies, and npm workspaces record them in the **root**
`package-lock.json`, which is upstream's file. That makes the lockfile a third
conflict site on every sync — documented in `UPSTREAM.md`, and never to be
resolved by hand.

## Revisit when

Upstream migrates package managers. Until then this is settled, and "let's switch
to pnpm for consistency" is a proposal that has already been rejected.
