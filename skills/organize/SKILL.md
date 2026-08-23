---
name: organize
description: "Sort inbox/ notes into notes/ or projects/ folders using the fuller vault context, normalizing any raw manually-dropped files into the note template's structure first, re-run the linking pass against notes that had nothing to link to at capture time, keep topic index pages current, and audit the vault for notes with no incoming or outgoing wikilinks. Use only when the user explicitly asks to organize/sort/tidy the vault or find orphan/unlinked notes — never run automatically after capture."
---

# Organize the vault

Read [the note format and vault layout reference](../capture/references/note-format.md)
first — organize reuses its folder-placement rule, index maintenance,
and linking pass.

This skill never runs as a side effect of `capture` or anything else —
only when the user explicitly asks (e.g. "organize the inbox", "sort my
notes", "tidy the vault", "any orphan notes?", "what's not connected?").

## Filing mode

Trigger: "organize the inbox", "sort my notes", "tidy the vault", or
similar.

1. **Resolve the vault** per
   [Resolving the vault](../capture/references/note-format.md#resolving-the-vault).
   List everything in `inbox/`. If it's empty, say so and stop.
2. **Normalize anything that isn't already in the template's shape.**
   A file the user dropped into `inbox/` themselves (not via `capture`)
   may have no frontmatter and no source/content/connections
   structure. Before deciding its destination, wrap it into
   `templates/note-template.md`'s current shape: derive a title/slug
   if it doesn't already look like one, set the source role (the
   original filename, or "pasted" if there's no clue), and place its
   existing text verbatim under the content role. This is structural
   normalization, not a rewrite — the wording stays exactly as given;
   it's not turned into a summary in anyone's "own words" the way a
   fresh `capture` would.
3. **For each inbox note**, decide its destination — `projects/<slug>/`
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
4. **After moving a note**, re-run the
   [linking pass](../capture/references/note-format.md#linking-pass)
   against the fuller vault — a note captured before a related one
   existed may not have had anything to link to yet.
5. **Report** what moved where, what got newly linked, what got
   normalized from a raw drop, and what's still sitting in `inbox/`
   unplaced.

## Link audit mode

Trigger: "any orphan notes?", "what's not connected?", or a similar
request to find unlinked/isolated notes.

1. Scan every note's outgoing `[[wikilinks]]`. Build the reverse
   (incoming) map from that.
2. Report every note with neither incoming nor outgoing links.
3. This is a report only. Don't force-link an orphan — a genuinely
   standalone note is a valid outcome, not a defect. The user decides
   whether to connect it (via a follow-up capture or edit) or leave it as
   is.

## Out of scope

Doesn't rewrite a note's wording or summarize on its own initiative —
step 2's normalization only wraps already-existing text into the
template's structure, it never rephrases it. Doesn't run automatically
after every capture; only on an explicit request.

## Error handling

- Move collision (destination folder already has a same-named file): ask,
  don't overwrite — same rule as capture's collision handling.
- Vault directory not writable: report the error and stop.
