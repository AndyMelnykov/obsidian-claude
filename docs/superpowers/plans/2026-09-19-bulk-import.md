# Bulk-import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `bulk-import`, a new skill that files many sources — a directory, an inline list of paths/URLs, or a listing file — in one run, reusing `capture`'s and `defuddle`'s existing per-item rules without changing either of them.

**Architecture:** One new skill file, `skills/bulk-import/SKILL.md`, that resolves the vault the same way `capture` does, builds a source list from a directory/inline-list/listing-file, gets one upfront batch consent for any URLs, then walks the sources one at a time applying `capture`'s existing per-item steps (skipping its master-index step) and `defuddle`'s fetch-and-clean step for URLs, with two bulk-specific overrides (skip on collision, default ambiguous placement to `inbox/`) instead of asking. Regenerates `indexes/README.md` once at the end. No new files inside `capture` or `defuddle`; the primary docs (`README.md`, `AGENTS.md`, `INSTALL.md`) get updated to list the new skill, matching the precedent set when `defuddle`/`autoresearch` were added.

**Tech Stack:** Markdown-only Claude Code Agent Skills, same as the rest of the system. No scripts, no dependencies, no code to unit test.

**Spec:** [docs/superpowers/specs/2026-09-18-master-index-and-bulk-import-design.md](../specs/2026-09-18-master-index-and-bulk-import-design.md) — only its "`bulk-import` skill" section (and "Rejected: real fan-out parallelism" / the bulk-import parts of "Non-goals" and "Rejected"). The spec's "Master index" section is already implemented — see [docs/superpowers/plans/2026-09-18-master-index.md](2026-09-18-master-index.md).

## Global Constraints

