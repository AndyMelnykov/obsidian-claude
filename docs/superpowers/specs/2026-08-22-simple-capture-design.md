# Simple capture/ask design

## Problem

The current claude-obsidian system (12 skills, ~18.7k lines of Python core,
transaction bundles, source/claim ledgers, address allocators, methodology
modes, MoCs, hot caches, log rollups) is more machinery than the actual goal
needs. The goal: capture source texts and images, write a short summary for
each, and link related notes together in Obsidian when useful. Everything
else in the current system is overhead against that goal.

## Scope

This spec covers a new, minimal, parallel system: two Claude Code skills,
`capture` and `ask`, with no Python core and no plugin-level transaction
machinery. It is designed clean-slate (a fresh vault with just a `notes/`
folder), not as a migration of an existing wiki-style vault. Migration from
the old format is an explicit non-goal for this spec — it can be designed
later, once the new format is proven.

The existing `skills/`, `agents/`, `claude_obsidian/`, `scripts/`,
`templates/`, `docs/` machinery is left in place, untouched. This is a
parallel, simpler alternative, not a replacement in this pass.

## Vault layout

```
vault/
├── notes/
│   ├── <slug-title>.md
│   ├── ...
│   └── attachments/
│       └── <original filename or a disambiguated version>
```

No `inbox/`, no `.raw/`, no `wiki/index.md` / `hot.md` / `log.md`, no
`.claude-obsidian.json` vault marker required. `capture` creates `notes/`
and `notes/attachments/` on first use if they don't exist. The user just
points Claude Code at any directory they treat as their vault (opened in
Obsidian or not).

## Note format

One Markdown file per captured source, `notes/<slug-title>.md`:

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

For an image or other binary attachment, the note additionally embeds it:

```markdown
![[attachments/<filename>]]
```

The slug is a short kebab-case version of the title (e.g. `notes/eu-ai-act-summary.md`).

## `capture` skill

**Trigger:** the user gives Claude a source to save — pasted text, a local
file path, an image, or a URL — and asks to capture/save/file it.

**Behavior:**

1. Resolve the vault: the current directory (or one the user names). No
   marker file or explicit registration required; if `notes/` doesn't
   exist, create it.
2. Read/view the source. For an image, use Claude's native image
   understanding to produce the summary; do not attempt OCR or any
   external tool.
3. If the source is a local binary file (image, PDF, etc.), copy it as-is
   into `notes/attachments/`, disambiguating the filename (e.g. append
   `-2`) if one already exists there with different content.
4. Derive a title and slug. Check whether `notes/<slug>.md` already
   exists:
   - If it doesn't, create it.
   - If it does, ask the user whether to update the existing note or
     create a new, differently-titled one. Don't silently overwrite.
5. Write the note: frontmatter, a short summary, and key
   points/quotes/excerpt. Keep it as short as the source allows — this is
   a summary, not a copy of the source.
6. Look for related notes: Grep existing `notes/*.md` titles, frontmatter
   tags, and the new note's key terms for an obvious overlap. If 1-3
   notes are clearly related, add `[[wikilink]]`s to them in the new
   note's body (in a sentence, not a bare bullet list). If nothing is
   obviously related, add no links — don't force it.
7. Report the note path (and attachment path, if any) and any links
   added.

**Explicitly out of scope for `capture`:** transactions/bundles, SHA-256
manifests, source/claim ledgers, address allocation, methodology modes,
index/MoC maintenance, git checkpointing. Plain file reads/writes/copies
only, using the host's normal file tools.

## `ask` skill

**Trigger:** the user asks a question that should be answered from what's
already in the vault (as opposed to asking Claude to capture something
new).

**Behavior:**

1. Resolve the vault the same way as `capture`.
2. Grep `notes/*.md` for terms from the question (titles, tags, and body
   text). Read the notes that look relevant — start with a handful, read
   more only if the question clearly needs broader coverage.
3. Answer directly from what those notes say. If the vault doesn't have
   an answer, say so plainly rather than guessing or falling back to
   general knowledge silently — it's fine to answer from general
   knowledge if asked, but say when that's happening versus when it's
   coming from the vault.
4. Cite which notes the answer drew from as `[[wikilink]]`s so the user
   can jump to them in Obsidian.

**`ask` never writes to the vault.** If the user wants to save the answer
itself, that's a separate `capture` of the conversation content (pasted
text), not something `ask` does automatically.

## Error handling

- Missing/unreadable source: report the problem, don't fabricate a
  summary.
- Note name collision: ask, per step 4 above — never silent-overwrite.
- Vault directory not writable: report the error and stop.

There is no transaction/rollback system in this design. A capture is a
small number of plain file operations (write one note, optionally copy
one attachment); if it partially fails, the user can just re-run it or
fix the note by hand. This tradeoff is deliberate — see "Why no
transactions" below.

## Why no transactions

The old system's transaction/ledger machinery exists to make multi-file,
multi-agent writes safe and recoverable. This design produces at most two
files per capture (one note, optionally one attachment copy) written
directly by the single acting agent, with no parallel workers mutating
the vault. That doesn't need a bundle/inspect/apply/recover pipeline —
plain writes are already atomic enough for the actual failure modes
(the agent just re-runs a failed capture). If a future need reintroduces
concurrent writers, that's a reason to revisit this, not a reason to
build it in now.

## Testing

No test suite is proposed as part of this spec — there's no Python code
to unit test. Verification is manual: run `capture` against a text
source, a pasted excerpt, and an image; run `ask` against the resulting
notes; confirm note format, attachment copying, collision handling, and
that links only appear when genuinely relevant (not forced).

## Non-goals (explicitly deferred, not decided against)

- Migrating an existing wiki-style vault to this format.
- URL/web capture (fetching content) — same untrusted-content handling
  concerns as the old `wiki-ingest` apply here if this is added later.
- Any retrieval beyond Grep (BM25, embeddings, reranking).
- Deleting or refactoring the existing `claude-obsidian` skills/core.
