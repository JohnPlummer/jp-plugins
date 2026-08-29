---
name: em
description: |
  Supervise several role-isolated TDD builds at once. Claims ready tickets, runs each
  `build-isolated-tdd` in its own worktree, watches for stalls, throttles on review debt,
  and opens draft PRs. Holds durable state in a repo progress file so it survives
  compaction. Explicit-only - this dispatches expensive concurrent work. Invoke with
  /em, never auto-triggered.
disable-model-invocation: true
---

# em `<LINEAR-PROJECT>`

Engineering manager for a fleet of ICs. An **IC is one `build-isolated-tdd` run on one ticket in its own worktree**. The EM is the session that decides which tickets run, holds the claim, notices when a run has stopped rather than slowed, and stops claiming when the human review queue is full.

It supervises, it does not design. Every ticket it touches already has an approved plan file. When a build needs a decision, the EM records the question and moves on rather than inventing an answer.

## Preconditions (check first, fail clearly)

1. **Tracker config + workspace safety** - run the config/safety check from the `linear:linear` skill before any MCP touchpoint. Wrong workspace, stop.
2. **Clean working tree on the integration branch.** The EM never edits code itself.
3. **`/.claude/worktrees` is gitignored.** Worktrees live inside the repo, so without this every claim adds an embedded git repository to the index and the next `git add` sweeps it in. Check with `git check-ignore .claude/worktrees` and add the entry before claiming anything.
4. **Makefile contract** - `make -n setup test-unit check`. Missing targets means the ICs cannot verify, so run `/setup` first.
5. **The verifier covers the code the ICs will write.** Read what `check` actually runs. A check that skips the workspace the tickets touch is worse than no check, because every run comes back green. Stop and say so rather than proceeding.
6. **At least one ready ticket** (below). A dry backlog is a halt condition, not an error.

## Ready means the plan file exists

> **IC-ready criterion:** a ticket is claimable if and only if its approved plan file exists on the integration branch at `docs/plans/<TICKET>-<slug>.md`.

That file is the human gate, already passed. It is why the EM never runs `/implement` phases 1 and 2: the spec is settled before the EM starts, so the EM cannot quietly redefine the work. A ticket without one is not ready, no exceptions, and the EM says so rather than writing the plan itself.

## State lives in a file, not in context

`docs/initiatives/<linear-project-slug>.md` in the target repo. **The EM owns it exclusively and ICs never write to it.** Rewrite it as state moves rather than appending, because it is the handoff artefact that has to survive compaction: everything the EM knows must be reconstructable from this file plus the tracker.

Keep the goal in the file, not in the prompt, so compaction cannot drift it. Per claimed ticket record:

| Field | Why |
| --- | --- |
| ticket, branch, worktree path | the claim |
| taskId, runId, transcript dir | to check liveness and to resume |
| status | claimed / building / needs-human / pr-open / landed |
| last liveness read | `STATUS`, `INFLIGHT`, `IDLE_SECONDS` and when |
| blocked-on | the exact human action that clears it, or empty |

Update it at every state change, not at the end of a cycle. A crash between changes must leave it accurate rather than optimistic.

## The loop

Repeat until a halt condition fires.

1. **Check backpressure.** Count open draft PRs from this initiative awaiting human review. At the limit, claim nothing new and go to step 4.
2. **Select and claim.** Take the next ready ticket. Get the branch name from `linear:linear` **branch-name**, then `git worktree add .claude/worktrees/<branch> -b <branch>`. **Creating the branch is the claim** - it is the only genuine test-and-set available, since `git push` rejects a non-fast-forward where tracker assignment is add-to-set and races. Do NOT use `EnterWorktree`, which would move the EM's own working directory. Post the claim comment via `linear:linear` **comment** and set status in-progress. Then verify the write landed by reading it back - a tracker API returning success is not evidence that it wrote anything.
3. **Launch the IC.** Install dependencies in the new worktree first (`make setup`, or `make deps` where that is the repo's target). A fresh worktree has none, and the build will fail confusingly without them. Then:

    ```js
    Workflow({
      scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/build-isolated-tdd.js",
      args: { ticketId: "<TICKET>", planPath: "<worktree>/docs/plans/<TICKET>-<slug>.md", repoPath: "<worktree>" }
    })
    ```

    Record the returned task id, run id and transcript dir in the progress file **before** launching anything else. An unrecorded run is an orphan: still burning tokens, invisible to the next cycle.
4. **Observe.** For each in-flight run:

    ```bash
    eval "$("$CLAUDE_PLUGIN_ROOT/skills/em/scripts/liveness.sh" --dir "<transcriptDir>" --deadline 900)"
    ```

    `running` - leave it. `stalled` - stop the task, record why, free the claim. `done` - the Workflow's own return value is the authority on whether it succeeded, so handle its `status` per step 5.

    A non-zero exit is a fourth state, not an error to ignore: the journal is unreadable, so the run can be neither confirmed alive nor confirmed dead. Mark the ticket needs-human and say the claim cannot be resolved. Do **not** free the claim on an unreadable run. Freeing it risks a second IC on a ticket the first may still be building, which is the one failure worktree isolation cannot save you from.
5. **Land or escalate**, by the IC's returned status:
    - `complete` -> push the branch, open a **draft** PR (`Closes: <TICKET>` in the body), link it via `linear:linear` **link-PR**, set status in-review. Reconcile the run's `workLog`: any entry with `posted: false` gets its comment posted now.
    - `needs-ratification` -> a hard-to-reverse decision. Write it to `docs/initiatives/decisions-needed/<TICKET>.md` and move to the next ticket. Do not wake the human and do not ratify it yourself.
    - `test-tampered` -> the test on disk is not what the test-author wrote. Surface the evidence, mark needs-human, never accept the modified test as the new baseline.
    - any other failed gate (`red-gate-failed`, `green-gate-failed`, `refactor-broke-tests`, `judge-gate-failed`, `verify-failed`) -> record the evidence and mark needs-human. Do not retry a failed gate unchanged. That is how a loop burns a night.
6. **Rewrite the progress file**, then loop.

## Concurrency

Start at one IC and confirm the whole path works before going wider. Three concurrent is the working ceiling: measured throughput plateaus around four agents, and human review capacity binds well before coordination does. More agents past that point produce review debt, not delivery.

## Backpressure

**Stop claiming when open draft PRs awaiting review reach four.** Without this the fleet converts an agent bottleneck into a human one and the throughput gain is imaginary: verification is the bottleneck, not implementation. Raising the limit does not raise capacity, it just hides the queue.

## Halt conditions

Stop, write the reason to the progress file, and report:

- a ticket's requirements are unresolved, or its plan file is missing
- missing access or credentials
- anything destructive: force-push, history rewrite, a migration that is not expand-then-contract, deleting anything outside a worktree
- repeated failures with no progress - the same gate failing twice on one ticket
- exhausted budget or quota
- a dry backlog: nothing ready to claim

## Cold start and compaction

On start, and after every compaction, rebuild state by **reading the progress file first**, then reconciling it against reality: `git worktree list` for live claims, the tracker for statuses, `liveness.sh` for each recorded run. Trust the reconciliation over the file and rewrite the file to match. Never trust remembered state.

If a compaction lands mid-run, the runs keep going - they are separate processes. What is lost is the EM's memory of them, which is exactly what the progress file is for. A run whose transcript dir was never written down cannot be recovered, only found and stopped.

**Resume is same-session only.** `resumeFromRunId` cannot cross sessions, so if the EM dies a ratification-blocked run restarts against a plan sliced to its remaining items rather than resuming. Per-item commits make that cheap, since the completed items are already committed.
