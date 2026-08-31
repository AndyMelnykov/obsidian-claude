# 001: Plain Markdown on the filesystem, no database

## Context

claude-obsidian needs somewhere to store captured notes, their
organization (topics, projects, indexes), and the links between them.
A database (SQLite, a vector store, a hosted service) would make
querying and ranking easier to implement.

## Options considered

- **A local database** (e.g. SQLite) for notes, metadata, and links.
  Easier to query, but adds a schema to migrate, a binary dependency,
  and a second source of truth that can drift from the files a user
  actually reads and edits in Obsidian.
- **A hosted/cloud backend.** Rejected outright — it contradicts the
  project's local-first premise and would require network access for
  every read.
- **Plain Markdown files on disk**, organized by folder convention
  (`notes/`, `projects/`, `indexes/`, `inbox/`), with structure
  (links, topics) expressed in the files themselves via `[[wikilinks]]`
  and frontmatter.

## Decision

Plain Markdown files on disk. No database, no Python runtime, no
transaction log or ledger. `capture`, `organize`, and `ask` read and
write files directly using the host's normal file tools.

## Consequences

- Notes remain portable, human-readable, and versionable (plain `git`
  works if the user's vault is a git repo) with zero migration risk.
- The file collection is the only source of truth — there's no
  separate index that can go stale relative to the files.
- Some operations that a database would make trivial (e.g. "find all
  notes tagged X sorted by date") instead rely on grep/glob over the
  vault, which is slower at large scale but keeps the system
  inspectable without any tooling beyond a text editor.
- This decision is revisited only if vault sizes in practice make
  file-scanning workflows unworkably slow — not preemptively.
