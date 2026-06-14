# Spec — {feature / work item}

The spec is the contract the test-author works from. Only behaviour is fixed up front;
implementation and architecture emerge in red -> green -> refactor.

## Acceptance criteria (BDD)

### Scenario: {behaviour in plain language}

- **Given** {starting context / preconditions}
- **When** {action / event}
- **Then** {observable outcome}
- **And** {additional outcome, if any}

<!-- repeat per scenario; one scenario = one or more failing tests in the Red phase -->

## Out of scope (YAGNI)

- {explicitly not building X}

## Notes for the implementer

- {constraints, edge cases, data shapes — only what the spec genuinely requires}
