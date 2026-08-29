# ADR 0003 — Documenso over DocuSeal

- **Status:** Accepted (retrospective — records existing reality)
- **Date recorded:** 2026-08-29
- **Decision date:** 2026-04-29

## Context

The platform needed self-hosted document signing with **per-tenant isolation**:
separate teams per legal entity, per-team API tokens, and a mailer that sends as
the tenant.

DocuSeal was tried first. **Five working days were spent building a CLI against
DocuSeal Pro before discovering that the self-hosted edition lacks the
multi-tenant API surface the plan assumed.** The multi-tenant features were
Cloud-only. The bootstrap spec had conflated the two.

## Decision

Build on **Documenso**, self-hosted.

- First-class multi-team primitives and per-team API tokens.
- TypeScript throughout, matching the house stack.
- AGPLv3, which is unproblematic for internal self-hosted use.
- Full features unlock with one env var and a one-line overlay; no licensing gate.

## Consequences

The multi-tenant surface exists as needed. The AGPL obligation is dormant while
we do not distribute modified versions — if that ever changes, it needs
revisiting.

**The process lesson is the more valuable half:** before designing against any
third-party API, verify the specific endpoints respond on the deployment model
you will actually run — not the vendor's Cloud tier. Five days were lost to a
premise nobody had tested.

## Alternatives considered

- **DocuSeal self-hosted.** Rejected on evidence, after building against it.
- **DocuSign / commercial e-sign.** Rejected: per-envelope pricing and no
  self-hosting, which the eIDAS AES positioning depends on.
