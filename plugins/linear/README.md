# linear

Linear tracker capability for Claude Code, behind one narrow seam. Used by [`dev-workflow`](../dev-workflow) as a native dependency; usable standalone.

## The seam (5 touchpoints)

Documented in the [`seam`](./skills/seam/SKILL.md) skill. Four wrap the `linear-server` MCP; `branch-name` is a deterministic script.

- **get-ticket**: read a ticket + all comments (`get_issue` + `list_comments`)
- **set-status**: transition workflow status (runtime state lookup, no hardcoding)
- **branch-name**: derive `<ID>-<slug>` from a ticket ([`scripts/branch-name.sh`](./scripts/branch-name.sh))
- **link-PR**: attach the PR to the ticket + `Closes: <ID>` in the PR body
- **comment**: post a work-log comment (decisions, failures, options)

Linear-specific for v1 (no generic tracker interface yet - YAGNI). A future Jira/GitHub tracker would implement the same five touchpoints behind the same names.

Integration is **MCP, not CLI**: the official `linear-server` remote MCP (`https://mcp.linear.app/mcp`, OAuth). The seam may be absent in headless/cron runs; MCP touchpoints inside the headless build are best-effort (log and continue, never fail the build).

## Setup

Routing is read from the environment as `$LINEAR_*` keys. Put them in **`<repo>/.claude/settings.local.json`** under `env` - local, gitignored, never committed. Claude Code injects `settings.local.json` `env` into the tool environment, so `$LINEAR_*` resolves in the skill's bash checks.

Use the **local** layer, not user or committed project settings:

- Not user `~/.claude/settings.json` - where `~/.claude` is a symlink into a config repo that gets pushed (a common setup), user settings would commit your routing.
- Not committed project `.claude/settings.json` - that lands in the repo's history (and a public repo) for everyone.
- The cascade is Managed > **Local (`settings.local.json`)** > Project (`settings.json`) > User, so local wins over committed project settings.

| Key | What | Example |
|---|---|---|
| `LINEAR_WORKSPACE` | workspace slug (the OAuth target) | `personal-jpp` |
| `LINEAR_DEFAULT_TEAM_ID` | team UUID (the safety check) | `537fb028-…` |
| `LINEAR_DEFAULT_TEAM_NAME` | team name | `JP` |
| `LINEAR_DEFAULT_TEAM_PREFIX` | issue ID prefix | `JP` (-> `JP-123`) |

Example `<repo>/.claude/settings.local.json`:

```json
{
  "env": {
    "LINEAR_WORKSPACE": "personal-jpp",
    "LINEAR_DEFAULT_TEAM_ID": "537fb028-288f-4ee9-928e-d2457d27746c",
    "LINEAR_DEFAULT_TEAM_NAME": "JP",
    "LINEAR_DEFAULT_TEAM_PREFIX": "JP"
  }
}
```

Each repo points at its own team via its own `settings.local.json`.

## Auth

OAuth via the `linear-server` MCP - there is **no Linear token to store**. On first use, OAuth fires against the workspace matching `$LINEAR_WORKSPACE` on that machine. The seam's safety check (`get_team` against `$LINEAR_DEFAULT_TEAM_ID`) refuses to operate if the wrong workspace is authenticated, so it can't write to the wrong place. Secrets are never repo-level.

## Projects

Linear hierarchy is team (required) -> project (optional) -> issue. This plugin uses **projects, not initiatives** (the layer above projects - unneeded for a single team).

Project is **ticket metadata, not repo config**: it is chosen when a ticket is created and read off the ticket thereafter. Project<->repo is **many-to-many**: a monorepo serves several projects, and one project can span an API repo plus a web-app repo - so project is never derived from the repo or the repo from the project. The five seam touchpoints don't need it; ticket creation (today, the standalone `linear` skill) sets it. No `LINEAR_DEFAULT_PROJECT_*` env is read yet; a soft per-repo default may be added when ticket creation moves into this plugin.
