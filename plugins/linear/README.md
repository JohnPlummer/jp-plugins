# linear

Linear tracker capability for Claude Code, behind one narrow seam. Used by [`dev-workflow`](../dev-workflow) as a native dependency; usable standalone.

> **Status: scaffold (Phase 0).** Skeleton only.

## The seam (~5 touchpoints)

- **get-ticket** — read a ticket + all comments
- **set-status** — transition workflow status
- **branch-name** — derive `ST-XXX-brief-desc` from a ticket
- **link-PR** — link a PR to the ticket (and back)
- **comment** — post a work-log comment (decisions, failures, options)

Linear-specific for v1 (no generic tracker interface yet — YAGNI). A future Jira/GitHub tracker would implement the same seam.

## Config

Routing config (team, project, status mapping, branch format) lives in `settings.json` `env` keys, resolved by the native cascade (project `.claude/settings.json` overrides user `~/.claude/settings.json`). Secrets are never repo-level — Linear auth is via the Linear MCP (OAuth) or a non-committed env token.
