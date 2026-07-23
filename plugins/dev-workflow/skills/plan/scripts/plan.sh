#!/usr/bin/env bash
# plan.sh - deterministic plan-file mechanics for the plan skill.
# Zero runtime deps (POSIX tools + awk) so it works in any repo.
#
# Usage:
#   plan.sh new --repo <path> --ticket <ID> --title "<feature title>"
#
# Creates docs/plans/<TICKET>-<slug>.md from the bundled plan template with the ticket id
# and title filled in, and prints the new file path. The LLM then fills the approach,
# work items + acceptance criteria, and any already-forced ADRs.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../../../templates/plan.md"

die() { echo "plan.sh: $*" >&2; exit 1; }

cmd="${1:-}"; shift || true
REPO=""; TICKET=""; TITLE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --repo)   REPO="${2:-}"; shift 2 ;;
    --ticket) TICKET="${2:-}"; shift 2 ;;
    --title)  TITLE="${2:-}"; shift 2 ;;
    *) die "unknown arg: $1" ;;
  esac
done

[ "$cmd" = "new" ] || die "usage: plan.sh new --repo <path> --ticket <ID> --title <title>"
[ -n "$REPO" ] || die "--repo is required"
[ -d "$REPO" ] || die "repo path does not exist: $REPO"
[ -n "$TICKET" ] || die "--ticket is required"
[ -n "$TITLE" ] || die "--title is required"
[ -f "$TEMPLATE" ] || die "template not found at $TEMPLATE"

slugify() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

PLANS_DIR="$REPO/docs/plans"
mkdir -p "$PLANS_DIR"
slug="$(slugify "$TITLE")"
[ -n "$slug" ] || die "title produced an empty slug"
out="$PLANS_DIR/$TICKET-$slug.md"
[ -e "$out" ] && die "already exists: $out"

awk -v ticket="$TICKET" -v title="$TITLE" '
  { line = $0
    gsub(/\{TICKET\}/, ticket, line)
    if (line ~ /\{feature title\}/) gsub(/\{feature title\}/, title, line)
    print line
  }
' "$TEMPLATE" > "$out"

echo "$out"
