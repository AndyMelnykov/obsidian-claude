---
name: organize
description: "Sort inbox/ notes into topic folders using the fuller vault context, re-run the linking pass against notes that had nothing to link to at capture time, and audit the vault for notes with no incoming or outgoing wikilinks. Use only when the user explicitly asks to organize/sort/tidy the vault or find orphan/unlinked notes — never run automatically after capture."
---

# Organize the vault

Read [the note format and vault layout reference](../capture/references/note-format.md)
first — organize reuses its folder-placement heuristic and linking pass.

This skill never runs as a side effect of `capture` or anything else —
only when the user explicitly asks (e.g. "organize the inbox", "sort my
notes", "tidy the vault", "any orphan notes?", "what's not connected?").

## Filing mode

Trigger: "organize the inbox", "sort my notes", "tidy the vault", or
similar.

1. **Resolve the vault**, the same way as `capture`. List everything in
   `inbox/`. If it's empty, say so and stop.
2. **For each inbox note**, decide where it now belongs using the
   [folder-placement heuristic](../capture/references/note-format.md#folder-placement)
   — the same logic `capture` uses, but now weighed against whatever else
   has been captured since. Before moving, re-check the
   [uniqueness rule](../capture/references/note-format.md#slug-and-filename-uniqueness)
   against the destination: if the target folder already has a same-named
   file, ask the user whether to update it or rename the incoming note —
   never overwrite. Move the note (a plain move; delete-and-rewrite only
   if the host has no move primitive), creating the destination folder if
   a clear new grouping emerges. A note that's still not a confident fit
   stays in `inbox/` — don't force placement just to empty the folder.
3. **After moving a note**, re-run the
   [linking pass](../capture/references/note-format.md#linking-pass)
   against the fuller vault — a note captured before a related one
   existed may not have had anything to link to yet.
4. **Report** what moved where, what got newly linked, and what's still
   sitting in `inbox/` unplaced.

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

Doesn't touch note content beyond adding links in the linking pass — no
rewriting summaries, no editing frontmatter beyond what a move implies.
Doesn't run automatically after every capture; only on an explicit
request.

## Error handling

- Move collision (destination folder already has a same-named file): ask,
  don't overwrite — same rule as capture's collision handling.
- Vault directory not writable: report the error and stop.
