---
name: technical-design
description: |
  Interview, brainstorm, then draft a Technical Design doc into the target repo's
  docs/design/. Use whenever someone needs to write up how a new service or significant
  change will be built before coding - a design doc, architecture doc, or "how are we
  going to build X" write-up - even if they don't say "Technical Design". Significant means
  it touches personal data or payments, adds/changes an external integration, changes the data
  model, or alters the auth/security boundary. Produces the design a reviewer signs off by
  PR approval and the build is later verified against. Not for reversible decisions (use the
  adr skill), the thin behavioural plan the build consumes (use the plan skill), or the
  product spec (PRD, which stays upstream in Word).
---

# technical-design

Take a change from "we should build this" to a committed Technical Design doc a reviewer
can sign off. Three phases: **interview** the problem, **brainstorm** the design, then
**draft** the doc. The file mechanics (slug, location, template) are deterministic and
handled by `scripts/technical-design.sh` -- you do the interview, the brainstorm, and the
writing.

A Technical Design captures *how* a service or significant change will be built --
architecture, data, security, performance, cost, operability -- so a reviewer can sign it
off and the build can be verified against it later. It sits between the product spec and
the Build in the delivery lifecycle.

Always spell it out as **"Technical Design"**. Never abbreviate to "TDD" -- that collides
with test-driven development, which is what the build workflow actually does.

## When to use

Write one for:

- A **new service**.
- A **significant change**: one that touches personal data or payments, adds or changes an
  external integration, changes the data model, or alters the security/auth boundary.

Anything smaller needs no Technical Design -- record any notable decision as an ADR (the
`adr` skill) instead. If you are unsure whether the change qualifies, ask the human before
drafting; a Technical Design for a trivial change is wasted ceremony, and a missing one for
a personal-data/payments/auth change is a real gap.

## Process

### 0. Resolve the canonical way of working

The rules below are a fallback copy. The authoritative version is the engineering wiki this machine points at, resolved from `$DEV_WORKFLOW_WIKI_PATH` -- never a hardcoded path, so a personal wiki and a team wiki can differ on the same machine's plugin.

```sh
[ -n "$DEV_WORKFLOW_WIKI_PATH" ] && cat "$DEV_WORKFLOW_WIKI_PATH/ways-of-working/technical-design.md"
```

If it resolves, read it and let it win on every conflict with this skill (triggers, sections, lifecycle, sign-off, template). If the variable is unset or the file is absent, use the rules below unchanged and say which you used.

### 1. Confirm a Technical Design is warranted

Check the change against the "When to use" test above. If it does not qualify, stop and
point the human at the `adr` skill (or `plan` for build behaviour). If it does, name the
change and continue.

### 2. Resolve where it lives

- **Monorepo**: the design lives at the repo root `docs/design/`, alongside
  `docs/decisions/` (a design commonly spans several projects, so it sits at root, not
  colocated under one).
- **Multi-repo**: colocate it in the relevant service repo's `docs/design/`.

Resolve the target repo path (the repo being worked on, not the plugin).

### 3. Interview for the problem

Read any upstream input first -- the PRD, the Linear ticket and its comments, the code the
change touches. Then interview the human to pin down, at minimum:

- **What** is being built or changed, and **why** (the problem, not the solution).
- **Scope, non-goals, and blast radius** -- what this deliberately does *not* do.
- **Which trigger** makes it significant (PII, payments, integration, data model, auth
  boundary) -- this tells you which sections must go deep.
- **Constraints already fixed** -- existing systems, deadlines, budget, compliance.

Ask, don't assume. The interview is where the load-bearing sections are decided.

### 4. Brainstorm the design

Before writing, drive out real options on the sections that bite for this change. Do not
settle on the first architecture. For each load-bearing dimension (usually Architecture,
Data, Security, sometimes Performance/Cost):

- Surface at least two genuine alternatives and the tradeoff between them.
- Name the failure modes and the risks, and how each option handles them.
- Reach a recommendation with the *reason* (which constraint or driver it satisfies).

For any decision that is hard to reverse (API shape, data format, dependency choice,
bounded-context boundary), run the `adr` skill (status `proposed`) and link the ADR from
the design rather than re-arguing it inline. If you want a structured divergent pass on a
gnarly section, the `brainstorm` skill can drive it; otherwise brainstorm inline here.

### 5. Create the doc

```sh
"$CLAUDE_PLUGIN_ROOT/skills/technical-design/scripts/technical-design.sh" new \
  --repo <repo-path> \
  --title "<service or change name>" \
  [--owner "<name>"] \
  [--dir docs/design]
```

It writes `docs/design/<slug>.md` from the bundled template at the plugin root
(`templates/technical-design.md`, i.e. `$CLAUDE_PLUGIN_ROOT/templates/technical-design.md`)
and prints the path. `--dir` overrides the location for a non-standard layout; default is
`docs/design`.

### 6. Fill the doc

Edit the created file, replacing every `{placeholder}`. The nine sections are: Overview,
Architecture, Data, Security, Performance & Scale, Cost, Reliability & Operability, Delivery
& Release, Risks & Open Questions.

Fill each to a depth **proportionate to the change**. A new service warrants every section
in full. A smaller significant change may leave most sections at a line and go deep only
where it bites -- but write **"no change"** or **"n/a"** explicitly rather than deleting a
section, so the reviewer can see it was considered, not forgotten. Carry the interview and
brainstorm findings into the relevant sections; link ADRs from Architecture; link the PRD
from Overview.

### 7. Hand off for sign-off

- **Team repo**: sign-off is by **pull request approval** -- the approver and the merge are the record. Output the design file path so it can be committed and raised as a PR.
- **Solo repo**: there is no approver, so the design itself is the sign-off. It exists to make the human argue with themselves before the code makes the argument expensive. Say so: write it, sit on it, then build.

## Lifecycle

A Technical Design describes work that has not happened yet, so the build has to retire it. Every design carries a **Status**, the only field edited after sign-off:

- **Proposed** -- written, not yet approved.
- **Accepted** -- approved, not yet built.
- **Built** -- the change has shipped.
- **Superseded** -- replaced by a later design. Link to it.
- **Abandoned** -- never built. Say why in a line.

The change that builds a design retires it: move the file to `docs/design/archived/`, set Status to Built with a link to the commit or PR, and fold whatever is still true into `docs/architecture/` or a runbook. Designs are archived, never deleted -- the built system is verified against the design that was committed to. A search result shows the file, not the folder, so an archived design's header has to say the work is done and link to the page that now describes the system.

## Notes

- Canonical standard: `ways-of-working/technical-design.md` in the wiki at `$DEV_WORKFLOW_WIKI_PATH` (see step 0). That page wins; this skill is the offline fallback. Do not hardcode a wiki path or repo name here -- the variable is what lets a personal wiki and a team wiki diverge.
- Template: `templates/technical-design.md` at the plugin root (bundled; the script copies it). Nine fixed sections -- keep the section set and order so a downstream readiness check can map onto them.
- Designs are named by slug, with no numbering or index (unlike ADRs). Re-running `new`
  with the same title errors rather than clobbering an existing design.
- The upstream PRD is a product spec for a broader audience and stays in Word -- this skill
  never writes or edits the PRD.

## Gotchas

Populate from real failure modes as they surface. None recorded yet.
