# Vault Structure, Projects, and Indexes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revise the vault layout from "no required taxonomy beyond `inbox/`/`attachments/`" to a fixed minimal skeleton — `inbox/`, `notes/`, `projects/`, `indexes/`, `templates/`, `attachments/` — add a `projects/` vs `notes/` placement decision (heuristic + fallback question), add auto-maintained `indexes/<Topic>.md` entry-point pages for `notes/` topics, and extract the note template into a user-editable `templates/note-template.md` that every skill reads instead of hardcoding field/section names.

**Architecture:** One shared reference (`skills/capture/references/note-format.md`) stays the single source of truth for vault layout, the note template's *roles* (source/content/connections, not hardcoded names), the notes-vs-projects heuristic, and index maintenance. All five skills (`capture`, `organize`, `ask`, `defuddle`, `autoresearch`) already link to it and get updated to follow the new rules. The design spec (`docs/superpowers/specs/2026-08-22-simple-capture-design.md`) is rewritten to match, since it's the living design record this whole system already points to.

**Tech Stack:** Markdown-only Claude Code Agent Skills, same as the rest of the system. No scripts, no dependencies.

**Spec:** [docs/superpowers/specs/2026-08-22-simple-capture-design.md](../specs/2026-08-22-simple-capture-design.md) — Task 1 below rewrites it in place; it is this plan's spec both before and after that rewrite.

## Global Constraints

- All vault folder names stay lowercase: `inbox/`, `notes/`, `projects/`, `indexes/`, `templates/`, `attachments/` — confirmed choice, matches the already-shipped `inbox/`/`attachments/` casing.
- `capture` creates all six top-level folders on first use if missing (previously only `inbox/`/`attachments/`).
- The note template's exact frontmatter fields and section headings live only in `templates/note-template.md`, created on first use, seeded with `created`/`tags`/`source` frontmatter, an `# {{title}}` heading, `## Idea`, and `## Connections`. Every skill reads this file and works off three roles (source / content / connections) rather than hardcoding names, so a user edit to the template is honored on the next run.
- Atomization (splitting one capture into several one-idea notes) stays explicitly rejected — notes should be fuller, not split. Nothing in this plan adds a splitting step.
- Explicit reasoning for a `[[link]]` stays optional, not mandatory — no change to the linking pass's existing wording.
- Notes vs. projects: heuristic first (explicit initiative/deadline/action-item language → `projects/`; otherwise → `notes/`), fallback to asking the user only when genuinely ambiguous — never silently guessing between the two the way `inbox/` silently absorbs "no confident folder."
- Indexes (`indexes/<Topic>.md`) are maintained automatically by `capture` and `organize`, 1:1 with `notes/<topic>/` folders, from the first note in a topic onward — no note-count threshold, no separate user request needed. Projects and `inbox/` never get an index page.
- `ask` and `capture` both consult `indexes/` before falling back to a full-vault grep — that's the whole point of adding them (faster placement/retrieval).

---

### Task 1: Rewrite the design spec

**Files:**
- Modify: `docs/superpowers/specs/2026-08-22-simple-capture-design.md`

**Interfaces:**
- Produces: the updated spec that Tasks 2-7 implement against.

- [ ] **Step 1: Replace the "Scope" paragraph about the vault layout's taxonomy stance**

Find this paragraph (currently right after the `defuddle`/`autoresearch` deferral paragraph):

```markdown
The existing `skills/`, `agents/`, `claude_obsidian/`, `scripts/`,
`templates/`, `docs/` machinery is left in place, untouched. This is a
parallel, simpler alternative, not a replacement in this pass.
```

Replace it with:

```markdown
The legacy transaction-based system (12 skills, the Python core,
scripts, templates, examples, older docs) that originally lived
alongside this one has since been removed entirely from this repo —
this is now the only system, not a parallel alternative to something
else.

`defuddle` and `autoresearch` are no longer deferred — both were
redesigned onto this note format and are implemented as of this
revision (see their own `SKILL.md` files; the "Deferred" framing below
is kept only as a historical note of what changed and why).
```

- [ ] **Step 2: Replace the "Vault layout" section**

Replace the entire section (from `## Vault layout` through the paragraph
ending `...don't exist.`) with:

````markdown
## Vault layout

```
vault/
├── inbox/
│   └── <slug-title>.md          # staged notes capture wasn't sure how to file
├── notes/
│   └── <topic>/
│       └── <slug-title>.md
├── projects/
│   └── <project-slug>/
│       └── <slug-title>.md
├── indexes/
│   └── <topic>.md               # curated entry point per notes/ topic
├── templates/
│   └── note-template.md         # the exact note template, user-editable
├── attachments/
│   └── <original filename or a disambiguated version>
```

