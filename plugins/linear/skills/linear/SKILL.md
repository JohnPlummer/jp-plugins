---
name: linear
description: |
  All Linear operations: create/view/update issues, change status, assign, label, comment,
  search, manage projects and sub-issues, set blocking relationships. For composing new
  ticket content or rewriting descriptions, chains to the `ticket-composer` skill. Also the
  tracker capability dev-workflow depends on (the five touchpoints in the contract section
  below). Wraps the `linear-server` MCP (no CLI).
context: fork
model: sonnet
---

# Linear

All Linear work goes through this skill, so team/project defaults, workspace safety, and
error handling stay consistent. It wraps the `linear-server` MCP tools. For creating or
rewriting ticket *content*, it chains to [`ticket-composer`](../ticket-composer/SKILL.md)
first; for everything else (status, assignment, labels, comments, queries) it calls the MCP
directly.

## Config + workspace safety (run once per session, before any MCP touchpoint)

Routing is read from the environment. Set it in the repo's committed `.claude/settings.json`
`env` - it is shared repo config (the team/workspace/project are the same for everyone on the
repo), and nothing here is secret (auth is OAuth via the MCP, no token is stored). Use
`settings.local.json` only for a personal per-machine override. Claude Code injects those
keys, so:

```
echo "workspace=$LINEAR_WORKSPACE team=$LINEAR_DEFAULT_TEAM_NAME id=$LINEAR_DEFAULT_TEAM_ID prefix=$LINEAR_DEFAULT_TEAM_PREFIX"
```

If any are unset, stop and tell the user to add the binding (plugin README "Setup"). Never
fall back to a hardcoded guess.

**Workspace safety:** before the first operation, call `mcp__linear-server__get_team` with
`$LINEAR_DEFAULT_TEAM_ID`. If it 404s or the name differs from `$LINEAR_DEFAULT_TEAM_NAME`,
the MCP is authenticated against the wrong workspace. Stop and tell the user to re-register
and re-authenticate against `$LINEAR_WORKSPACE`. Wrong-workspace writes are hard to undo, so
never proceed when the check fails.

Pass `$LINEAR_DEFAULT_TEAM_NAME` (or `$LINEAR_DEFAULT_TEAM_ID`) wherever an example shows a
team. Issue identifiers are `$LINEAR_DEFAULT_TEAM_PREFIX-<number>` (shown as `<PREFIX>-<n>`).

**Optional default project.** A repo may set `LINEAR_DEFAULT_PROJECT_ID` (and
`LINEAR_DEFAULT_PROJECT_NAME` for readability) in the same `.claude/settings.json`. When set,
new tickets default to that project (see Projects). Leave it unset for a monorepo serving
several projects. It is a soft default, always overridable per ticket - never a hard binding.

## Concept mapping

Linear has no "Epic" object. Map Jira concepts onto Linear's hierarchy
(project -> milestone -> issue -> sub-issue):

| Jira | Linear entity | MCP tool |
|---|---|---|
| Epic | Project | `save_project` |
| Phase of an epic | Milestone | `save_milestone` |
| Story / Task | Issue | `save_issue` |
| Sub-task | Sub-issue | `save_issue` with `parentId` |
| Comment | Comment | `save_comment` |

A product or surface is not a layer here. It is carried by an Area label (see Labels), not by
a project, so cross-product work stays filterable across projects.

## Statuses and priority

Status types: Backlog (backlog), Todo (unstarted), In Progress / In Review / Blocked (started),
Done (completed), Canceled / Duplicate (canceled). Never hardcode state *names* - resolve them at
runtime with `list_issue_statuses` for the team, since workspaces rename them and add their own
(e.g. a Blocked status in the started category).

Priority values: 0 None, 1 Urgent, 2 High, 3 Normal, 4 Low.

## Cycles

Where the team runs cycles, cycles are the delivery cadence and projects are the deliverable.
Issues are scheduled into the current cycle and unfinished work rolls over automatically - both
are usually the workspace's own cycle settings, so creation does not force a `cycle`. To
schedule an issue explicitly, resolve the target with `list_cycles` (type=current for the live
one) and set `cycle` on the issue. Where the workspace does not run cycles, `list_cycles`
returns none and the field is left untouched.

## Labels

Discover the taxonomy at runtime - `mcp__linear-server__list_issue_labels` - before assuming
any label exists. Do not invent labels; if a needed one is missing, flag it to the user. The
rules are universal even though each workspace's labels differ:

1. Every issue gets exactly one **Type** label (e.g. Bug, Feature, Chore, Tech Debt).
2. Every issue gets at least one **Area** label - the product or surface it touches. This is the
   cross-project spine, since a product is a label here, not a project.
3. **Concern** labels (Security, Performance, Observability, Accessibility) are optional, one or more.
4. Labels use Title Case.
5. Mapping from a ticket file's frontmatter labels: pick the closest existing workspace label.

## Content fidelity

When creating or updating with description content from the caller: include ALL of it
EXACTLY as received. Never summarise, truncate, paraphrase, restructure, or drop sections you
think redundant. Long descriptions are expected. When in doubt, include more.

## Error reporting

Report every error to the user, even when a retry succeeds: the original error (full text),
what you changed on retry, and the outcome. Never swallow errors silently. For batch creates,
stop on the first error and report before continuing.

## Operations

Each is `mcp__linear-server__<tool>`. Only pass the fields you want to change; omitted fields
are left unchanged.

