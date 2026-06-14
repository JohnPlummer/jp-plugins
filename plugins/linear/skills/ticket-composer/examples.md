# Ticket Examples

Real-world examples of well-structured tickets.

## Example 1: Bug Ticket

```markdown
# [Auth] Fix JWT validation failing for concurrent requests

## Context

### Current State

JWT token validation middleware validates tokens synchronously but uses a shared cache without proper locking. Under high load with concurrent requests, this causes race conditions.

### Problem Details

- **Specific Issue**: Middleware occasionally returns 401 Unauthorized for valid tokens during high traffic periods
- **Impact**: Affects 2-5% of requests during peak hours (100-250 failed requests/hour). Users see intermittent login failures.
- **Root Cause**: Race condition in token cache when multiple requests validate the same token simultaneously
- **Environment**: Production only, occurs at >1000 req/min load

### Dependencies

- **Technical**: `auth-middleware` package v2.3.1, Redis cache cluster
- **Team**: None

## Reproduction Steps

1. Generate valid JWT token: `curl -X POST /api/auth/login -d '{"user":"test","pass":"test123"}'`
2. Make 100 concurrent requests with same token: `ab -n 100 -c 100 -H "Authorization: Bearer $TOKEN" http://api/protected`
3. Observe 2-5 requests fail with 401 status

**Expected Result**: All 100 requests succeed with 200 status
**Actual Result**: 2-5 requests fail with 401 Unauthorized error

## Error Messages/Logs

```

[ERROR] auth-middleware: Token validation failed - cache miss during validation
[ERROR] jwt-validator: Signature verification failed for token prefix eyJhbG...
[WARN] redis-client: Concurrent modification detected on key auth:token:abc123

```

## Acceptance Criteria

### Functional Requirements

- [ ] All valid tokens validate successfully under concurrent load
- [ ] No 401 errors for valid tokens during load testing
- [ ] No performance degradation from fix

### Technical Requirements

- [ ] Implement proper locking mechanism for cache access
- [ ] Add retry logic for cache read failures
- [ ] Maintain <10ms p95 validation latency

### Edge Cases

- [ ] Handles expired tokens correctly under load
- [ ] Handles cache unavailability gracefully
- [ ] Works with token refresh during validation

## Technical Details

### Investigation Areas

1. Check `src/middleware/auth.ts` for cache access patterns
2. Verify Redis connection pooling in `src/config/redis.ts`
3. Review token validation flow in `src/services/jwt-validator.ts`
4. Check for similar race conditions in other middleware

### Key Files

- `src/middleware/auth.ts` - Main authentication middleware with cache logic
- `src/services/jwt-validator.ts` - JWT validation service
- `src/config/redis.ts` - Redis client configuration
- `tests/integration/auth.test.ts` - Integration tests to update

### Patterns to Follow

- Look at `src/middleware/rate-limiter.ts` for proper Redis locking pattern
- Follow error handling pattern in `src/middleware/error-handler.ts`
- Use distributed lock from `src/utils/redis-lock.ts`

## Testing Requirements

### Unit Tests

- [ ] Add test for concurrent token validation
- [ ] Test cache miss scenarios
- [ ] Test lock acquisition and release

### Integration Tests

- [ ] Test with actual Redis instance
- [ ] Simulate high concurrent load (100+ requests)
- [ ] Verify no race conditions under load

### Verification Commands

```bash
# Run auth middleware tests
npm test src/middleware/auth.test.ts

# Run integration tests
npm run test:integration -- auth

# Load test the endpoint
k6 run tests/load/concurrent-auth.js

# Verify Redis locks
redis-cli KEYS "lock:auth:*"
```

### Manual Testing Steps

1. Start local Redis: `docker-compose up redis`
2. Start API server: `npm run dev`
3. Generate test token: `npm run auth:test-token`
4. Run load test: `ab -n 1000 -c 100 -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/protected`
5. Verify zero 401 errors in output
6. Check Redis for no stuck locks: `redis-cli KEYS "lock:*"`

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Root cause documented in ticket comments
- [ ] Tests written and passing (including load tests)
- [ ] Code reviewed and approved
- [ ] No new linting errors
- [ ] Monitoring added for cache lock contention
- [ ] Deployed to staging and verified under load

```

## Example 2: Feature Ticket

```markdown
# [API] Add rate limiting per API key with Redis backend

## User Story

As an API product manager
I want to enforce rate limits per API key
So that we can prevent abuse and ensure fair usage across all customers

## Context

### Current State

