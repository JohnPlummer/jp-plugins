---
description: Diff-oriented review of the current changes against philosophy + standards.
argument-hint: "[PR-number] [--heavy]"
---

# /review [PR-number] [--heavy]

Diff-oriented review — reviews whatever is in the diff regardless of authorship
(plugin-built or hand-coded). One engine, three triggers:

- `/implement` phase 5 — reviews the code it just built
- `/review` standalone (local) — reviews your manual changes before pushing
- CI action — reviews any PR diff (see below)

Applies the plugin's philosophy + the resolved standards cascade (external folder/repo ->
repo, repo wins). The shared criteria live in the **`review-diff`** skill.

## Local

- **Default (light):** run the `review-diff` skill on the current diff (or the given PR).
  Single-pass, standards-aware, prints findings by severity; offers fixes, never auto-applies.
- **`--heavy`:** the full Workflow-driven multi-agent separation-of-judgment review (wraps
  `code-review`) — can apply fixes. Local only; the Workflow tool is unavailable in CI.

## CI

CI cannot run the Workflow tool, so CI review is the **single-pass `review-diff` skill** via
`anthropics/claude-code-action@v1`: it loads this plugin (philosophy travels), checks out
the external standards repo, and posts inline comments on every PR. Drop
[`templates/ci-review.yml`](../templates/ci-review.yml) into the target repo's
`.github/workflows/` and set `ANTHROPIC_API_KEY` (+ `STANDARDS_REPO_TOKEN` for a private
standards repo). See the plugin README "CI review" section.
