---
name: plan-feature
description: |
  Turn a Linear ticket (or a feature description) into a thin, committed repo plan file
  with per-item BDD acceptance criteria. Use at the start of /implement or standalone via
  /plan. Produces the spec the role-isolated build workflow consumes. Interactive: reads
  the ticket, proposes a ceremony tier, drafts the plan, and stops for human approval.
  Does not design implementation/architecture up front -- that emerges in red->green->refactor.
---

# plan-feature

Interactive planning: a Linear ticket becomes an approved, committed plan file that the
`build-isolated-tdd` workflow consumes (`args.planPath`). The plan is **thin** — only
behaviour (acceptance criteria) is fixed here; implementation and most architecture emerge
during the build. The file mechanics are deterministic (`scripts/plan.sh`); you write the
content.

## When to use

- Start of `/implement <TICKET>`, or standalone `/plan <TICKET>`.
- Whenever a ticket needs a runnable plan before building.

## Process

1. **Resolve the target repo and the ticket.** If given a Linear ticket id, use it. If
   given only a feature description (e.g. dogfooding without Linear), proceed with that and
   skip the Linear-specific steps (5b, 7b).

2. **Read the ticket + ALL comments FIRST** (ticket-workflow standard). Use the `linear`
   plugin / `linear-server` MCP (`get_issue`, `list_comments`). Comments often carry
   constraints and prior decisions — read them before drafting.

3. **Propose a ceremony tier** (light | full) with brief reasoning, and let the human
   confirm or adjust. Default to **full** when uncertain (safe-by-default). Tiers vary
   *added* ceremony only — tests are on in both. Light: single-pass review, ADR only if
   significant, role isolation collapsed (small changes). Full: formal spec as feature
   tests, full separation of judgment, MADR ADRs + ratification gates, heavier review.

4. **Create the plan file** (deterministic mechanics):

   ```sh
   "$CLAUDE_PLUGIN_ROOT/skills/plan-feature/scripts/plan.sh" new \
     --repo <repo-path> --ticket <TICKET> --title "<feature title>" --tier <light|full>
   ```

   It writes `docs/plans/<TICKET>-<slug>.md` from `templates/plan.md` and prints the path.

5. **Fill the plan** by editing that file:
   - **Approach** — coarse, the vertical slices, smallest in-slice diff. NOT implementation
     design.
   - **Work items** — small and vertical. Each `### <TICKET>-x — <desc>` becomes one
     red->green->refactor->judge cycle, so each needs a clear **Spec (acceptance criteria)**
     block (BDD Given/When/Then or plain observable behaviour), worked examples where they
     sharpen intent, and an explicit out-of-scope (YAGNI) line.
   - 5b. **Known decisions** — only decisions already forced before any code. For each, run
     the `write-adr` skill (status `proposed`) and list it under "Known decisions". Most
     decisions are discovered later in the build, not here — keep this short.

6. **Present the plan for approval** (the human gate). Show the work items + acceptance
   criteria. Do not commit until the human approves. Revise on feedback.

7. **On approval:**
   - **Baseline commit** the plan file (and any proposed ADRs) on the feature branch — this
     is the approved baseline; later mid-build changes are visible commits.
   - 7b. **Reference the plan from the ticket** (a link to the file/PR, not a copy — the
     ticket references the plan, per R4). Set the ticket status if appropriate.

8. **Output the plan file path** — this is what `/build` / `build-isolated-tdd` takes as
   `args.planPath`.

## Notes

- The plan FORMAT is the contract with `build-isolated-tdd` (it parses each item's id, desc,
  and Spec block). Keep the `### <TICKET>-x` + **Spec** structure from the template.
- Reversible work-log decisions ("chose A over B") are **Linear comments**, not plan
  content and not ADRs.
- Thin beats thorough here: over-planning constrains the design before the build has the
  information to make it well.
