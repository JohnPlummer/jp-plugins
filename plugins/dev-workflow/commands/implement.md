---
description: Primary orchestrator. Take a Linear ticket through the full deterministic SDLC to a draft PR.
argument-hint: <TICKET-ID>
---

# /implement <TICKET-ID>

Primary orchestrator. Chains the phases below, pausing only at the human gates. The
interactive phases (ingest, plan, PR) run here in the conversation; the build runs
**headless** via the `build-isolated-tdd` Workflow. The pipeline ends at a **draft PR**,
not a deploy — hence `/implement`, not `/ship`.

Each phase is also a standalone command (`/plan`, `/build`, `/review`, `/adr`); this
command composes them. If `$1` (the ticket id) is missing, ask for it.

## Preconditions (check first, fail clearly)

1. **Linear seam config + workspace safety** — run the config/safety check from the
   `linear:linear` skill before any MCP touchpoint. If the MCP is on the wrong workspace,
   stop.
2. **Clean working tree** — `git status` clean (or stash/commit first). Never start on a
   dirty tree.
3. **Makefile contract preflight** — dry-run the required targets:
   `make -n setup test-unit test check` (and `mocks`, `build` if used). If any are missing,
   offer to scaffold from `templates/Makefile.go` / `templates/Makefile.ts` (repo's choice
   of language) before continuing. The build cannot run without the contract.

## Phase 1 — Ingest

Use `linear:linear` **get-ticket** to read the ticket AND all its comments. Summarise the
intent and the constraints the comments add.

## Phase 2 — Plan (+ known ADRs)  ►► GATE ◄◄

Invoke the **`plan-feature`** skill:

- propose a ceremony tier (light | full), human confirms (default full);
- draft the thin plan to `docs/plans/<TICKET>-<slug>.md` (behaviour only — acceptance
  criteria per work item; NOT implementation design);
- write only already-forced decisions as `proposed` ADRs via **`write-adr`**.

**HUMAN GATE:** present the plan + any proposed ADRs. Do not proceed until approved. On
approval, flip ratified ADRs to `accepted`. Revise on feedback.

## Phase 3 — Branch + baseline

- Branch name from `linear:linear` **branch-name** (`<TICKET>-<slug>`); create the feature
  branch (github-flow standard; never work on main).
- **Baseline commit** the approved plan file + ADRs (`type(scope): desc`).
- `linear:linear` **set-status** → in-progress.

## Phase 4 — Build (headless, role-isolated)

Invoke the Workflow tool on the build core:

```
Workflow({
  scriptPath: "<plugin>/workflows/build-isolated-tdd.js",
  args: { ticketId: "<TICKET>", planPath: "<repo>/docs/plans/<TICKET>-<slug>.md", repoPath: "<repo>" }
})
```

It runs per item: RED (test-author, spec only) → GREEN (implementer) → REFACTOR (design
emerges) → JUDGE (independent, spec+diff only), then parallel REVIEW and a `make check`
VERIFY. Guarantees come from control flow, not prompting.

Handle the return `status`:

- `complete` → proceed to Phase 5.
- `needs-ratification` → a hard-to-reverse decision surfaced. Write the MADR ADR
  (`write-adr`), get the **human to ratify** (ADR → `accepted`), then resume:
  `Workflow({ scriptPath, resumeFromRunId: "<runId>" })` (completed agents are cached).
- `red-gate-failed` / `green-gate-failed` / `refactor-broke-tests` / `verify-failed` →
  surface the evidence; fix the plan or the blocker and re-run. Do not paper over a failed
  gate.

For reversible decisions the build logs work-log comments via `linear:linear` **comment**
(best-effort; headless MCP may be absent — it logs and continues).

## Phase 5 — Review

The build workflow already runs a diff-oriented review per change. Surface its findings.
For deeper local review, run **`/review`** (wraps `code-review`) before opening the PR —
heavy separation-of-judgment review runs locally, not in CI (the Workflow tool is not
available in CI).

## Phase 6 — Verify

The build's VERIFY phase ran `make check`. Confirm `allGreen` with no regressions. Per the
github-flow push rule, **only push when `make check` passes** — for the initial PR and
every subsequent push.

## Phase 7 — Open PR  ►► GATES ◄◄

- Push the branch (only after `make check` green).
- Open a **DRAFT** PR (soft, reversible publish): title `<TICKET>: <summary>`, body =
  Summary / Testing / Related with `Closes: <TICKET>` (github-flow PR-body standard).
- `linear:linear` **link-PR** (attach PR to ticket) and **set-status** → in-review.
- **GATE:** CI review runs on the draft. When the human is satisfied, they **mark the PR
  ready-for-review** (the firmer gate). The pipeline stops here — deployment is separate
  and not owned by this plugin.

## Reversibility (principles in practice)

Prefer the smallest in-slice diff (Phase 2). Short-lived branch, feature flag if it won't
land in days, a named rollback noted in the PR (Phase 7). Resist shipping big.
