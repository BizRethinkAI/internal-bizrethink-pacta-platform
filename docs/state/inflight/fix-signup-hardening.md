# fix/signup-hardening — signup fails closed; SSO removed; invites claim on verification

**Branch:** `fix/signup-hardening`. Response to the 2026-09-10 external probe.

## What happened (the incident this answers)

On 2026-09-10, 08:30–09:37 UTC, one IP (180.178.58.85, a Hong Kong hosting range)
self-signed-up three accounts on production and spent about 240 HTTP requests
probing tRPC: guessing document and team ids, admin procedures, API tokens, and a
webhook pointed at a `dnslog.cn` canary. **Nothing crossed a tenant boundary,
nothing was sent, and the SSRF attempt was blocked** — every request that
succeeded touched only the attacker's own rows. Evidence is kept outside the repo
(it contains PII).

**The root cause was that signup had never been closed.** The `site.signup` row was
saved on 2026-05-11 with `enabled=false, signupDisabled=false`. `signup-config.ts`
treated a disabled, missing or unreadable row as "fall back to
`NEXT_PUBLIC_DISABLE_SIGNUP`", which production never set — so signup was open
from launch. Merchants had been creating accounts through the post-signing "create
account" button since 2026-05-13, each receiving an unmetered `pro` org.

Containment was done by hand the same day, outside this PR: the row was set to
enabled + disabled, the attacker's accounts, orgs, sessions, webhook and draft were
deleted, a stray API token was revoked, and a five-month-old PENDING ADMIN invite
to `mfg` was removed. `/signup` now redirects to `/signin` on all three domains.

## What this PR changes

- **Signup fails closed** (`signup-config.ts`, `schemas/signup.ts`). Open only when
  the row exists, is enabled, parses, and says `signupDisabled: false`. A missing
  row, a disabled row, a bad row and a DB error all mean closed, and the last two
  are logged. The env var can close signup but never open it. The admin section
  now shows "closed" when no row exists, and its copy says what opens it.
- **SSO is removed from the build** — a code-level switch, not a setting, so a DB
  row or env credentials cannot bring it back. Production had no SSO configured
  and no OAuth-linked accounts, so no user is affected.
- **Invites are accepted only for a verified email.** Signup no longer joins an
  org before the address is proven; verification does.
- **The public `signupInvite.lookup` procedure is removed.** It told anyone which
  orgs had invited a given email.

## E2E consequence

A fresh E2E database now has signup closed. `resetAllBizRethinkSingletons` re-seeds
an **open** `site.signup` row instead of deleting it (deleting it would close
signup under whichever spec is signing up in another worker — the suite is
`fullyParallel` on one DB), and the two specs that sign up through the UI open it
explicitly first.

## Still open

- **Parked by the owner:** review of the ~35 self-signup `pro` orgs and their
  accounts. Users 6 and 9 and Lombard are known valid; whether their personal orgs
  are needed is unknown. Nothing is deleted until that review.
- Not in this PR: the org SMTP "test connection" procedure accepts any host from any
  signed-in user (an internal port scanner); the webhook SSRF guard fails open on
  DNS errors and does not pin the resolved IP; per-user rate limits.
- Two Axiom monitors were created outside the repo: "new signup (any)" and
  "tRPC enumeration from one IP" (backtested over 30 days: fires only on this
  attacker).
