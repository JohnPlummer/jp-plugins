---
description: Turn a Linear ticket into a thin committed repo plan file with BDD acceptance criteria.
argument-hint: <TICKET-ID>
---

# /plan <TICKET-ID>

Standalone planning phase. Invoke the **`plan-feature`** skill: read the ticket + all
comments, propose a ceremony tier, and produce a **thin** plan as a committed repo file
`docs/plans/<TICKET>-<feature>.md`:

- ordered work items (task checklist)
- per-item BDD acceptance criteria (the spec the test-author works from)
- coarse vertical slices and approach

Does NOT design implementation/architecture up front — that emerges in the build (red -> green -> refactor). Writes proposed ADRs only for decisions already forced. The ticket references the plan file; work-log decisions go to Linear comments.
