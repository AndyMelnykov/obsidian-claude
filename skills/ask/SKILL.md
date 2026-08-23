---
name: ask
description: "Answer a question from what's already captured in the vault: check indexes/ for a matching topic, then grep across every folder for relevant terms, read the matching notes, and answer directly from their content with [[wikilink]] citations — saying plainly when the vault doesn't have an answer rather than silently falling back to general knowledge. Read-only, never writes to the vault. Use when the question should be answered from existing vault notes, not when the user is handing Claude something new to capture."
---

# Ask the vault

This skill is read-only. It never creates, edits, or moves a note. If the
user wants the answer itself saved, that's a separate `capture` of the
conversation content (pasted text) — `ask` doesn't do that automatically.

## Steps

1. **Resolve the vault** per
   [Resolving the vault](../capture/references/note-format.md#resolving-the-vault)
   — an explicit directory named in the request, then the
   `OBSIDIAN_VAULT` environment variable, then the current directory.
   The `OBSIDIAN_VAULT` fallback is what lets this work consistently
   from an unrelated project directory or a different chat session,
   without repeating the vault path every time.
2. **Check `indexes/` first** for a topic index matching the question
   — per [Indexes](../capture/references/note-format.md#indexes), it's
   a faster, curated map of what exists and where than a cold grep. If
   nothing there covers it, or the question needs more than the
   index's own notes, **grep the whole vault** — all folders — for
   terms from the question: note titles, frontmatter tags, and body
   text. Read the notes that look relevant, starting with a handful;
   read more only if the question clearly needs broader coverage.
3. **Answer directly from what those notes say.** If the vault doesn't
   have an answer, say so plainly rather than guessing or silently
   falling back to general knowledge. It's fine to answer from general
   knowledge if the user asks for that too — just say explicitly when
   that's what's happening, versus when the answer is coming from the
   vault.
4. **Cite** which notes the answer drew from as `[[wikilink]]`s, so the
   user can jump to them in Obsidian.

## Out of scope

No retrieval beyond Grep/glob text search (no BM25, embeddings, or
reranking). No vault writes of any kind.
