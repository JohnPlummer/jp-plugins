// build-isolated-tdd.js
//
// The deterministic core of dev-workflow. LOCAL ONLY -- the Workflow tool is not
// available in CI.
//
// Two guarantees come from CONTROL FLOW, not prompting:
//   1. TDD order -- the implementer (Green) cannot run until the test-author (Red)
//      returns a confirmed-failing test. Red precedes Green precedes Refactor.
//   2. Separation of judgment -- each role is a SEPARATE subagent context. The only
//      information that crosses between them is what this script puts in the prompt:
//        - Red (test-author): sees the SPEC ONLY. Writes a failing test, no impl.
//        - Green (implementer): sees the spec + Red's test (TDD needs this) but did
//          NOT author the test, so cannot pre-shape it to be trivially passable.
//        - Judge (completion): sees the SPEC + the final DIFF ONLY -- never the test
//          internals or the implementer's reasoning -- so it catches an implementation
//          that games the test without meeting the spec's intent.
//
// Schemas force EVIDENCE, not claims (a role that can't reach its gate returns the
// failure and the report flags it).
//
// args = {
//   planPath:  string  (required) -- repo file with the work items + acceptance criteria
//   repoPath:  string  (required) -- absolute path to the target repo; ALL work happens here
//   ticketId:  string  (optional) -- Linear ticket for work-log comments; omit for dogfood
//   testCmd:   string  (optional) -- defaults to the Makefile contract `make test-unit`
//   checkCmd:  string  (optional) -- defaults to the Makefile contract `make check`
// }

export const meta = {
  name: 'build-isolated-tdd',
  description: 'Build approved spec via role-isolated TDD: test-author != implementer != judge',
  phases: [
    { title: 'Plan' },
    { title: 'Red' },
    { title: 'Green' },
    { title: 'Refactor' },
    { title: 'Judge' },
    { title: 'Review' },
    { title: 'Verify' },
  ],
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const ITEMS = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          desc: { type: 'string', description: 'short title of the work item' },
          spec: { type: 'string', description: 'the acceptance criteria (BDD) for this item' },
        },
        required: ['id', 'desc', 'spec'],
      },
    },
  },
  required: ['items'],
}

const RED = {
  type: 'object',
  additionalProperties: false,
  properties: {
    failed: { type: 'boolean', description: 'true if the test ran and FAILED' },
    failsForRightReason: { type: 'boolean', description: 'true if it fails because the behaviour is missing, NOT a syntax/setup error' },
    testFile: { type: 'string' },
    testCode: { type: 'string', description: 'the full test source written' },
    failureOutput: { type: 'string', description: 'verbatim test-runner failure output' },
    notes: { type: 'string' },
  },
  required: ['failed', 'failsForRightReason', 'testFile', 'testCode', 'failureOutput'],
}

const GREEN = {
  type: 'object',
  additionalProperties: false,
  properties: {
    passed: { type: 'boolean', description: 'true if the test now PASSES' },
    diff: { type: 'string', description: 'git diff of the implementation (impl only)' },
    implFile: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['passed', 'diff'],
}

const REFACTOR = {
  type: 'object',
  additionalProperties: false,
  properties: {
    changed: { type: 'boolean' },
    stillGreen: { type: 'boolean', description: 'tests still pass after refactor' },
    summary: { type: 'string' },
    decisions: {
      type: 'array',
      description: 'architecturally significant decisions forced during refactor (may be empty)',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          summary: { type: 'string' },
          reversible: { type: 'boolean', description: 'true = local/cheap to undo; false = hard-to-reverse, needs ratification' },
          rationale: { type: 'string' },
        },
        required: ['summary', 'reversible'],
      },
    },
  },
  required: ['stillGreen', 'decisions'],
}

const JUDGE = {
  type: 'object',
  additionalProperties: false,
  properties: {
    satisfiesSpec: { type: 'boolean', description: 'does the diff ACTUALLY meet the spec intent' },
    testGaming: { type: 'boolean', description: 'true if impl games the test without meeting intent' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'spec requirements not met' },
    overBuild: { type: 'array', items: { type: 'string' }, description: 'functionality beyond the spec (YAGNI)' },
    verdict: { type: 'string' },
  },
  required: ['satisfiesSpec', 'testGaming', 'gaps'],
}

