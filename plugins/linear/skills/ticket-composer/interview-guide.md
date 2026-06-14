# Interview Guide

Complete question bank for gathering ticket information. Use targeted questions based on ticket type and context.

## Initial Questions (All Ticket Types)

1. "What type of ticket is this? (bug/feature/task/technical debt)"
2. "Can you provide a brief description of what needs to be done?"
3. "What's the current problem or opportunity?"
4. "Who are the primary users affected?"

## Clarifying Questions (As Needed)

- "Are there any technical constraints I should know about?"
- "What's the desired timeline or priority?"
- "Are there related tickets or documentation?"
- "What would success look like?"
- "Any specific files or components involved?"

## Bug-Specific Questions

### Reproduction

- "Can you provide steps to reproduce?"
- "What's the expected behaviour?"
- "What's the actual behaviour?"
- "How frequently does this occur?"
- "Is it environment-specific?"

### Context

- "Any error messages or logs?"
- "When did this start happening?"
- "Were there recent changes that might be related?"
- "Does it affect all users or specific conditions?"

### Investigation

- "Have you identified any potential causes?"
- "What have you already tried?"
- "Are there similar issues in the codebase?"

## Feature-Specific Questions

### User Impact

- "Who is the target user for this feature?"
- "What problem does this solve for them?"
- "How do users currently work around this?"

### Requirements

- "Are there specific acceptance criteria already defined?"
- "Any UI/UX mockups or designs?"
- "API requirements or contracts?"
- "Performance requirements?"

### Scope

- "What's in scope vs out of scope?"
- "Are there related features to consider?"
- "Any migration requirements?"
- "Feature flag or rollout strategy needed?"

## Technical Debt Questions

### Current State

- "What's the current problem with the code?"
- "How is this impacting development?"
- "What's the blast radius of changes?"

### Proposed Solution

- "What's the proposed improvement?"
- "Are there alternative approaches?"
- "What's the risk level?"

### Migration

- "Is there a migration path needed?"
- "Can this be done incrementally?"
- "What's the rollback strategy?"

## Task/Subtask Questions

### Scope

- "What specifically needs to be done?"
- "What's the parent ticket (if subtask)?"
- "Dependencies on other work?"

### Definition

- "How will we know when this is done?"
- "Estimated effort?"
- "Who should review?"

## Question Selection Strategy

### Minimal Interview (Agent Calls)

Skip interview entirely. Use provided context and make reasonable assumptions.

### Light Interview (Simple Tickets)

Ask only:

1. Type
2. Brief description
3. One type-specific question

### Full Interview (Complex Features/Bugs)

1. Start with initial questions
2. Add type-specific questions based on answers
3. Clarify technical constraints
4. Confirm understanding before generating

## Tips for Effective Interviewing

- **Don't over-interview**: 3-5 questions usually sufficient
- **Build on answers**: Use previous answers to inform next questions
- **Offer examples**: "For instance, steps like: 1. Go to login, 2. Enter credentials..."
- **Confirm critical details**: Repeat back key requirements before generating
- **Make assumptions explicit**: "I'll assume X unless you tell me otherwise"
