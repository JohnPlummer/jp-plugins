# CLAUDE.md

## Plugin manifests: never add a top-level `version`

Do not add a `version` field to `plugins/*/.claude-plugin/plugin.json`. If you find one, remove it. CI enforces this via `scripts/check-no-plugin-versions.sh`.

**Why.** The plugin cache keys on the declared version when there is one, and on the commit SHA when there is not. A declared version pins the cache, so the plugin keeps serving an old copy while the repo moves on. Nothing fails visibly: the skill still runs, it is just the wrong version of it.

This happened. `linear` declared `1.0.1` and served a 19 June snapshot for three weeks, missing two commits that had changed its skill. A correct fix merged and changed nothing, because nothing was reading it. `dev-workflow`, which declares no version, re-cached on every commit throughout.

A `version` inside a `dependencies` entry is a constraint, not a declaration. Those are fine and the check ignores them.

**Verify what is actually live** when a plugin change appears to have no effect:

```bash
ls ~/.claude/plugins/cache/<marketplace>/<plugin>/
```

SHA-named directories mean it tracks commits. A version-named directory means it is pinned.

## Conventions

- Conventional commits, scoped by plugin: `fix(linear): ...`, `feat(dev-workflow): ...`.
- No test suite. Shell scripts are verified by running them, including the failure path.
