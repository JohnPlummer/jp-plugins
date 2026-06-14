# dev-workflow

An opinionated, **deterministic** software development workflow for Claude Code. It encodes a documented engineering philosophy as an executable method — determinism comes from the [Workflow tool](https://code.claude.com/docs/en/workflows) (JS control flow), not from probabilistic skill-triggering.

> **Status: scaffold (Phase 0).** Commands, skills, the build workflow, and templates are skeletons. Build order is in the authoring vault project `Dev Workflow Plugin`.

## What it does

Takes a Linear ticket to a draft PR through fixed phases:

```text
ticket -> plan (repo file) -> known ADRs -> [GATE] -> build (role-isolated TDD) ->
review (diff-oriented) -> verify -> draft PR -> [GATE: mark ready]
```

The pipeline ends at a **draft PR**, not a deploy — hence `/implement`, not `/ship`.

## The opinion (what makes it deterministic, not just nudged)

- **Separation of judgment** — test-author != implementer != completion-judge, each a separate subagent context. The judge evaluates against the spec, not the tests. Enforced by the Workflow, not by prompting.
- **Testable by default** — no code change without a test change. Red is structurally enforced (a confirmed-failing test before any implementation).
- **Small, reversible changes** — short-lived branches, feature flags, named rollback.
- **Emergent design** — only behaviour (BDD acceptance criteria) is fixed up front; implementation and most architecture emerge in red -> green -> refactor. Most ADRs are discovered during the build and escalated by reversibility.

See [`docs/philosophy.md`](./docs/philosophy.md).

## Commands

- `/implement <TICKET>` — primary orchestrator (chains all phases + human gates).
- `/plan <TICKET>` — ticket -> thin committed plan file with BDD acceptance criteria.
- `/build <TICKET> <PLAN-PATH>` — run the role-isolated TDD workflow on an approved plan.
- `/review [PR]` — diff-oriented review (any author) against philosophy + standards.
- `/adr "<title>"` — write a MADR 4.0.0 ADR.

## Build interface contract (Makefile)

The plugin invokes tests/checks via canonical `make` targets so the same commands work across languages: `setup`, `mocks`, `build`, `test-unit`, `test`, `check`, `check-ci` (+ composed `deps`/`fmt`/`lint`/`test-integration`/`test-coverage`). Standard: `~/.claude/standards/workflow/makefile-targets.md`. Reference Makefiles for Go and TS ship in [`templates/`](./templates).

## Dependencies

Declares `linear` (`^1.0`) as a native dependency — auto-installed from the same marketplace.
