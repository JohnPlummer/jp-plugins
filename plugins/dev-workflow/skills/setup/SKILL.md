---
name: setup
description: |
  Onboard a repo to dev-workflow + linear in one idempotent, interactive pass: register the
  linear-server MCP, write Linear routing into committed .claude/settings.json, scaffold the
  Makefile target contract, create docs/plans + docs/decisions, and optionally add the CI
  review workflow. Use on a fresh repo before /implement, or to repair a partially-set-up one.
  Explicit-only - it writes config and registers an MCP; invoke with /setup, never auto-triggered.
disable-model-invocation: true
---

# setup

Get a repo ready for `/implement`. Idempotent: check each piece, add only what is missing,
confirm before writing. Run from the target repo (everything happens in the current repo).
Report each step's before/after so a re-run reads clearly.

## 1. linear-server MCP (machine-level)

```bash
claude mcp list
```

If `linear-server` is absent, register it (user scope, shared across the machine's repos):

```bash
claude mcp add --transport http --scope user linear-server https://mcp.linear.app/mcp \
  --header 'Authorization: Bearer ${LINEAR_API_KEY}'
```

Quote the header so the shell stores the literal `${LINEAR_API_KEY}`. Claude Code expands it at
connect time from the environment of the connecting process, so a rotated key needs no
reconfiguration. `LINEAR_API_KEY` is a personal API key from Linear, Settings, Account, Security
and Access, exported from `~/.zshenv.local`. It needs write access.

Note the header differs by endpoint: `mcp.linear.app` wants `Bearer <key>`, while the GraphQL API
at `api.linear.app/graphql` takes the raw key with no prefix.

Drop the `--header` flag to use interactive OAuth instead, in which case tell the user that OAuth
fires on first use and they should authenticate against the workspace this repo targets (the
`LINEAR_WORKSPACE` set in step 2). Prefer the header on a machine whose keychain is unreliable.
If the server is already present, do nothing.

If the variable is unset, Claude Code sends the literal string `Bearer ${LINEAR_API_KEY}` and
Linear returns 401, which surfaces as "failed to connect" with nothing pointing at the real cause.
`check-auth` diagnoses it directly.

## 2. Linear routing -> committed `.claude/settings.json`

Routing is shared repo config, so it goes in the repo's **committed** `.claude/settings.json`
`env` (the machine default lives in `~/.zshenv.local` - see the linear plugin README). Gather it with the
`linear` skill, do not guess:

- If the repo already has the four `LINEAR_DEFAULT_TEAM_*` / `LINEAR_WORKSPACE` keys, confirm
  them and move on.
- Otherwise discover: `mcp__linear-server__list_teams` for the team (id, name, key=prefix)
  and `$LINEAR_WORKSPACE` (the workspace slug). Ask the user to pick the team if more than one.
- **Optional default project:** ask if this repo has one primary project. If yes,
  `mcp__linear-server__list_projects` (team) -> set `LINEAR_DEFAULT_PROJECT_ID` (+ `_NAME`).
  Skip for a monorepo serving several projects.
- Run the workspace-safety check (`get_team` against the chosen id) before writing.

Merge into `.claude/settings.json` under `env` (read-modify-write; preserve any existing
keys and other settings; create the file if absent). Validate it is valid JSON afterwards.
Target shape:

```json
{
  "env": {
    "LINEAR_WORKSPACE": "...",
    "LINEAR_DEFAULT_TEAM_ID": "...",
    "LINEAR_DEFAULT_TEAM_NAME": "...",
    "LINEAR_DEFAULT_TEAM_PREFIX": "...",
    "LINEAR_DEFAULT_PROJECT_ID": "...",
    "LINEAR_DEFAULT_PROJECT_NAME": "..."
  }
}
```

## 3. Makefile target contract

Preflight the required targets:

```bash
make -n setup mocks build test-unit test check check-ci
```

If there is no Makefile, detect the language and scaffold from the reference:

- `go.mod` present -> `${CLAUDE_PLUGIN_ROOT}/templates/Makefile.go`
- `package.json` present -> `${CLAUDE_PLUGIN_ROOT}/templates/Makefile.ts`
- both or neither -> ask which.

Copy the template to `Makefile`. If a Makefile exists but is missing required targets, list
the missing ones and offer to add them from the template (do not clobber working targets).
The contract is the standard `workflow/makefile-targets.md` in the resolved standards source (`$DEV_WORKFLOW_STANDARDS_PATH`) - the
plugin's required set is a subset of it.

## 4. Folders

Ensure both exist (they hold versioned plan + decision records):

- `docs/plans/` - the per-feature plan files `plan` writes.
- `docs/decisions/` - MADR ADRs. Seed/refresh the index with the `adr` skill's script:
  `"${CLAUDE_PLUGIN_ROOT}/skills/adr/scripts/adr.sh" index <repo>` (or note it will be
  generated on the first ADR). Add a `.gitkeep` if a dir would otherwise be empty.

## 5. CI review workflow (offer, default no)

Ask whether to add per-PR CI review. **Default no** - it needs the Claude GitHub App + an
`ANTHROPIC_API_KEY` secret, and per-PR review has a cost. If yes:

- Copy `${CLAUDE_PLUGIN_ROOT}/templates/ci-review.yml` to `.github/workflows/`.
- Point its `STANDARDS_REPO`/`STANDARDS_REF` at the user's external standards source.
- Tell the user the out-of-band steps: install the GitHub App (`/install-github-app`), add
  `ANTHROPIC_API_KEY` (and `STANDARDS_REPO_TOKEN` if the standards repo is private).

## 6. Verify (optional)

Offer to run `make check` for a green baseline. Do not fail setup if it is red - report it.

## Done

Summarise what was added vs already present, and what the user must still do by hand (MCP
OAuth on first use; GitHub App + secret if CI was added). The repo is ready for `/implement`.

## What this is NOT

- Not a generic Claude Code repo setup (that is the standalone `setup-repo` skill) - this is
  dev-workflow + linear specifically.
- Not a one-shot that hides its writes - it is interactive and confirms before each change.
- Does not commit. It stages files in the working tree; the user reviews and commits.
