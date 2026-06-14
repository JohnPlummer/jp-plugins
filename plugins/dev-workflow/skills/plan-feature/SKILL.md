---
name: plan-feature
description: |
  Turn a Linear ticket into a thin, committed repo plan file with per-item BDD acceptance
  criteria. Use at the start of /implement or standalone via /plan. Produces the spec the
  role-isolated build workflow consumes. Does not design implementation/architecture up
  front -- that emerges in red -> green -> refactor.
---

# plan-feature

> **STATUS: SKELETON (Phase 0).** Built in project Phase 3.

Interactive planning: Linear ticket -> approved plan file.

## Process

1. Read the ticket + ALL comments (via the `linear` plugin / MCP).
2. Draft a **thin** plan to `docs/plans/ST-XXX-<feature>.md`:
   - ordered work items (task checklist)
   - per-item BDD acceptance criteria (the spec; use `templates/spec.md`)
   - coarse vertical slices + approach
3. Write proposed ADRs only for already-forced decisions (`write-adr`).
4. Propose a ceremony tier (light/full) with reasoning.
5. Human approves -> baseline commit; ticket references the plan file.

Only behaviour (acceptance criteria) is fixed up front. Implementation design and most architecture emerge in the build.
