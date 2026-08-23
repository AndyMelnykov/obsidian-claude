---
name: capture
description: "Capture a source — pasted text, a local file path, an image, or a URL — into the vault as one plain Markdown note: derive a title/slug, place it in notes/, projects/, or inbox/, copy any binary attachment, keep the topic's index page current, and add wikilinks to genuinely related notes. Use when the user gives Claude a source and asks to capture/save/file it. Plain file reads/writes/copies only — no transactions, ledgers, or MoCs."
---

# Capture a source into the vault

Read [the note format and vault layout reference](references/note-format.md)
first — it defines the vault skeleton, the note template's roles, the
slug/uniqueness rule, the notes/projects/inbox placement rule, index
maintenance, and the linking pass that this skill uses below.

This skill does one thing: turn one source into one short, filed,
optionally-linked note. It does not run automatically — only act when the
user hands Claude a source and asks to capture/save/file it.

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

## Out of scope

No transactions/bundles, SHA-256 manifests, source/claim ledgers, address
allocation, methodology modes, or git checkpointing. Plain file
reads/writes/copies only, using the host's normal file tools.

URL capture is not handled by this pass of the skill — treat a URL source
the same as any unclear input and ask the user for pasted text instead of
fetching it (fetching untrusted web content safely is `defuddle`'s job).

## Error handling

- Missing or unreadable source: report the problem, don't fabricate a
  summary.
- Note name collision: ask per step 5 — never silently overwrite.
- Vault directory not writable: report the error and stop.