const REVIEW = {
  type: 'object',
  additionalProperties: false,
  properties: {
    clean: { type: 'boolean' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['bug', 'simplification', 'nit'] },
          desc: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['severity', 'desc'],
      },
    },
  },
  required: ['clean', 'findings'],
}

const COMMENTED = {
  type: 'object',
  additionalProperties: false,
  properties: { done: { type: 'boolean' }, ref: { type: 'string' } },
  required: ['done'],
}

const VERDICT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    allGreen: { type: 'boolean' },
    regressions: { type: 'array', items: { type: 'string' } },
    output: { type: 'string' },
  },
  required: ['allGreen', 'regressions'],
}

// ── Setup ─────────────────────────────────────────────────────────────────────
// args may arrive as an object or a JSON string depending on the caller. Normalise,
// then FAIL FAST if the required paths are missing -- never let agents run with an
// undefined plan/repo (they will improvise: read the wrong "plan", write the wrong repo).
const A = typeof args === 'string' ? JSON.parse(args) : (args || {})
if (!A || !A.planPath || !A.repoPath) {
  return {
    status: 'bad-args',
    error: 'planPath and repoPath are both required',
    received: args,
  }
}

const REPO = A.repoPath
const TEST_CMD = A.testCmd || 'make test-unit'
const CHECK_CMD = A.checkCmd || 'make check'
const REPO_RULE = `All work happens in the repo at ${REPO}. Run every command from there (cd ${REPO}). Never touch files outside it. If this path looks wrong or does not exist, STOP and report it -- do not improvise a different target.`

phase('Plan')
const plan = await agent(
  `${REPO_RULE}\nRead the plan file at ${A.planPath}. Return the ordered work items, each with its id, a short desc, and its spec (the acceptance criteria verbatim). Do not invent items not in the plan. If the plan file does not exist, STOP and report it -- do not substitute another file.`,
  { phase: 'Plan', schema: ITEMS, label: 'read-plan' },
)
log(`Plan has ${plan.items.length} work item(s)`)

