# Ticket Templates

Complete templates for different ticket types.

## Bug Ticket Template

```markdown
# [Component] Fix [Specific Problem]

## Context

### Current State

[Describe current behaviour and how it differs from expected]

### Problem Details

- **Specific Issue**: [Exact problem description]
- **Impact**: [Who is affected, frequency, severity]
- **Root Cause**: [If known, or hypotheses]
- **Environment**: [Browser/OS/version where bug occurs]

### Dependencies

- **Technical**: [Affected services, APIs, libraries]
- **Team**: [Related tickets, blocking issues]

## Reproduction Steps

1. [Step 1 with exact actions]
2. [Step 2 with exact actions]
3. [Step 3 with exact actions]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happens]

## Error Messages/Logs

```

[Paste relevant error messages or logs]

```

## Acceptance Criteria

### Functional Requirements

- [ ] Bug no longer occurs when following reproduction steps
- [ ] No regressions in related functionality
- [ ] Works across all supported environments

### Technical Requirements

- [ ] Root cause identified and fixed
- [ ] Error handling improved (if applicable)
- [ ] Logging added for future debugging

### Edge Cases

- [ ] Works with empty/null data
- [ ] Handles concurrent requests
- [ ] Graceful degradation if dependencies fail

## Technical Details

### Investigation Areas

1. Check `[file/path]` for [what to look for]
2. Verify [condition] in [location]
3. Review logs in [service] for [patterns]

### Key Files

- `path/to/affected/file.ext` - [Why this file is relevant]
- `path/to/test/file.test.ext` - [Test that should catch this]

### Patterns to Follow

- Look at similar fix in `path/to/example.ext`
- Follow error handling pattern in `path/to/pattern.ext`

## Testing Requirements

### Unit Tests

- [ ] Add test case that reproduces the bug
- [ ] Verify fix resolves the test case
- [ ] Add regression tests for edge cases

### Integration Tests

- [ ] Test end-to-end user flow
- [ ] Verify no side effects on related features

### Verification Commands

```bash
# Run affected test suite
npm test path/to/tests

# Run full regression
npm test

# Manual verification
[Specific commands to verify fix]
```

### Manual Testing Steps

1. [Step-by-step verification process]
2. [Include multiple scenarios]

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Root cause documented in ticket
- [ ] Tests written and passing (including regression tests)
- [ ] Code reviewed and approved
- [ ] No new linting errors
- [ ] Documentation updated if behaviour changed

```

## Feature Ticket Template

```markdown
# [Component] Add [Specific Feature/Capability]

## User Story

As a [specific user type]
I want to [specific action/feature]
So that [clear business value/outcome]

## Context

### Current State

[How users currently accomplish this goal, or why they can't]

### Business Value

- **Primary Benefit**: [Main value delivered]
- **User Impact**: [How many users, how often used]
- **Strategic Alignment**: [How this fits product roadmap]

### Dependencies

- **Technical**: [Services, APIs, libraries needed]
- **Team**: [Other teams or tickets blocking this]
- **External**: [Third-party integrations, vendor requirements]

## Acceptance Criteria

### Functional Requirements

- [ ] [Specific user-facing behaviour]
- [ ] [Feature works in specified scenarios]
- [ ] [UI/UX meets design requirements]

### Technical Requirements

- [ ] [Performance requirements: response time, throughput]
- [ ] [Scalability requirements]
- [ ] [Security requirements]
- [ ] [Compatibility requirements]

### Edge Cases

- [ ] [Handles invalid input gracefully]
- [ ] [Works with empty data]
- [ ] [Concurrent usage scenarios]

## Technical Details

### Implementation Approach

[High-level approach without prescribing exact implementation]

Example:
- Add new API endpoint following REST conventions
- Implement service layer following existing patterns
- Update UI components to consume new endpoint

### API Contract (if applicable)

```typescript
// Request
POST /api/v1/resource
{
  "field1": "string",
  "field2": number
}

// Response
{
  "id": "string",
  "status": "success|error",
  "data": { ... }
}
```

### UI/UX Considerations

- [Wireframes or mockups link]
- [Interaction patterns]
- [Accessibility requirements]
- [Responsive behaviour]

### Key Files

- `path/to/api/handler.ext` - [Create new endpoint here]
- `path/to/service/logic.ext` - [Business logic implementation]
- `path/to/ui/component.ext` - [UI component]

### Patterns to Follow

- Look at `existing/feature.ext` for similar implementation
- Follow validation pattern in `path/to/validator.ext`
- Use error handling from `path/to/errors.ext`

### Database Changes (if applicable)

```sql
-- Migration up
CREATE TABLE new_table (
  id UUID PRIMARY KEY,
  ...
);

