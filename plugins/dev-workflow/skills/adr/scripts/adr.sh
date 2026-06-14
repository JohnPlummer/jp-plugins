#!/usr/bin/env bash
# adr.sh - deterministic MADR file mechanics for the adr skill.
# Zero runtime deps (POSIX tools + awk) so it works in any repo, not just node.
#
# Usage:
#   adr.sh new   --repo <path> --title "<title>" [--status proposed] [--deciders "a, b"]
#   adr.sh index --repo <path>
#
# `new` creates docs/decisions/NNNN-slug.md from the bundled MADR template with the
#   next consecutive 4-digit number, the title, status and today's date filled in,
#   regenerates the index, and prints the new file path.
# `index` (re)generates docs/decisions/README.md listing every ADR (number, title, status).
#
# The LLM fills the decision BODY (Context, Drivers, Options, Outcome, Consequences)
# after this script creates the file.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../../../templates/madr.md"

die() { echo "adr.sh: $*" >&2; exit 1; }

cmd="${1:-}"; shift || true
REPO=""; TITLE=""; STATUS="proposed"; DECIDERS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --repo)     REPO="${2:-}"; shift 2 ;;
    --title)    TITLE="${2:-}"; shift 2 ;;
    --status)   STATUS="${2:-}"; shift 2 ;;
    --deciders) DECIDERS="${2:-}"; shift 2 ;;
    *) die "unknown arg: $1" ;;
  esac
done

[ -n "$REPO" ] || die "--repo is required"
[ -d "$REPO" ] || die "repo path does not exist: $REPO"
DECISIONS_DIR="$REPO/docs/decisions"

slugify() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

next_number() {
  last=$(ls "$DECISIONS_DIR" 2>/dev/null | grep -E '^[0-9]{4}-' | sed -E 's/^([0-9]{4})-.*/\1/' | sort -n | tail -1 || true)
  if [ -z "$last" ]; then echo "0001"; else printf '%04d' "$((10#$last + 1))"; fi
}

generate_index() {
  [ -d "$DECISIONS_DIR" ] || return 0
  idx="$DECISIONS_DIR/README.md"
  {
    echo "# Architecture Decision Records"
    echo
    echo "| ADR | Title | Status |"
    echo "|---|---|---|"
    for f in "$DECISIONS_DIR"/[0-9][0-9][0-9][0-9]-*.md; do
      [ -e "$f" ] || continue
      base="$(basename "$f")"
      num="${base%%-*}"
      # First H1 AFTER the YAML frontmatter (frontmatter may contain '# ' comment lines).
      title="$(awk '
        NR==1 && /^---/ {fm=1; next}
        fm==1 && /^---/ {fm=2; next}
        (fm==2 || fm==0) && /^# / {sub(/^# +/,""); print; exit}
      ' "$f")"
      [ -n "$title" ] || title="$base"
      status="$(grep -m1 '^status:' "$f" | sed -E 's/^status: *"?([^"]*)"?.*/\1/' || true)"
      [ -n "$status" ] || status="-"
      echo "| [$num]($base) | $title | $status |"
    done
  } > "$idx"
  echo "$idx"
}

case "$cmd" in
  new)
    [ -n "$TITLE" ] || die "--title is required"
    [ -f "$TEMPLATE" ] || die "template not found at $TEMPLATE"
    mkdir -p "$DECISIONS_DIR"
    nnnn="$(next_number)"
    slug="$(slugify "$TITLE")"
    [ -n "$slug" ] || die "title produced an empty slug"
    out="$DECISIONS_DIR/$nnnn-$slug.md"
    [ -e "$out" ] && die "already exists: $out"
    today="$(date +%Y-%m-%d)"
    awk -v title="$TITLE" -v status="$STATUS" -v date="$today" -v deciders="$DECIDERS" '
      /^status:/ && !sd { print "status: \"" status "\""; sd=1; next }
      /^date:/ && !dd { print "date: " date; dd=1; next }
      /^decision-makers:/ && !md { if (deciders != "") print "decision-makers: " deciders; else print; md=1; next }
      /^# \{short title/ { print "# " title; next }
      { print }
    ' "$TEMPLATE" > "$out"
    generate_index >/dev/null
    echo "$out"
    ;;
  index)
    generate_index
    ;;
  *)
    die "usage: adr.sh new|index --repo <path> [--title <t>] [--status <s>] [--deciders <d>]"
    ;;
esac
