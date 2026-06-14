---
name: ticket-composer
description: Internal skill that composes ticket content with LLM-optimised structure. Called by the linear skill for creates and content updates. NOT for direct invocation.
context: fork
user-invocable: false
---

# Ticket Composer

## Template Reference

Other commands and skills should read the template files in this skill directory for structure and format guidance rather than duplicating format rules inline. The source of truth for ticket structure lives here:

- `${CLAUDE_PLUGIN_ROOT}/skills/ticket-composer/templates.md` - Full ticket templates by type
- `${CLAUDE_PLUGIN_ROOT}/skills/ticket-composer/examples.md` - Real-world examples
- `${CLAUDE_PLUGIN_ROOT}/skills/ticket-composer/interview-guide.md` - Question bank for gathering requirements

All ticket content must be **GitHub-flavoured markdown**. Linear renders markdown natively.

---

## Fast Path (Pre-Composed Content)

**BEFORE doing any work**, check if the input already contains fully-composed content.

### Fast Path Criteria

Content is "pre-composed" if it has ALL of these:

1. A title/summary with `[Component]` prefix pattern
2. At least ONE of: "User Story", "Context", "Problem", "Description" section
3. At least ONE of: "Acceptance Criteria", "Requirements", "Definition of Done" section

### Fast Path Action

If content meets fast path criteria, return the content AS-IS. Do NOT:

- Re-research the codebase
- Re-structure the content
- Add additional sections
- Ask clarifying questions

Just extract the fields and return immediately.

### Fast Path Output

```json
{
  "fast_path": true,
  "title": "[extracted from input]",
  "type": "[extracted or inferred]",
  "description": "[the full input content]",
  "team": "[extracted or default team]",
  "priority": "[extracted or default]",
  "labels": "[extracted or empty]"
}
```

---

## Standard Path (Content Needs Composition)

Only proceed here if fast path criteria NOT met.

### Core Responsibilities

1. **Compose Comprehensive Content**: Generate all required sections following best practices
2. **Optimise for LLM Implementation**: Use phrasing that helps LLMs succeed
3. **Interview When Needed**: Ask clarifying questions when user context is incomplete
4. **Output Ready-to-Use Content**: Provide Markdown format for linear:linear

### Caller Detection

**Interactive Mode (User Requests)**

When user says "create a ticket", "help me write", etc:

1. Gather essential information through targeted questions
2. Ask only what's missing, avoid over-interviewing
3. Confirm understanding before generating content
4. Show generated content for review

**Automated Mode (Agent Calls)**

When called by another agent with structured requirements:

1. Extract all provided context
2. Generate content based on available information
3. Make reasonable assumptions for missing details
4. Return structured output immediately

### Ticket Components

Every ticket includes:

1. **Title**: `[Component/Area] Action + Specific Outcome` (8-15 words)
2. **User Story**: As a / I want / So that (for features)
3. **Context**: Current state, problem details, dependencies
4. **Acceptance Criteria**: Functional, technical, edge cases (checkboxes)
5. **Technical Details**: Approach, key files, investigation areas, patterns
6. **Testing Requirements**: Unit, integration, verification commands
7. **Definition of Done**: Checklist

For detailed templates by ticket type, see:
`${CLAUDE_PLUGIN_ROOT}/skills/ticket-composer/templates.md`

### Ticket Type Focus

| Type | Focus Areas |
|------|-------------|
| Bug | Reproduction steps, error logs, investigation hints, root cause hypotheses |
| Feature | User journey, API contracts, migrations, feature flags |
| Tech Debt | Current problems, proposed improvements, risk, migration path |

### LLM Optimisation

Use phrases that help LLM agents succeed:

- "First, explore the existing [pattern/implementation]"
- "Follow the pattern established in [file/component]"
- "Verify success by [specific test/check]"

Structure for success:

- Put critical information first
- Use checkboxes for trackable items
- Reference similar implementations
- Include verification commands

### Interview Process

**Essential Questions**

1. "What type of ticket? (bug/feature/task/tech debt)"
2. "Brief description of what needs to be done?"
3. "Current problem or opportunity?"

**For Bugs**

- Steps to reproduce?
- Expected vs actual behaviour?
- Error messages or logs?

For complete question bank, see:
`${CLAUDE_PLUGIN_ROOT}/skills/ticket-composer/interview-guide.md`

## Output Format

### For User Review

```markdown
# Ticket: [Title]

[Full ticket content in markdown format]

---

Ready to create? Pass this to linear:linear.
```

### For Agent Handoff

Return JSON with: title, type, description, team, priority, labels, project.

## Quality Checklist

- [ ] Title clearly describes outcome
- [ ] All sections present
- [ ] Acceptance criteria specific and testable
- [ ] Technical details include file paths
- [ ] Testing includes verification commands
- [ ] Content under 2000 words

## Integration

**linear:linear handoff**: End with "Composed ticket content. Pass to linear:linear to create."

**implement-ticket calls**: Generate subtask content automatically, maintain parent consistency, return batch JSON.

## Important Notes

- **Fast path first** - always check before doing work
- **Compose only** - never create tickets directly
- **Markdown format** - `## Heading`, `**bold**`, `- item`
- **LLM optimisation** - default unless told otherwise
- **When in doubt, ask** - better to clarify than assume (standard path only)

## Reference Materials

- `${CLAUDE_PLUGIN_ROOT}/skills/ticket-composer/templates.md` - Full ticket templates
- `${CLAUDE_PLUGIN_ROOT}/skills/ticket-composer/examples.md` - Real-world examples
- `${CLAUDE_PLUGIN_ROOT}/skills/ticket-composer/interview-guide.md` - Complete question bank
