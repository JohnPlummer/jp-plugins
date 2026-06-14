# Reference Makefile (Go) — implements the dev-workflow target contract.
# Standard: ~/.claude/standards/workflow/makefile-targets.md
# Copy into a Go repo and wire the tooling behind each target. The dev-workflow
# plugin invokes these targets by name; the repo decides the toolchain.

.PHONY: setup deps mocks build fmt lint test-unit test-integration test test-feature \
        test-coverage check check-ci clean

# ── Lifecycle ───────────────────────────────────────────────────────────────
setup: ## bootstrap a fresh checkout (idempotent)
	@cp -n .env.example .env 2>/dev/null || true
	@go mod download
	@go install go.uber.org/mock/mockgen@latest
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@go install mvdan.cc/gofumpt@latest

deps:
	@go mod download
	@go mod tidy
	@go mod verify

clean:
	@rm -f coverage.out coverage.html
	@go clean

# ── Build & codegen ──────────────────────────────────────────────────────────
mocks: ## (re)generate test doubles; run when interfaces change
	@go generate ./...

build: deps
	@go build ./...

# ── Quality ──────────────────────────────────────────────────────────────────
fmt: deps
	@go fmt ./...
	@gofumpt -w .

lint:
	@golangci-lint run ./...

# ── Tests ────────────────────────────────────────────────────────────────────
test-unit: mocks ## fast unit tests — red/green inner loop
	@ginkgo run --label-filter="unit" ./...

test-integration:
	@ginkgo run --label-filter="integration" ./...

test-feature: ## BDD / acceptance feature tests (full ceremony tier)
	@ginkgo run --label-filter="feature" ./...

test: test-unit test-integration

test-coverage:
	@ginkgo run --cover --coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html

# ── Gates ────────────────────────────────────────────────────────────────────
check: deps fmt lint build test          ## fast local verification (~1-2 min)
	@echo "All checks passed!"

check-ci: deps fmt lint build test-coverage  ## CI gate, with coverage
	@echo "CI checks passed with coverage!"
