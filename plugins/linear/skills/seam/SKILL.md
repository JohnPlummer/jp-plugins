---
name: seam
description: |
  The narrow tracker seam dev-workflow depends on: get-ticket, set-status, branch-name,
  link-PR, comment. Linear-specific v1, wrapping the linear-server MCP (no CLI). Use when
  a dev-workflow phase needs to read a ticket, transition status, name a branch, link a PR,
  or post a work-log comment. Not a general Linear manager -- for arbitrary Linear ops use
  the standalone linear skill.
---

# Linear seam (tracker touchpoints)

Exactly five touchpoints, no more (YAGNI). Four wrap the `linear-server` MCP; one
(branch-name) is a deterministic script. A future Jira/GitHub tracker would implement the
same five behind the same names — keeping the swap contained.

## Config + safety (run once per session, before any MCP touchpoint)

Routing comes from the environment (the native config cascade: project
`.claude/settings.json` `env` overrides user `~/.claude/settings.json`):

```
echo "workspace=$LINEAR_WORKSPACE team=$LINEAR_DEFAULT_TEAM_NAME id=$LINEAR_DEFAULT_TEAM_ID prefix=$LINEAR_DEFAULT_TEAM_PREFIX"
```

If unset, stop and tell the user to add the Linear binding (same env contract as the
standalone `linear` skill). **Workspace safety:** call `mcp__linear-server__get_team` with
`$LINEAR_DEFAULT_TEAM_ID`; if it 404s or the name differs from `$LINEAR_WORKSPACE`/
`$LINEAR_DEFAULT_TEAM_NAME`, the MCP is on the wrong workspace — stop, do not write.

**Headless caveat:** `linear-server` is an OAuth HTTP MCP and may be ABSENT in headless /
cron runs. Touchpoints that run inside the headless build (set-status, comment) must be
best-effort: if the MCP is unavailable, log the intended action and continue, never fail
the build. Plan reads never use the MCP (the plan lives in the repo file).

## The five touchpoints

### 1. get-ticket(id)

Read the ticket AND all its comments before anything else (ticket-workflow standard).

- `mcp__linear-server__get_issue` (id) -> identifier, title, description, state, url.
- `mcp__linear-server__list_comments` (issueId) -> full discussion (constraints, prior decisions).

### 2. set-status(id, targetStatus)

Never hardcode state names — resolve at runtime.

- `mcp__linear-server__list_issue_statuses` for the team to find the state matching the
  intended stage (e.g. "In Progress", "In Review", "Done").
- `mcp__linear-server__save_issue` (id, stateId).

### 3. branch-name(id, title)

Deterministic, no MCP:

```sh
"$CLAUDE_PLUGIN_ROOT/scripts/branch-name.sh" --id <TICKET-ID> --title "<ticket title>"
```

-> `<ID>-<slug>` (github-flow standard). Use `--type feature|fix|chore` instead of `--id`
for non-ticket branches.

### 4. link-PR(id, prUrl)

Two directions:

- Ticket -> PR: `mcp__linear-server__create_attachment` (issueId, url=prUrl, title) so the
  ticket shows the PR. (Or a comment with the URL if attachments are unavailable.)
- PR -> ticket: ensure the PR body contains `Closes: <ID>` (github-flow PR-body standard) so
  merging closes/links the ticket. The seam returns the line to put in the PR body; the PR
  itself is created by the github/PR step.

### 5. comment(id, text)

Work-log comments — decisions, failures, options (ticket-workflow audit intent).

- `mcp__linear-server__save_comment` (issueId, body).

## What this seam is NOT

- Not a generic tracker interface (Linear-specific v1).
- Not ticket creation / triage / label management — that's the standalone `linear` skill.
- Not a place for the plan document (the plan lives in the repo; the ticket only references it).
