# Signing identity — A-19

Assigned to author `security-queue-20260914`, task #218. Second in the approved
Account protection → Signing identity → Resource/abuse limits → Sensitive
information sequence. Fresh main-based worktree, Node 24 npm ci and Prisma
generation; latest merged main reconfirmed as
`9e03b72d570dc00b9904974fadedeaadf3a079a3`. Account protection #221 has green
final-head author CI before this PR opens. Independent review, merging,
consolidation and shipping remain separate; no production operation occurred.

## Behavior and boundaries

- **Reassignment revokes authority.** Changing a recipient's name, normalized
  email or role rotates its bearer and clears local CSC credential/session proof.
  Read, sent, signed, rejection and reminder bookkeeping reset for the new
  identity. Configured expiry and authentication requirements remain intact.
  An unchanged identity retains its token and provider proof; case-only email
  normalization is not a reassignment.
- **All existing identity editors participate.** Document replacements, v2
  updates, template replacements, admin corrections and direct-template
  placeholder conversion/removal use the locked authoring transaction. The
  common envelope/recipient/field locks preserve signed/inserted-field and
  AES/QES distribution immutability. Next-signer dictation also rotates the
  reassigned recipient. New direct-template documents already create fresh
  recipient tokens before publishing the document, so their initial identity
  assignment needs no second rotation.
- **Requests retain the authority they checked.** Legacy and v2 field insertion
  and removal, completion, rejection and CSC final persistence lock the parent,
  recipients and fields, then recheck current token/identity, relevant auth and
  signing policy, target identity, status and deadline before writing. Field
  mutations also retain the checked field assignment/type/metadata. A request
  overtaken by reassignment cannot mutate fields, write signed document bytes,
  complete the replacement or create its completion audit/jobs.
- **Completion is one database unit.** Automatic DATE insertion, successful
  completion-auth audit and recipient completion share the guarded transaction.
  Failed 2FA audit checks current authority before recording the failed attempt.
  Duplicate completion keeps the existing idempotent success behavior. Filling
  a previously blank identity during that recipient's own completion preserves
  its active token; this is distinct from assigning its authority to someone else.
- **Provider proof cannot return after reassignment.** Service credentials,
  prepared sessions and provider signing approvals carry the originating token
  into the final local write. Only short database work holds locks; provider
  network and PDF operations stay outside them. CSC completion checks identity
  before any in-place signed-PDF data update or session consumption.
- **Delivery remains consistent.** Reassignment of a delivered, currently
  eligible recipient schedules its new link after commit, respecting manual
  distribution, sequential turn, CC and email settings. The existing email job
  resolves the current token. Finishing an older send cannot mark the replacement
  SENT or reschedule its reminders; reminder writes carry their source token.

## Decisions and limits

Names compare exactly; emails compare case-insensitively, matching the existing
normalization policy. Role changes revoke the bearer because they change what
it authorizes. Recipient expiration is retained, including an already expired
signing window; authorized downloads continue under the previously approved
A-05 policy.

Resetting CSC data removes local proof and authority. It does not revoke a
provider's remote account or retract emails/PDF bytes already delivered. An old
request that already finished authorization for a read may finish that read;
write transactions recheck authority at commit. Delivery scheduling remains
best effort after commit using the existing jobs, without an exactly-once outbox.
A previously completed email job step without a stored count does not perform
unproven replacement bookkeeping when resumed.

No schema, dependency, billing, trial-limit or legal-language change. No new
signing method, general error-status rewrite, provider integration or historic
production-data cleanup. The later sensitive-information bucket owns existing
raw error/log content, including CSC diagnostics. Public records contain only
synthetic test values and role/session attribution.

## Fork durability and validation

Owned lifecycle policy is in `server-only/recipient-identity.ts`,
`recipient-authority.ts` and `recipient-identity-delivery.ts`. The existing owned
`document-replacement.ts` snapshot also includes direct-link state. Overlay
`088-recipient-identity.patch` reproduces all **20 upstream files exactly** from
this main base and passes reverse application. Recheck every hooked editor,
field/recipient transaction, CSC callback/persistence boundary and delivery token
predicate after an upstream signing/auth refactor. The new HTTP spec has exact
ownership and separate-typecheck declarations.

- Test-first commit `40f17eb08`: **21 meaningful failures / 13 passing controls**
  before implementation, covering identity editors and stale field/completion/
  rejection requests. Additional pre-fix failures covered provider-proof writes
  (3), replacement delivery (1), next-signer dictation (1), provider execution
  and duplicate completion (2), and stale reminder state (1). A supplementary
  comparison against the merged email handler reproduced stale SENT bookkeeping
  with its current-delivery control passing.
- Focused validation: **307 passing tests in 11 files**, including all changed
  signing/identity boundaries and existing assistant, replacement, recipient
  factor, token-operation and PDF-access controls. Separate type checking and
  changed-file formatting pass. No new skips or weakened assertions.
- Seven HTTP/PostgreSQL scenarios are included: four editor paths, retained
  ACCOUNT/deadline policy, and real lock-wait races for insertion and completion.
  Local discovery found all seven; actual execution belongs to PR CI.
- Before Playwright: main run
  [34794610436](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34794610436)
  represents the exact unchanged main base, dependencies and test configuration.
  This PR's CI is the broad after gate; no local build or production DB was used.
- Production audit remains **6 accepted entries: 3 high, 3 moderate, 0 critical**,
  with unchanged advisory identities/paths through Prisma configuration and
  OpenAPI generation. No dependency changed; advisory success is not zero findings.

Next: author owns final-head CI through green and substantive review fixes.
Fresh human-started adversarial review of signing/auth/upstream changes remains
required. The separate shipping session owns approved merges and final batch
state consolidation. Resource/abuse limits #219 follows this PR's green author CI.
