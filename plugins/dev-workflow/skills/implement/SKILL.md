---
name: implement
description: |
  Primary orchestrator. Take a Linear ticket through the full deterministic SDLC to a draft
  PR: ingest -> plan + ADRs -> role-isolated TDD build (review + verify run inside it) ->
  draft PR, with human gates. Explicit-only - this is the expensive, multi-phase pipeline;
  invoke with /implement <TICKET>, never auto-triggered.
disable-model-invocation: true
---

# implement `<TICKET-ID>`

Primary orchestrator. Chains the phases below, pausing only at the human gates. The
interactive phases (ingest, plan, PR) run here in the conversation; the build runs
**headless** via the `build-isolated-tdd` Workflow. The pipeline ends at a **draft PR**,
not a deploy - hence `implement`, not `ship`.

Each phase is also a standalone skill (`plan`, `build`, `review`, `adr`); this skill
composes them. If `$1` (the ticket id) is missing, ask for it.

## Preconditions (check first, fail clearly)

If several of these are unmet, the repo hasn't been onboarded - run `/setup` first, which
handles all of them in one pass.

1. **Linear config + workspace safety** - run the config/safety check from the
   `linear:linear` skill before any MCP touchpoint. If the MCP is on the wrong workspace,
   stop.
2. **Clean working tree** - `git status` clean (or stash/commit first). Never start on a
   dirty tree.
3. **Makefile contract preflight** - dry-run the required targets:
   `make -n setup test-unit test check` (and `mocks`, `build` if used). If any are missing,
   offer to scaffold from `templates/Makefile.go` / `templates/Makefile.ts` (repo's choice
   of language) before continuing. The build cannot run without the contract.

## Phase 1 - Ingest

Use `linear:linear` **get-ticket** to read the ticket AND all its comments. Summarise the
intent and the constraints the comments add.

## Phase 2 - Plan (+ known ADRs)  >> GATE <<

Invoke the **`plan`** skill:

- draft the thin plan to `docs/plans/<TICKET>-<slug>.md` (behaviour only - acceptance
  criteria per work item; NOT implementation design);
- write only already-forced decisions as `proposed` ADRs via **`adr`**.

There is no ceremony tier: `/implement` IS the full-ceremony path. A change too small
for it should use a normal session plus `/review` instead.

**HUMAN GATE:** present the plan + any proposed ADRs. Do not proceed until approved. On
approval, flip ratified ADRs to `accepted`. Revise on feedback.

## Phase 3 - Branch + baseline

- Branch name from `linear:linear` **branch-name** (`<TICKET>-<slug>`); create the feature
  branch (github-flow standard; never work on main).
- **Baseline commit** the approved plan file + ADRs (`type(scope): desc`).
- `linear:linear` **set-status** -> in-progress.

## Phase 4 - Build (headless, role-isolated)

Invoke the Workflow tool on the build core:

```js
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/build-isolated-tdd.js",
  args: { ticketId: "<TICKET>", planPath: "<repo>/docs/plans/<TICKET>-<slug>.md", repoPath: "<repo>" }
})
```

It runs per item: RED (test-author, spec only) -> GREEN (implementer) -> REFACTOR (design
emerges) -> CHECKPOINT (mechanical: verifies the test on disk is byte-identical to what
Red authored, commits the item, extracts the ground-truth diff from git) -> JUDGE
(independent gate, spec + ground-truth diff only), then parallel REVIEW and a
`make check` VERIFY. Guarantees come from control flow, not prompting.

**Each item lands as its own commit inside the build.** Do not add a wrap-up commit for
the build afterwards, and never squash its per-item history.

Handle the return `status`:

- `complete` -> surface the build's review findings and the `allGreen` verdict, run the
  work-log reconciliation below, then proceed to Phase 5. For deeper local review before
  the PR, run the **`review`** skill (`--heavy` wraps `code-review`) - heavy
  separation-of-judgment review runs locally, not in CI (the Workflow tool is not
  available in CI).
- `needs-ratification` -> a hard-to-reverse decision surfaced. Write the MADR ADR
  (`adr`), get the **human to ratify** (ADR -> `accepted`), then resume with the SAME
  args plus the ratified summary:
  `Workflow({ scriptPath, resumeFromRunId: "<runId>", args: { ...same args, ratified: ["<decision summary>"] } })`
  (completed agents are cached; `ratified` is what lets the run continue past the stop).
- `test-tampered` -> the test on disk is not what the test-author wrote: Green or
  Refactor modified it. Surface the evidence diff. Never accept the modified test as the
  new baseline; find out why it was changed, fix, and re-run.
- `judge-gate-failed` -> the independent judge found the implementation does not satisfy
  the spec's intent, or games the test. Surface the judge's gaps and verdict; fix the
  spec or the plan and re-run.
- `red-gate-failed` / `green-gate-failed` / `refactor-broke-tests` / `verify-failed` ->
  surface the evidence; fix the plan or the blocker and re-run. Do not paper over a failed
  gate.

**Work-log reconciliation (every terminal status):** the result's `workLog` array carries
each reversible decision with `posted`/`ref`. Mid-run posting is best-effort (headless MCP
may be absent), so for any entry with `posted: false`, post it now via `linear:linear`
**comment** - Linear ends complete either way, live when the MCP was up.

## Phase 5 - Open PR  >> GATES <<

- Push the branch (only after `make check` green).
- Open a **DRAFT** PR (soft, reversible publish): title `<TICKET>: <summary>`, body =
  Summary / Testing / Related with `Closes: <TICKET>` (github-flow PR-body standard).
- `linear:linear` **link-PR** (attach PR to ticket) and **set-status** -> in-review.
- **GATE:** CI review runs on the draft. When the human is satisfied, they **mark the PR
  ready-for-review** (the firmer gate). The pipeline stops here - deployment is separate
  and not owned by this plugin.

## Reversibility (principles in practice)

Prefer the smallest in-slice diff (Phase 2). Short-lived branch, feature flag if it won't
land in days, a named rollback noted in the PR (Phase 5). Resist shipping big.
