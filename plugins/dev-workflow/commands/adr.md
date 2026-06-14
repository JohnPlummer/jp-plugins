---
description: Write a MADR 4.0.0 architecture decision record into docs/decisions/.
argument-hint: "<decision title>"
---

# /adr "<decision title>"

> **STATUS: SKELETON (Phase 0).** Built in project Phase 2 (`write-adr` skill).

Standalone ADR writer. Creates a MADR 4.0.0 record in the target repo's `docs/decisions/`:

- filename `NNNN-title-with-dashes.md` (consecutive 4-digit, auto-scanned next number)
- template: status / date / deciders frontmatter + Context and Problem Statement + Decision Drivers + Considered Options + Decision Outcome + Consequences
- status lifecycle: `proposed -> accepted -> (deprecated | superseded by ADR-NNNN)`; `rejected` for options not taken

Most ADRs are discovered during build and emitted by the build workflow; this command is for writing one by hand.