| Operation | Tool + key params |
|---|---|
| Create issue | `save_issue` (title, team, description, state, priority, labels, project, assignee). If the caller gives no project and `$LINEAR_DEFAULT_PROJECT_ID` is set, default `project` to it (note which project you applied; let the user override). |
| View issue | `get_issue` (id, includeRelations: true) |
| Update issue | `save_issue` (id + changed fields) |
| Add comment | `save_comment` (issueId, body) |
| List comments | `list_comments` (issueId) |
| Search (filters) | `list_issues` (team, state, assignee, label, project) |
| Search (text) | `search` (query, type: "issue") |
| List sub-tasks | `list_issues` (parentId) |
| Create project | `save_project` (name, addTeams, description, lead, priority). Always set a description and lead - an empty project shell is a smell. `icon` must be a valid Linear icon name, not a Unicode emoji - omit if unsure. |
| Link to project | `save_issue` (id, project) |
| Create milestone | `save_milestone` (project, name) |
| Update milestone | `save_milestone` (id + changed fields) |
| List milestones | `list_milestones` (project) |
| Set issue milestone | `save_issue` (id, milestone) |
| Set parent | `save_issue` (id, parentId) |
| List cycles | `list_cycles` (teamId, type: current/previous/next) |
| Schedule into cycle | `save_issue` (id, cycle - name, number, or ID; resolve "current" via `list_cycles` type=current) |
| Block/unblock | `save_issue` (id, blocks/blockedBy arrays; `removeBlocks`/`removeBlockedBy` to remove - append-only) |

`list_issues` with no filter returns only the most-recently-updated set. Pass `team` and
`limit` for the full set, and page via `cursor` for large results.

## Creating or rewriting ticket content

For a new ticket or a description/title/AC rewrite, chain to `ticket-composer` first, then
create/update:

1. Invoke the [`ticket-composer`](../ticket-composer/SKILL.md) skill - it interviews the
   user (interactive) or extracts from context (agent call), and for updates takes the
   existing content to improve.
2. Once composed, `save_issue` with the title, description, team, priority, labels, project
   (create) or id + changed fields (update).

Callers that compose their own content (using the ticket-composer templates as reference) may
call this skill directly to avoid a slow chain.

## Hierarchy and conventions

Linear nests project -> milestone -> issue -> sub-issue. Team is required; the other layers
are optional.

- **Project** - a deliverable with an end: a feature or a capability programme that completes and
  closes. Not a product and not an open-ended bucket (a product is an Area label, not a project).
  A feature that spans several repos is still one project. Every project gets a lead and a
  description on creation - an empty project shell is a smell.
- **Milestone** - a phase within a project, planned and reviewed as a unit. This is the planning
  unit inside a project. Name it after the outcome (e.g. "Meetup integration"). A milestone has
  no page of its own; to see its issues, group the project board by milestone.
- **Issue** - a deployable, roughly week-sized chunk that delivers value on its own. Repo-agnostic:
  one issue can touch a frontend and a backend repo. Issues sit under a milestone (set `milestone`
  on the issue).
- **Sub-issue** - a child of an issue (one parent each), the routine one-hour-to-one-day unit of
  actual work. Break a larger issue into sub-issues when it needs decomposing. A small issue,
  such as a single bug, can stand on its own. (A parent issue with sub-issues also serves when
  you want a clickable deliverable page with progress in place of a milestone.)

**Plan by milestone.** Group the project board by milestone so each becomes a section with its
issues underneath, and review progress per milestone.

**project<->repo is many-to-many** (a monorepo serves several projects; one project can span an
API repo and a web-app repo), so never derive project from repo or repo from project. Project
is chosen at creation (`project` param) and read off the ticket thereafter.

**Soft per-repo default.** Most repos have one primary project, so a repo may set
`$LINEAR_DEFAULT_PROJECT_ID` (+ `$LINEAR_DEFAULT_PROJECT_NAME`) in its `.claude/settings.json`.
When set, new tickets default to it (pass it as the `project` param; if `save_issue` wants a
name rather than an id, resolve via `list_projects`). Always overridable per ticket, and left
unset for a monorepo. It is a creation convenience only - it never selects the repo to build
in, and the build/consume flow still reads the project off the ticket.

## dev-workflow contract (the five touchpoints)

dev-workflow depends on this plugin for exactly five operations. They are the stable contract
between the two plugins - a future Jira/GitHub tracker plugin would implement the same five.

1. **get-ticket(id)** - `get_issue` + `list_comments`. Read the ticket AND all comments
   first (ticket-workflow standard).
2. **set-status(id, target)** - `list_issue_statuses` to resolve the state, then `save_issue`.
3. **branch-name(id, title)** - deterministic, no MCP:
   `"$CLAUDE_PLUGIN_ROOT/scripts/branch-name.sh" --id <ID> --title "<title>"` ->
   `<ID>-<slug>` (github-flow). Use `--type feature|fix|chore` for non-ticket branches.
4. **link-PR(id, prUrl)** - `create_attachment` (ticket -> PR), and ensure `Closes: <ID>` is
   in the PR body (PR -> ticket). This skill returns the line; the PR step creates the PR.
5. **comment(id, text)** - `save_comment` for work-log entries (decisions, failures, options).

**Headless caveat:** `linear-server` is an OAuth HTTP MCP and may be ABSENT in headless/cron
runs. Touchpoints inside the headless build (set-status, comment) must be best-effort: if the
MCP is unavailable, log the intended action and continue, never fail the build. Plan reads
never use the MCP (the plan lives in the repo file).

## Linear unavailable

If the MCP fails or is unavailable, log it and tell the user; suggest the Linear web UI as a
fallback (outside the headless build, where touchpoints are best-effort per above).
