---
name: standards-check
description: Check code or plans against the resolved development standards. Use PROACTIVELY after creating implementation plans and after writing significant code. Covers Go, TypeScript, React, Python patterns for architecture, testing, error handling, database access, resilience, accessibility, and CI/CD workflows.
context: fork
---

# Standards Check

Check code or a plan against the standards that apply here, and return a verdict.

This skill knows how to *resolve* a standards source. It does not know where one lives. The location differs by context - a personal machine, a work machine, a CI runner - and hardcoding any of them is what caused the drift this cascade replaces.

## Input Modes

- **No arguments**: check changes in the current branch vs main (`git diff main...HEAD`)
- **"this plan"**: check the plan currently being discussed
- **File reference**: check the specified file (e.g. `@some-file.go`)

## 1. Resolve The Standards Root

Read `$DEV_WORKFLOW_STANDARDS_PATH`. That directory is the standards source, and it is called `$STANDARDS` below. It is the same variable the `review` skill uses, so one setting drives both.

Its value is set per context, and this skill does not care which:

| Context     | Set in                                | Points at                                                  |
| ----------- | ------------------------------------- | ---------------------------------------------------------- |
| Any machine | `~/.claude/settings.local.json` `env` | that machine's clone of its engineering wiki, `standards/` |
| CI          | the review workflow's `env`           | the standards repo checked out for that job                |

`settings.local.json` is machine-local and gitignored, which is what makes this work: the same `~/.claude` is shared across machines via git, but the standards path differs per machine (a personal wiki on one, the team wiki on another) and the home directory differs too. A path in the tracked `settings.json` would be wrong on every machine but the one it was written on.

**If the variable is unset or does not resolve to a directory containing `common-llms.md`, stop.** Report that the standards source is unresolved, name the variable, and check nothing further. A PASS with no standards loaded is a false negative, and worse than no check at all - it tells the caller their code conforms when nothing looked.

## 2. Load The Relevant Standards

1. Read the index: `$STANDARDS/common-llms.md`.
2. Find the "Loading Strategy by Task Type" table.
3. Match the code or plan to task types (e.g. "Go API endpoint", "Writing tests (Go)").
4. Read every standard the matched rows list, from `$STANDARDS/<domain>/<file>.md`. Index paths may be written `standards/<domain>/<file>` - resolve them relative to `$STANDARDS`, stripping a leading `standards/`.

Load only what the diff or plan touches. The index exists so the whole corpus never enters context.

## 3. Load Project Standards

Read the repo's `CLAUDE.md`, plus any nested `CLAUDE.md` under the changed paths (each applies only to files beneath it).

**Project standards win on conflict.** Where a repo standard and an external standard address the same topic, the repo one replaces it. Unrelated standards stack.

## 4. Analyse

For each loaded standard: does the code or plan follow the pattern, are there deviations, and is anything the standard requires missing?

Judge against the standards that were actually loaded. Do not invent a rule because it feels like good practice - if it is not in the resolved standards or the project's `CLAUDE.md`, it is not a violation, and saying so anyway trains the caller to ignore you.

## Output Format

```text
## Standards Check Results

### Standards Source
<the resolved $STANDARDS path>

### Standards Loaded
- [standard-name]
- [standard-name]

### Violations Found
- ⚠️ [file:line] [pattern]: [what's wrong]

### Missing Patterns
- [pattern that should be applied]

### Verdict: PASS | NEEDS_ATTENTION
```

Use **PASS** when the code follows every applicable standard. Use **NEEDS_ATTENTION** when there are violations or missing patterns. If the standards source did not resolve, report that instead of a verdict.

## Related

- `review` - the full diff-oriented code review. It resolves the same standards through the same variable, and adds the philosophy layer and review criteria on top. This skill is the narrower, standards-only check.
