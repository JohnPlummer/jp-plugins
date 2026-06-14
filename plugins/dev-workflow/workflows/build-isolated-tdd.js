// build-isolated-tdd.js
//
// STATUS: DESIGN SKETCH (Phase 0). To be built and dogfooded in project Phase 1.
// The deterministic core of dev-workflow. LOCAL ONLY -- the Workflow tool is not
// available in CI.
//
// Two guarantees come from control flow, not prompting:
//   - TDD order: the implementer agent cannot run until the test-author returns a
//     confirmed-failing test. Red precedes green precedes refactor.
//   - Separation of judgment: each role is a separate subagent context. The
//     test-author works from the SPEC ONLY. The implementer sees the test (TDD needs
//     this) but did not write it. The completion-judge works from the SPEC ONLY -- not
//     the test internals, not the implementer's reasoning -- so it catches an
//     implementation that games the test without meeting intent.
//
// Schemas (defined in Phase 1) force evidence, not claims:
//   RED      -> failed:true + failureOutput + testCode
//   GREEN    -> passed:true + diff
//   REFACTOR -> decisions[]{summary, reversible}
//   JUDGE    -> satisfiesSpec + gaps[]
//   VERDICT  -> allGreen + regressions

export const meta = {
  name: 'build-isolated-tdd',
  description: 'Build approved spec via role-isolated TDD: test-author != implementer != judge',
  phases: [
    { title: 'Red' },
    { title: 'Green' },
    { title: 'Refactor' },
    { title: 'Judge' },
    { title: 'Review' },
    { title: 'Verify' },
  ],
}

// args = { ticketId, planPath }  -- plan doc lives in the repo (docs/plans/ST-XXX-*.md),
// version-tracked; ticket references it. Read from the file (no MCP needed for the plan).
const plan = await agent(`Read the plan ${args.planPath} (repo file). Return ordered work
                          items, each with its acceptance criteria (the spec). Work-log goes
                          to Linear ticket ${args.ticketId}.`, { schema: ITEMS })

// Serial: a single feature's items share files. (worktree isolation only if proven needed)
const built = []
for (const item of plan.items) {
  // RED -- test-author sees the SPEC ONLY. Does not implement.
  const red = await agent(`Spec: ${item.spec}\nWrite a FAILING test that encodes this spec.
                           Run the test command. Return the failure output -- it MUST fail
                           for the right reason. Do NOT write implementation code.`,
                          { phase: 'Red', schema: RED })

  // GREEN -- implementer sees spec + the test it must pass, but did not author the test.
  const green = await agent(`Spec: ${item.spec}\nTest to satisfy:\n${red.testCode}\nWrite the
                             MINIMAL code to pass it. Run tests. Confirm green. YAGNI -- no
                             functionality the spec didn't ask for.`,
                            { phase: 'Green', schema: GREEN })

  // REFACTOR -- design EMERGES here. Extract abstractions as they become evident; tests
  // stay green (run after each change). This is the design step, not tidying.
  const refac = await agent(`Refactor: let the design emerge. Extract abstractions that are
                             now evident, simplify (DRY, YAGNI). Tests stay green -- run after
                             each change. Report any architecturally significant decision you
                             were forced to make, and whether it is reversible.`,
                            { phase: 'Refactor', schema: REFACTOR })

  // DISCOVERED DECISIONS -- escalate by reversibility (JP's Working Agreement principle).
  for (const d of refac.decisions ?? []) {
    if (d.reversible) {
      // work-log decision -> Linear comment (ticket-workflow standard); continue headless
      await agent(`Post a work-log comment on ticket ${args.ticketId}: decided ${d.summary}.`,
                  { phase: 'Refactor', schema: COMMENTED })
    } else {
      // architecturally significant -> MADR ADR + escalate for ratification
      return { status: 'needs-ratification', built, pending: d, at: item.id } // RETURN EARLY
      // human ratifies -> MADR ADR accepted in docs/decisions/, then resumeFromRunId to continue
    }
  }

  // JUDGE -- independent, sees SPEC ONLY. Not the test internals, not the impl reasoning.
  const judge = await agent(`Spec: ${item.spec}\nHere is the resulting diff:\n${green.diff}\n
                             Does this ACTUALLY satisfy the spec's intent (not just pass a
                             test)? Flag any gap, over-build, or test-gaming.`,
                            { phase: 'Judge', schema: JUDGE })
  built.push({ item, red, green, refac, judge })
}

phase('Review')
const reviews = await parallel(built.map(b => () =>
  agent(`Review change for ${b.item.desc}: correctness bugs AND simplicity/reuse.`,
        { phase: 'Review', schema: REVIEW })))   // wraps existing /code-review

phase('Verify')
const verdict = await agent(`Run the full suite. Confirm all green, no regressions. Report any
                             failure.`, { schema: VERDICT })
return { built, reviews, verdict }
