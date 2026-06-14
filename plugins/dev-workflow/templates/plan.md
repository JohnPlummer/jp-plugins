# Plan - {TICKET}: {feature title}

{One-line summary of the change.}

- **Ticket:** {link to the Linear ticket}
- **Ceremony tier:** {light | full}

## Approach

{Coarse approach and the vertical slices, in a few sentences. Prefer the smallest
in-slice diff. This is NOT implementation or architecture design - that emerges during
the build (red -> green -> refactor). Only behaviour is fixed here.}

## Work items

Each item below becomes one red -> green -> refactor -> judge cycle in the build workflow.
The build reads each item's id (the `### {TICKET}-x` heading), its short desc, and its
**Spec** block (the acceptance criteria the test-author works from).

### {TICKET}-a - {short desc}

{Optional one-line context.}

**Spec (acceptance criteria):**

- {BDD-style criterion: Given/When/Then, or a plain observable behaviour}
- {criterion}

Worked examples (input -> output):

- {input} -> {output}

Out of scope (YAGNI): {what this item explicitly does not do}

<!-- repeat the ### {TICKET}-x block per work item; keep items small and vertical -->

## Known decisions (proposed ADRs)

{ONLY decisions already forced before any code - e.g. "uses Linear", "lives in bounded
context X". Most decisions are discovered during the build, not here. One line each;
the actual ADR file goes in docs/decisions/ via the adr skill, status `proposed`.}

- ADR-{NNNN}: {title} (proposed) - {one-line rationale}

## Notes

{Anything the implementer needs that isn't an acceptance criterion.}
