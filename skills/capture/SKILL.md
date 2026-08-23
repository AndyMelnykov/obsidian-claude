---
name: capture
description: "Capture a source — pasted text, a local file path, an image, or a URL — into the vault as one plain Markdown note: derive a title/slug, place it in an existing or new topic folder (or inbox/ if unsure), copy any binary attachment, and add wikilinks to genuinely related notes. Use when the user gives Claude a source and asks to capture/save/file it. Plain file reads/writes/copies only — no transactions, ledgers, or MoCs."
---

# Capture a source into the vault

Read [the note format and vault layout reference](references/note-format.md)
first — it defines the frontmatter, the slug/uniqueness rule, the
folder-placement heuristic, and the linking pass that this skill uses at
steps 4, 5, and 7 below.

This skill does one thing: turn one source into one short, filed,
optionally-linked note. It does not run automatically — only act when the
user hands Claude a source and asks to capture/save/file it.

## Steps

1. **Resolve the vault.** Use the current directory, or the directory the
   user names. Create `inbox/` and `attachments/` in it if they don't
   already exist.
2. **Read or view the source.**
   - Local text file or pasted text: read it directly.
   - Image: use Claude's native image understanding to produce the
     summary. Do not attempt OCR or invoke an external tool.
   - PDF or other binary: read what the host's tools can extract; note in
     the summary if content couldn't be extracted.
3. **Copy binary sources.** If the source is a local binary file (image,
   PDF, etc.), copy it as-is into `attachments/`. If a file with that name
   already exists there with different content, disambiguate the filename
   (append `-2`, `-3`, ...).
4. **Derive a title and slug**, then check the whole vault for a filename
   collision per the [uniqueness rule](references/note-format.md#slug-and-filename-uniqueness):
   - No existing file with that slug: continue.
   - One exists: ask the user whether to update the existing note or
     create a new, differently-titled one. Never silently overwrite.
5. **Decide where the note belongs**, per the
   [folder-placement heuristic](references/note-format.md#folder-placement).
   Default to `inbox/` when not confident.
6. **Write the note** in the [note format](references/note-format.md#note-format):
   frontmatter (`title`, `date`, `source`, optional `tags`), a 2-6 sentence
   `## Summary`, and a `## Notes` section with key points/quotes/excerpt.
   Keep it as short as the source allows — a summary, not a copy. If
   there's an attachment, embed it with `![[attachments/<filename>]]`.
7. **Look for related notes** and add links, per the
   [linking pass](references/note-format.md#linking-pass).
8. **Report** the note's path, the attachment path (if any), any links
   added, and whether it landed in `inbox/` for later filing.

## Out of scope

No transactions/bundles, SHA-256 manifests, source/claim ledgers, address
allocation, methodology modes, index/MoC maintenance, or git
checkpointing. Plain file reads/writes/copies only, using the host's normal
file tools.

URL capture is not handled by this pass of the skill — treat a URL source
the same as any unclear input and ask the user for pasted text instead of
fetching it (fetching untrusted web content safely is `defuddle`'s job,
deferred to a later pass).

## Error handling

- Missing or unreadable source: report the problem, don't fabricate a
  summary.
- Note name collision: ask per step 4 — never silently overwrite.
- Vault directory not writable: report the error and stop.
