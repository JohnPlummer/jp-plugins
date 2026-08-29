#!/usr/bin/env bash
# liveness.sh -- is a running build-isolated-tdd Workflow stopped, or just slow?
#
# The two look identical from the outside, which is the failure this exists to prevent.
# Phase names are NOT exposed anywhere readable, so this reports the two signals that are:
#   - inFlight: agents started minus agents finished, from the run's journal
#   - idleSeconds: how long since the journal last changed
#
# A run is STALLED, not slow, when idleSeconds exceeds the deadline. Size the deadline
# against the slowest legitimate phase (Green on a large item), not the average.
#
# Reads ONLY journal.jsonl. The sibling agent-*.jsonl files are full conversation
# transcripts -- never read those into a supervising context, they will bury it.
#
# Usage: liveness.sh --dir <transcriptDir> [--deadline <seconds>]
#   transcriptDir is the "Transcript dir" the Workflow tool printed when the run launched.
#
# Prints KEY=VALUE for eval. Exit 0 = read succeeded (check STATUS), 1 = could not read.

set -euo pipefail

DIR=""
DEADLINE=900

while [ $# -gt 0 ]; do
  case "$1" in
    --dir) DIR="${2:-}"; shift 2 ;;
    --deadline) DEADLINE="${2:-}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

[ -n "$DIR" ] || { echo "--dir is required" >&2; exit 1; }

JOURNAL="$DIR/journal.jsonl"
if [ ! -f "$JOURNAL" ]; then
  echo "no journal at $JOURNAL" >&2
  exit 1
fi

# stat is not portable: BSD (macOS) uses -f %m, GNU uses -c %Y.
MTIME=$(stat -f %m "$JOURNAL" 2>/dev/null || stat -c %Y "$JOURNAL")
NOW=$(date +%s)
IDLE=$((NOW - MTIME))

STARTED=$(grep -c '"type":"started"' "$JOURNAL" || true)
FINISHED=$(grep -c '"type":"result"' "$JOURNAL" || true)
INFLIGHT=$((STARTED - FINISHED))

# Distinguish the three states the supervisor acts on differently. DONE is reported
# rather than assumed complete: the Workflow's own return value is the authority on
# whether it succeeded, this only says nothing is still running.
if [ "$INFLIGHT" -le 0 ]; then
  STATUS=done
elif [ "$IDLE" -gt "$DEADLINE" ]; then
  STATUS=stalled
else
  STATUS=running
fi

echo "STATUS=$STATUS"
echo "INFLIGHT=$INFLIGHT"
echo "STARTED=$STARTED"
echo "FINISHED=$FINISHED"
echo "IDLE_SECONDS=$IDLE"
echo "DEADLINE=$DEADLINE"
