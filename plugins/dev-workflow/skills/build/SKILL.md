---
name: build
description: |
  Run the role-isolated TDD build workflow against an approved plan file. Invokes the
  build-isolated-tdd Workflow (test-author != implementer != judge). Explicit-only - this is
  expensive and side-effecting; invoke with /build, never auto-triggered.
disable-model-invocation: true
---

# build

Standalone build phase. Invokes the `build-isolated-tdd` Workflow on an already-approved plan
file:

```js
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/build-isolated-tdd.js",
  args: { ticketId: "<TICKET>", planPath: "<PLAN-PATH>", repoPath: "<repo>" }
})
```

The workflow guarantees by control flow (not prompting):

- **TDD order** - the implementer cannot run until the test-author returns a confirmed-failing test.
- **Separation of judgment** - test-author (spec only) != implementer (sees the test, did not write it) != completion-judge (spec + ground-truth diff only), and the judge's verdict is a gate.
- **Evidence integrity** - a mechanical per-item checkpoint verifies the test on disk is byte-identical to what the test-author wrote (mismatch -> `test-tampered`), commits the item, and extracts the judge's diff from git rather than trusting the implementer's self-report.

`repoPath` and `planPath` are required (the workflow fails fast on missing args and never
improvises a target). `ticketId` is optional - omit it to run without Linear (work-log
decisions just log; the returned `workLog` array records what posted). LOCAL only - the
Workflow tool is not available in CI.

Each item lands as its own commit - do not add a wrap-up commit or squash the history.

Handle the returned `status` as the `implement` orchestrator's Phase 4 does: `complete`,
`needs-ratification` -> ratify + resume with the same args plus `ratified: [...]`, or a
failed gate (`red-gate-failed`, `green-gate-failed`, `refactor-broke-tests`,
`test-tampered`, `judge-gate-failed`, `verify-failed`) -> surface the evidence and fix.