- No database, no new persistent metadata store (ADR 001) — this skill is plain file reads/writes/copies, same as `capture`.
- No new retrieval infrastructure or `ask` hop (ADR 002) — `ask`'s contract does not change; this skill only writes notes.
- Tier (ADR 003): filing within an approved batch is autonomous, same as `capture`; any URL in the batch requires one upfront, per-batch network-egress consent (not per-source); an unreviewed Defuddle-style extractor requires one provenance/version confirmation per batch (not per source).
- Neither `capture` nor `defuddle`'s own `SKILL.md` changes — this skill reuses their existing rules by reference only (per the spec: "neither of those two skills changes").
- Sequential processing only, one source at a time — no real fan-out/parallelism (spec's "Rejected: real fan-out parallelism").
- No recursive directory expansion — a directory source expands one level only; a nested directory the user means to include must be named explicitly (spec's "Non-goals").
- A filename collision inside a bulk run is skipped and recorded, never asked. Genuinely ambiguous project-vs-note placement inside a bulk run defaults to `inbox/` and is recorded, never asked. Both are bulk-specific overrides to `capture`'s normal ask-first behavior; they apply only inside this skill.
- `indexes/README.md` regenerates once after the whole batch finishes, not once per item (spec step 5) — reuses the "Master index" regeneration rule already defined in `skills/capture/references/note-format.md#master-index`.
- No new ledger, transaction bundle, or persistent run log — the end-of-batch report in the conversation is the only record (spec's explicit rule, consistent with every other skill in this project).

---

### Task 1: Create the `bulk-import` skill

**Files:**
- Create: `skills/bulk-import/SKILL.md`

**Interfaces:**
- Consumes: `skills/capture/SKILL.md`'s numbered steps 3-8 and 10 (its step 9, master-index regeneration, is deliberately skipped per-item); `skills/capture/references/note-format.md`'s `#resolving-the-vault`, `#master-index`, `#indexes`, and `#folder-placement-notes-vs-projects-vs-inbox` anchors; `skills/defuddle/SKILL.md`'s `#safety-contract` and `#fetch-after-consent` sections.
- Produces: the `bulk-import` skill itself, which Task 5's manual verification exercises.

- [ ] **Step 1: Write the skill file**

Create `skills/bulk-import/SKILL.md` with exactly this content:

```markdown
---
name: bulk-import
description: "File many sources into the vault in one run — a directory, an inline list of paths/URLs in the request, or a listing file where each line is a path or URL — reusing capture's per-item write rules and defuddle's fetch/safety contract for any URLs, with one upfront batch consent for network egress. Use when the user hands Claude more than one source to file in a single request (e.g. 'import everything in this folder', a pasted list of links, a listing file) — not for a single source (use capture) or a research question (use autoresearch). Sequential processing only; collisions and ambiguous placement are skipped/defaulted rather than asked, so one bad item doesn't block the batch."
---

# Bulk-import many sources at once

Read [the note format and vault layout reference](../capture/references/note-format.md)
and [capture's SKILL.md](../capture/SKILL.md) first — this skill reuses
capture's per-item write rules almost unchanged and only adds a batch
wrapper around them. Also read
[defuddle's safety contract](../defuddle/SKILL.md#safety-contract) if the
batch has any URLs.

This skill files *many* sources in one pass. It does not run
automatically — only when the user hands Claude more than one source to
file: a directory ("import everything in this folder"), an inline list of
paths/URLs in the request text, or a plain text/Markdown file where each
line is a path or URL. A single source is `capture`'s job, not this
skill's; a research question to investigate (rather than a list of
sources to file as-is) is `autoresearch`'s job.

## Steps

1. **Resolve the vault** per
   [Resolving the vault](../capture/references/note-format.md#resolving-the-vault),
   the same way `capture` does. Create `inbox/`, `notes/`, `projects/`,
   `indexes/`, `templates/`, and `attachments/` in it if any don't already
   exist.
2. **Build the source list:**
   - **Directory:** list its immediate contents only — one level, no
     recursion into subdirectories, matching the vault's own shallow-
     nesting rule. A nested directory the user clearly means to include
     should be named explicitly in a separate request; don't expand it
     automatically.
   - **Inline list:** each path or URL the user wrote directly in the
     request text is one source.
   - **Listing file:** read the file; each non-blank line is one source
     (strip a leading `-`/`*` bullet marker and surrounding whitespace if
     present).

   Classify each entry: starts with `https://` → URL; starts with
   `http://` or otherwise looks like a URL but isn't `https://` → still a
   URL, which the safety contract in step 3 will reject; anything else →
   local path.
3. **If the batch includes any URLs**, before fetching anything:
   1. Validate each URL against
      [defuddle's safety contract](../defuddle/SKILL.md#safety-contract)
      (HTTPS only; no embedded credentials; no private/local hosts; no
      sensitive query parameters; etc.). Drop any that fail validation —
      record each as skipped (`skipped: rejected — <reason>`) in this
      run's report; a rejected URL never appears in the consent list
      below.
   2. Check whether a reviewed Defuddle-style extractor is available —
      the same one-time check `defuddle` itself does:
      - **Not found:** skip every remaining URL source for this run
        (each reported as `skipped: no extractor`) and continue to step 4
        with only the local sources. Don't block a batch that's mostly
        local files on one missing external tool.
      - **Found, unreviewed:** show its resolved path and get the user
        to confirm its provenance and version once, for the whole batch
        — not once per URL.
      - **Found and already reviewed this session:** continue.
   3. If any URLs survived validation and an extractor is available, get
      **one upfront batch consent**: list every surviving URL and its
      host, state plainly that all of them will leave the machine, and
      stop for explicit approval before fetching any of them. This single
      approval covers every URL in the list — no per-source consent
      inside an already-approved batch.
4. **Process each source in sequence** — not in parallel:
   - **Local source:** apply `capture`'s steps 3, 4, 5, 6, 7, 8, and 10
     (read/view the source, copy a binary attachment, derive a
     title/slug, decide the destination, write the note, update the
     topic index if it landed in `notes/<topic>/`, and the linking pass)
     to this one source. Skip `capture`'s step 9 (regenerating the master
     index) — this skill regenerates it once, after the whole batch, in
     step 5 below.
   - **URL source:** apply
     [defuddle's fetch-and-clean step](../defuddle/SKILL.md#fetch-after-consent)
     (its redirect policy and fail-closed rules — already covered by this
     run's batch consent), then the same `capture` steps as the
     local-source case above, using defuddle's cleaned Markdown as the
     source content.
   - **Bulk-specific overrides to those per-item rules** (apply instead
     of the ask-first behavior `capture`'s steps 5 and 6 normally use):
     - A filename collision (`capture` step 5) is **skipped, not asked**:
       record it in this run's report (`skipped: collision with <existing
       path>`) and move to the next source. The user resolves it
       afterward with a normal `capture` or a manual edit.
     - Genuinely ambiguous project-vs-note placement (`capture` step 6)
       **defaults to `inbox/`, not asked**: file it there and record it
       as filed-to-inbox in the report. The user triages `inbox/`
       afterward with `organize`.
     - Any other per-item failure — unreadable file, empty or failed
       fetch, a defuddle extraction error — is recorded
       (`skipped: <reason>`) and the batch keeps going.
5. **After the whole batch finishes**, regenerate `indexes/README.md`
   once per
   [Master index](../capture/references/note-format.md#master-index) —
   one full rescan at the end covers every change the batch made, so
   there's no need to regenerate per item.
6. **Report** a per-source summary, grouped into: filed (path, and which
   topic index was updated, if any), filed to `inbox/` (ambiguous
   placement), and skipped (with each one's specific reason) — so the
   user can see exactly what happened across the whole batch and what
   still needs attention.

## Out of scope

No real fan-out/parallelism — sources are processed one at a time, in
order; see the design spec's "Rejected: real fan-out parallelism" for
why. No recursive directory expansion. No new ledger, transaction
bundle, or persistent run log — the end-of-batch report in the
conversation is the only record, same as every other skill in this
project.

## Error handling

- Missing or unreadable source, empty/failed fetch, or an extraction
  error: record as skipped with the reason, don't stop the batch.
- Filename collision: skip, don't ask — see step 4's override above.
- Ambiguous project-vs-note placement: default to `inbox/`, don't ask —
  see step 4's override above.
- No reviewed Defuddle-style extractor available: skip all URL sources
  (`skipped: no extractor`), keep going with local sources.
- Vault directory not writable: report the error and stop the whole
  batch (same as `capture`).
```

- [ ] **Step 2: Verify the anchors this file links to still exist**

```bash
grep -n "^## Safety contract\|^## Fetch after consent" skills/defuddle/SKILL.md
grep -n "^## Resolving the vault\|^## Master index\|^## Indexes\|^## Folder placement" skills/capture/references/note-format.md
```

Expected: one match for each of the six headings. If any is missing or
worded differently, fix the corresponding link text in
`skills/bulk-import/SKILL.md` (written in Step 1) to match the actual
heading before continuing.

- [ ] **Step 3: Verify capture's step numbering still matches**

```bash
grep -n "^[0-9]\+\. \*\*" skills/capture/SKILL.md
```

Expected: 11 numbered steps, where step 3 is "Read or view the source",
step 9 is "Regenerate the master index", and step 10 is "Look for
related notes" (the linking pass). This confirms the step numbers named
in Step 1's file ("steps 3, 4, 5, 6, 7, 8, and 10", "skip step 9") are
still accurate. If `capture`'s steps have been renumbered since this
plan was written, update the numbers in `skills/bulk-import/SKILL.md` to
match before continuing — do not leave a stale reference.

- [ ] **Step 4: Commit**

```bash
git add skills/bulk-import/SKILL.md
git commit -m "feat: add the bulk-import skill"
```

---

### Task 2: Document `bulk-import` in the README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1's `skills/bulk-import/SKILL.md` (this task only
  describes it; it doesn't change its behavior).

- [ ] **Step 1: Update the tagline and skill count**

Find:

```markdown
  Five plain Claude Code skills, no plugin core, no database — just Markdown files you own.
```

Replace with:

```markdown
  Six plain Claude Code skills, no plugin core, no database — just Markdown files you own.
```

- [ ] **Step 2: Update the Product section's skill list and add a bulk-import step**

Find:

```markdown
claude-obsidian is `capture`, `organize`, `ask`, `defuddle`, and
`autoresearch` — five plain Claude Code skills, no plugin core, no
database:

1. You hand Claude a source — pasted text, a local file, an image, or
   a URL (via `defuddle`).
2. `capture` derives a title, decides whether it belongs in
   `notes/<topic>/`, `projects/<project-slug>/`, or `inbox/`, writes
   one short Markdown note, keeps that topic's index page current, and
   links it to genuinely related notes.
3. As you keep capturing, `organize` periodically sorts whatever's
   sitting in `inbox/` and re-links notes that had nothing to link to
   at capture time.
4. You ask a question; `ask` checks `indexes/` first, greps the vault
   for anything else relevant, answers directly from what those notes
   say with `[[wikilink]]` citations — and says plainly when the vault
   doesn't have an answer, rather than guessing.
5. For research beyond your own notes, `autoresearch` runs a bounded,
   consented web-research loop and files a cited dossier only after
   you've reviewed it.
```

Replace with:

```markdown
claude-obsidian is `capture`, `organize`, `ask`, `defuddle`,
`autoresearch`, and `bulk-import` — six plain Claude Code skills, no
plugin core, no database:

1. You hand Claude a source — pasted text, a local file, an image, or
   a URL (via `defuddle`).
2. `capture` derives a title, decides whether it belongs in
   `notes/<topic>/`, `projects/<project-slug>/`, or `inbox/`, writes
   one short Markdown note, keeps that topic's index page current, and
   links it to genuinely related notes.
3. As you keep capturing, `organize` periodically sorts whatever's
   sitting in `inbox/` and re-links notes that had nothing to link to
   at capture time.
4. You ask a question; `ask` checks `indexes/` first, greps the vault
   for anything else relevant, answers directly from what those notes
   say with `[[wikilink]]` citations — and says plainly when the vault
   doesn't have an answer, rather than guessing.
5. For research beyond your own notes, `autoresearch` runs a bounded,
   consented web-research loop and files a cited dossier only after
   you've reviewed it.
6. To file many sources at once — a folder, a pasted list of links, a
   listing file — `bulk-import` reuses `capture`'s and `defuddle`'s own
   rules across the whole batch in one pass, with one upfront consent
   for any URLs instead of one per source.
```

- [ ] **Step 3: Update the architecture diagram**

Find:

```markdown
Skills: capture · organize · ask · defuddle · autoresearch
```

Replace with:

```markdown
Skills: capture · organize · ask · defuddle · autoresearch · bulk-import
```

- [ ] **Step 4: Add a row to the core workflows table**

Find:

```markdown
| `autoresearch` | Bounded web research (explicit consent), filed as one or more notes |

Each skill's exact contract lives in `skills/<name>/SKILL.md`; the note
```

Replace with:

```markdown
| `autoresearch` | Bounded web research (explicit consent), filed as one or more notes |
| `bulk-import` | File a directory, pasted list, or listing file of sources in one run, reusing `capture`/`defuddle`'s rules |

Each skill's exact contract lives in `skills/<name>/SKILL.md`; the note
```

- [ ] **Step 5: Add `bulk-import`'s tier notes to the Safety / trust model**

Find:

```markdown
### Autonomous

- `capture` filing a new note, once invoked
- `organize` sorting `inbox/` and re-linking, once invoked
- Either skill updating an `indexes/<Topic>.md` page or adding a wikilink
- `ask` reading and answering (it never writes)

### Requires review

- Ambiguous project-vs-note placement — `capture`/`organize` ask rather than guess
- A filename collision — ask whether to update the existing note or create a new one, never silently overwrite
- A `defuddle` extractor found but not yet reviewed this session — its provenance and version must be confirmed before first use

### Requires approval

- `defuddle` fetching any URL — explicit, per-request network consent
- `autoresearch` reaching the public web — explicit topic, domain, and budget approval before the loop starts
- Filing a fetched page or research dossier as a note — a separate consent from fetching/researching it
```

Replace with:

```markdown
### Autonomous

- `capture` filing a new note, once invoked
- `organize` sorting `inbox/` and re-linking, once invoked
- Either skill updating an `indexes/<Topic>.md` page or adding a wikilink
- `ask` reading and answering (it never writes)
- `bulk-import` skipping a filename collision or defaulting ambiguous placement to `inbox/`, inside an already-approved batch — see Requires review/approval below for what's approved once per batch, not once per source

### Requires review

- Ambiguous project-vs-note placement — `capture`/`organize` ask rather than guess (`bulk-import` defaults to `inbox/` instead, see above)
- A filename collision — ask whether to update the existing note or create a new one, never silently overwrite (`bulk-import` skips instead, see above)
- A `defuddle` extractor found but not yet reviewed this session — its provenance and version must be confirmed before first use; `bulk-import` does this once per batch, not once per URL

### Requires approval

- `defuddle` fetching any URL — explicit, per-request network consent
- `bulk-import` fetching any URLs in a batch — one upfront consent listing every URL in the batch, covering all of them at once
- `autoresearch` reaching the public web — explicit topic, domain, and budget approval before the loop starts
- Filing a fetched page or research dossier as a note — a separate consent from fetching/researching it
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: document bulk-import as part of the primary skill set"
```

---

### Task 3: Document `bulk-import` in AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Task 1's `skills/bulk-import/SKILL.md`.

- [ ] **Step 1: Update the skill list and count in the intro paragraph**

Find:

```markdown
claude-obsidian is `capture`, `organize`, `ask`, `defuddle`, and
`autoresearch` — five plain-Markdown Claude Code skills at
`skills/<name>/SKILL.md`, with no Python core, no transaction bundles, no
ledgers, no MoC maintenance. `capture`, `organize`, and `ask` need no
network access; `defuddle` and `autoresearch` require explicit,
per-request consent before any egress, and `defuddle` additionally
requires an external Defuddle-style extractor the user provides. Notes
```

Replace with:

```markdown
claude-obsidian is `capture`, `organize`, `ask`, `defuddle`,
`autoresearch`, and `bulk-import` — six plain-Markdown Claude Code skills
at `skills/<name>/SKILL.md`, with no Python core, no transaction bundles,
no ledgers, no MoC maintenance. `capture`, `organize`, and `ask` need no
network access; `defuddle` and `autoresearch` require explicit,
per-request consent before any egress, and `defuddle` additionally
requires an external Defuddle-style extractor the user provides.
`bulk-import` files many sources in one run, reusing `capture`'s and
`defuddle`'s rules with a single upfront consent for any URLs in the
batch rather than one per source. Notes
```

- [ ] **Step 2: Update the section heading and the per-skill boundary paragraph**

Find:

```markdown
## Primary system: capture / organize / ask / defuddle / autoresearch
```

Replace with:

```markdown
## Primary system: capture / organize / ask / defuddle / autoresearch / bulk-import
```

Find:

```markdown
Behavior, triggers, and out-of-scope boundaries for each skill are fully
specified in its own `SKILL.md` — this file doesn't duplicate them.
`organize` never runs automatically; `ask` never writes to the vault;
`defuddle` and `autoresearch` never fetch or research without explicit
per-request consent, and never file a note without a separate, later
consent to keep the result. None of the five uses transactions, ledgers,
or an index/MoC.
```

Replace with:

```markdown
Behavior, triggers, and out-of-scope boundaries for each skill are fully
specified in its own `SKILL.md` — this file doesn't duplicate them.
`organize` never runs automatically; `ask` never writes to the vault;
`defuddle` and `autoresearch` never fetch or research without explicit
per-request consent, and never file a note without a separate, later
consent to keep the result. `bulk-import` only runs when handed more
than one source, gets one upfront consent for every URL in its batch
instead of one per source, and skips/defaults collisions and ambiguous
placement rather than asking mid-batch. None of the six uses
transactions, ledgers, or an index/MoC.
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document bulk-import in AGENTS.md"
```

---

### Task 4: Wire `bulk-import` into the install instructions

**Files:**
- Modify: `INSTALL.md`

**Interfaces:**
- Consumes: Task 1's `skills/bulk-import/SKILL.md` (this task copies the
  folder into a user's skills directory the same way as the other five).

- [ ] **Step 1: Update the intro skill list and count**

Find:

```markdown
This guide covers getting `capture`, `organize`, `ask`, `defuddle`, and
`autoresearch` working against **your own existing Obsidian vault** —
```

Replace with:

```markdown
This guide covers getting `capture`, `organize`, `ask`, `defuddle`,
`autoresearch`, and `bulk-import` working against **your own existing
Obsidian vault** —
```

- [ ] **Step 2: Update the "What you're actually installing" count**

Find:

```markdown
There's no plugin core, database, or vault-side install step. The
"install" is a one-time step that makes five `SKILL.md` files
discoverable by Claude Code, wherever you run it from. Everything
```

Replace with:

```markdown
There's no plugin core, database, or vault-side install step. The
"install" is a one-time step that makes six `SKILL.md` files
discoverable by Claude Code, wherever you run it from. Everything
```

- [ ] **Step 3: Update the copy-loop instructions and skill count**

Find (note: this block uses a 4-backtick outer fence because the
content itself contains 3-backtick code fences):

````markdown
This repo keeps its skills at `skills/<name>/SKILL.md`. Claude Code
auto-discovers skills from your **personal** skills folder,
`~/.claude/skills/`, in every session regardless of which directory
you're in — but it does not scan a bare `skills/` folder sitting in
some other repo. Copy (or link) the five skill folders across once:

**Windows (PowerShell) — plain copy:**

```powershell
$repo   = "C:\path\to\claude-obsidian"          # wherever you cloned this repo
$target = "$env:USERPROFILE\.claude\skills"
New-Item -ItemType Directory -Force -Path $target | Out-Null
foreach ($skill in "capture","organize","ask","defuddle","autoresearch") {
  Copy-Item -Recurse -Force "$repo\skills\$skill" "$target\$skill"
}
```

**Windows — junction instead (stays in sync with the repo, no admin
rights needed, unlike a real symlink):**

```powershell
foreach ($skill in "capture","organize","ask","defuddle","autoresearch") {
  cmd /c mklink /J "$target\$skill" "$repo\skills\$skill"
}
```

**macOS / Linux:**

```bash
target=~/.claude/skills
mkdir -p "$target"
cd /path/to/claude-obsidian
for skill in capture organize ask defuddle autoresearch; do
  ln -s "$(pwd)/skills/$skill" "$target/$skill"   # or: cp -r "skills/$skill" "$target/$skill"
done
```
````

Replace with:

````markdown
This repo keeps its skills at `skills/<name>/SKILL.md`. Claude Code
auto-discovers skills from your **personal** skills folder,
`~/.claude/skills/`, in every session regardless of which directory
you're in — but it does not scan a bare `skills/` folder sitting in
some other repo. Copy (or link) the six skill folders across once:

**Windows (PowerShell) — plain copy:**

```powershell
$repo   = "C:\path\to\claude-obsidian"          # wherever you cloned this repo
$target = "$env:USERPROFILE\.claude\skills"
New-Item -ItemType Directory -Force -Path $target | Out-Null
foreach ($skill in "capture","organize","ask","defuddle","autoresearch","bulk-import") {
  Copy-Item -Recurse -Force "$repo\skills\$skill" "$target\$skill"
}
```

**Windows — junction instead (stays in sync with the repo, no admin
rights needed, unlike a real symlink):**

```powershell
foreach ($skill in "capture","organize","ask","defuddle","autoresearch","bulk-import") {
  cmd /c mklink /J "$target\$skill" "$repo\skills\$skill"
}
```

**macOS / Linux:**

```bash
target=~/.claude/skills
mkdir -p "$target"
cd /path/to/claude-obsidian
for skill in capture organize ask defuddle autoresearch bulk-import; do
  ln -s "$(pwd)/skills/$skill" "$target/$skill"   # or: cp -r "skills/$skill" "$target/$skill"
done
```
````

- [ ] **Step 4: Verify no other skill-count or skill-list mentions were missed**

```bash
grep -n "five\|capture.*organize.*ask.*defuddle.*autoresearch" INSTALL.md
```

Expected: no remaining occurrence of the word "five" describing the
skill set, and no skill list that stops at `autoresearch` without
`bulk-import`. Fix any you find using the same find/replace pattern as
Steps 1-3.

- [ ] **Step 5: Commit**

```bash
git add INSTALL.md
git commit -m "docs: install bulk-import alongside the other five skills"
```

---

### Task 5: Manually verify against a scratch vault

**Files:**
- None modified — this task only reads `skills/bulk-import/SKILL.md`
  (Task 1) and exercises it by hand against a throwaway vault. No test
  suite exists in this repo and none is proposed here, matching the
  spec's own "Testing" section and the master-index plan's precedent
  (Markdown instructions have no code to unit test).

**Interfaces:**
- Consumes: the final text of `skills/bulk-import/SKILL.md` from Task 1.

- [ ] **Step 1: Build a scratch vault with existing content**

```bash
mkdir -p /tmp/bulk-import-verify/{inbox,notes/ai-agents,projects/client-onboarding,indexes,templates,attachments,drop}
```

(Use the scratchpad directory instead of `/tmp` if running this from
inside a session that has one — the path itself doesn't matter, only
that it's throwaway and not part of the repo.)

Write `indexes/AI-Agents.md`:

```markdown
# AI Agents

## Core notes

- [[Tool-using agents]] — deciding when a tool call is warranted.
```

Write `notes/ai-agents/tool-using-agents.md` (minimal note-template
shape, per `templates/note-template.md`'s seed content) so a filename
collision has something to collide with.

- [ ] **Step 2: Seed a mixed batch in `drop/` (the directory source)**

In `drop/`, create:
- `tool-using-agents.md` — same slug as the existing note above, to
  exercise the collision-skip override.
- `unreadable.bin` — a file whose content cannot be sensibly read as
  text (e.g. a few bytes of random binary), to exercise the
  unreadable-file skip.
- `quarterly-planning-notes.md` — plain text content that's genuinely
  ambiguous between a project and a general note (mentions a goal and a
  deadline, but nothing in the vault or the note itself decisively
  points to an existing project), to exercise the ambiguous-placement
  default.
- A subdirectory `drop/nested/` containing one file — to confirm it is
  **not** picked up (one-level expansion only).

- [ ] **Step 3: Prepare an inline list and a listing file**

Note two or three inline sources to pass directly in the request text
when executing the skill (e.g. a short pasted text snippet and one more
local file path).

Write a listing file, `import-list.txt`, containing one line each for:
- `https://example.com/one` (a syntactically valid HTTPS URL — since no
  real Defuddle extractor is expected to be configured in this
  environment, this exercises the "no extractor" skip path, which is the
  realistic, testable outcome here)
- `http://insecure.example.com/two` (non-HTTPS, to exercise the
  safety-contract rejection)
- one more local file path from the scratch vault

- [ ] **Step 4: Manually execute `bulk-import` against the whole batch**

Following `skills/bulk-import/SKILL.md` as written (not by invoking a
loaded skill — by hand, per its exact text), run steps 1-6 against: the
`drop/` directory, the inline sources from Step 3, and
`import-list.txt`. Confirm:

- The nested file under `drop/nested/` never appears as a source.
- `tool-using-agents.md` from `drop/` is reported as
  `skipped: collision with notes/ai-agents/tool-using-agents.md`, not
  written, and not asked about.
- `unreadable.bin` is reported as skipped with a reason, not written.
- `quarterly-planning-notes.md` lands in `inbox/`, reported as filed to
  `inbox/` for ambiguous placement, not asked about.
- `https://example.com/one` is reported as `skipped: no extractor` (or,
  if this environment does have a reviewed extractor configured, that it
  went through the batch-consent step correctly instead).
- `http://insecure.example.com/two` is reported as
  `skipped: rejected — <reason>` and never appears in any consent
  prompt.
- The remaining local sources (from `drop/`, the inline list, and the
  listing file) are filed correctly per `capture`'s normal per-item
  rules, each into `notes/<topic>/`, `projects/<slug>/`, or `inbox/` as
  appropriate.
- `indexes/README.md` is regenerated exactly once, after the whole batch
  — not once per item — and reflects every change the batch made (new
  topics/projects, and the current `inbox/` count).
- The final report groups results into filed / filed-to-inbox / skipped,
  with a specific reason on every skipped entry.

- [ ] **Step 5: Confirm the master-index regeneration matches its own rule**

Regenerate `indexes/README.md` a second time by hand with no vault
changes in between (per
[Master index](../../../skills/capture/references/note-format.md#master-index)).
Confirm the output is identical to Step 4's — proves this run's
single end-of-batch regeneration produced a correct, non-drifting
result, consistent with the master index's own "regenerated in full
each time... so it can't drift" requirement.

- [ ] **Step 6: Clean up**

```bash
rm -rf /tmp/bulk-import-verify
```

(Or the scratchpad equivalent used in Step 1.) Nothing from this task is
committed — it's a verification pass against the already-committed
Task 1, not new repo content.

---

## Explicitly out of scope

- Real fan-out parallelism for `bulk-import` (spec's "Rejected: real
  fan-out parallelism") — sequential processing is the shipped design,
  not a placeholder for a future parallel version in this plan.
- Recursive directory expansion in `bulk-import`'s directory mode (spec's
  "Non-goals").
- The entities/concepts promotion layer and raw/derivative immutable
  source split from the spec's "Non-goals" — an independent, materially
  bigger feature with its own future spec.
- Any change to `capture`, `defuddle`, `organize`, or `ask`'s own
  `SKILL.md` files — this skill reuses their rules by reference only.
