#!/usr/bin/env bash
# Fail if any plugin manifest declares a top-level "version".
#
# Plugins here are cached by commit SHA so every merge reaches a running session.
# Declaring a version switches the cache key to that version, which pins the cache
# until the version changes. A plugin then keeps serving an old copy while the repo
# moves on, and the staleness is invisible: the skill runs, it is just the wrong one.
#
# Observed on 2026-07-18: linear declared 1.0.1 and served a 19 June snapshot for
# three weeks, while dev-workflow (no version) re-cached on every commit.
#
# A "version" inside a dependencies entry is a constraint, not a declaration, and is
# left alone. That is why this parses JSON rather than grepping.
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
status=0

while IFS= read -r manifest; do
  offending="$(python3 - "$manifest" <<'PY'
import json, sys
try:
    with open(sys.argv[1]) as fh:
        data = json.load(fh)
except Exception as exc:
    print(f"UNREADABLE {exc}")
    sys.exit(0)
if "version" in data:
    print(f"VERSION {data['version']}")
PY
)"
  case "$offending" in
    VERSION*)
      rel="${manifest#"$repo_root"/}"
      echo "error: $rel declares a top-level \"version\" (${offending#VERSION })." >&2
      status=1
      ;;
    UNREADABLE*)
      rel="${manifest#"$repo_root"/}"
      echo "error: $rel is not valid JSON: ${offending#UNREADABLE }" >&2
      status=1
      ;;
  esac
done < <(find "$repo_root/plugins" -path "*/.claude-plugin/plugin.json" -type f | sort)

if [ "$status" -ne 0 ]; then
  echo "" >&2
  echo "Remove the field. Plugins here are cached by commit SHA, so a declared" >&2
  echo "version pins the cache and the plugin goes stale without any visible failure." >&2
fi

exit "$status"
