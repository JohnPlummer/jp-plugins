# linear

Linear tracker capability for Claude Code, behind one narrow seam. Used by [`dev-workflow`](../dev-workflow) as a native dependency; usable standalone.

## The seam (5 touchpoints)

Documented in the [`seam`](./skills/seam/SKILL.md) skill. Four wrap the `linear-server` MCP; `branch-name` is a deterministic script.

- **get-ticket** — read a ticket + all comments (`get_issue` + `list_comments`)
- **set-status** — transition workflow status (runtime state lookup, no hardcoding)
- **branch-name** — derive `ST-XXX-brief-desc` from a ticket ([`scripts/branch-name.sh`](./scripts/branch-name.sh))
- **link-PR** — attach the PR to the ticket + `Closes: <ID>` in the PR body
- **comment** — post a work-log comment (decisions, failures, options)

Linear-specific for v1 (no generic tracker interface yet — YAGNI). A future Jira/GitHub tracker would implement the same five touchpoints behind the same names.

Integration is **MCP, not CLI** — the official `linear-server` remote MCP (`https://mcp.linear.app/mcp`, OAuth). The seam may be absent in headless/cron runs; MCP touchpoints inside the headless build are best-effort (log and continue, never fail the build).

## Config

Routing config (team, project, status mapping, branch format) lives in `settings.json` `env` keys, resolved by the native cascade (project `.claude/settings.json` overrides user `~/.claude/settings.json`). Secrets are never repo-level — Linear auth is via the Linear MCP (OAuth) or a non-committed env token.