This is a fixed minimal top-level skeleton — a revision from the
original "no required taxonomy at all" stance. Two things forced the
change: index pages need a stable, predictable place to live, and
separating active-project notes from general reference notes turned
out to matter for retrieval. `capture` creates all six folders on first
use if any are missing.

Topic folders under `notes/` and project folders under `projects/` are
still freely inferred by name — capture and organize choose them the
same way they choose a title — just nested one level under a fixed root
instead of directly at the vault root. Nested subtopics
(`notes/<topic>/<subtopic>/...`) are still allowed.

`inbox/` is where a note lands when `capture` isn't confident whether
something is a `notes/` topic or a `projects/` initiative, or which
topic/project it belongs to — not a place notes are expected to stay.
`attachments/` stays flat and holds every copied-in binary source,
referenced by notes from wherever they live in the tree.

No `.raw/`, no `wiki/index.md` / `hot.md` / `log.md`, no
`.claude-obsidian.json` vault marker required.
````

- [ ] **Step 3: Replace the "Note format" section**

Replace the entire `## Note format` section (through the paragraph
ending `...not just one folder.`) with:

````markdown
## Note format

The exact frontmatter fields and body section headings live in one
user-editable file, `templates/note-template.md` — not hardcoded here
or in any skill. `capture` creates it on first use if missing, seeded
with:

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

Every skill that writes or reads a note works off three *roles*, read
from whatever `templates/note-template.md` currently says — if the
user edits the template, the new field/heading names are what's
followed from then on:

- **Source role** (seed: `source:` frontmatter) — the original file
  path, URL, or "pasted".
- **Content role** (seed: `## Idea`) — the note's actual content, in
  the user's own words, as short as the source allows. This is one
  full note per source — not split into several one-idea notes.
- **Connections role** (seed: `## Connections`) — outgoing
  `[[wikilink]]`s to related notes, each with a short reason when one's
  worth stating (a reason is not mandatory — an unadorned `[[link]]` is
  fine too). Omit this section entirely when there's nothing to link;
  never leave an empty heading or force a link.

For an image or other binary attachment, the note additionally embeds
it inside the content section: `![[attachments/<filename>]]`.

The slug is a short kebab-case version of the title (e.g.
`eu-ai-act-summary.md`). **Filenames must be unique vault-wide, not
just per-folder** — Obsidian resolves a bare `[[wikilink]]` by filename
regardless of folder. Both `capture` and `organize` check for an
existing file with the same slug anywhere in the vault before writing,
using Grep/glob across the whole tree, not just one folder.

## Notes vs. projects vs. inbox

Filing now has three possible destinations instead of two:

- **`projects/<project-slug>/`** — the source is clearly part of an
  ongoing, active initiative with a goal and forward motion: explicit
  language like "I'm working on...", a named deliverable, a deadline, a
  status, or action items. Prefer an existing `projects/<slug>/` folder
  when one's an obvious fit.
- **`notes/<topic>/`** — general reference/idea material not tied to a
  specific active initiative. The default for anything that isn't
  clearly project-scoped.
- **`inbox/`** — neither is confident. Don't guess.

When it's genuinely ambiguous whether something is project-scoped or a
general note (as opposed to simply "no existing folder matches," which
is an `inbox/` case), ask the user directly — e.g. "Is this part of an
ongoing project, or a general reference note?" — rather than picking
silently.

## Indexes: entry points into `notes/`

Every `notes/<topic>/` folder gets one corresponding
`indexes/<Topic>.md`: a short, curated list of the notes in that topic,
so a person or a later capture/ask pass can see what's already there
without grepping the whole vault cold. `capture` and `organize`
maintain these automatically:

- When a note is newly filed into or moved into `notes/<topic>/`,
  ensure `indexes/<Topic>.md` exists (create it, seeded with a title
  and an empty list, if it doesn't) and add one `[[slug]]` + short
  description line for the note if it isn't already listed.
- Before creating a *new* topic folder under `notes/`, check
  `indexes/` first — an existing index is a faster, curated signal that
  the topic already exists than scanning `notes/` itself.
- `ask` reads `indexes/` first, as a map of what topics exist and
  where, before falling back to a full-vault grep.

Indexes aren't maintained for `projects/` (a project's own notes are
few enough to browse directly) or for `inbox/` (meant to empty out, not
accumulate a table of contents). There's no note-count threshold — the
index exists from the topic folder's first note onward.
````

- [ ] **Step 4: Update the `capture` skill's behavior list**

Replace the numbered behavior list under `## \`capture\` skill` (steps
1-8) with:

