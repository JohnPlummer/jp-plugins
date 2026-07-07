#!/usr/bin/env bash
# technical-design.sh - deterministic file mechanics for the technical-design skill.
# Zero runtime deps (POSIX tools + awk) so it works in any repo, not just node.
#
# Usage:
#   technical-design.sh new --repo <path> --title "<service or change name>" \
#     [--owner "<name>"] [--dir <docs/design>]
#
# `new` creates <dir>/<slug>.md from the bundled Technical Design template with the
#   title and owner filled in, then prints the new file path. Default dir is
#   docs/design (monorepo root, or a service repo root in a multi-repo setup).
#   It errors if the target file already exists rather than clobbering a design.
#
# The LLM fills the design BODY (Overview, Architecture, Data, Security, ...) after
# this script creates the file. There is no numbering or index - designs are named
# by slug, unlike ADRs.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../../../templates/technical-design.md"

die() { echo "technical-design.sh: $*" >&2; exit 1; }

cmd="${1:-}"; shift || true
REPO=""; TITLE=""; OWNER=""; DIR="docs/design"
while [ $# -gt 0 ]; do
  case "$1" in
    --repo)  REPO="${2:-}"; shift 2 ;;
    --title) TITLE="${2:-}"; shift 2 ;;
    --owner) OWNER="${2:-}"; shift 2 ;;
    --dir)   DIR="${2:-}"; shift 2 ;;
    *) die "unknown arg: $1" ;;
  esac
done

[ -n "$REPO" ] || die "--repo is required"
[ -d "$REPO" ] || die "repo path does not exist: $REPO"

slugify() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

case "$cmd" in
  new)
    [ -n "$TITLE" ] || die "--title is required"
    [ -f "$TEMPLATE" ] || die "template not found at $TEMPLATE"
    DESIGN_DIR="$REPO/$DIR"
    mkdir -p "$DESIGN_DIR"
    slug="$(slugify "$TITLE")"
    [ -n "$slug" ] || die "title produced an empty slug"
    out="$DESIGN_DIR/$slug.md"
    [ -e "$out" ] && die "already exists: $out"
    awk -v title="$TITLE" -v owner="$OWNER" '
      /^# Technical Design: / { print "# Technical Design: " title; next }
      /^- \*\*Owner:\*\*/ { if (owner != "") print "- **Owner:** " owner; else print; next }
      { print }
    ' "$TEMPLATE" > "$out"
    echo "$out"
    ;;
  *)
    die "usage: technical-design.sh new --repo <path> --title <t> [--owner <name>] [--dir <docs/design>]"
    ;;
esac
