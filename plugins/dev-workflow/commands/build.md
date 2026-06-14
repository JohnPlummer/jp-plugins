---
description: Run the role-isolated TDD build workflow against an approved plan file.
argument-hint: <TICKET-ID> <PLAN-PATH>
---

# /build <TICKET-ID> <PLAN-PATH>

> **STATUS: SKELETON (Phase 0).** Built in project Phase 1 (the deterministic core, `workflows/build-isolated-tdd.js`).

Standalone build phase. Invokes the `build-isolated-tdd` Workflow on an already-approved plan file. The workflow guarantees by control flow (not prompting):

- **TDD order** — implementer cannot run until the test-author returns a confirmed-failing test.
- **Separation of judgment** — test-author (spec only) != implementer (sees test, did not write it) != completion-judge (spec only).

LOCAL only — the Workflow tool is not available in CI. `args = { ticketId, planPath }`.
