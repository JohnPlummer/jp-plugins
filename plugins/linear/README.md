# linear

The Linear tracker capability for Claude Code. A full Linear manager, plus the tracker seam that [`dev-workflow`](../dev-workflow) depends on as a native dependency. Usable standalone.

## Skills

- **`linear`** ([SKILL.md](./skills/linear/SKILL.md)) - all Linear operations: create/view/update issues, status, assignment, labels, comments, search, projects, sub-issues, blocking. Also documents the five-touchpoint contract dev-workflow relies on.
- **`ticket-composer`** ([SKILL.md](./skills/ticket-composer/SKILL.md)) - composes well-structured ticket content (templates, interview guide, examples). The `linear` skill chains to it for creates and rewrites; not invoked directly.

Integration is **MCP, not CLI**: the official `linear-server` remote MCP (`https://mcp.linear.app/mcp`, OAuth). `branch-name` is the one deterministic script ([scripts/branch-name.sh](./scripts/branch-name.sh)).

## Usage

Invoke explicitly with `/linear:linear`, or just describe the task and let it trigger. It speaks natural language and resolves IDs, statuses and labels at runtime (no hardcoded taxonomy). Examples:

```text
/linear:linear create a bug for the rate limiter dropping requests under load
/linear:linear show me JP-123
/linear:linear move JP-123 to In Review
/linear:linear what's assigned to me in the Get Out More project
/linear:linear add a comment to JP-123 with the rollout plan
/linear:linear label JP-123 as a bug and set it blocked by JP-120
```

For new tickets and rewrites it chains to `ticket-composer` for structure, then reads `$LINEAR_DEFAULT_PROJECT_ID` (if set) to default the project. Routing comes from the repo's committed `.claude/settings.json` (see Setup).

## dev-workflow contract (5 touchpoints)

dev-workflow uses exactly five operations from the `linear` skill, the stable contract between the two plugins: **get-ticket**, **set-status**, **branch-name**, **link-PR**, **comment**. A future Jira/GitHub tracker plugin would implement the same five behind the same names. Inside the headless build, the MCP touchpoints (set-status, comment) are best-effort: if the MCP is absent, log and continue, never fail the build. Full detail in the `linear` skill's contract section.

## Setup

Routing is read from the environment as `$LINEAR_*` keys. Put them in the repo's **committed `.claude/settings.json`** under `env`. Claude Code injects them into the tool environment, so `$LINEAR_*` resolves in the skill's bash checks.

Commit it, don't hide it in `settings.local.json`:

- The team, workspace, prefix, and default project are facts about the repo, the same for everyone who clones it - shared, versioned config, not a per-developer choice.
- Nothing here is secret. Auth is OAuth via the `linear-server` MCP (see Auth), so no token is ever committed; these keys are just routing identifiers.
- Use `settings.local.json` only for a genuine per-machine override (rare). The cascade is Managed > Local (`settings.local.json`) > Project (`settings.json`) > User, so a local override still wins when you need one.

| Key | What | Example |
|---|---|---|
| `LINEAR_WORKSPACE` | workspace slug (the OAuth target) | `personal-jpp` |
| `LINEAR_DEFAULT_TEAM_ID` | team UUID (the safety check) | `537fb028-…` |
| `LINEAR_DEFAULT_TEAM_NAME` | team name | `JP` |
| `LINEAR_DEFAULT_TEAM_PREFIX` | issue ID prefix | `JP` (-> `JP-123`) |
| `LINEAR_DEFAULT_PROJECT_ID` | *optional* - default project for new tickets | `8db96294-…` |
| `LINEAR_DEFAULT_PROJECT_NAME` | *optional* - readable name for the above | `Get Out More` |

Example `<repo>/.claude/settings.json`:

```json
{
  "env": {
    "LINEAR_WORKSPACE": "personal-jpp",
    "LINEAR_DEFAULT_TEAM_ID": "537fb028-288f-4ee9-928e-d2457d27746c",
    "LINEAR_DEFAULT_TEAM_NAME": "JP",
    "LINEAR_DEFAULT_TEAM_PREFIX": "JP",
    "LINEAR_DEFAULT_PROJECT_ID": "8db96294-0e6c-4a3f-bc6c-3f7826d2abc5",
    "LINEAR_DEFAULT_PROJECT_NAME": "Get Out More"
  }
}
```

Each repo points at its own team via its own committed `.claude/settings.json`. The two project keys are optional - set them for a repo with one primary project, omit them for a monorepo serving several.

## Auth

OAuth via the `linear-server` MCP - there is **no Linear token to store**. On first use, OAuth fires against the workspace matching `$LINEAR_WORKSPACE` on that machine. The skill's safety check (`get_team` against `$LINEAR_DEFAULT_TEAM_ID`) refuses to operate if the wrong workspace is authenticated, so it can't write to the wrong place. Secrets are never repo-level.

## Projects

Linear hierarchy is team (required) -> project (optional) -> issue. This plugin uses **projects, not initiatives** (the layer above projects - unneeded for a single team).

Project is **ticket metadata, not repo config**: it is chosen when a ticket is created and read off the ticket thereafter. Project<->repo is **many-to-many**: a monorepo serves several projects, and one project can span an API repo plus a web-app repo - so project is never derived from the repo or the repo from the project.

That said, most repos have one primary project, so the `linear` skill reads an **optional** `$LINEAR_DEFAULT_PROJECT_ID` from the committed `.claude/settings.json` and defaults new tickets to it. It is a creation convenience only: always overridable per ticket, left unset for a monorepo, and it never selects which repo to build in. The five contract touchpoints don't need it.
