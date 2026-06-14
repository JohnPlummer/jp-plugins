---
description: Onboard the current repo to dev-workflow + linear (MCP, settings, Makefile, folders, optional CI).
argument-hint: ""
---

# /setup

Get the current repo ready for `/implement` in one idempotent, interactive pass via the
`onboard-repo` skill:

1. Register the `linear-server` MCP if missing.
2. Write Linear routing (team/workspace/prefix, optional default project) into the committed `.claude/settings.json`.
3. Scaffold the Makefile target contract (Go or TS) where targets are missing.
4. Create `docs/plans/` and `docs/decisions/`.
5. Offer the CI review workflow (default no).
6. Optionally run `make check` for a green baseline.

Safe to re-run: it adds only what's missing and confirms before writing. It stages changes;
you review and commit.