-- Migration down
DROP TABLE new_table;
```

## Testing Requirements

### Unit Tests

- [ ] Test all business logic paths
- [ ] Test error handling
- [ ] Test edge cases and boundary conditions

### Integration Tests

- [ ] Test API endpoints end-to-end
- [ ] Test database operations
- [ ] Test external service integrations

### E2E Tests

- [ ] Test complete user journey
- [ ] Test cross-browser compatibility
- [ ] Test responsive behaviour

### Verification Commands

```bash
# Run unit tests
npm test path/to/tests

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Check coverage
npm run test:coverage
```

### Performance Testing

```bash
# Load test the new endpoint
k6 run performance/test.js

# Verify response times < 200ms
```

## Documentation Updates

- [ ] API documentation
- [ ] User-facing documentation
- [ ] Internal runbooks
- [ ] Architecture diagrams

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Tests written and passing (>80% coverage)
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Performance requirements met
- [ ] Security review completed (if needed)
- [ ] Accessibility requirements met
- [ ] No new linting errors

```

## Technical Debt/Refactoring Template

```markdown
# [Component] Refactor [Specific Area]

## Context

### Current Problems

[Describe specific pain points with current implementation]

- **Code Quality Issues**: [Complexity, duplication, unclear structure]
- **Performance Issues**: [Slow operations, memory leaks, inefficiency]
- **Maintainability Issues**: [Hard to modify, fragile, brittle tests]
- **Technical Limitations**: [Blocks future features, doesn't scale]

### Business Impact

- **Developer Velocity**: [How this slows down development]
- **Bug Rate**: [How this contributes to bugs]
- **Cost**: [Infrastructure costs, time costs]

### Why Now

[Why addressing this now is important]

## Proposed Improvements

### Changes Overview

[High-level description of refactoring approach]

### Benefits

- **Performance**: [Expected improvements]
- **Maintainability**: [How code becomes easier to work with]
- **Extensibility**: [New capabilities unlocked]

### Risks

- **Breaking Changes**: [What might break]
- **Migration Effort**: [Cost to migrate]
- **Team Impact**: [Learning curve, documentation needs]

## Acceptance Criteria

### Functional Requirements

- [ ] All existing functionality preserved
- [ ] No user-facing behaviour changes (unless specified)
- [ ] Existing tests still pass

### Technical Requirements

- [ ] [Performance improvement: X% faster]
- [ ] [Code complexity reduced by X%]
- [ ] [Test coverage maintained or improved]
- [ ] [Memory usage reduced by X%]

### Quality Metrics

- [ ] No increase in cyclomatic complexity
- [ ] Code duplication reduced
- [ ] Type safety improved (if applicable)

## Technical Details

### Implementation Approach

[Step-by-step refactoring approach]

Example:
1. Add new implementation alongside old
2. Migrate tests to new implementation
3. Gradually migrate callers
4. Remove old implementation

### Key Files

- `path/to/current/impl.ext` - [Current implementation to refactor]
- `path/to/new/impl.ext` - [New implementation location]
- `path/to/tests.ext` - [Tests to update/add]

### Patterns to Follow

- Use pattern from `reference/implementation.ext`
- Follow architectural principles in `docs/architecture.md`

### Migration Path

```typescript
// Phase 1: Add new implementation
export function newImplementation() { ... }

// Phase 2: Deprecate old
/** @deprecated Use newImplementation instead */
export function oldImplementation() { ... }

// Phase 3: Remove old (separate PR)
```

## Testing Requirements

### Unit Tests

- [ ] All existing tests pass
- [ ] New tests for refactored code
- [ ] Performance benchmarks

### Integration Tests

- [ ] End-to-end functionality unchanged
- [ ] No regressions in related systems

### Verification Commands

```bash
# Run full test suite
npm test

# Run performance benchmarks
npm run benchmark

# Check code quality
npm run lint
npm run complexity

# Verify no regressions
npm run test:regression
```

## Definition of Done

- [ ] All acceptance criteria met
- [ ] No functional regressions
- [ ] Performance improvements verified
- [ ] Tests updated and passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Old code removed (if applicable)
- [ ] Team notified of changes

```

## Subtask Template

```markdown
# [Component] Implement [Specific Subtask]

Part of: [Parent Ticket ID]

## Scope

[Clear boundary of what this subtask covers]

## Acceptance Criteria

- [ ] [Specific deliverable]
- [ ] [Specific deliverable]
- [ ] [Tests written and passing]

## Implementation Notes

- Follow pattern in `path/to/example.ext`
- Ensure compatibility with [related subtask]

## Testing

```bash
# Verification command
npm test path/to/tests
```

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Integrated with parent ticket work

```
