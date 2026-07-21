#!/usr/bin/env bash
# Resolve Linear routing (workspace, team, optional default project) for the current repo.
#
# Cascade, most specific first:
#   1. Repo binding - the env block of the repo's committed .claude/settings.json. Read from
#      the file, not from the environment, so the repo always wins regardless of how Claude
#      Code orders its env injection. Use it when a repo belongs to a team or workspace other
#      than the machine default, or to pin a default project.
#   2. Machine default - $LINEAR_* exported from ~/.zshenv.local, which is sourced by .zshenv
#      and never committed. A machine belongs to one Linear workspace and its MCP is
#      authenticated against that workspace, so this is the everyday default: a personal Mac
#      resolves to the personal workspace, a work Mac to the work one.
#      Taken from the environment when present, otherwise read straight out of the file.
#      The file read is what makes this robust under Claude Code. .zshenv reaches
#      non-interactive shells, but not unconditionally: zsh reads $ZDOTDIR/.zshenv in
#      preference to ~/.zshenv, so any process that inherits a ZDOTDIR pointing at a
#      directory without a .zshenv skips the machine-local file entirely. A long-running
#      agent supervisor also pins whatever environment it started with. Reading the file
#      directly sidesteps both. Values are read, never sourced, so nothing else runs.
#      ~/.zshrc.local is still read as a legacy fallback: it held these exports before
#      2026-07-21 and other machines may not have migrated yet.
#
# Prints KEY=VALUE lines for eval, or exits 1 naming what is missing. Never guesses a team:
# a wrong-workspace write is hard to undo.
set -uo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
repo_settings="${repo_root:+$repo_root/.claude/settings.json}"

from_repo() {                     # from_repo <KEY> -> value in the repo's committed settings
  [ -n "$repo_settings" ] && [ -f "$repo_settings" ] || return 0
  python3 - "$repo_settings" "$1" <<'PY' 2>/dev/null
import json, sys
try:
    env = json.load(open(sys.argv[1])).get("env", {})
except Exception:
    sys.exit(0)
print(env.get(sys.argv[2], ""))
PY
}

read_export() {                   # read_export <FILE> <KEY> -> value exported in that file
  [ -f "$1" ] || return 0
  sed -n -E "s/^[[:space:]]*export[[:space:]]+$2=[[:space:]]*(\"([^\"]*)\"|'([^']*)'|([^[:space:]#]*)).*/\2\3\4/p" \
    "$1" | head -1
}

from_env_file() {                 # from_env_file <KEY> -> value from .zshenv.local, else legacy .zshrc.local
  local val
  val="$(read_export "${ZSHENV_LOCAL:-$HOME/.zshenv.local}" "$1")"
  [ -n "$val" ] || val="$(read_export "${ZSHRC_LOCAL:-$HOME/.zshrc.local}" "$1")"
  printf '%s' "$val"
}

resolve() {                       # repo binding wins, then the environment, then the file
  local key="$1" val
  val="$(from_repo "$key")"
  [ -n "$val" ] || val="${!key:-}"
  [ -n "$val" ] || val="$(from_env_file "$key")"
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
  echo "Export the machine default in ~/.zshenv.local (sourced by .zshenv, never committed), or" >&2
  echo "bind this repo in its committed .claude/settings.json env block. Never guess a team -" >&2
  echo "wrong-workspace writes are hard to undo. See the linear plugin README, Setup." >&2
  exit 1
fi

echo "LINEAR_WORKSPACE=${WORKSPACE}"
echo "LINEAR_DEFAULT_TEAM_ID=${TEAM_ID}"
echo "LINEAR_DEFAULT_TEAM_NAME=${TEAM_NAME}"
echo "LINEAR_DEFAULT_TEAM_PREFIX=${TEAM_PREFIX}"
[ -n "$PROJECT_ID" ]   && echo "LINEAR_DEFAULT_PROJECT_ID=${PROJECT_ID}"
[ -n "$PROJECT_NAME" ] && echo "LINEAR_DEFAULT_PROJECT_NAME=${PROJECT_NAME}"
exit 0