// Serial: a single feature's items share files. (worktree isolation only if proven needed.)
const built = []
for (const item of plan.items) {
  log(`── item ${item.id}: ${item.desc}`)

  // RED -- test-author. SPEC ONLY. Must not write implementation.
  const red = await agent(
    `${REPO_RULE}\nYou are the TEST-AUTHOR. You may ONLY write test code, never implementation.\n\nSPEC (acceptance criteria):\n${item.spec}\n\nWrite a failing automated test that encodes this spec. Then run \`${TEST_CMD}\` and capture the output. Do NOT write or stub any implementation — it is correct and expected that the unit under test does not exist yet.\n\nfailsForRightReason = true when the test fails because the behaviour/unit is not implemented yet (including "module not found" or "x is not a function" for the unit you are testing). failsForRightReason = false ONLY when the failure is a defect in the TEST itself (a typo, a bad import path in the test, an assertion that would fail even against a correct implementation). Return the test file path, the full test source, whether it failed, whether it failed for the right reason, and the verbatim failure output.`,
    { phase: 'Red', schema: RED, label: `red:${item.id}` },
  )
  if (!red.failed || !red.failsForRightReason) {
    return { status: 'red-gate-failed', at: item.id, red, built }
  }

  // GREEN -- implementer. Sees the test it must pass, but did NOT author it.
  const green = await agent(
    `${REPO_RULE}\nYou are the IMPLEMENTER. A test has already been written by someone else (you did not write it and must not change it).\n\nSPEC:\n${item.spec}\n\nThe test you must satisfy (already on disk at ${red.testFile}):\n\`\`\`\n${red.testCode}\n\`\`\`\n\nWrite the MINIMAL implementation to make this test pass. YAGNI -- add no functionality the spec did not ask for. Do not modify the test. Run \`${TEST_CMD}\` and confirm it passes. Return whether it passed and the \`git diff\` of your implementation changes.`,
    { phase: 'Green', schema: GREEN, label: `green:${item.id}` },
  )
  if (!green.passed) {
    return { status: 'green-gate-failed', at: item.id, red, green, built }
  }

  // REFACTOR -- design emerges here. Tests stay green. Report significant decisions.
  const refac = await agent(
    `${REPO_RULE}\nYou are refactoring. The tests are green; keep them green (run \`${TEST_CMD}\` after each change). Let the design emerge: extract abstractions that are now evident, remove duplication (DRY), simplify (YAGNI). This is the design step, not cosmetic tidying. Report any architecturally significant decision you were forced to make and whether it is reversible (reversible = local and cheap to undo later; not reversible = hard to undo, e.g. a public API shape, a data format, a dependency choice). If none, return an empty decisions array.`,
    { phase: 'Refactor', schema: REFACTOR, label: `refactor:${item.id}` },
  )
  if (!refac.stillGreen) {
    return { status: 'refactor-broke-tests', at: item.id, red, green, refac, built }
  }

  // DISCOVERED DECISIONS -- escalate by reversibility (Working Agreement principle).
  for (const d of refac.decisions ?? []) {
    if (d.reversible) {
      if (A.ticketId) {
        await agent(
          `Post a brief work-log comment on Linear ticket ${A.ticketId} recording this reversible decision made while building ${item.id}: "${d.summary}". Use the linear plugin / MCP. Return done:true and the comment ref.`,
          { phase: 'Refactor', schema: COMMENTED, label: `worklog:${item.id}` },
        )
      } else {
        log(`(no ticket) reversible decision on ${item.id}: ${d.summary}`)
      }
    } else {
      // Hard-to-reverse -> stop for human ratification (MADR ADR), resume via resumeFromRunId.
      return { status: 'needs-ratification', at: item.id, pending: d, built }
    }
  }

  // JUDGE -- independent. SPEC + DIFF ONLY. Not the test internals, not Green's reasoning.
  const judge = await agent(
    `${REPO_RULE}\nYou are an INDEPENDENT completion judge. Evaluate ONLY against the spec below and the diff provided. You do not have, and must not request, the test source or the implementer's notes.\n\nSPEC:\n${item.spec}\n\nResulting implementation diff:\n\`\`\`diff\n${green.diff}\n\`\`\`\n\nDoes this ACTUALLY satisfy the spec's intent (not merely pass some test)? Identify any gap (spec requirement not met), any over-build (functionality beyond the spec), and whether it looks like test-gaming. Return your verdict.`,
    { phase: 'Judge', schema: JUDGE, label: `judge:${item.id}` },
  )
  built.push({ item, red, green, refac, judge })
}

// REVIEW -- diff-oriented, per change, in parallel. (Wraps the code-review philosophy.)
phase('Review')
const reviews = await parallel(
  built.map((b) => () =>
    agent(
      `${REPO_RULE}\nReview the change for work item "${b.item.desc}" (${b.item.id}). Inspect the current diff in the repo. Look for correctness bugs AND simplicity/reuse opportunities (DRY, YAGNI, dead code). Report findings with severity bug/simplification/nit, or clean:true if none.`,
      { phase: 'Review', schema: REVIEW, label: `review:${b.item.id}` },
    ),
  ),
)

// VERIFY -- full local gate, no regressions.
phase('Verify')
const verdict = await agent(
  `${REPO_RULE}\nRun the full local gate \`${CHECK_CMD}\`. Confirm everything is green with no regressions. Return allGreen, any regressions, and the tail of the output.`,
  { phase: 'Verify', schema: VERDICT, label: 'verify' },
)

return {
  status: verdict.allGreen ? 'complete' : 'verify-failed',
  itemsBuilt: built.length,
  built: built.map((b) => ({
    id: b.item.id,
    desc: b.item.desc,
    redFailedFirst: b.red.failed && b.red.failsForRightReason,
    greenPassed: b.green.passed,
    decisions: b.refac.decisions,
    judge: { satisfiesSpec: b.judge.satisfiesSpec, testGaming: b.judge.testGaming, gaps: b.judge.gaps },
  })),
  reviews,
  verdict,
}
