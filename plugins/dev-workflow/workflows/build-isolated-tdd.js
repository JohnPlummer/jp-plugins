// build-isolated-tdd.js
//
// The deterministic core of dev-workflow. LOCAL ONLY -- the Workflow tool is not
// available in CI.
//
// Three guarantees come from CONTROL FLOW, not prompting:
//   1. TDD order -- the implementer (Green) cannot run until the test-author (Red)
//      returns a confirmed-failing test. Red precedes Green precedes Refactor.
//   2. Separation of judgment -- each role is a SEPARATE subagent context. The only
//      information that crosses between them is what this script puts in the prompt:
//        - Red (test-author): sees the SPEC ONLY. Writes a failing test, no impl.
//        - Green (implementer): sees the spec + Red's test (TDD needs this) but did
//          NOT author the test, so cannot pre-shape it to be trivially passable.
//        - Judge (completion): sees the SPEC + the checkpoint's ground-truth DIFF
//          ONLY -- never the test internals or the implementer's reasoning -- and its
//          verdict is a GATE, not a report note.
//   3. Evidence integrity -- a mechanical per-item CHECKPOINT verifies the test on
//      disk is byte-identical to what Red authored (mismatch -> test-tampered gate),
//      commits the item (small reversible changes land in the build's own history),
//      and extracts the judge's diff from git rather than trusting the implementer's
//      self-report.
//
// Schemas force EVIDENCE, not claims (a role that can't reach its gate returns the
// failure and the report flags it).
//
// args = {
//   planPath:  string   (required) -- repo file with the work items + acceptance criteria
//   repoPath:  string   (required) -- absolute path to the target repo; ALL work happens here
//   ticketId:  string   (optional) -- Linear ticket for work-log comments; omit for dogfood
//   testCmd:   string   (optional) -- defaults to the Makefile contract `make test-unit`
//   checkCmd:  string   (optional) -- defaults to the Makefile contract `make check`
//   ratified:  string[] (optional) -- decision summaries a human has already ratified;
//                                     pass alongside resumeFromRunId to continue past a
//                                     needs-ratification stop
// }

