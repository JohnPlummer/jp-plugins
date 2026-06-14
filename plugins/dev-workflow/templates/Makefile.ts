# Reference Makefile (TypeScript/Node) — implements the dev-workflow target contract.
# Standard: ~/.claude/standards/workflow/makefile-targets.md
# Copy into a Node repo and wire the tooling behind each target. The dev-workflow
# plugin invokes these targets by name; the repo decides the toolchain.

.PHONY: setup deps mocks build fmt lint test-unit test-integration test test-feature \
        test-coverage check check-ci clean

# ── Lifecycle ───────────────────────────────────────────────────────────────
setup: ## bootstrap a fresh checkout (idempotent)
	@cp -n .env.example .env 2>/dev/null || true
	@npm ci

deps:
	@npm ci

clean:
	@rm -rf dist coverage

# ── Build & codegen ──────────────────────────────────────────────────────────
mocks: ## (re)generate test doubles; run when interfaces change
	@npm run generate:mocks

build: deps
	@npm run build

# ── Quality ──────────────────────────────────────────────────────────────────
fmt: deps
	@npx prettier --write .

lint:
	@npx eslint .
	@npx tsc --noEmit

# ── Tests ────────────────────────────────────────────────────────────────────
test-unit: ## fast unit tests — red/green inner loop
	@npm run test:unit

test-integration:
	@npm run test:integration

test-feature: ## BDD / acceptance feature tests (full ceremony tier)
	@npm run test:feature

test: test-unit test-integration

test-coverage:
	@npm run test -- --coverage

# ── Gates ────────────────────────────────────────────────────────────────────
check: deps fmt lint build test          ## fast local verification (~1-2 min)
	@echo "All checks passed!"

check-ci: deps fmt lint build test-coverage  ## CI gate, with coverage
	@echo "CI checks passed with coverage!"
