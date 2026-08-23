# Note format and vault layout

Shared by `capture`, `organize`, and `ask`. Read this before writing or
moving any note.

## Vault layout

```
vault/
├── inbox/
│   └── <slug-title>.md          # staged notes capture wasn't sure how to file
├── <topic>/
│   ├── <slug-title>.md
│   └── <subtopic>/
│       └── <slug-title>.md
├── attachments/
│   └── <original filename or a disambiguated version>
```

Folders are inferred, not fixed up front. There's no required taxonomy and
no `notes/` root — a note can live at the vault root, under a topic folder,
or nested deeper. `inbox/` is the only required folder; it's where a note
lands when placement isn't confident, not a place notes are expected to
stay. `attachments/` holds copied-in binary sources, referenced by notes
from wherever they live in the tree.

No `.raw/`, no `wiki/index.md` / `hot.md` / `log.md`, no vault marker file
required. `capture` creates `inbox/` and `attachments/` on first use if they
don't exist.

## Note format

One Markdown file per captured source, named `<slug-title>.md`:

```markdown
---
title: <title>
date: <YYYY-MM-DD>
source: <original file path, URL, or "pasted">
tags: [optional, short, list]
---

## Summary

<2-6 sentence summary of the source>

## Notes

<key points, quotes, or a short excerpt, as concise as the source allows>
```

For an image or other binary attachment, additionally embed it:

```markdown
![[attachments/<filename>]]
```

## Slug and filename uniqueness

The slug is a short kebab-case version of the title (e.g.
`eu-ai-act-summary` → `eu-ai-act-summary.md`).

**Filenames must be unique vault-wide, not just per-folder.** Obsidian
resolves a bare `[[wikilink]]` by filename regardless of folder, so two
different notes with the same filename in different folders create
ambiguous links. Before writing or moving any note, check the whole vault
— not just the destination folder — for an existing file with the same
slug, using Grep or glob across the whole tree.

- If none exists, continue.
- If one exists, ask the user whether to update the existing note or create
  a new, differently-titled one. Never silently overwrite.

## Folder placement

Used by `capture` step 5 and `organize`'s filing mode step 2:

- If an existing folder is an obvious fit (by name/topic overlap with notes
  already there), file the note there.
- If a clear new topic grouping emerges, create that folder (and nested
  subfolders, if the grouping is naturally nested).
- If neither is confident, leave/place the note in `inbox/` rather than
  guessing.

## Linking pass

Used by `capture` step 7 and `organize`'s filing mode step 3:

Grep existing notes' titles, frontmatter tags, and the note's own key terms
for obvious overlap, across the whole vault. If 1-3 notes are clearly
related, add `[[wikilink]]`s to them in the note's body, worked into a
sentence — not as a bare bullet list. If nothing is obviously related, add
no links. Don't force a link just to have one.