export const meta = {
  name: 'build-isolated-tdd',
  description: 'Build approved spec via role-isolated TDD: test-author != implementer != judge',
  phases: [
    { title: 'Plan' },
    { title: 'Red' },
    { title: 'Green' },
    { title: 'Refactor' },
    { title: 'Checkpoint' },
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
    implFile: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['passed'],
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

const CHECKPOINT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    testIntact: { type: 'boolean', description: 'the test file on disk is byte-identical to what the test-author returned' },
    tamperEvidence: { type: 'string', description: 'unified diff between the authored test and the file on disk, when not intact' },
    commit: { type: 'string', description: 'hash of the commit created for this item (empty when tampered)' },
    implDiff: { type: 'string', description: 'git show of the item commit with the test file excluded -- the ground-truth implementation diff' },
  },
  required: ['testIntact', 'commit', 'implDiff'],
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
const RATIFIED = new Set(A.ratified || [])
const REPO_RULE = `All work happens in the repo at ${REPO}. Run every command from there (cd ${REPO}). Never touch files outside it. If this path looks wrong or does not exist, STOP and report it -- do not improvise a different target.`

// Every reversible decision, with whether its Linear comment actually posted -- the
// orchestrator reconciles posted:false entries after the run (headless MCP is best-effort).
const workLog = []

phase('Plan')
const plan = await agent(
  `${REPO_RULE}\nRead the plan file at ${A.planPath}. Return the ordered work items, each with its id, a short desc, and its spec (the acceptance criteria verbatim). Do not invent items not in the plan. If the plan file does not exist, STOP and report it -- do not substitute another file.`,
  { phase: 'Plan', schema: ITEMS, label: 'read-plan', model: 'haiku', effort: 'low' },
)
log(`Plan has ${plan.items.length} work item(s)`)

// Serial: a single feature's items share files. (worktree isolation only if proven needed.)
const built = []
for (const item of plan.items) {
  log(`── item ${item.id}: ${item.desc}`)

  // RED -- test-author. SPEC ONLY. Must not write implementation.
  const red = await agent(
    `${REPO_RULE}\nYou are the TEST-AUTHOR. You may ONLY write test code, never implementation.\n\nSPEC (acceptance criteria):\n${item.spec}\n\nWrite a failing automated test that encodes this spec. Then run \`${TEST_CMD}\` and capture the output. Do NOT write or stub any implementation - it is correct and expected that the unit under test does not exist yet.\n\nfailsForRightReason = true when the test fails because the behaviour/unit is not implemented yet (including "module not found" or "x is not a function" for the unit you are testing). failsForRightReason = false ONLY when the failure is a defect in the TEST itself (a typo, a bad import path in the test, an assertion that would fail even against a correct implementation). Return the test file path, the full test source, whether it failed, whether it failed for the right reason, and the verbatim failure output.`,
    { phase: 'Red', schema: RED, label: `red:${item.id}` },
  )
  if (!red.failed || !red.failsForRightReason) {
    return { status: 'red-gate-failed', at: item.id, red, built, workLog }
  }

  // GREEN -- implementer. Sees the test it must pass, but did NOT author it. Its diff
  // is NOT collected -- the judge gets ground truth from the checkpoint instead.
  const green = await agent(
    `${REPO_RULE}\nYou are the IMPLEMENTER. A test has already been written by someone else (you did not write it and must not change it).\n\nSPEC:\n${item.spec}\n\nThe test you must satisfy (already on disk at ${red.testFile}):\n\`\`\`\n${red.testCode}\n\`\`\`\n\nWrite the MINIMAL implementation to make this test pass. YAGNI -- add no functionality the spec did not ask for. Do not modify the test. Run \`${TEST_CMD}\` and confirm it passes. Return whether it passed and the implementation file path.`,
    { phase: 'Green', schema: GREEN, label: `green:${item.id}` },
  )
  if (!green.passed) {
    return { status: 'green-gate-failed', at: item.id, red, green, built, workLog }
  }

  // REFACTOR -- design emerges here. Tests stay green. Report significant decisions.
  const refac = await agent(
    `${REPO_RULE}\nYou are refactoring. The tests are green; keep them green (run \`${TEST_CMD}\` after each change). Let the design emerge: extract abstractions that are now evident, remove duplication (DRY), simplify (YAGNI). This is the design step, not cosmetic tidying. Do not modify the test file at ${red.testFile}. Report any architecturally significant decision you were forced to make and whether it is reversible (reversible = local and cheap to undo later; not reversible = hard to undo, e.g. a public API shape, a data format, a dependency choice). If none, return an empty decisions array.`,
    { phase: 'Refactor', schema: REFACTOR, label: `refactor:${item.id}` },
  )
  if (!refac.stillGreen) {
    return { status: 'refactor-broke-tests', at: item.id, red, green, refac, built, workLog }
  }

  // DISCOVERED DECISIONS -- escalate by reversibility (Working Agreement principle).
  for (const d of refac.decisions ?? []) {
    if (d.reversible) {
      const entry = { item: item.id, summary: d.summary, rationale: d.rationale || '', posted: false, ref: '' }
      if (A.ticketId) {
        const posted = await agent(
          `Post a brief work-log comment on Linear ticket ${A.ticketId} recording this reversible decision made while building ${item.id}: "${d.summary}". Use the linear plugin / MCP. If the MCP is unavailable, return done:false -- do not treat that as a failure.`,
          { phase: 'Refactor', schema: COMMENTED, label: `worklog:${item.id}`, model: 'haiku', effort: 'low' },
        )
        if (posted && posted.done) {
          entry.posted = true
          entry.ref = posted.ref || ''
        }
      } else {
        log(`(no ticket) reversible decision on ${item.id}: ${d.summary}`)
      }
      workLog.push(entry)
    } else if (!RATIFIED.has(d.summary)) {
      // Hard-to-reverse -> stop for human ratification (MADR ADR). Resume via
      // resumeFromRunId with the same args + this summary in args.ratified.
      return { status: 'needs-ratification', at: item.id, pending: d, built, workLog }
    }
  }

  // CHECKPOINT -- mechanical, no judgment. Test-tamper gate + per-item commit +
  // ground-truth diff for the judge.
  const cp = await agent(
    `${REPO_RULE}\nYou are a mechanical CHECKPOINT for work item ${item.id}. Perform exactly these steps.\n\n1. TEST INTEGRITY. The test-author wrote ${red.testFile} with exactly this content:\n\`\`\`\n${red.testCode}\n\`\`\`\nCompare the file on disk byte-for-byte against that content (write the expected content to a temp file outside the repo and run \`diff\`). If they differ in any way, return testIntact:false, the unified diff as tamperEvidence, and empty strings for commit and implDiff -- and do NOT commit.\n\n2. COMMIT. If intact, stage and commit all current changes as one conventional commit for this item: \`type(scope): desc\` per github-flow, type matching the nature of "${item.desc}". Return the commit hash.\n\n3. GROUND-TRUTH DIFF. Return the implementation diff verbatim from \`git show HEAD -- . ':(exclude)${red.testFile}'\` (the item's commit with the test file excluded).`,
    { phase: 'Checkpoint', schema: CHECKPOINT, label: `checkpoint:${item.id}`, model: 'haiku', effort: 'low' },
  )
  if (!cp.testIntact) {
    return { status: 'test-tampered', at: item.id, evidence: cp.tamperEvidence || '', red, built, workLog }
  }

  // JUDGE -- independent GATE. SPEC + ground-truth DIFF ONLY. Not the test internals,
  // not the implementer's reasoning.
  const judge = await agent(
    `${REPO_RULE}\nYou are an INDEPENDENT completion judge. Evaluate ONLY against the spec below and the diff provided. You do not have, and must not request, the test source or the implementer's notes.\n\nSPEC:\n${item.spec}\n\nGround-truth implementation diff (the item's commit, test file excluded):\n\`\`\`diff\n${cp.implDiff}\n\`\`\`\n\nDoes this ACTUALLY satisfy the spec's intent, not merely pass some test? Check specifically for: gaps (spec requirements not met); over-build beyond the spec (YAGNI) including defensive layers the spec never asked for -- validation, error handling, configuration; and test-gaming (an implementation shaped to satisfy a test's letter while missing the spec's intent, e.g. special-casing the inputs a test would use). Return your verdict.`,
    { phase: 'Judge', schema: JUDGE, label: `judge:${item.id}` },
  )
  if (!judge.satisfiesSpec || judge.testGaming) {
    return { status: 'judge-gate-failed', at: item.id, judge, commit: cp.commit, built, workLog }
  }
  built.push({ item, red, green, refac, cp, judge })
}

// REVIEW -- diff-oriented, per change, in parallel. (Wraps the code-review philosophy.)
phase('Review')
const reviews = await parallel(
  built.map((b) => () =>
    agent(
      `${REPO_RULE}\nReview the change for work item "${b.item.desc}" (${b.item.id}) -- commit ${b.cp.commit}. Inspect that commit's diff (\`git show ${b.cp.commit}\`). Look for correctness bugs AND simplicity/reuse opportunities (DRY, YAGNI, dead code). Report findings with severity bug/simplification/nit, or clean:true if none.`,
      { phase: 'Review', schema: REVIEW, label: `review:${b.item.id}` },
    ),
  ),
)

// VERIFY -- full local gate, no regressions.
phase('Verify')
const verdict = await agent(
  `${REPO_RULE}\nRun the full local gate \`${CHECK_CMD}\`. Confirm everything is green with no regressions. Return allGreen, any regressions, and the tail of the output.`,
  { phase: 'Verify', schema: VERDICT, label: 'verify', model: 'haiku', effort: 'low' },
)

return {
  status: verdict.allGreen ? 'complete' : 'verify-failed',
  itemsBuilt: built.length,
  built: built.map((b) => ({
    id: b.item.id,
    desc: b.item.desc,
    commit: b.cp.commit,
    redFailedFirst: b.red.failed && b.red.failsForRightReason,
    greenPassed: b.green.passed,
    decisions: b.refac.decisions,
    judge: { satisfiesSpec: b.judge.satisfiesSpec, testGaming: b.judge.testGaming, gaps: b.judge.gaps },
  })),
  reviews,
  workLog,
  verdict,
}
