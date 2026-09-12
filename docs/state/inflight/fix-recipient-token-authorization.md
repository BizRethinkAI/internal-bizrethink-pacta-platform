# fix/recipient-token-authorization — A-05 recipient identity gates

Owner approved A-05 on 2026-09-12 after independent source verification against
latest merged main `005db8e469ad8c66da6bb3373149705f0089e250`. Fresh worktree
`/private/tmp/pacta-a05-recipient-auth`, Node 24.20.0, own npm ci and Prisma
generation. No production access. Shared checkout remains the MCA session's.

Overlay **076** is reserved here; 074/#169 and 075/#170 belong to the preceding
remediations. This work does not edit either PR or duplicate their state folds.
There is no SendMessage capability to the other live sessions; ownership is
announced through Shwet and this branch. Review-and-ship owns queue integration.

## Owner decision and existing behavior

**Keep downloads after the signing deadline**, with configured identity checks
still enforced. Signing expiry remains enforced by mutation helpers. Upstream
explicitly asks for its access 2FA at completion, not before viewing; preserve
that timing and bind authenticator checks to the intended recipient. ACCOUNT
access is independent and must hold throughout. Deliberately link-only signing
continues without forcing account creation. QR capability semantics are separate.

## Verified failing baseline (implementation not yet committed)

**46 failing / 40 passing** Vitest cases were run before implementation; the
separate TypeScript gate passes. Real authorization helpers, public mutation/read handlers, and all three Hono
recipient PDF paths reproduce missing ACCOUNT checks, wrong-person factors,
FREE_SIGNATURE omission, and file state/cache gaps. Tests double DB/storage/
webhook/job boundaries; password verification uses actual bcrypt. Positive
controls preserve the correct account, unprotected links, email-code completion
without an account, QR files, and authorized post-deadline downloads. Every test
must typecheck separately; no skips/xfails permitted.

The exact base main already passed CI run 34663118704 and full Playwright run
34663118705. Final PR CI/E2E remains required. The implementing session opens the
PR and stops; fresh independent adversarial review is mandatory, with no own
merge or deployment and no CI/deploy watcher.
