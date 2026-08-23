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
