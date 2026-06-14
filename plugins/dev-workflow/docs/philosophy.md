# Engineering philosophy (the opinion dev-workflow enforces)

> **Status: skeleton (Phase 0).** To be consolidated from the scattered sources below into one canonical doc during the build. This is the plugin's "opinion" — always on, not overridable by standards.

The plugin is "opinionated" because it encodes an *already-documented* engineering philosophy as an executable method, not an invented one.

## Load-bearing principles

1. **Separation of judgment** *(the crown jewel)* — a single agent that writes the code, the tests, and judges completion Goodharts its own artifacts. Isolate the roles: test-author != implementer != completion-judge; the judge evaluates against the **spec**, not the tests. Maps directly onto Workflow subagent isolation.
2. **Testable by default** — "you cannot change what you cannot test." No code change without a test change.
3. **Spec quality determines output quality** — BDD acceptance criteria are the contract the test-author builds from. Discovery/spec is the constraint, not typing code.
4. **Small, reversible changes** — short-lived branches, trunk-based, feature flags past a few days, expand-then-contract migrations, named rollback. Resist shipping big just because AI can generate big.
5. **Verification is the bottleneck** — not implementation. Heavier, multi-agent review.
6. **Outcome over activity** — tie changes to outcomes; rework rate as the AI-quality early-warning signal.
7. **Minimal ceremony** — async-first, one review gate. Simplicity applies to the process, not just the code.
8. **Bounded contexts / vertical slices** — prefer in-slice changes.

## Two axes

- **Philosophy** (values) — baked into the plugin, always on, not overridable by standards.
- **Standards** (concrete patterns) — supplied externally, resolved by a scope cascade (external folder/repo -> repo, repo wins). Never baked in.

## Sources to consolidate

Engineering Principles, Software Factory, AI SDLC, Working Agreement, Product discovery to agent execution, How We Measure (authoring vault project `Dev Workflow Plugin` references). The richest source lives in a private work vault, which is the argument for consolidating it here as the cross-context canonical home.
