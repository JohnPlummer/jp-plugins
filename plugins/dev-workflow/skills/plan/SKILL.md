---
name: plan
description: |
  Turn a Linear ticket (or a feature description) into a thin, committed repo plan file
  with per-item BDD acceptance criteria. Use at the start of /implement or standalone via
  /plan. Produces the spec the role-isolated build workflow consumes. Interactive: reads
  the ticket, drafts the plan, and stops for human approval.
  Does not design implementation/architecture up front -- that emerges in red->green->refactor.
---

# plan

Interactive planning: a Linear ticket becomes an approved, committed plan file that the
`build-isolated-tdd` workflow consumes (`args.planPath`). The plan is **thin** - only
behaviour (acceptance criteria) is fixed here; implementation and most architecture emerge
during the build. The file mechanics are deterministic (`scripts/plan.sh`); you write the
content.

## When to use

- Start of `/implement <TICKET>`, or standalone `/plan <TICKET>`.
- Whenever a ticket needs a runnable plan before building.

## Process

1. **Resolve the target repo and the ticket.** If given a Linear ticket id, use it. If
   given only a feature description (e.g. dogfooding without Linear), proceed with that and
   skip the Linear-specific steps (4b, 6b).

2. **Read the ticket + ALL comments FIRST** (ticket-workflow standard). Use the `linear`
   plugin / `linear-server` MCP (`get_issue`, `list_comments`). Comments often carry
   constraints and prior decisions - read them before drafting.

3. **Create the plan file** (deterministic mechanics):

   ```sh
   "$CLAUDE_PLUGIN_ROOT/skills/plan/scripts/plan.sh" new \
     --repo <repo-path> --ticket <TICKET> --title "<feature title>"
   ```

   It writes `docs/plans/<TICKET>-<slug>.md` from `templates/plan.md` and prints the path.

4. **Fill the plan** by editing that file:
   - **Approach** - coarse, the vertical slices, smallest in-slice diff. NOT implementation
     design.
   - **Work items** - small and vertical. Each `### <TICKET>-x - <desc>` becomes one
     red->green->refactor->judge cycle, so each needs a clear **Spec (acceptance criteria)**
     block (BDD Given/When/Then or plain observable behaviour), worked examples where they
     sharpen intent, and an explicit out-of-scope (YAGNI) line.

     **The criteria must cover the behaviour, not merely illustrate it.** Worked examples go
     in the examples block, never in place of a criterion. Four checks:

     1. **State the rule, not just examples.** An example pins one point, a rule constrains
        the domain. Criteria that are only input/output pairs let any function passing
        through those points clear every gate.
     2. **Bound the input domain.** Say what is in and what is out. Defects collect in the
        region the criteria never described.
     3. **Include a boundary or near-boundary case.** Exact powers, round numbers and
        well-formed input prove nothing about the edges, which is where implementations bend.
     4. **Make negative cases near-misses.** An obviously invalid input proves only that a
        guard exists. A plausible-but-wrong one proves the guard is correct.
   - 4b. **Known decisions** - only decisions already forced before any code. For each, run
     the `adr` skill (status `proposed`) and list it under "Known decisions". Most
     decisions are discovered later in the build, not here - keep this short.

5. **Present the plan for approval** (the human gate). Show the work items + acceptance
   criteria. Do not commit until the human approves. Revise on feedback.

6. **On approval:**
   - **Baseline commit** the plan file (and any proposed ADRs) on the feature branch - this
     is the approved baseline; later mid-build changes are visible commits.
   - 6b. **Reference the plan from the ticket** (a link to the file/PR, not a copy - the
     ticket references the plan, per R4). Set the ticket status if appropriate.

7. **Output the plan file path** - this is what `/build` / `build-isolated-tdd` takes as
   `args.planPath`.

## Notes

- The plan FORMAT is the contract with `build-isolated-tdd` (it parses each item's id, desc,
  and Spec block). Keep the `### <TICKET>-x` + **Spec** structure from the template.
- Reversible work-log decisions ("chose A over B") are **Linear comments**, not plan
  content and not ADRs.
- Thin beats thorough **on design**: over-planning constrains the design before the build
  has the information to make it well. It does NOT mean thin on behaviour. The plan can be
  thin, but the acceptance criteria must cover the required behaviour. Under-specified
  behaviour is not thin, it is unfinished, and it disarms every gate downstream without
  showing a failure: the test-author can only test what it was told, so a weak spec yields
  weak tests, and the judge then approves an implementation that satisfies them.
