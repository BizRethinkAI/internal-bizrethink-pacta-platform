#!/usr/bin/env bash
# bizrethink-sync-lease-data.sh — Copy lease-builder working data prod → local.
#
# This is BizRethink dev tooling, NOT bundled with the platform build.
#
# WHY THIS EXISTS
#   `npm run prisma:seed` gives you users, orgs and 1000 filler documents, but
#   zero lease matters — so the lease builder, the reviewer page and the PDF
#   renderer all start from an empty state locally. This pulls the small set of
#   rows you actually work on so Tier 0 (local dev server) starts somewhere real.
#
# WHAT IT COPIES (and nothing else)
#   BizrethinkProperty, BizrethinkLeaseMatter, BizrethinkLeaseReview,
#   BizrethinkReviewComment, BizrethinkClauseApproval
#
# WHAT IT DELIBERATELY DOES NOT COPY
#   - Envelope / Recipient / Signature  → the real signed contracts. Never.
#   - Bizrethink*InstanceConfig         → holds encrypted secrets (AI, signing,
#                                         storage, Stripe). Never.
#   - User / Organisation / Team        → local seed identities are used instead,
#                                         and prod foreign keys are remapped onto
#                                         them (see REMAPS below).
#
# DIRECTION IS ONE-WAY AND ENFORCED
#   Reads prod through the read-only bizrethink-db-query.sh. Writes only to a
#   database whose host is localhost/127.0.0.1; anything else aborts. There is no
#   flag to reverse this.
#
# ── Usage ────────────────────────────────────────────────────────────────
#   ./scripts/bizrethink-sync-lease-data.sh                # sync as-is
#   ./scripts/bizrethink-sync-lease-data.sh --anonymize    # scrub tenant PII
#   ./scripts/bizrethink-sync-lease-data.sh --as user@x    # attach to another
#                                                          # local seed user
#
# --anonymize replaces reviewer/comment-author names and emails with test
# values. The lease facts themselves (address, rent, dates) are kept, because
# without them there is nothing to test. Use it if you want the tenant's real
# name and email off your laptop.
#
# ── Requirements ─────────────────────────────────────────────────────────
#   - scripts/.creds.env with PACTA_PROD_DATABASE_URL (+ PACTA_PROD_SSH_HOST)
#   - local stack up: npm run dx:up
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ANONYMIZE=false
AS_EMAIL="example@documenso.com"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --anonymize) ANONYMIZE=true; shift ;;
    --as) AS_EMAIL="${2:?--as needs an email}"; shift 2 ;;
    -h|--help) sed -n '2,45p' "$0"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

# ── Resolve + guard the local target ─────────────────────────────────────
LOCAL_URL="$(grep -E '^NEXT_PRIVATE_DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
if [[ -z "$LOCAL_URL" ]]; then
  echo "FATAL: NEXT_PRIVATE_DATABASE_URL not found in .env" >&2; exit 1
fi

LOCAL_HOST="$(printf '%s' "$LOCAL_URL" | sed -E 's#^[^:]+://([^@]*@)?([^:/?]+).*#\2#')"
case "$LOCAL_HOST" in
  localhost|127.0.0.1|::1) : ;;
  *) echo "FATAL: refusing to write to non-local host '$LOCAL_HOST'." >&2
     echo "       This script only ever writes to a local development database." >&2
     exit 1 ;;
esac

psql_local() { psql "$LOCAL_URL" -v ON_ERROR_STOP=1 -qtA "$@"; }

echo "→ local target: $LOCAL_HOST"

# ── Resolve local identities to remap prod foreign keys onto ─────────────
read -r LOCAL_USER LOCAL_ORG LOCAL_TEAM <<<"$(psql_local -F' ' -c "
  select u.id, om.\"organisationId\", t.id
  from \"User\" u
  join \"OrganisationMember\" om on om.\"userId\" = u.id
  join \"Team\" t on t.\"organisationId\" = om.\"organisationId\"
  where u.email = '${AS_EMAIL//\'/\'\'}'
  limit 1")"

if [[ -z "${LOCAL_USER:-}" ]]; then
  echo "FATAL: no local user '$AS_EMAIL'. Run: npm run prisma:seed" >&2; exit 1
