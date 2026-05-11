#!/usr/bin/env bash
# bizrethink-db-query.sh — Run a Postgres query against a Pacta environment.
#
# This is BizRethink dev tooling, NOT bundled with the platform build.
# Useful for ad-hoc data inspection, debugging, and one-off migrations
# without needing to SSH to the VPS or open the Coolify console.
#
# ── Usage ────────────────────────────────────────────────────────────────
#   ./scripts/bizrethink-db-query.sh <env> '<sql>'        # inline
#   ./scripts/bizrethink-db-query.sh <env> -f path.sql    # from file
#   echo 'SQL' | ./scripts/bizrethink-db-query.sh <env>   # from stdin
#
# Environments:
#   local — reads NEXT_PRIVATE_DATABASE_URL from .env at repo root
#   prod  — reads PACTA_PROD_DATABASE_URL (set in scripts/.creds.env or env)
#   stg   — reads PACTA_STG_DATABASE_URL (set in scripts/.creds.env or env)
#
# Transport (per-env, optional):
#   - Direct (default): psql connects to the URL host:port from your laptop.
#   - SSH-tunneled: when PACTA_<ENV>_SSH_HOST is set (e.g.
#     PACTA_PROD_SSH_HOST="root@45.32.220.165"), the script ships the query
#     over SSH and runs psql ON the remote host. This is required when the
#     URL points at a Coolify/Docker internal hostname that only resolves
#     inside the VPS network (the typical Coolify Postgres setup). No
#     port-forward, no background tunnel — psql executes remotely and stdout
#     comes back over the SSH session.
#
# Safety:
#   - Default mode is READ-ONLY. The script rejects queries containing
#     INSERT / UPDATE / DELETE / DROP / TRUNCATE / ALTER / CREATE / GRANT
#     / REVOKE unless you pass --write.
#   - --write requires an interactive "yes" confirmation showing the
#     query first. Refuses to run unattended without confirm.
#   - PGCONNECT_TIMEOUT=10 prevents hanging on bad networks.
#   - When SSH-tunneled, the URL string is shell-quoted with printf %q so
#     special chars in the password don't break remote command parsing.
#
# ── First-time setup for prod ────────────────────────────────────────────
# 1. In Coolify dashboard, find the pacta-platform service → Environment
#    Variables → copy NEXT_PRIVATE_DATABASE_URL (it'll look like
#    `postgres://docu:PASS@<host>:5432/documenso`).
# 2. (If URL host is an internal Docker hostname like `f640r884...`,
#    you also need SSH-tunnel mode — see step 3a.)
# 3. Save to scripts/.creds.env (this file is gitignored):
#
#      echo 'export PACTA_PROD_DATABASE_URL="postgres://..."' \
#        >> scripts/.creds.env
#
#    3a. If the URL host doesn't resolve locally, also add the VPS SSH
#        host. The VPS must be reachable via passwordless SSH key auth:
#
#      echo 'export PACTA_PROD_SSH_HOST="root@45.32.220.165"' \
#        >> scripts/.creds.env
#
# 4. Run queries (no flag changes — transport is auto-selected):
#      ./scripts/bizrethink-db-query.sh prod \
#        'SELECT id, url, name FROM "Organisation" ORDER BY "createdAt";'
#
# ── Examples ─────────────────────────────────────────────────────────────
#   List all orgs in prod:
#     ./scripts/bizrethink-db-query.sh prod \
#       'SELECT id, url, name, type, "createdAt"::date FROM "Organisation" ORDER BY "createdAt";'
#
#   Stamp internal orgs (write mode, will prompt):
#     ./scripts/bizrethink-db-query.sh prod --write "
#       INSERT INTO \"BizrethinkOrganisationBilling\"
#         (id, \"organisationId\", \"bizrethinkInternal\", \"updatedAt\")
#       SELECT gen_random_uuid()::text, id, true, NOW()
#       FROM \"Organisation\"
#       WHERE url IN ('bizrethink-ai', 'mfg', 'morg-cap')
#       ON CONFLICT (\"organisationId\")
#       DO UPDATE SET \"bizrethinkInternal\" = true;"
#
# ── Why this exists ──────────────────────────────────────────────────────
# Recurring need across sessions: pull org IDs / signature counts / audit
# log entries from prod without committing prod creds anywhere or opening
# Coolify in a browser. Solo dev shop = no formal DBA + ops separation;
# this is the ergonomic shortcut.

set -euo pipefail

# psql availability check (macOS hint: brew install libpq && brew link --force libpq)
if ! command -v psql >/dev/null 2>&1; then
  # Check common libpq paths that aren't in PATH
  for candidate in /opt/homebrew/opt/libpq/bin/psql /usr/local/opt/libpq/bin/psql; do
    if [[ -x "$candidate" ]]; then
      PATH="$(dirname "$candidate"):$PATH"
      break
    fi
  done
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install with:" >&2
  echo "    brew install libpq && brew link --force libpq" >&2
  echo "  (postgresql@15 also works if you want the server too.)" >&2
  exit 1
fi

ENV="${1:-}"
shift || true

if [[ -z "$ENV" || "$ENV" == "-h" || "$ENV" == "--help" ]]; then
  sed -n '2,30p' "$0"
  exit 1
fi

