---
description: Diff-oriented adversarial review of the current changes against philosophy + standards.
argument-hint: "[PR-number]"
---

# /review [PR-number]

> **STATUS: SKELETON (Phase 0).** Built in project Phase 4/5; wraps the existing `code-review` skill.

Diff-oriented review — reviews whatever is in the diff regardless of authorship (plugin-built or hand-coded). One engine, three triggers:

- `/implement` phase 5 — reviews the code it just built
- `/review` standalone (local) — reviews your manual changes before pushing
- CI action — reviews any PR diff

Applies the plugin's philosophy + the resolved standards cascade (external folder/repo -> repo, repo wins). Local: full Workflow-driven multi-agent separation-of-judgment, can apply fixes. CI: single-pass inline comments (Workflow tool unavailable in CI).
