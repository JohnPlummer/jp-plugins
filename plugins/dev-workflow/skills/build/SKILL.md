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

```
Workflow({
  scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/build-isolated-tdd.js",
  args: { ticketId: "<TICKET>", planPath: "<PLAN-PATH>", repoPath: "<repo>" }
})
```

The workflow guarantees by control flow (not prompting):

- **TDD order** - the implementer cannot run until the test-author returns a confirmed-failing test.
- **Separation of judgment** - test-author (spec only) != implementer (sees the test, did not write it) != completion-judge (spec only).

`repoPath` and `planPath` are required (the workflow fails fast on missing args and never
improvises a target). `ticketId` is optional - omit it to run without Linear (work-log
decisions just log). LOCAL only - the Workflow tool is not available in CI.

Handle the returned `status` as the `implement` orchestrator's Phase 4 does (`complete`,
`needs-ratification` -> ratify + `resumeFromRunId`, or a failed gate -> surface and fix).
