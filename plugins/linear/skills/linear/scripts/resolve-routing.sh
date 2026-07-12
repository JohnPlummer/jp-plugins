#!/usr/bin/env bash
# Resolve Linear routing (workspace, team, optional default project) for the current repo.
#
# Cascade, most specific first:
#   1. Environment - Claude Code injects the repo's committed .claude/settings.json env.
#      A repo that names its own team/workspace always wins.
#   2. Machine default - the env block of ~/.claude/settings.local.json, which is gitignored
#      and therefore machine-local. A machine belongs to one workspace and its MCP is
#      authenticated against that workspace, so this is the everyday default: a personal Mac
#      resolves to the personal workspace, a work Mac to the work one.
#
# Read from the file rather than trusting env for layer 2: user-scope settings.local.json is
# not a documented settings layer, so whether Claude Code injects it cannot be relied on.
# Reading it makes the cascade deterministic on every machine and in every Claude version.
#
# Prints KEY=VALUE lines for eval, or exits 1 with a message naming what is missing.
set -uo pipefail

LOCAL_SETTINGS="${HOME}/.claude/settings.local.json"

from_local() {
  [ -f "$LOCAL_SETTINGS" ] || return 0
  python3 - "$LOCAL_SETTINGS" "$1" <<'PY' 2>/dev/null
import json, sys
try:
    env = json.load(open(sys.argv[1])).get("env", {})
except Exception:
    sys.exit(0)
print(env.get(sys.argv[2], ""))
PY
}

resolve() {           # resolve <KEY> -> env wins, else the machine-local file
  local key="$1" val="${!1:-}"
  [ -n "$val" ] || val="$(from_local "$key")"
  printf '%s' "$val"
}

WORKSPACE="$(resolve LINEAR_WORKSPACE)"
TEAM_ID="$(resolve LINEAR_DEFAULT_TEAM_ID)"
TEAM_NAME="$(resolve LINEAR_DEFAULT_TEAM_NAME)"
TEAM_PREFIX="$(resolve LINEAR_DEFAULT_TEAM_PREFIX)"
PROJECT_ID="$(resolve LINEAR_DEFAULT_PROJECT_ID)"
PROJECT_NAME="$(resolve LINEAR_DEFAULT_PROJECT_NAME)"

missing=()
[ -n "$WORKSPACE" ]   || missing+=(LINEAR_WORKSPACE)
[ -n "$TEAM_ID" ]     || missing+=(LINEAR_DEFAULT_TEAM_ID)
[ -n "$TEAM_NAME" ]   || missing+=(LINEAR_DEFAULT_TEAM_NAME)
[ -n "$TEAM_PREFIX" ] || missing+=(LINEAR_DEFAULT_TEAM_PREFIX)

if [ ${#missing[@]} -gt 0 ]; then
  echo "linear: unresolved routing: ${missing[*]}" >&2
  echo "Set the machine default in ~/.claude/settings.local.json (env block), or bind this repo" >&2
  echo "in its committed .claude/settings.json. Never guess a team - wrong-workspace writes are" >&2
  echo "hard to undo. See the linear plugin README, Setup." >&2
  exit 1
fi

echo "LINEAR_WORKSPACE=${WORKSPACE}"
echo "LINEAR_DEFAULT_TEAM_ID=${TEAM_ID}"
echo "LINEAR_DEFAULT_TEAM_NAME=${TEAM_NAME}"
echo "LINEAR_DEFAULT_TEAM_PREFIX=${TEAM_PREFIX}"
[ -n "$PROJECT_ID" ]   && echo "LINEAR_DEFAULT_PROJECT_ID=${PROJECT_ID}"
[ -n "$PROJECT_NAME" ] && echo "LINEAR_DEFAULT_PROJECT_NAME=${PROJECT_NAME}"
exit 0
