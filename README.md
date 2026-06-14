# jp-plugins

Public marketplace (`jp`) for opinionated Claude Code engineering plugins.

## Plugins

- [`dev-workflow`](./plugins/dev-workflow) - opinionated, deterministic SDLC: Linear ticket -> repo plan -> MADR ADRs -> role-isolated TDD (test-author != implementer != judge) -> diff-oriented review -> draft PR. Determinism comes from the Workflow tool, not skill-triggering.
- [`linear`](./plugins/linear) - Linear tracker capability behind one narrow seam. A native dependency of `dev-workflow`; usable standalone.

> **Status: core built.** `dev-workflow` (role-isolated TDD build, `plan-feature`, `write-adr`, `/implement` orchestrator, CI review action) and the `linear` seam are implemented; the build core is dogfood-proven end-to-end. Remaining: prove the draft-PR slice on a repo with a remote, then publish.

## Install

```text
/plugin marketplace add JohnPlummer/jp-plugins
/plugin install dev-workflow@jp
```

`dev-workflow` declares `linear` as a native dependency, so Claude Code auto-installs and enables it from this same marketplace.

## Update

```text
/plugin marketplace update jp
/reload-plugins
```

`plugin.json` has no `version` field on `dev-workflow`, so the git commit SHA is the cache key - every push is a new version.

## Dev mode

Live editing on the authoring Mac:

```text
claude --plugin-dir ~/code/jp-plugins/plugins/dev-workflow
```

## Related

- `JohnPlummer/jp-private-plugins` - the private marketplace (`jp-private`), holds `productivity`.
- `JohnPlummer/engineering-standards` - external standards source consumed by the review cascade.