```markdown
1. Resolve the vault: the current directory (or one the user names).
   Create `inbox/`, `notes/`, `projects/`, `indexes/`, `templates/`, and
   `attachments/` if any don't exist.
2. Read `templates/note-template.md` (create it with the seed content
   above if missing) to learn the current source/content/connections
   field and heading names.
3. Read/view the source. For an image, use Claude's native image
   understanding to produce the content; do not attempt OCR or any
   external tool.
4. If the source is a local binary file (image, PDF, etc.), copy it
   as-is into `attachments/`, disambiguating the filename (e.g. append
   `-2`) if one already exists there with different content.
5. Derive a title and slug. Check the whole vault (not just one folder)
   for an existing file with that slug:
   - If none exists, continue.
   - If one does, ask the user whether to update the existing note or
     create a new, differently-titled one. Don't silently overwrite.
6. Decide the destination — `projects/<slug>/`, `notes/<topic>/`, or
   `inbox/` — per "Notes vs. projects vs. inbox" above. Check
   `indexes/` before creating a new `notes/` topic folder.
7. Write the note per the template's current roles: source, content
   (a summary in the user's own words, not a copy), and — if anything
   is genuinely related — connections.
8. If the note landed in `notes/<topic>/`, ensure
   `indexes/<Topic>.md` exists and lists the new note.
9. Look for related notes (grep titles, tags, and key terms across the
   whole vault) and fill the connections role if 1-3 are clearly
   related; add nothing if not.
10. Report the note's path (and attachment path, if any), the index
    updated (if any), any links added, and whether it landed in
    `inbox/` for later triage.
```

- [ ] **Step 5: Update the `organize` skill's behavior list**

Replace step 2 of `organize`'s filing-mode behavior (currently "For
each inbox note, look at the rest of the vault's folder structure...")
with:

```markdown
2. For each inbox note, decide its destination — `projects/<slug>/` or
   `notes/<topic>/` — using the same heuristic and fallback question as
   `capture`, but with the benefit of whatever's been captured since.
   Move it (plain move, or delete+rewrite if the host has no move
   primitive) to that destination, creating the folder if a clear new
   grouping emerges. If it lands in `notes/<topic>/`, ensure
   `indexes/<Topic>.md` exists and lists it. A note that's still not a
   confident fit for either stays in `inbox/` — organize doesn't force
   placement just to empty the folder.
```

- [ ] **Step 6: Update the `ask` skill's behavior list**

Replace step 2 of `ask`'s behavior (currently "Grep the whole vault...")
with:

```markdown
2. Check `indexes/` first for a topic index matching the question —
   it's a faster, curated map of what exists and where than a cold
   grep. If nothing there covers it, or the question needs more than
   the index's own notes, grep the whole vault (all folders) for terms
   from the question (titles, tags, and body text). Read the notes that
   look relevant, starting with a handful; read more only if the
   question clearly needs broader coverage.
```

- [ ] **Step 7: Replace the "Deferred: defuddle and autoresearch" section**

Replace the whole `## Deferred: defuddle and autoresearch` section with:

```markdown
## Implemented: defuddle and autoresearch

Both were redesigned onto this note format rather than left on the old
transaction-bundle filing step (see their `SKILL.md` files for the
current behavior). Their fetch/safety/evidence logic — `defuddle`'s
HTTPS-only safety contract and `autoresearch`'s bounded research loop —
carried forward close to as-is, since it never depended on the old
system. Only the filing step changed: both now write plain notes via
the same `notes/`/`projects/`/`inbox/` rules as `capture`, with no
bundle and no ledger.
```

- [ ] **Step 8: Update "Non-goals"**

Replace the `## Non-goals` list with:

```markdown
## Non-goals (explicitly deferred, not decided against)

- Migrating an existing wiki-style vault to this format.
- URL/web capture directly inside `capture` itself — `defuddle` covers
  fetching; `capture` only files what it's handed.
- Any retrieval beyond Grep and the `indexes/` entry points (BM25,
  embeddings, reranking).

## Rejected (considered and decided against, not merely deferred)

- **Atomization at triage** — splitting one Inbox note into several
  one-idea notes. Rejected: the goal is fuller, more complete notes,
  not maximally split ones.
- **Mandatory stated reason on every `[[link]]`** — an unadorned link
  stays valid; explaining *why* two notes connect is encouraged, not
  required.
```

- [ ] **Step 9: Verify the rewrite**

Run: `grep -n "^## " "docs/superpowers/specs/2026-08-22-simple-capture-design.md"` and confirm the section list reads: Problem, Scope, Vault layout, Note format, Notes vs. projects vs. inbox, Indexes: entry points into `notes/`, `capture` skill, `organize` skill, `ask` skill, Error handling, Implemented: defuddle and autoresearch, Testing, Non-goals, Rejected.
Run: `grep -c "Deferred: defuddle" "docs/superpowers/specs/2026-08-22-simple-capture-design.md"` — expect `0`.

