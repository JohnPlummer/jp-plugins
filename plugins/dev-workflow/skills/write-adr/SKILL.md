---
name: write-adr
description: |
  Write a MADR 4.0.0 architecture decision record into the target repo's docs/decisions/.
  Use when a significant, hard-to-reverse decision needs recording, or when the build
  workflow surfaces a discovered decision to ratify. Handles next-number scanning and the
  MADR template. Not for work-log decisions (those go to Linear comments).
---

# write-adr

> **STATUS: SKELETON (Phase 0).** Built in project Phase 2.

Writes a MADR 4.0.0 ADR.

## Process

1. Ensure `docs/decisions/` exists in the target repo (create if absent).
2. Scan existing `NNNN-*.md` files, compute the next consecutive 4-digit number.
3. Render the MADR template (`templates/madr.md`): status / date / deciders frontmatter, Context and Problem Statement, Decision Drivers, Considered Options, Decision Outcome, Consequences, optional Confirmation / Pros-Cons / More Information.
4. Set status: `proposed` for discovered-reversible, `accepted` after human ratification.

Status lifecycle: `proposed -> accepted -> (deprecated | superseded by ADR-NNNN)`; `rejected` for options not taken.
