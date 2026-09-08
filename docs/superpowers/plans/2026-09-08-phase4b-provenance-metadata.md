# Phase 4b: Provenance Metadata (`source_type`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one new frontmatter field, `source_type`, to the vault's
note-template seed and to the three note-writing skills'
(`capture`/`defuddle`/`autoresearch`) write steps, so every newly
created note carries a cheap, always-populated signal for how it
entered the vault (`pasted` / `file` / `web` / `research`) — without
adding fields that would sit blank in every note this project's skills
actually write.

**Architecture:** One shared reference doc
(`skills/capture/references/note-format.md`) documents the field and
its four allowed values once, since all three skills already read it
before writing a note. Each skill's existing "write the note" step gets
a one-line addition naming its own fixed value. No code, no new files —
pure instruction-file edits, verified by hand-running each skill's
filing step against a scratch vault, the same way the original
capture/organize/ask and defuddle/autoresearch plans verified their own
instruction changes (there's no code to unit test).

**Tech Stack:** None — Markdown instruction files only.

**Spec:** [docs/superpowers/specs/2026-08-25-context-engineering-experiment.md](../specs/2026-08-25-context-engineering-experiment.md)
section "Source provenance" (scoped down from its suggested 5 fields to
just `source_type` — see Global Constraints) and "Agent write
boundaries". Phase context:
[2026-08-25-context-engineering-roadmap.md](2026-08-25-context-engineering-roadmap.md)
Phase 4's second bullet.

## Global Constraints

- **Scope decision:** only `source_type` is added (values: `pasted`,
  `file`, `web`, `research`). The spec's other suggested fields —
  `captured_at`, `author`, `source_url`, `original_file` — are
  deliberately dropped: they'd sit blank in every note this repo's
  skills actually write today, and the existing `source:` field already
  carries the path/URL/"pasted" reference `source_url`/`original_file`
  would duplicate. This is a product decision, not an oversight.
- The existing `source:` field is unchanged — `source_type` is additive,
  one new frontmatter line.
- Only affects notes newly created going forward. Existing notes with
  the old frontmatter shape are not migrated or rewritten — per "Agent
  write boundaries," this plan does not rewrite existing notes.
- `skills/ask/SKILL.md` and `skills/organize/SKILL.md` are **not**
  modified — this only touches the three skills that create notes and
  the shared reference they all read.
- `eval/vault/templates/note-template.md` and every other eval fixture
  are **not** modified — this is a product change to the live skills,
  matching the roadmap's exact wording ("touches
  `skills/capture/references/note-format.md` and all three `SKILL.md`
  files"), not the eval harness.

---

### Task 1: Update the shared note-format reference

**Files:**
- Modify: `skills/capture/references/note-format.md`

**Interfaces:** none (documentation only) — produces the field
definition Tasks 2-4 point back to via
`references/note-format.md#note-format` /
`../capture/references/note-format.md#note-format`.

- [ ] **Step 1: Add `source_type` to the seeded template**

In `skills/capture/references/note-format.md`, find the seed code block
under "## Note format" (currently):

```markdown
```markdown
---
created: {{date}}
tags: []
source:
---

# {{title}}

## Idea

...

## Connections

- [[Related note]] — why it's connected
```
```

Replace it with:

```markdown
```markdown
---
created: {{date}}
tags: []
source:
source_type:
---

# {{title}}

## Idea

...

## Connections

- [[Related note]] — why it's connected
```
```

- [ ] **Step 2: Document the field in the "Source role" bullet**

Find this bullet under "Work off three *roles*":

```markdown
- **Source role** (seed: `source:` frontmatter) — the original file
  path, URL, or "pasted".
```

Replace it with:

```markdown
- **Source role** (seed: `source:` and `source_type:` frontmatter) —
  `source:` holds the original file path, URL, or "pasted"; `source_type:`
  is always exactly one of `pasted` (inline text or a summary handed in
  conversation), `file` (a local document or image `capture` copied
  into `attachments/`), `web` (`defuddle`), or `research`
  (`autoresearch`) — each skill fills in its own fixed value, so this
  stays a cheap, always-populated signal for how a note entered the
  vault rather than another field that's usually blank.
```

- [ ] **Step 3: Verify the edit**

Read the file back and confirm: the seed code block has exactly two
`source`-related lines (`source:` then `source_type:`), and the "Source
role" bullet is the only place describing `source_type`'s four allowed
values (so Tasks 2-4 can link to it instead of repeating the list).

- [ ] **Step 4: Commit**

```bash
git add skills/capture/references/note-format.md
git commit -m "feat: add source_type provenance field to the shared note-format reference"
```

---

### Task 2: `capture`'s write step populates `source_type`

**Files:**
- Modify: `skills/capture/SKILL.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Edit step 7 ("Write the note")**

Find:

```markdown
7. **Write the note** using the template's current roles: source,
   content (a summary in the user's own words, not a copy — one full
   note, never split into several), and connections if anything is
   genuinely related. If there's an attachment, embed it in the content
   role with `![[attachments/<filename>]]`.
```

Replace with:

```markdown
7. **Write the note** using the template's current roles: source,
   `source_type` (`pasted` for inline text or a summary handed in
   conversation, `file` for a local document or image path — per
   [Source role](references/note-format.md#note-format)), content (a
   summary in the user's own words, not a copy — one full note, never
   split into several), and connections if anything is genuinely
   related. If there's an attachment, embed it in the content role with
   `![[attachments/<filename>]]`.
```

- [ ] **Step 2: Commit**

```bash
git add skills/capture/SKILL.md
git commit -m "feat: capture populates source_type on every note it writes"
```

---

### Task 3: `defuddle`'s write step populates `source_type`

**Files:**
- Modify: `skills/defuddle/SKILL.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Edit step 3 under "File as a note"**

Find:

```markdown
3. Write the note using the current template's roles: source (the
   HTTPS URL), content holding the cleaned page's key points or a
   short excerpt — not the full cleaned page verbatim unless it's
   already short — and connections if anything is genuinely related.
   Keep the original cleaned Markdown available in the conversation in
   case the user wants more of it; don't dump the entire page into the
   vault by default.
```

Replace with:

```markdown
3. Write the note using the current template's roles: source (the
   HTTPS URL), `source_type: web` (per
   [Source role](../capture/references/note-format.md#note-format)),
   content holding the cleaned page's key points or a short excerpt —
   not the full cleaned page verbatim unless it's already short — and
   connections if anything is genuinely related. Keep the original
   cleaned Markdown available in the conversation in case the user
   wants more of it; don't dump the entire page into the vault by
   default.
```

- [ ] **Step 2: Commit**

```bash
git add skills/defuddle/SKILL.md
git commit -m "feat: defuddle populates source_type: web on filed notes"
```

---

### Task 4: `autoresearch`'s write step populates `source_type`

**Files:**
- Modify: `skills/autoresearch/SKILL.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Edit step 3 under "File the dossier"**

Find:

```markdown
3. Write each note using the current template's roles: source
   (`autoresearch`, with the primary source URLs listed in the content
   instead, since a dossier draws on several), content holding the
   evidence-honest findings from the step above ending with a short
   "Sources" list (URL, title, date) for what was actually cited, and
   connections if genuinely related.
```

Replace with:

```markdown
3. Write each note using the current template's roles: source
   (`autoresearch`, with the primary source URLs listed in the content
   instead, since a dossier draws on several), `source_type: research`
   (per [Source role](../capture/references/note-format.md#note-format)),
   content holding the evidence-honest findings from the step above
   ending with a short "Sources" list (URL, title, date) for what was
   actually cited, and connections if genuinely related.
```

- [ ] **Step 2: Commit**

```bash
git add skills/autoresearch/SKILL.md
git commit -m "feat: autoresearch populates source_type: research on filed notes"
```

---

### Task 5: Verify all three skills against scratch vaults

**Files:** none (throwaway scratch vaults only, outside the repo — no
commit for this task).

- [ ] **Step 1: Build a scratch vault**

Create a scratch vault skeleton somewhere outside the repo (e.g. the
session scratchpad directory), with `inbox/`, `notes/`, `projects/`,
`indexes/`, `templates/`, `attachments/` subfolders, matching
[the vault layout](../../../skills/capture/references/note-format.md#vault-layout).
Do not pre-create `templates/note-template.md` — the skills create it
from the seed on first use, which is itself a check that Task 1's seed
edit is what actually gets written.

- [ ] **Step 2: Hand-run `capture` on pasted text**

Follow `skills/capture/SKILL.md`'s steps yourself against the scratch
vault with a pasted-text source, e.g. "MCP tool descriptions should be
treated as untrusted input." Confirm:

- `templates/note-template.md` was created with the `source:` +
  `source_type:` seed from Task 1.
- The written note's frontmatter has `source_type: pasted`.

- [ ] **Step 3: Hand-run `capture` on a local file**

Create a throwaway local `.txt` file with a paragraph of content, then
hand-run `capture` against that file path into the same scratch vault.
Confirm the written note's frontmatter has `source_type: file`.

- [ ] **Step 4: Hand-run `defuddle`'s filing step only**

Skip the network-fetch half (no live URL fetch needed to test this
plan's change — same precedent as the original defuddle plan's own
verification, which tested the filing step with already-cleaned
content). Using a canned short paragraph as if it were already
Defuddle-cleaned Markdown from some URL, hand-run
`skills/defuddle/SKILL.md`'s "File as a note" section against the
scratch vault. Confirm the written note's frontmatter has
`source_type: web` and `source:` holding the (canned) HTTPS URL.

- [ ] **Step 5: Hand-run `autoresearch`'s filing step only**

Skip the research loop (no live web access needed to test this plan's
change). Using one canned short "finding" paragraph with a fabricated
source citation as if a research loop had already produced it,
hand-run `skills/autoresearch/SKILL.md`'s "File the dossier" section
against the scratch vault. Confirm the written note's frontmatter has
`source_type: research`.

- [ ] **Step 6: Delete the scratch vault**

Remove the scratch vault directory — it's throwaway verification
output, not committed anywhere.

---

## Self-review notes

- **Spec coverage:** "Source provenance"'s core ask — distinguishing
  "their own synthesis; external source material; research generated by
  the agent" — is fully covered by `source_type`'s four values (`pasted`
  covers "their own synthesis," `file`/`web` cover "external source
  material," `research` covers "research generated by the agent"). The
  spec's other four suggested fields are explicitly, not silently,
  scoped out (see Global Constraints). "Agent write boundaries" is
  respected: no existing note is rewritten by this plan.
- **Placeholder scan:** every task has exact find/replace text (no
  "similar to Task N," no TBD).
- **Type consistency:** all three skills' new frontmatter line uses the
  identical field name `source_type` and the identical four-value
  vocabulary defined once in Task 1, referenced (not restated) by Tasks
  2-4.

## Execution handoff

Two ways to execute this plan:

1. **Subagent-driven (recommended)** — a fresh subagent per task, with review between tasks.
2. **Inline execution** — run tasks in this session with checkpoints.
