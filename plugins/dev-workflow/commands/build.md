---
description: Run the role-isolated TDD build workflow against an approved plan file.
argument-hint: <TICKET-ID> <PLAN-PATH>
---

# /build <TICKET-ID> <PLAN-PATH>

Standalone build phase. Invokes the `build-isolated-tdd` Workflow on an already-approved plan file:

```
Workflow({
  scriptPath: "<plugin>/workflows/build-isolated-tdd.js",
  args: { ticketId: "<TICKET>", planPath: "<PLAN-PATH>", repoPath: "<repo>" }
})
```

The workflow guarantees by control flow (not prompting):

- **TDD order** — implementer cannot run until the test-author returns a confirmed-failing test.
- **Separation of judgment** — test-author (spec only) != implementer (sees test, did not write it) != completion-judge (spec only).

`repoPath` and `planPath` are required (the workflow fails fast on missing args and never improvises a target). `ticketId` is optional — omit it to run without Linear (work-log decisions just log). LOCAL only — the Workflow tool is not available in CI.

Handle the returned `status` as `/implement` Phase 4 does (`complete`, `needs-ratification` → ratify + `resumeFromRunId`, or a failed gate → surface and fix).
