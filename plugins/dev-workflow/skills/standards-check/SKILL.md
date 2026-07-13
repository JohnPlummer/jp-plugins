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

| Context     | Set in                       | Points at                                                  |
| ----------- | ---------------------------- | ---------------------------------------------------------- |
| Any machine | `~/.zshenv.local` (`export`) | that machine's clone of its engineering wiki, `standards/` |
| CI          | the review workflow's `env`  | the standards repo checked out for that job                |

`~/.zshenv.local` is sourced by `~/.zshenv` on every shell invocation and never committed, which is what makes this work: `~/.claude` is shared across machines through git, but the standards path is not. One machine points at a personal wiki, another at the team wiki, and even the home directory differs (`/Users/jp` vs `/Users/johnp`). A path committed under `~/.claude` would be wrong on every machine except the one that wrote it. Prefer `.zshenv.local` over `.zshrc.local`: `.zshrc` is skipped by non-interactive shells, so a value set there is invisible to any tool that shells out without a tty.

**Then find the index.** Take the first of these that exists, and call it `$INDEX`:

1. `$STANDARDS/common-llms.md`
2. `$STANDARDS/README.md`

Both are valid. A corpus large enough to need a machine-only index has `common-llms.md`; a smaller corpus keeps one index for humans and machines in its `README.md`. Either way the index is what tells you which pages to load.

**If the variable is unset, does not resolve to a directory, or that directory has neither file, stop.** Report that the standards source is unresolved, name the variable, and check nothing further. A PASS with no standards loaded is a false negative, and worse than no check at all - it tells the caller their code conforms when nothing looked.

## 2. Load The Relevant Standards

1. Read `$INDEX`, resolved in step 1.
2. Find the "Loading Strategy by Task Type" table.
3. Match the code or plan to task types (e.g. "Go API endpoint", ".NET write endpoint (Command)", "Writing tests (Website)").
4. Read every standard the matched rows list, from `$STANDARDS/<domain>/<file>.md`. Index paths may be written `standards/<domain>/<file>` - resolve them relative to `$STANDARDS`, stripping a leading `standards/`.

Load only what the diff or plan touches. The index exists so the whole corpus never enters context.

**If `$INDEX` has no "Loading Strategy by Task Type" table**, say so in your output, then fall back to selecting pages from the index's own descriptions. Do not go quiet about it: without the table, page selection is your judgment rather than a mapping, so the caller needs to know a page may have been missed.

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