ALLOW_WRITE=false
NON_INTERACTIVE=false
while true; do
  case "${1:-}" in
    --write) ALLOW_WRITE=true; shift ;;
    # --yes skips the interactive "Type yes" prompt. Use ONLY when invoking
    # this script from another script / automation that has already shown
    # the SQL to a human reviewer (e.g., a committed migration file).
    # NOT a shortcut for ad-hoc destructive queries from the terminal.
    --yes) NON_INTERACTIVE=true; shift ;;
    *) break ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CREDS_FILE="$REPO_ROOT/scripts/.creds.env"

# Resolve DATABASE_URL + optional SSH transport host based on env.
# When SSH_HOST is non-empty, psql runs on the remote host instead of locally
# — required for Coolify Postgres which uses internal Docker hostnames.
SSH_HOST=""
case "$ENV" in
  local)
    if [[ -f "$REPO_ROOT/.env" ]]; then
      set -a; source "$REPO_ROOT/.env"; set +a
    fi
    URL="${NEXT_PRIVATE_DATABASE_URL:-}"
    # No SSH for local — always direct.
    ;;
  prod)
    [[ -f "$CREDS_FILE" ]] && source "$CREDS_FILE"
    URL="${PACTA_PROD_DATABASE_URL:-}"
    SSH_HOST="${PACTA_PROD_SSH_HOST:-}"
    ;;
  stg)
    [[ -f "$CREDS_FILE" ]] && source "$CREDS_FILE"
    URL="${PACTA_STG_DATABASE_URL:-}"
    SSH_HOST="${PACTA_STG_SSH_HOST:-}"
    ;;
  *)
    echo "Unknown env: $ENV  (expected: local | prod | stg)" >&2
    exit 1
    ;;
esac

if [[ -z "$URL" ]]; then
  echo "DATABASE_URL for env '$ENV' is not set." >&2
  echo "" >&2
  if [[ "$ENV" == "local" ]]; then
    echo "Expected NEXT_PRIVATE_DATABASE_URL in $REPO_ROOT/.env" >&2
  else
    echo "Expected PACTA_${ENV^^}_DATABASE_URL in $CREDS_FILE" >&2
    echo "" >&2
    echo "Fetch it from Coolify and save:" >&2
    echo "  echo 'export PACTA_${ENV^^}_DATABASE_URL=\"postgres://...\"' \\" >&2
    echo "    >> $CREDS_FILE" >&2
  fi
  exit 1
fi

# Determine query source
QUERY=""
if [[ "${1:-}" == "-f" ]]; then
  QUERY="$(cat "$2")"
elif [[ -n "${1:-}" ]]; then
  QUERY="$1"
elif [[ ! -t 0 ]]; then
  QUERY="$(cat)"
fi

if [[ -z "$QUERY" ]]; then
  echo "No query provided." >&2
  exit 1
fi

# Read-only enforcement
if ! $ALLOW_WRITE; then
  # Strip line comments, uppercase, then word-boundary keyword check
  cleaned="$(printf '%s' "$QUERY" | sed -E 's|--[^[:cntrl:]]*||g' | tr '[:lower:]' '[:upper:]')"
  if echo "$cleaned" | grep -qE '\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b'; then
    echo "Query contains write keywords; use --write to allow." >&2
    echo "(--write will prompt for explicit 'yes' confirmation before executing.)" >&2
    exit 1
  fi
fi

if $ALLOW_WRITE; then
  printf '\n⚠️  WRITE MODE on env=%s. Query:\n' "$ENV"
  printf -- '---\n%s\n---\n' "$QUERY"
  if $NON_INTERACTIVE; then
    printf '✓ --yes flag set; skipping interactive confirmation.\n'
  else
    printf 'Type "yes" to proceed: '
    read -r confirm
    if [[ "$confirm" != "yes" ]]; then
      echo "Aborted." >&2
      exit 1
    fi
  fi
fi

# Execute — direct or via SSH+docker-exec depending on transport selection.
# In both modes the query is piped via stdin to psql so we don't have to
# worry about shell-quoting the SQL itself.
if [[ -n "$SSH_HOST" ]]; then
  # SSH mode. The VPS host doesn't ship psql at the OS level — Postgres
  # runs as a Coolify-managed Docker container. The Coolify convention is
  # that the container name == the internal Docker hostname == the host
  # portion of the URL. Parse it out and `docker exec` into it.
  #
  # Strip protocol prefix → "user:pass@host:port/db", then auth →
  # "host:port/db", then port+db → "host" which is the container name.
  REMOTE_HOST_PART="${URL#*@}"
  CONTAINER="${REMOTE_HOST_PART%%:*}"

  if [[ -z "$CONTAINER" ]]; then
    echo "Could not parse container name from URL." >&2
    exit 1
  fi

  # printf %q shell-quotes the URL safely for re-evaluation by the remote
  # bash. docker exec then passes the un-escaped URL as a single argv to
  # psql (no further shell parsing inside the container).
  QUOTED_URL=$(printf '%q' "$URL")
  printf '%s\n' "$QUERY" | ssh \
    -o ConnectTimeout=10 \
    -o BatchMode=yes \
    -o LogLevel=ERROR \
    -T "$SSH_HOST" \
    "docker exec -i $CONTAINER env PGCONNECT_TIMEOUT=10 psql $QUOTED_URL -v ON_ERROR_STOP=1"
else
  printf '%s\n' "$QUERY" | PGCONNECT_TIMEOUT=10 psql "$URL" -v ON_ERROR_STOP=1
fi
