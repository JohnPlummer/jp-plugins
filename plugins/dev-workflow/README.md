# dev-workflow

An opinionated, **deterministic** software development workflow for Claude Code. It encodes a documented engineering philosophy as an executable method - determinism comes from the [Workflow tool](https://code.claude.com/docs/en/workflows) (JS control flow), not from probabilistic skill-triggering.

> **Status: core built.** The build workflow (role-isolated TDD), `plan`, `adr`, the `linear` plugin, the `/implement` orchestrator, and the CI review action (`review` skill + `templates/ci-review.yml`) are implemented; the build core is dogfood-proven end-to-end. Remaining: prove the draft-PR slice on a repo with a remote, publish. Build order is in the authoring vault project `Dev Workflow Plugin`.

## What it does

Takes a Linear ticket to a draft PR through fixed phases:

```text
ticket -> plan (repo file) -> known ADRs -> [GATE] -> build (role-isolated TDD) ->
review (diff-oriented) -> verify -> draft PR -> [GATE: mark ready]
```

The pipeline ends at a **draft PR**, not a deploy - hence `/implement`, not `/ship`.

## Quickstart

First time on a repo, onboard it once:

```text
/dev-workflow:setup
```

This registers the `linear-server` MCP, writes Linear routing into the repo's committed `.claude/settings.json`, scaffolds the Makefile target contract, and creates `docs/plans` + `docs/decisions`. Idempotent, so re-running only fills gaps.

Then take a ticket to a draft PR:

```text
/dev-workflow:implement JP-123
```

A run stops at two human gates and is otherwise hands-off:

1. **Ingest** the ticket and all its comments.
2. **Plan**: proposes a ceremony tier (light/full) and drafts a thin committed plan file with BDD acceptance criteria. **GATE 1: you approve the plan** before any code.
3. **Branch + baseline** commit, Linear status to In Progress.
4. **Build**: role-isolated TDD in a headless Workflow (test-author, implementer and judge are separate subagent contexts). Hard-to-reverse decisions surface as ADRs to ratify, then resume.
5. **Review** the diff against philosophy + standards, then **verify** (`make check` must pass before any push).
6. **Draft PR** with `Closes: JP-123`, Linear status to In Review. **GATE 2: you mark it ready for review.**

You can also run any phase standalone instead of letting `/implement` chain them, e.g. `/dev-workflow:plan JP-123` to draft a plan, or `/dev-workflow:review` for a quick pass on uncommitted changes.

## The opinion (what makes it deterministic, not just nudged)

- **Separation of judgment**: test-author != implementer != completion-judge, each a separate subagent context. The judge evaluates against the spec, not the tests. Enforced by the Workflow, not by prompting.
- **Testable by default**: no code change without a test change. Red is structurally enforced (a confirmed-failing test before any implementation).
- **Small, reversible changes**: short-lived branches, feature flags, named rollback.
- **Emergent design**: only behaviour (BDD acceptance criteria) is fixed up front; implementation and most architecture emerge in red -> green -> refactor. Most ADRs are discovered during the build and escalated by reversibility.

See [`docs/philosophy.md`](./docs/philosophy.md).

## Skills

Each phase is a skill, invoked by name (`/setup`, or namespaced `/dev-workflow:setup`). The heavy, side-effecting ones (`implement`, `build`, `setup`) are explicit-only (`disable-model-invocation`); the lighter ones (`plan`, `adr`, `review`) may also auto-trigger when you describe the task. There are no separate command wrappers - commands are merged into skills in Claude Code.

- `/setup` - onboard the current repo (linear-server MCP, Linear routing in committed `.claude/settings.json`, Makefile contract, `docs/plans` + `docs/decisions`, optional CI review). Idempotent; run once per repo before `/implement`.
- `/implement <TICKET>` - primary orchestrator (chains all phases + human gates).
- `/plan <TICKET>` - ticket -> thin committed plan file with BDD acceptance criteria.
- `/technical-design "<name>"` - interview -> brainstorm -> draft a Technical Design doc into `docs/design/` for a new service or significant change (PII/payments/integration/data-model/auth). Signed off by PR approval.
- `/build <TICKET> <PLAN-PATH>` - run the role-isolated TDD workflow on an approved plan, e.g. `/build JP-123 docs/plans/JP-123-rate-limiter.md`.
- `/review [PR] [--heavy]` - diff-oriented review (any author) against philosophy + standards; light single-pass by default, `--heavy` for the local multi-agent pass. Same engine runs in CI.
- `/adr "<title>"` - write a MADR 4.0.0 ADR, e.g. `/adr "Use Redis for the rate limiter"`.
- `/standards-check [target]` - check a diff, a plan, or a file against the resolved standards only (no philosophy layer, no review criteria). The narrow check `/review` subsumes.

## Standards Source

`review` and `standards-check` both resolve the external standards from `$DEV_WORKFLOW_STANDARDS_PATH`, a directory holding a `common-llms.md` index. Nothing hardcodes a path, so the same plugin works against a personal wiki, a team wiki, or a CI checkout:

| Context     | Set it in                             | Points at                                     |
| ----------- | ------------------------------------- | --------------------------------------------- |
| Any machine | `~/.zshrc.local` (`export`)           | that machine's engineering wiki, `standards/` |
| CI          | `templates/ci-review.yml` `env`       | the standards repo checked out for the job    |

Export it from `~/.zshrc.local`, never from anything under `~/.claude`. That file is sourced by `.zshrc` and never committed, so each machine points at its own wiki (personal or team) under its own home directory. `~/.claude` is shared across machines through git, so a path committed there would be wrong everywhere else it synced to.

If it is unset, `review` skips the external layer and reviews against repo standards alone; `standards-check` stops and says so rather than passing against nothing.

## Wiki Source

Standards are the rules for the artefact. The ways of working (Technical Design, ADRs, documentation) live in the same wiki but outside `standards/`, and are not in the `common-llms.md` index, so nothing loads them automatically. Skills that carry a copy of a way of working resolve the authoritative page from `$DEV_WORKFLOW_WIKI_PATH`, the wiki repo **root**:

```sh
export DEV_WORKFLOW_WIKI_PATH="$HOME/code/personal-engineering-wiki"
```

Export it from `~/.zshrc.local`, for the same reason as the standards path: `~/.claude` is shared across machines through git, so one machine can point at a personal wiki and another at the team wiki only if the path lives outside it. `technical-design` reads `$DEV_WORKFLOW_WIKI_PATH/ways-of-working/technical-design.md` and lets it win over the skill's own copy; with the variable unset, the skill falls back to that copy. No skill hardcodes a wiki path or repo name.

## CI review

CI cannot run the Workflow tool, so the deterministic multi-agent build/review core is
local-only. CI gets a **single-pass, standards-aware, diff-oriented** review via the
`review` skill running on [`anthropics/claude-code-action@v1`](https://code.claude.com/docs/en/github-actions):
the action installs this plugin (philosophy travels), checks out your external standards
repo, and posts inline comments on every PR. Run the heavy separation-of-judgment review
locally before you push.

Setup:

1. Copy [`templates/ci-review.yml`](./templates/ci-review.yml) into the target repo's `.github/workflows/`.
2. Install the Claude GitHub App (`/install-github-app`) and add the repo secret `ANTHROPIC_API_KEY`.
3. Point `STANDARDS_REPO` / `STANDARDS_REF` at your external standards source (pin the ref). If it is private, add a `STANDARDS_REPO_TOKEN` secret.

Standards resolve as a cascade - external repo (pinned) -> repo `CLAUDE.md` / `REVIEW.md`,
repo wins on conflict. `REVIEW.md` recalibrates severity, caps nits, and adds repo-specific
checks. Findings are tagged 🔴 Important / 🟡 Nit / 🟣 Pre-existing.

## Build interface contract (Makefile)

The plugin invokes tests/checks via canonical `make` targets so the same commands work across languages: `setup`, `mocks`, `build`, `test-unit`, `test`, `check`, `check-ci` (+ composed `deps`/`fmt`/`lint`/`test-integration`/`test-coverage`). Standard: `workflow/makefile-targets.md` in the resolved standards source (see Standards Source). Reference Makefiles for Go and TS ship in [`templates/`](./templates).

## Dependencies

Declares `linear` (`^1.0`) as a native dependency - auto-installed from the same marketplace.
