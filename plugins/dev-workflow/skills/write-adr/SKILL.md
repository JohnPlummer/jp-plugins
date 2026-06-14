---
name: write-adr
description: |
  Write a MADR 4.0.0 architecture decision record into the target repo's docs/decisions/.
  Use when a significant, hard-to-reverse decision needs recording, or when the build
  workflow surfaces a discovered decision to ratify. Handles next-number scanning, the
  filename slug, and the index deterministically via a helper script. Not for work-log
  decisions (reversible chose-A-over-B notes) -- those go to Linear comments.
---

# write-adr

Create a MADR 4.0.0 ADR in the target repo. The mechanics (consecutive 4-digit
numbering, filename slug, frontmatter date, index regeneration) are deterministic and
handled by `scripts/adr.sh` -- never hand-number or guess the next ADR number. You write
the decision *content*.

## When to use

- A hard-to-reverse / architecturally significant decision (API shape, data format,
  dependency choice, bounded-context boundary).
- A decision the build workflow returned for ratification (`status: needs-ratification`).
- An already-forced decision captured up front in the plan phase (status `proposed`,
  flipped to `accepted` at the approval gate).

Do NOT use for reversible work-log decisions ("chose a regex over a parser") -- those are
Linear comments, per the ticket-workflow standard.

## Process

1. **Resolve the target repo path** (the repo being worked on, not the plugin).

2. **Create the file** with the helper (it computes the next number, slug, date, and
   regenerates the index, then prints the path):

   ```sh
   "$CLAUDE_PLUGIN_ROOT/skills/write-adr/scripts/adr.sh" new \
     --repo <repo-path> \
     --title "<short decision title>" \
     [--status proposed|accepted] \
     [--deciders "name, name"]
   ```

   Default status is `proposed`. The file lands at `docs/decisions/NNNN-slug.md`.

3. **Fill the body** by editing the created file. Replace every `{placeholder}`:
   - **Context and Problem Statement** -- what forces the decision (2-3 sentences or a short story; link the ticket/PR).
   - **Decision Drivers** -- the forces/criteria.
   - **Considered Options** -- the real alternatives (at least two).
   - **Decision Outcome** -- the chosen option and *why* (which driver it satisfies).
   - **Consequences** -- good and bad, honestly.
   - Optional: **Confirmation** (how compliance is verified), **Pros and Cons of the
     Options**, **More Information**.
   Remove sections you genuinely don't need; don't leave `{placeholder}` text behind.

4. **Set the status correctly** (see lifecycle). A discovered-but-reversible decision is
   `proposed`; a ratified one is `accepted`.

5. **Regenerate the index** if you edited a title/status after creation:

   ```sh
   "$CLAUDE_PLUGIN_ROOT/skills/write-adr/scripts/adr.sh" index --repo <repo-path>
   ```

## Status lifecycle

`proposed -> accepted -> (deprecated | superseded by ADR-NNNN)`; use `rejected` for an
option that was considered and not taken. When superseding, set the old ADR's status to
`superseded by ADR-NNNN` and add a back-link in the new one.

## Notes

- Template: `templates/madr.md` (bundled; the script copies it).
- `docs/decisions/README.md` is the generated index -- don't hand-edit it; rerun `index`.
- Numbering is by filename scan, so concurrent ADRs in one run must be created
  sequentially (the script enforces uniqueness and errors on collision).
