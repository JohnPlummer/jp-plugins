#!/usr/bin/env bash
# branch-name.sh — deterministic branch name from a ticket, per the github-flow standard.
# Zero runtime deps. The one purely-mechanical touchpoint of the linear seam; the other
# four (get-ticket, set-status, link-PR, comment) are MCP-backed and live in the skill.
#
# Usage:
#   branch-name.sh --id <TICKET-ID> --title "<title>" [--max <chars>]
#   branch-name.sh --type feature|fix|chore --title "<title>" [--max <chars>]
#
# Ticket form -> "<ID>-<slug>"        e.g. ST-412-rate-limit-the-public-api
# Type form   -> "<type>/<slug>"      e.g. fix/login-redirect-loop
# Slug is lowercased, hyphenated, and capped (default 50 chars, trimmed at a hyphen).

set -euo pipefail
die() { echo "branch-name.sh: $*" >&2; exit 1; }

ID=""; TYPE=""; TITLE=""; MAX=50
while [ $# -gt 0 ]; do
  case "$1" in
    --id)    ID="${2:-}"; shift 2 ;;
    --type)  TYPE="${2:-}"; shift 2 ;;
    --title) TITLE="${2:-}"; shift 2 ;;
    --max)   MAX="${2:-}"; shift 2 ;;
    *) die "unknown arg: $1" ;;
  esac
done

[ -n "$TITLE" ] || die "--title is required"
[ -n "$ID" ] || [ -n "$TYPE" ] || die "one of --id or --type is required"
case "$TYPE" in ""|feature|fix|chore|docs|refactor|test) ;; *) die "invalid --type: $TYPE" ;; esac

slug="$(printf '%s' "$TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')"
[ -n "$slug" ] || die "title produced an empty slug"

# Cap length, then trim a trailing partial word (dangling hyphen).
if [ "${#slug}" -gt "$MAX" ]; then
  slug="$(printf '%s' "$slug" | cut -c1-"$MAX" | sed -E 's/-[^-]*$//; s/-+$//')"
fi

if [ -n "$ID" ]; then
  echo "${ID}-${slug}"
else
  echo "${TYPE}/${slug}"
fi
