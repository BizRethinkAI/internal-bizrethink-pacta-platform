# ADR 0001 — Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-08-29

## Context

This repo is an additive fork of a large upstream project, shaped by decisions
whose reasoning lives mostly in one person's head and in scattered session notes.
A new contributor — human or model — reading `overlays/` or
`packages/bizrethink/` reasonably asks "why is it like this?", and today the
honest answer is "ask Shwet".

Several decisions were also expensive. The DocuSeal attempt cost five working
days. Losing the reasoning means paying again.

## Decision

Architecture decisions are recorded here as numbered Markdown files, **append-only**.

- A decision that changes is **superseded** by a new ADR, never edited in place.
  Corrections of fact — a typo, a broken link — are fine.
- `governance.yml` fails any PR that modifies an existing ADR's decision content.
- Numbering is sequential and never reused.
- ADRs 0002–0007 are **retrospective**: they record decisions already embedded in
  the codebase, written on 2026-08-29, with the original decision date noted
  where it is known and uncertainty named where it is not.

## Consequences

The reasoning survives the session that produced it, and a superseded decision
leaves a trail rather than vanishing. The cost is a file per significant
decision, which for a repo this size is a handful per quarter.

Not every choice needs an ADR. If a competent newcomer would ask "why is it like
this?", write one.