API has no rate limiting. All customers can make unlimited requests, leading to:

- Service degradation during traffic spikes from single customer
- No way to enforce tier-based usage limits
- No visibility into per-customer usage patterns

### Business Value

- **Primary Benefit**: Protect service availability for all customers
- **User Impact**: All 500+ API customers, prevents service degradation
- **Strategic Alignment**: Required for paid tier launch Q2 2024

### Dependencies

- **Technical**: Redis cluster (already deployed), API key authentication (in place)
- **Team**: None
- **External**: None

## Acceptance Criteria

### Functional Requirements

- [ ] Rate limits enforced per API key across all endpoints
- [ ] Different limits for free tier (100 req/min) and paid tier (1000 req/min)
- [ ] Rate limit headers returned in all API responses
- [ ] Clear error message when limit exceeded

### Technical Requirements

- [ ] Use Redis for distributed rate limiting
- [ ] p95 latency increase <5ms per request
- [ ] Handle Redis unavailability gracefully (fail open with logging)
- [ ] Support burst allowance of 2x sustained rate for 10 seconds

### Edge Cases

- [ ] Multiple API servers increment same counter correctly
- [ ] Rate limits reset at correct intervals
- [ ] Invalid API keys don't cause rate limiter errors
- [ ] Works during Redis failover

## Technical Details

### Implementation Approach

1. Add rate limiting middleware before authentication
2. Implement sliding window counter using Redis
3. Store limits in database, cache in Redis
4. Return standard rate limit headers (X-RateLimit-*)
5. Add admin API to adjust limits per key

### Key Files

- `src/middleware/rate-limiter.ts` - New rate limiting middleware
- `src/services/rate-limit-service.ts` - Rate limit business logic
- `src/models/api-key.ts` - Add rate limit fields to model
- `src/config/rate-limits.ts` - Rate limit configuration
- `migrations/20240115_add_rate_limits.sql` - Database migration

### Patterns to Follow

- Look at `src/middleware/auth.ts` for middleware structure
- Follow Redis pattern in `src/services/cache-service.ts`
- Use error handling from `src/middleware/error-handler.ts`

## Testing Requirements

### Unit Tests

- [ ] Test rate limit calculation logic
- [ ] Test sliding window counter
- [ ] Test tier-based limit lookup
- [ ] Test header generation

### Integration Tests

- [ ] Test with real Redis instance
- [ ] Test limit enforcement across requests
- [ ] Test limit reset timing
- [ ] Test Redis failover handling

### Verification Commands

```bash
# Run rate limiter tests
npm test src/middleware/rate-limiter.test.ts

# Run integration tests
npm run test:integration -- rate-limit

# Load test rate limiting
k6 run tests/load/rate-limit.js
```

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Tests written and passing (>80% coverage)
- [ ] Code reviewed and approved
- [ ] Feature flag implemented
- [ ] Documentation updated
- [ ] Performance requirements met (<5ms latency increase)
- [ ] No new linting errors

```

## Example 3: Subtask

```markdown
# [API] Implement Redis sliding window rate limiter

Part of: PROJ-456 (Add rate limiting per API key)

## Scope

Implement the core sliding window rate limiting algorithm using Redis. This subtask covers only the rate limit calculation logic, not the middleware integration.

## Acceptance Criteria

- [ ] Sliding window counter implemented using Redis sorted sets
- [ ] Supports configurable time windows (minute, hour, day)
- [ ] Returns correct limit, remaining, and reset time
- [ ] Handles Redis errors gracefully (returns default values)
- [ ] Performance: <2ms per rate limit check

## Implementation Notes

Key algorithm:

1. Use Redis sorted set with timestamps as scores
2. Remove expired entries outside window
3. Count remaining entries
4. Add current request
5. Return limit status

Follow pattern in `src/services/cache-service.ts` for Redis client usage.

## Testing

### Unit Tests

```bash
npm test src/services/rate-limiter.test.ts
```

Tests should cover:

- [ ] Basic rate limit enforcement
- [ ] Window sliding behaviour
- [ ] Concurrent requests
- [ ] Redis error handling

### Integration Tests

```bash
npm run test:integration -- rate-limiter
```

## Files to Create

- `src/services/sliding-window-limiter.ts` - Implementation
- `src/services/sliding-window-limiter.test.ts` - Unit tests
- `tests/integration/rate-limiter.integration.test.ts` - Integration tests

## Definition of Done

- [ ] Implementation complete and tested
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Performance verified <2ms per check
- [ ] Ready for middleware integration (next subtask)

```
