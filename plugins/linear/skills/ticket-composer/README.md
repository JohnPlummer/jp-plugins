# Ticket Composer

Composes comprehensive ticket content with LLM-optimised structure.

## Usage

Trigger this skill when:

- Creating any new Linear ticket
- User says "create a ticket", "file a bug", "log an issue"
- Need help composing well-structured ticket content
- Before calling linear:linear to create tickets

## Structure

- **SKILL.md** - Main skill instructions, workflow, and core guidelines
- **templates.md** - Complete ticket templates for bug/feature/debt/subtask
- **examples.md** - Real-world examples of well-structured tickets
- **interview-guide.md** - Question bank for gathering requirements
- **README.md** - This file

## Key Features

- Interactive interview mode when called by users
- Automated mode when called by other agents
- LLM-optimised phrasing and structure
- Comprehensive sections: Context, Acceptance Criteria, Technical Details, Testing
- Type-specific templates for different ticket types
- Quality checks before output

## Integration

Always use BEFORE linear:linear for ticket creation:

1. User requests ticket creation
2. ticket-composer gathers info and composes content
3. Content handed to linear:linear for actual Linear creation

## Context Mode

Uses `context: fork` to keep main conversation clean while composing tickets.