fi
echo "→ attaching to user=$LOCAL_USER org=$LOCAL_ORG team=$LOCAL_TEAM ($AS_EMAIL)"

# ── Pull each table prod → local ─────────────────────────────────────────
# Streamed straight into psql; prod rows are never written to disk.
pull() {
  local table="$1"
  printf '   %-28s' "$table"
  psql_local -c "drop table if exists _sync_stage; create temp table _sync_stage (like \"$table\" including defaults);" >/dev/null 2>&1 || true
  # temp tables die with the session, so stage + insert must share one psql.
  ./scripts/bizrethink-db-query.sh prod \
    "COPY (select * from \"$table\") TO STDOUT WITH (FORMAT csv, HEADER true)" 2>/dev/null \
    > "$TMPDIR_SYNC/$table.csv"
  local n; n=$(( $(wc -l < "$TMPDIR_SYNC/$table.csv") - 1 ))
  [[ $n -lt 0 ]] && n=0
  echo "$n row(s)"
}

TMPDIR_SYNC="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SYNC"' EXIT   # prod rows never outlive this process

echo "→ pulling from prod (read-only)"
for t in BizrethinkProperty BizrethinkLeaseMatter BizrethinkLeaseReview \
         BizrethinkReviewComment BizrethinkClauseApproval; do
  pull "$t"
done

# ── Load into local, remapping foreign keys ──────────────────────────────
# REMAPS: prod org/team/user ids do not exist locally, so every owning column is
# rewritten to the local seed identity resolved above. envelopeId is nulled —
# the prod Envelope is a real contract and is not copied.
echo "→ loading into local"
for t in BizrethinkProperty BizrethinkLeaseMatter BizrethinkLeaseReview \
         BizrethinkReviewComment BizrethinkClauseApproval; do
  cols="$(head -1 "$TMPDIR_SYNC/$t.csv")"
  [[ -z "$cols" ]] && continue
  printf '   %-28s' "$t"
  psql_local >/dev/null <<SQL
begin;
create temp table _stage (like "$t" including defaults) on commit drop;
\copy _stage ($cols) from '$TMPDIR_SYNC/$t.csv' with (format csv, header true)

$( [[ "$t" == "BizrethinkProperty" ]] && echo "
update _stage set \"organisationId\" = '$LOCAL_ORG', \"createdByUserId\" = $LOCAL_USER;" )
$( [[ "$t" == "BizrethinkLeaseMatter" ]] && echo "
update _stage set \"organisationId\" = '$LOCAL_ORG', \"teamId\" = $LOCAL_TEAM,
                  \"createdByUserId\" = $LOCAL_USER, \"envelopeId\" = null;" )
$( [[ "$t" == "BizrethinkLeaseReview" ]] && echo "
update _stage set \"createdByUserId\" = $LOCAL_USER;" )
$( [[ "$t" == "BizrethinkReviewComment" ]] && echo "
update _stage set \"dispositionedByUserId\" = case when \"dispositionedByUserId\" is null
                                              then null else $LOCAL_USER end;" )
$( [[ "$t" == "BizrethinkClauseApproval" ]] && echo "
update _stage set \"approvedByUserId\" = case when \"approvedByUserId\" is null
                                         then null else $LOCAL_USER end;" )

$( [[ "$ANONYMIZE" == true && "$t" == "BizrethinkLeaseReview" ]] && echo "
update _stage set \"reviewerName\" = 'Test Reviewer',
                  \"reviewerEmail\" = 'reviewer@example.test';" )
$( [[ "$ANONYMIZE" == true && "$t" == "BizrethinkReviewComment" ]] && echo "
update _stage set \"authorName\" = 'Test Reviewer';" )

delete from "$t" where id in (select id from _stage);
insert into "$t" select * from _stage;
commit;
SQL
  echo "ok"
done

echo
echo "✓ synced. Verify:"
psql_local -c "
  select 'LeaseMatter' t, count(*) n from \"BizrethinkLeaseMatter\"
  union all select 'LeaseReview', count(*) from \"BizrethinkLeaseReview\"
  union all select 'Property',    count(*) from \"BizrethinkProperty\"
  order by 1" | sed 's/^/   /'
echo
echo "  Sign in at http://localhost:3000 as $AS_EMAIL (password: password)"