- [ ] **Step 10: Commit**

```bash
git add docs/superpowers/specs/2026-08-22-simple-capture-design.md
git commit -m "docs: revise spec for notes/projects/indexes/templates structure"
```

---

### Task 2: Rewrite the shared note-format reference

**Files:**
- Modify: `skills/capture/references/note-format.md`

**Interfaces:**
- Produces: updated `## Vault layout`, `## Note format`, `## Slug and filename uniqueness`, `## Folder placement` (renamed/expanded to cover projects), `## Linking pass`, plus two new sections `## Indexes` and (implicitly) the projects-vs-notes heuristic folded into folder placement. Anchors `#note-format`, `#slug-and-filename-uniqueness`, `#folder-placement`, `#linking-pass` must keep working since `capture`/`organize`/`ask`/`defuddle`/`autoresearch` all link to them; add `#indexes` as a new anchor.

- [ ] **Step 1: Replace the file's content**

Replace the full content of `skills/capture/references/note-format.md`
with:

````markdown
# Note format and vault layout

Shared by `capture`, `organize`, `ask`, `defuddle`, and `autoresearch`.
Read this before writing or moving any note.

## Vault layout

```
vault/
├── inbox/
│   └── <slug-title>.md          # staged notes capture wasn't sure how to file
├── notes/
│   └── <topic>/
│       └── <slug-title>.md
├── projects/
│   └── <project-slug>/
│       └── <slug-title>.md
├── indexes/
│   └── <topic>.md               # curated entry point per notes/ topic
├── templates/
│   └── note-template.md         # the exact note template, user-editable
├── attachments/
│   └── <original filename or a disambiguated version>
```

This is a fixed minimal top-level skeleton — `capture` creates all six
folders on first use if any are missing. Topic folders under `notes/`
and project folders under `projects/` are still freely inferred by
name (nested subtopics allowed); only the six top-level names are
fixed.

`inbox/` is where a note lands when `capture` isn't confident whether
something is a `notes/` topic or a `projects/` initiative, or which one
— not a place notes are expected to stay. `attachments/` stays flat and
holds every copied-in binary source, referenced by notes from wherever
they live in the tree.

## Note format

The exact frontmatter fields and body section headings live in one
user-editable file, `templates/note-template.md` — never hardcode them
elsewhere. Create it on first use if missing, seeded with:

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

Work off three *roles*, read from whatever the template currently
says — if the user has edited it, follow the new names from then on:

- **Source role** (seed: `source:` frontmatter) — the original file
  path, URL, or "pasted".
- **Content role** (seed: `## Idea`) — the note's actual content, in
  the user's own words, as short as the source allows. One full note
  per source — never split into several one-idea notes.
- **Connections role** (seed: `## Connections`) — outgoing
  `[[wikilink]]`s to related notes, each with a short reason when one's
  worth stating (not mandatory — a bare `[[link]]` is fine too). Omit
  the section entirely when nothing is genuinely related; never leave
  an empty heading or force a link.

For an image or other binary attachment, embed it inside the content
section: `![[attachments/<filename>]]`.

## Slug and filename uniqueness

The slug is a short kebab-case version of the title (e.g.
`eu-ai-act-summary` → `eu-ai-act-summary.md`).

**Filenames must be unique vault-wide, not just per-folder.** Obsidian
resolves a bare `[[wikilink]]` by filename regardless of folder, so two
different notes with the same filename in different folders create
ambiguous links. Before writing or moving any note, check the whole
vault — not just the destination folder — for an existing file with the
same slug, using Grep or glob across the whole tree.

- If none exists, continue.
- If one exists, ask the user whether to update the existing note or
  create a new, differently-titled one. Never silently overwrite.

## Folder placement: notes vs. projects vs. inbox

Used by `capture` and by `organize`'s filing mode:

- **`projects/<project-slug>/`** — the source is clearly part of an
  ongoing, active initiative with a goal and forward motion: explicit
  language like "I'm working on...", a named deliverable, a deadline, a
  status, or action items. Prefer an existing `projects/<slug>/` folder
  when one's an obvious fit; create a new one for a clear new
  initiative.
