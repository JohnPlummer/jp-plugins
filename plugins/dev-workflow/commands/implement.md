---
description: Primary orchestrator. Take a Linear ticket through the full deterministic SDLC to a draft PR.
argument-hint: <TICKET-ID>
---

# /implement <TICKET-ID>

> **STATUS: SKELETON (Phase 0).** Not yet implemented. Built in project Phase 4 — see the implementation plan in the vault project `Dev Workflow Plugin`.

Primary orchestrator. Chains the phases below, pausing only at the human gates.

## Flow (phases 1-7)

1. **Ingest** — read the Linear ticket + ALL comments first (via the `linear` plugin).
2. **Plan** — thin plan as a committed repo file `docs/plans/ST-XXX-<feature>.md` (task checklist + approach + BDD acceptance criteria). Ticket references it. NOT implementation/architecture design (that emerges in build).
3. **Known ADRs** — write only already-forced decisions to `docs/decisions/` (status: proposed).
   - **GATE: human approves plan file + known ADRs** (ADRs -> accepted; baseline commit).
4. **Build** — invoke the `build-isolated-tdd` workflow (LOCAL): per item RED(test-author) -> GREEN(implementer) -> REFACTOR(design emerges) -> JUDGE(independent). Reversible discovered decisions -> Linear work-log comment + continue; hard-to-reverse -> return early -> MADR ADR + ratify, then resume (`resumeFromRunId`).
5. **Review** — diff-oriented adversarial review + simplicity dimension (wraps `code-review`).
6. **Verify** — full suite green, no regressions.
7. **Open PR** — short-lived branch, small change, feature flag if >a few days, named rollback. Open a **DRAFT** PR. Transition Linear status, link PR<->ticket.
   - **GATE: CI review runs on draft -> human marks READY-for-review.**

## Ceremony tier

Propose light/full at the approval gate, human confirms, default to FULL when uncertain. Tests stay on in every tier (D4).

## Notes

- This pipeline ends at a **draft PR**, not a deploy. Hence `/implement`, not `/ship`.
- Each phase is also a standalone command: `/plan`, `/build`, `/review`, `/adr`.
