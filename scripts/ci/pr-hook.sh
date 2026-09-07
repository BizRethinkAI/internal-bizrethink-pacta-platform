#!/usr/bin/env bash
# pr-hook.sh — Claude Code PreToolUse hook for Bash. Blocks `gh pr create` /
# `gh pr edit` unless the body comes from a file that passes check-pr-body.mjs.
# Receives the tool call as JSON on stdin; exit 2 blocks and the message on
# stderr is shown to the session. Anything that is not a PR body write passes.
set -u
input=$(cat)
cmd=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.command)||"")}catch{process.stdout.write("")}})')
case "$cmd" in
  *"gh pr create"*|*"gh pr edit"*) ;;
  *) exit 0 ;;
esac
# `gh pr edit` without a body flag (title, labels, base) is not a body write.
if [[ "$cmd" == *"gh pr edit"* ]] && [[ "$cmd" != *"--body"* ]] && [[ "$cmd" != *"-b "* ]] && [[ "$cmd" != *"-F "* ]]; then exit 0; fi
root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
# Parse the gh line only (the rest of a compound command may mention the flag in prose).
ghline=$(printf '%s' "$cmd" | grep -E 'gh pr (create|edit)' | tail -1)
bodyfile=$(printf '%s' "$ghline" | sed -nE 's/.*(--body-file|-F)[= ]+("([^"]+)"|'"'"'([^'"'"']+)'"'"'|([^ ]+)).*/\3\4\5/p' | head -1)
case "$bodyfile" in *'$'*) echo "The hook reads the command text and cannot expand shell variables: give the body flag a literal path (got $bodyfile)." >&2; exit 2 ;; esac
if [ -z "$bodyfile" ]; then
  echo "PR bodies are written from a file that follows .github/pull_request_template.md — use \`gh pr create --body-file <file>\` (or \`gh pr edit N --body-file <file>\`), never --body/-b. Run /open-pr." >&2
  exit 2
fi
case "$bodyfile" in /*) ;; *) bodyfile="$PWD/$bodyfile" ;; esac
if [ ! -f "$bodyfile" ]; then echo "PR body file not found: $bodyfile" >&2; exit 2; fi
changed=$(mktemp)
base=$(git -C "$root" rev-parse --abbrev-ref origin/HEAD 2>/dev/null | sed 's#^origin/##'); base=${base:-main}
git -C "$root" fetch -q origin "$base" 2>/dev/null || true
git -C "$root" diff --name-status "origin/$base...HEAD" > "$changed" 2>/dev/null || true
if ! out=$(cd "$root" && node scripts/ci/check-pr-body.mjs --body "$bodyfile" --changed "$changed" 2>&1); then
  echo "$out" >&2
  echo "Blocked: the PR body does not follow the template. Fix $bodyfile and retry." >&2
  rm -f "$changed"; exit 2
fi
rm -f "$changed"; exit 0
