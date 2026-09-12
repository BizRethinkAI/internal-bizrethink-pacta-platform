# Safe outbound connections — A-09, A-14 and webhook A-10

Assigned by Shwet to `safe-outbound-20260912`, task [#191](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/191).
Branch `fix/safe-outbound-connections`, worktree `/private/tmp/pacta-safe-outbound`,
base main `1813b1d72fb231593ddcb2cb0b2a55054ac7f040`. This is an author handoff,
not evidence of independent review, merge or deployment. Final CI verdict belongs
in the PR and task comments, without a status-only code push.

## Scope and outcome

Shwet approved this coherent bucket together and explicitly chose **public
Internet SMTP only**. The existing admin-managed webhook exceptions are separate.

- **A-09:** creation/editing validation and every delivery attempt fail closed on
  DNS errors, timeouts, empty/malformed answers and mixed permitted/denied answers.
  Host/URL parsing rejects unsupported protocols and URL credentials. Node's IP
  parser and CIDR checks cover private, loopback, link-local, shared, multicast,
  reserved/documentation and IPv6 translation/tunnel ranges. Every resolved address
  must pass, then one checked address is used for that attempt. HTTP(S) uses a fresh
  connection to that numeric address, the original Host/SNI/certificate name and
  normal certificate trust enforcement. It never follows redirects.
- **A-14:** the real `organisationSmtp.test` requires the explicit organisation and
  existing MANAGE_ORGANISATION roles before rate counters or network work. Atomic
  counters in the existing RateLimit table permit five tests per user and ten per
  organisation per ten-minute bucket, across processes. Counter errors deny the
  request. This does not change the shared limiter or REST/API/email quotas.
  Nodemailer gets a checked public address, an owned TCP socket, verified implicit
  TLS or mandatory STARTTLS, and forced authentication. `verify()` sends no email.
  Cleanup destroys the actual socket; transporter.close() alone is insufficient
  for a non-pooled, in-progress verification. Raw errors/banners are not returned.
  The form supplies organisationId and displays a failed permission/rate check.
- **A-10, webhook portion only:** each complete operation has a ten-second
  deadline, covering config/DNS, connection/TLS and response-body consumption.
  DNS itself has a two-second deadline. A late configuration result cannot start
  another lookup after the overall deadline. Webhook response bodies are capped
  at 64 KiB on the wire and after decompression; parser headers and retained
  header/trailer metadata are capped at 8 KiB. gzip/deflate/Brotli responses retain
  their ordinary decoded JSON/text behavior. Budget/transport failures retain only
  a bounded controlled error, status 0 and empty headers; actual HTTP errors and
  redirects retain their status without following them.

## Decisions and limits

The numeric limits above are fixed safety ceilings for these operations, chosen
by this author; no new environment variable, configuration model, migration or
admin surface was introduced. They may reject receivers that return unusually
large diagnostic responses, DNS taking over two seconds, or tests taking over ten.

The IP policy is deliberately conservative: ordinary public IPv4 and global
unicast IPv6 outside special-purpose prefixes; it denies even public mapped/NAT64/
tunnel forms and the small globally routable exceptions within reserved aggregate
ranges. One address is selected per attempt, with no internal address retry or
connection pool; existing webhook job retry behavior remains responsible for
future attempts. This can reduce availability for an unreachable first DNS answer.
No proxy environment/global agent substitutes for the checked HTTP destination.

The existing webhook exception getter retains its DB/env/cache behavior and exact
host semantics (canonical case/IDNA/IP/trailing-dot normalization). An explicit
exception can authorize a private destination for webhooks, but still requires a
valid address, successful resolution, supported protocol and verified HTTPS.
SMTP never consults that exception list. Its public ports remain configurable in
1–65535; this work does not impose a provider/port allowlist. Private SMTP and
plaintext-only servers fail. Existing saved SMTP configurations are not migrated,
and the unconnected per-org mailer factory is not wired into actual email sends.

This is application-layer protection, not verification of network egress policy.
Deployment-specific routing, public-address hairpins and intentionally trusted
private webhook receivers require operator controls. No production credential,
query, connection test, infrastructure change or deployment was used.

**A-10 remains open:** upload/multipart pre-auth buffering, lease PDF work,
unsigned job bodies, avatar/AI work, shared-host CPU/memory and tenant/concurrency/
spend budgets are outside this PR. SMTP reply byte budgets beyond its connection
count/time bounds also are not established here. Other audit findings remain in
their assigned buckets.

## Validation and evidence

- Fresh `npm ci`, Prisma generation, Node 24.20.0; no local build or imported
  production environment. No dependency or lockfile changes.
- Test-first commit `54c4b462b`: 35 behavior failures and eight controls before
  implementation, through the real guard/execution helpers and authenticated
  router (four Vitest files). Additional focused red tests caught four hostname
  truncations in Node domainToASCII and one late-policy lookup during development;
  those were fixed before the final full focused run. Filtering those diagnostic
  runs did not add skips; all cases run in the final suite.
- Final focused run: 67 owned tests across six files, plus 34 existing upstream
  URL tests. Targeted TypeScript check includes owned implementation and tests,
  their upstream consumers and the new HTTP/browser spec. Changed-file Biome,
  source whitespace and overlay forward/reverse checks pass before push. Patch files
  contain legitimate blank context lines; the source whitespace check excludes
  `overlays/*.patch` rather than corrupting their patch syntax.
- Real loopback HTTP/HTTPS and SMTP/TLS/STARTTLS fixtures verify pinning, original
  Host/SNI, response limits, stalled bodies, certificate-name/trust rejection,
  encrypted authentication and actual socket destruction. SMTP's test adapter
  remaps only the checked synthetic public address to loopback; it does not
  establish production/public-service reachability. Ephemeral synthetic CA/key
  material is generated and removed locally; production TLS checks are intact.
- Seven Playwright HTTP/PostgreSQL/browser cases cover anonymity, foreign-org and
  non-manager denial, allowed manager/private-target rejection, independent user
  and org budgets, atomic concurrent admission and the actual SMTP form. They are
  discovered locally; executed after evidence comes from PR CI, not a local DB.
- Before Playwright: [run 34719946377](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34719946377)
  passed on exact base main 1813b1d72 (1098 passed, two flaky, 59 skipped). It
  represents the unchanged application/dependencies/test configuration. The PR
  CI supplies the after gate and full builds/unit/type/security checks.
- Local production audit matches the six accepted baseline findings: three high
  via deepmerge-ts/Prisma (GHSA-ggr8-5vv4-36mx), three moderate via
  ts-deepmerge/OpenAPI (GHSA-87mf-gv2c-c62c). No new advisory identity or dependency
  change. Final CI comparison belongs in the PR/task; audit workflow success
  alone is not a clean advisory result.

## Fork and review handoff

Owned implementation: `packages/bizrethink/server-only/outbound/`,
`test-org-smtp.ts` and `trpc/org-smtp-router.ts`. **Overlay 083** contains both
upstream webhook delegates, changed upstream fail-closed test expectations and
the SMTP form integration. README and the exact owned Playwright declaration are
included. The former guard body is removed rather than copied into a parallel
upstream implementation; overlay 017's deferred config import is preserved.
Regenerate/review these hooks if upstream webhook dispatch or SMTP UI changes.

Only this branch's note is owned. Task #186 / PR #188 keeps overlay 082 and its
A-08 review. MCA tasks #185/#189/#192 are separate. Mechanical README/typecheck/
ownership-list integration with #188 must retain both sets of entries. No STATE.md
or another branch/note was edited. After green CI, Shwet starts one fresh independent
adversarial review; substantive fixes return here. The author never merges or
ships. The separately authorized shipping session consolidates batch state and
owns any deployment. A deploy request is not evidence that code is live.

Implementation references, checked 2026-09-12: [OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html),
[Node HTTP request options](https://nodejs.org/docs/latest-v24.x/api/http.html#httprequestoptions-callback),
[Nodemailer SMTP/TLS options](https://nodemailer.com/smtp), and the linked IANA
special-purpose registries in `outbound/destination.ts`. The installed Nodemailer
source was also checked for getSocket/verify/close behavior and forceAuth support.