- **`notes/<topic>/`** — general reference/idea material not tied to a
  specific active initiative. The default for anything that isn't
  clearly project-scoped. Check [Indexes](#indexes) before creating a
  brand-new topic folder — an existing index is a faster signal that
  the topic already exists than scanning `notes/` itself.
- **`inbox/`** — neither is confident. Don't guess.

When it's genuinely ambiguous whether something is project-scoped or a
general note (as opposed to simply "no existing folder matches," which
is an `inbox/` case), ask the user directly — e.g. "Is this part of an
ongoing project, or a general reference note?" — rather than picking
silently.

## Indexes

Every `notes/<topic>/` folder gets one corresponding
`indexes/<Topic>.md` — a short, curated list of the notes in that
topic. `capture` and `organize` maintain these automatically, with no
separate request needed:

- When a note is newly filed into or moved into `notes/<topic>/`,
  ensure `indexes/<Topic>.md` exists (create it, seeded with a title
  and an empty list, if it doesn't) and add one `[[slug]]` + short
  description line for the note if it isn't already listed.
- `ask` reads `indexes/` first, before falling back to a full-vault
  grep.

Indexes aren't maintained for `projects/` or `inbox/`. There's no
note-count threshold — the index exists from the topic's first note
onward.

## Linking pass

Used when filling the connections role:

Grep existing notes' titles, frontmatter tags, and the note's own key
terms for obvious overlap, across the whole vault. If 1-3 notes are
clearly related, add `[[wikilink]]`s to them under the connections
role, each with a short reason when one's worth stating. If nothing is
obviously related, add no links — don't force it.
````

- [ ] **Step 2: Verify anchors still resolve**

Run: `grep -n "^## " "skills/capture/references/note-format.md"` and
confirm headings include: Vault layout, Note format, Slug and filename
uniqueness, Folder placement: notes vs. projects vs. inbox, Indexes,
Linking pass.
Run: `grep -rn "note-format.md#" skills/*/SKILL.md` and check every
anchor referenced (`#slug-and-filename-uniqueness`,
`#folder-placement`, `#note-format`, `#linking-pass`) still matches a
heading slug here — `#folder-placement` now needs updating at each call
site in Task 3-7 since the heading text changed (see those tasks).

- [ ] **Step 3: Commit**

```bash
git add skills/capture/references/note-format.md
git commit -m "docs: rewrite note-format reference for notes/projects/indexes/templates"
```

---

### Task 3: Update `capture`

**Files:**
- Modify: `skills/capture/SKILL.md`

**Interfaces:**
- Consumes: `skills/capture/references/note-format.md` (Task 2).

- [ ] **Step 1: Replace the "Steps" section**

Replace `capture`'s entire `## Steps` list with:

```markdown
## Steps

1. **Resolve the vault.** Use the current directory, or the directory
   the user names. Create `inbox/`, `notes/`, `projects/`, `indexes/`,
   `templates/`, and `attachments/` in it if any don't already exist.
2. **Read the note template.** Read `templates/note-template.md`
   (create it with the seed content from
   [the note format reference](references/note-format.md#note-format)
   if missing) to learn the current source/content/connections
   field and heading names.
3. **Read or view the source.**
   - Local text file or pasted text: read it directly.
   - Image: use Claude's native image understanding to produce the
     content. Do not attempt OCR or invoke an external tool.
   - PDF or other binary: read what the host's tools can extract; note
     in the content if some of it couldn't be extracted.
4. **Copy binary sources.** If the source is a local binary file (image,
   PDF, etc.), copy it as-is into `attachments/`. If a file with that
   name already exists there with different content, disambiguate the
   filename (append `-2`, `-3`, ...).
5. **Derive a title and slug**, then check the whole vault for a
   filename collision per the
   [uniqueness rule](references/note-format.md#slug-and-filename-uniqueness):
   - No existing file with that slug: continue.
   - One exists: ask the user whether to update the existing note or
     create a new, differently-titled one. Never silently overwrite.
6. **Decide the destination** — `projects/<slug>/`, `notes/<topic>/`,
   or `inbox/` — per
   [folder placement](references/note-format.md#folder-placement-notes-vs-projects-vs-inbox).
   Check [indexes/](references/note-format.md#indexes) before creating
   a brand-new `notes/` topic folder. Ask the user when it's genuinely
   ambiguous between a project and a general note.
7. **Write the note** using the template's current roles: source,
   content (a summary in the user's own words, not a copy — one full
   note, never split into several), and connections if anything is
   genuinely related. If there's an attachment, embed it in the content
   role with `![[attachments/<filename>]]`.
8. **Update the index** if the note landed in `notes/<topic>/`: ensure
   `indexes/<Topic>.md` exists per
   [Indexes](references/note-format.md#indexes) and lists the new
   note.
9. **Look for related notes** and fill the connections role, per the
   [linking pass](references/note-format.md#linking-pass).
10. **Report** the note's path, the attachment path (if any), the
    index updated (if any), any links added, and whether it landed in
    `inbox/` for later triage.
```

- [ ] **Step 2: Verify frontmatter and structure**

Run: `head -n 4 "skills/capture/SKILL.md"` — confirm `---`/`name:
capture`/`description:`/`---` unchanged.
Run: `grep -c "^## " "skills/capture/SKILL.md"` — expect `3` (`##
Steps`, `## Out of scope`, `## Error handling` — unchanged from
before, only the Steps list content changed).

- [ ] **Step 3: Commit**

```bash
git add skills/capture/SKILL.md
git commit -m "feat: update capture for notes/projects/indexes/templates"
```

---

### Task 4: Update `organize`

**Files:**
- Modify: `skills/organize/SKILL.md`

**Interfaces:**
- Consumes: `../capture/references/note-format.md` (Task 2).

- [ ] **Step 1: Replace step 2 of Filing mode**

Replace the current step 2 of `organize`'s "Filing mode" (the one
starting "**For each inbox note**, decide where it now belongs...")
with:

```markdown
2. **For each inbox note**, decide its destination — `projects/<slug>/`
   or `notes/<topic>/` — using the same
   [folder placement](../capture/references/note-format.md#folder-placement-notes-vs-projects-vs-inbox)
   rule and fallback question as `capture`, but with the benefit of
   whatever's been captured since. Before moving, re-check the
   [uniqueness rule](../capture/references/note-format.md#slug-and-filename-uniqueness)
   against the destination: if the target folder already has a
   same-named file, ask the user whether to update it or rename the
   incoming note — never overwrite. Move the note (a plain move;
   delete-and-rewrite only if the host has no move primitive), creating
   the destination folder if a clear new grouping emerges. If it lands
   in `notes/<topic>/`, update
   [the index](../capture/references/note-format.md#indexes) for that
   topic. A note that's still not a confident fit for either stays in
   `inbox/` — organize doesn't force placement just to empty the
   folder.
```

- [ ] **Step 2: Verify frontmatter and structure**

Run: `grep -c "^## " "skills/organize/SKILL.md"` — expect `4`
(unchanged section count — only step 2's content changed).

- [ ] **Step 3: Commit**

```bash
git add skills/organize/SKILL.md
git commit -m "feat: update organize for notes/projects/indexes structure"
```

---

### Task 5: Update `ask`

**Files:**
- Modify: `skills/ask/SKILL.md`

**Interfaces:**
- Consumes: `../capture/references/note-format.md` (Task 2).

- [ ] **Step 1: Replace step 2 of Steps**

Replace the current step 2 ("**Grep the whole vault**...") with:

```markdown
2. **Check `indexes/` first** for a topic index matching the question
   — per [Indexes](../capture/references/note-format.md#indexes), it's
   a faster, curated map of what exists and where than a cold grep. If
   nothing there covers it, or the question needs more than the
   index's own notes, **grep the whole vault** — all folders — for
   terms from the question: note titles, frontmatter tags, and body
   text. Read the notes that look relevant, starting with a handful;
   read more only if the question clearly needs broader coverage.
```

- [ ] **Step 2: Verify frontmatter and structure**

Run: `grep -c "^## " "skills/ask/SKILL.md"` — expect `2` (unchanged).

- [ ] **Step 3: Commit**

```bash
git add skills/ask/SKILL.md
git commit -m "feat: update ask to check indexes/ before a full grep"
```

---

### Task 6: Update `defuddle` and `autoresearch`

**Files:**
- Modify: `skills/defuddle/SKILL.md`
- Modify: `skills/autoresearch/SKILL.md`

**Interfaces:**
- Consumes: `../capture/references/note-format.md` (Task 2).

- [ ] **Step 1: Update `defuddle`'s filing step**

Replace the numbered list under `## File as a note (optional, separate
consent)` with:

```markdown
1. Derive a title and slug from the page; check the whole vault for a
   filename collision before writing (never silently overwrite).
2. Decide the destination — `projects/<slug>/`, `notes/<topic>/`, or
   `inbox/` — per
   [folder placement](../capture/references/note-format.md#folder-placement-notes-vs-projects-vs-inbox),
   checking `indexes/` before creating a new `notes/` topic folder and
   asking the user if it's genuinely ambiguous between project and
   general note.
3. Write the note using the current template's roles: source (the
   HTTPS URL), content holding the cleaned page's key points or a
   short excerpt — not the full cleaned page verbatim unless it's
   already short — and connections if anything is genuinely related.
   Keep the original cleaned Markdown available in the conversation in
   case the user wants more of it; don't dump the entire page into the
   vault by default.
4. If the note landed in `notes/<topic>/`, update
   [the index](../capture/references/note-format.md#indexes) for that
   topic.
5. Report the note's path, the index updated (if any), and any links
   added.
```

- [ ] **Step 2: Update `autoresearch`'s filing step**

Replace the numbered list under `## File the dossier` with:

```markdown
1. Derive a title and slug per note; check the whole vault for a
   filename collision before writing.
2. Decide each note's destination — `projects/<slug>/` when the
   research was explicitly for an active initiative, otherwise
   `notes/<topic>/`, or `inbox/` if unsure — per
   [folder placement](../capture/references/note-format.md#folder-placement-notes-vs-projects-vs-inbox).
   A fresh topic from a research run is often a legitimate new
   `notes/` folder; check `indexes/` first before creating one.
3. Write each note using the current template's roles: source
   (`autoresearch`, with the primary source URLs listed in the content
   instead, since a dossier draws on several), content holding the
   evidence-honest findings from the step above ending with a short
   "Sources" list (URL, title, date) for what was actually cited, and
   connections if genuinely related.
4. For each note filed into `notes/<topic>/`, update
   [the index](../capture/references/note-format.md#indexes) for that
   topic, and link the dossier's own notes to each other when they
   cover related questions.
5. Report each note's path, the indexes updated, and the links added.
```

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "skills/defuddle/SKILL.md"` — expect `4`
(unchanged).
Run: `grep -c "^## " "skills/autoresearch/SKILL.md"` — expect `4`
(unchanged).

- [ ] **Step 4: Commit**

```bash
git add skills/defuddle/SKILL.md skills/autoresearch/SKILL.md
git commit -m "feat: update defuddle/autoresearch for notes/projects/indexes structure"
```

---

### Task 7: Verify the new behavior end-to-end against a scratch vault

**Files:**
- None created in the repo. Uses a throwaway temp directory (deleted at
  the end of this task).

**Interfaces:**
- Consumes: all files from Tasks 1-6.

This exercises the genuinely new logic by hand: template creation, the
notes/projects/inbox three-way decision (including the ask-the-user
fallback), index creation and update, and `ask` consulting `indexes/`
first.

- [ ] **Step 1: Fresh vault — template and skeleton creation**

```bash
SCRATCH="/c/Users/andym/AppData/Local/Temp/claude/c--Projects-obsidian-claude/88ba80b8-6e3c-4942-bd4b-2fb0febb6e8e/scratchpad"
VAULT="$SCRATCH/structure-test-vault"
rm -rf "$VAULT"
mkdir -p "$VAULT"
```

Following `skills/capture/SKILL.md` step 1-2 by hand against an empty
`$VAULT`: create all six top-level folders, then create
`templates/note-template.md` with the seed content.

```bash
mkdir -p "$VAULT/inbox" "$VAULT/notes" "$VAULT/projects" "$VAULT/indexes" "$VAULT/templates" "$VAULT/attachments"
cat > "$VAULT/templates/note-template.md" <<'EOF'
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
EOF
find "$VAULT" -maxdepth 1 -type d
```

Expected outcome to confirm:
- [ ] All six folders exist.
- [ ] `templates/note-template.md` matches the seed content verbatim.

- [ ] **Step 2: Capture a general reference note — lands in `notes/` with a new index**

Topic: "the EU AI Act's risk tiers" — clearly reference material, no
project language. Derive slug `eu-ai-act-summary`, topic `eu-regulation`.

```bash
mkdir -p "$VAULT/notes/eu-regulation"
cat > "$VAULT/notes/eu-regulation/eu-ai-act-summary.md" <<'EOF'
---
created: 2026-08-23
tags: [ai, regulation, eu]
source: pasted
---

# EU AI Act summary

## Idea

The EU AI Act sorts AI systems into four risk tiers — unacceptable,
high, limited, minimal — and providers of high-risk systems must
complete a conformity assessment before market placement.
EOF
mkdir -p "$VAULT/indexes"
cat > "$VAULT/indexes/eu-regulation.md" <<'EOF'
---
topic: EU Regulation
---

# EU Regulation

## Notes

- [[eu-ai-act-summary]] — the EU AI Act's four risk tiers and
  conformity-assessment duty for high-risk providers
EOF
cat "$VAULT/indexes/eu-regulation.md"
```

Expected outcome to confirm:
- [ ] The note has no `## Connections` section (nothing else in the
      vault yet to link to — confirms "omit when nothing to link").
- [ ] `indexes/eu-regulation.md` was created alongside the topic
      folder, listing the one note with a short description.

- [ ] **Step 3: Capture a second note in the same topic — index gets a second line, not a second file**

```bash
find "$VAULT" -iname "eu-data-act-summary.md"
cat > "$VAULT/notes/eu-regulation/eu-data-act-summary.md" <<'EOF'
---
created: 2026-08-23
tags: [regulation, eu]
source: pasted
---

# EU Data Act summary

## Idea

The EU Data Act governs IoT data access rights and B2B/B2G data
sharing rules; in force since January 2024.

## Connections

- [[eu-ai-act-summary]] — a second piece of EU digital regulation
EOF
python_free_append_check=1
grep -n "eu-data-act-summary" "$VAULT/indexes/eu-regulation.md" || cat >> "$VAULT/indexes/eu-regulation.md" <<'EOF'
- [[eu-data-act-summary]] — IoT data access rights and B2B/B2G sharing
  rules under the EU Data Act
EOF
cat "$VAULT/indexes/eu-regulation.md"
```

Expected outcome to confirm:
- [ ] Only one `indexes/eu-regulation.md` file exists (no duplicate
      index per note).
- [ ] It now lists both notes.
- [ ] The second note's `## Connections` section links to the first,
      with a stated reason (allowed, not mandatory).

- [ ] **Step 4: A clearly project-scoped capture — lands in `projects/`, no index**

Source text: "I'm working on the Q3 onboarding redesign — need to cut
signup drop-off by 20% before the Q3 deadline." This has explicit
initiative + deadline language, so per the heuristic it's `projects/`,
not `notes/`, and gets no index.

```bash
mkdir -p "$VAULT/projects/q3-onboarding-redesign"
cat > "$VAULT/projects/q3-onboarding-redesign/goal-and-target.md" <<'EOF'
---
created: 2026-08-23
tags: [onboarding]
source: pasted
---

# Goal and target

## Idea

Cut signup drop-off by 20% before the Q3 deadline as part of the
onboarding redesign.
EOF
find "$VAULT/indexes" -iname "*onboarding*" -o -iname "*q3*"
echo "exit=$?"
```

Expected outcome to confirm:
- [ ] The note is under `projects/q3-onboarding-redesign/`, not
      `notes/`.
- [ ] No matching file was created under `indexes/` for it (projects
      don't get indexes).

- [ ] **Step 5: An ambiguous capture — triggers the fallback question, doesn't guess**

Source text: "Thinking about switching our onboarding flow to a
progressive-disclosure pattern — could reduce cognitive load." This
could be read as a general UX note *or* as part of the Q3 onboarding
project above. Per the heuristic this is genuinely ambiguous (not
simply "no folder matches"), so confirm the correct behavior is to ask
the user "Is this part of an ongoing project, or a general reference
note?" rather than silently placing it in either `projects/` or
`notes/`.

Expected outcome to confirm:
- [ ] The ambiguous case is identified as ambiguous rather than
      resolved by a silent guess in either direction.

- [ ] **Step 6: `ask` consults `indexes/` before a full grep**

Question: "What are the EU AI Act's risk tiers?"

Following `skills/ask/SKILL.md` step 2: check `indexes/` first.

```bash
grep -rli "ai act\|risk tier" "$VAULT/indexes"
```

Expected outcome to confirm:
- [ ] `indexes/eu-regulation.md` alone is enough to find and read
      `eu-ai-act-summary.md` — confirm the answer can be sourced from
      the index's pointer without needing a vault-wide grep first.

- [ ] **Step 7: Clean up**

```bash
rm -rf "/c/Users/andym/AppData/Local/Temp/claude/c--Projects-obsidian-claude/88ba80b8-6e3c-4942-bd4b-2fb0febb6e8e/scratchpad/structure-test-vault"
```

- [ ] **Step 8: No commit for this task**

Fix and commit only if verification surfaced a wording problem in any
of the five `SKILL.md` files or the shared reference:

```bash
git add skills/capture/SKILL.md skills/organize/SKILL.md skills/ask/SKILL.md skills/defuddle/SKILL.md skills/autoresearch/SKILL.md skills/capture/references/note-format.md
git commit -m "fix: clarify notes/projects/indexes wording found during manual verification"
```

(Skip if no fix was needed.)

---

### Task 8: Update AGENTS.md and README.md

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing code-level — a doc-accuracy pass so both files
  describe the six-folder skeleton, the notes/projects/inbox
  three-way split, and indexes.

- [ ] **Step 1: Update AGENTS.md's opening description**

In the opening paragraph of `AGENTS.md`, after "...no ledgers, no MoC
maintenance." add a sentence:

```markdown
Notes are filed under `notes/<topic>/` or `projects/<project-slug>/`
(never at the vault root directly), and `indexes/<Topic>.md` pages give
a fast entry point into each `notes/` topic — see
[skills/capture/references/note-format.md](skills/capture/references/note-format.md)
for exactly how.
```

- [ ] **Step 2: Update README.md's Quick start section**

After the paragraph describing what `capture` creates and does, add:

```markdown
Notes land under `notes/<topic>/` for reference material or
`projects/<project-slug>/` for an active initiative — `capture` asks
if it's genuinely unsure which, rather than guessing. Each `notes/`
topic gets a matching `indexes/<Topic>.md` entry-point page,
maintained automatically as notes are added.
```

- [ ] **Step 3: Verify**

Run: `grep -c "indexes/\|projects/" AGENTS.md README.md` — expect a
nonzero count in each file.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: describe notes/projects/indexes structure in AGENTS.md and README.md"
```
