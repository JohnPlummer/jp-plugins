---
description: Write a MADR 4.0.0 architecture decision record into docs/decisions/.
argument-hint: "<decision title>"
---

# /adr "<decision title>"

Standalone ADR writer. Invoke the **`write-adr`** skill to create a MADR 4.0.0 record in
the target repo's `docs/decisions/`:

- filename `NNNN-title-with-dashes.md` (consecutive 4-digit, deterministically numbered by `scripts/adr.sh`)
- template: status / date / deciders frontmatter + Context and Problem Statement + Decision Drivers + Considered Options + Decision Outcome + Consequences
- status lifecycle: `proposed -> accepted -> (deprecated | superseded by ADR-NNNN)`; `rejected` for options not taken
- regenerates `docs/decisions/README.md` (the ADR index)

Pass the decision title from the command argument. If no repo is obvious from context, ask
which repo. Then follow the `write-adr` skill process: create the file, fill the body, set
status.

Most ADRs are discovered during build and emitted by the build workflow; this command is
for writing one by hand.
