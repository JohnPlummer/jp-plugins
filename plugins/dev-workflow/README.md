# dev-workflow

An opinionated, **deterministic** software development workflow for Claude Code. It encodes a documented engineering philosophy as an executable method - determinism comes from the [Workflow tool](https://code.claude.com/docs/en/workflows) (JS control flow), not from probabilistic skill-triggering.

> **Status: core built.** The build workflow (role-isolated TDD), `plan-feature`, `write-adr`, the `linear` plugin, the `/implement` orchestrator, and the CI review action (`review-diff` skill + `templates/ci-review.yml`) are implemented; the build core is dogfood-proven end-to-end. Remaining: prove the draft-PR slice on a repo with a remote, publish. Build order is in the authoring vault project `Dev Workflow Plugin`.

## What it does

Takes a Linear ticket to a draft PR through fixed phases:

```text
ticket -> plan (repo file) -> known ADRs -> [GATE] -> build (role-isolated TDD) ->
review (diff-oriented) -> verify -> draft PR -> [GATE: mark ready]
```

The pipeline ends at a **draft PR**, not a deploy - hence `/implement`, not `/ship`.

## The opinion (what makes it deterministic, not just nudged)

- **Separation of judgment**: test-author != implementer != completion-judge, each a separate subagent context. The judge evaluates against the spec, not the tests. Enforced by the Workflow, not by prompting.
- **Testable by default**: no code change without a test change. Red is structurally enforced (a confirmed-failing test before any implementation).
- **Small, reversible changes**: short-lived branches, feature flags, named rollback.
- **Emergent design**: only behaviour (BDD acceptance criteria) is fixed up front; implementation and most architecture emerge in red -> green -> refactor. Most ADRs are discovered during the build and escalated by reversibility.

See [`docs/philosophy.md`](./docs/philosophy.md).

## Commands

- `/setup` - onboard the current repo (linear-server MCP, Linear routing in committed `.claude/settings.json`, Makefile contract, `docs/plans` + `docs/decisions`, optional CI review). Idempotent; run once per repo before `/implement`.
- `/implement <TICKET>` - primary orchestrator (chains all phases + human gates).
- `/plan <TICKET>` - ticket -> thin committed plan file with BDD acceptance criteria.
- `/build <TICKET> <PLAN-PATH>` - run the role-isolated TDD workflow on an approved plan.
- `/review [PR] [--heavy]` - diff-oriented review (any author) against philosophy + standards; light single-pass by default, `--heavy` for the local multi-agent pass. Same engine runs in CI.
- `/adr "<title>"` - write a MADR 4.0.0 ADR.

## CI review

CI cannot run the Workflow tool, so the deterministic multi-agent build/review core is
local-only. CI gets a **single-pass, standards-aware, diff-oriented** review via the
`review-diff` skill running on [`anthropics/claude-code-action@v1`](https://code.claude.com/docs/en/github-actions):
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

The plugin invokes tests/checks via canonical `make` targets so the same commands work across languages: `setup`, `mocks`, `build`, `test-unit`, `test`, `check`, `check-ci` (+ composed `deps`/`fmt`/`lint`/`test-integration`/`test-coverage`). Standard: `~/.claude/standards/workflow/makefile-targets.md`. Reference Makefiles for Go and TS ship in [`templates/`](./templates).

## Dependencies

Declares `linear` (`^1.0`) as a native dependency - auto-installed from the same marketplace.
