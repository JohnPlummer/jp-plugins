---
description: Turn a Linear ticket into a thin committed repo plan file with BDD acceptance criteria.
argument-hint: <TICKET-ID>
---

# /plan <TICKET-ID>

> **STATUS: SKELETON (Phase 0).** Built in project Phase 3 (`plan-feature` skill).

Standalone planning phase. Read the ticket + comments, produce a **thin** plan as a committed repo file `docs/plans/ST-XXX-<feature>.md`:

- ordered work items (task checklist)
- per-item BDD acceptance criteria (the spec the test-author works from)
- coarse vertical slices and approach

Does NOT design implementation/architecture up front — that emerges in the build (red -> green -> refactor). Writes proposed ADRs only for decisions already forced. The ticket references the plan file; work-log decisions go to Linear comments.
