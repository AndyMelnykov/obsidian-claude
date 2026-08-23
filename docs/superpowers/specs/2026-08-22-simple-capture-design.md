# Simple capture/ask/organize design

## Problem

The current claude-obsidian system (12 skills, ~18.7k lines of Python core,
transaction bundles, source/claim ledgers, address allocators, methodology
modes, MoCs, hot caches, log rollups) is more machinery than the actual goal
needs. The goal: capture source texts and images, write a short summary for
each, file them into a folder structure that makes sense, and link related
notes together in Obsidian when useful. Everything else in the current
system is overhead against that goal.

## Scope

This spec covers a minimal system of five Claude Code skills —
`capture`, `organize`, `ask`, `defuddle`, and `autoresearch` — with no
Python core and no plugin-level transaction machinery. It was designed
clean-slate (a fresh vault with just an `inbox/` folder), not as a
migration of an existing wiki-style vault. Migration from any older
format is an explicit non-goal — it can be designed later, if ever
needed.

The legacy transaction-based system (12 skills, the Python core,
scripts, templates, examples, older docs) that originally lived
alongside this one has since been removed entirely from this repo —
this is the only system now, not a parallel alternative to something
else.

`defuddle` (web page cleaning) and `autoresearch` (bounded web
research) were initially deferred, on the reasoning that their
fetch/safety/evidence logic didn't depend on the old system but their
*filing* step was hard-wired to transaction bundles, ledgers, and MoC
updates. Both have since been redesigned onto this note format and are
implemented (see their own `SKILL.md` files and "Implemented: defuddle
and autoresearch" below).

## Resolving the vault

In this order: an explicit directory named in the current request;
then the `OBSIDIAN_VAULT` environment variable, if set; then the
current directory as a last resort. The environment-variable fallback
is what lets `ask` (and the other skills) work consistently across
unrelated project directories and separate chat sessions, without
repeating the vault path in every request.

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
instead of directly at the vault root. Nesting stays shallow: at most
one subtopic level (`notes/<topic>/<subtopic>/...`); a grouping that
seems to need a third level should be its own topic or project instead.

`inbox/` is where a note lands when `capture` isn't confident whether
something is a `notes/` topic or a `projects/` initiative, or which
topic/project it belongs to — not a place notes are expected to stay.
`attachments/` stays flat and holds every copied-in binary source,
referenced by notes from wherever they live in the tree.

No `.raw/`, no `wiki/index.md` / `hot.md` / `log.md`, no
`.claude-obsidian.json` vault marker required.

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

**Explicit override:** when the request itself says to add it to the
inbox (e.g. "add this to inbox", "drop this in the inbox") rather than
a general "capture/save/file this," skip this decision entirely and
file straight to `inbox/` — an explicit instruction, not a fallback
guess, deferring the placement call to a later `organize` pass.

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

## `capture` skill

**Trigger:** the user gives Claude a source to save — pasted text, a local
file path, an image, or a URL — and asks to capture/save/file it.

**Behavior:**

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

**Explicitly out of scope for `capture`:** transactions/bundles, SHA-256
manifests, source/claim ledgers, address allocation, methodology modes,
index/MoC maintenance, git checkpointing. Plain file reads/writes/copies
only, using the host's normal file tools.

## `organize` skill

**Trigger:** the user runs it explicitly (e.g. "organize the inbox", "sort
my notes", "tidy the vault") — never automatic, never run as a side effect
of `capture`.

**Behavior:**

1. Resolve the vault. List everything in `inbox/`. If it's empty, say so
   and stop.
2. Normalize anything that isn't already in the template's shape — a
   file the user dropped into `inbox/` manually (not via `capture`) may
   have no frontmatter or source/content/connections structure. Wrap it
   into `templates/note-template.md`'s current shape (derive a
   title/slug, set the source role, place its existing text verbatim
   under the content role) before deciding where it goes. This is
   structural normalization, not a rewrite — the wording is preserved
   exactly as given.
3. For each inbox note, decide its destination — `projects/<slug>/` or
   `notes/<topic>/` — using the same heuristic and fallback question as
   `capture`, but with the benefit of whatever's been captured since.
   Move it (plain move, or delete+rewrite if the host has no move
   primitive) to that destination, creating the folder if a clear new
   grouping emerges. If it lands in `notes/<topic>/`, ensure
   `indexes/<Topic>.md` exists and lists it. A note that's still not a
   confident fit for either stays in `inbox/` — organize doesn't force
   placement just to empty the folder.
4. After moving a note, re-run the linking pass (capture step 9) against
   the fuller vault — a note captured a week before a related one may not
   have had anything to link to yet.
5. Report what moved where, what got newly linked, what got normalized
   from a raw drop, and what's still sitting in `inbox/` unplaced.

**Link audit mode:** when asked to find unlinked/isolated notes (e.g. "any
orphan notes?", "what's not connected?"), scan every note's outgoing
`[[wikilinks]]` and build the reverse (incoming) map from that. Report
notes with neither incoming nor outgoing links. This is a report only —
organize doesn't force-link an orphan; a genuinely standalone note is a
valid outcome, not a defect. The user decides whether to connect it (via a
follow-up capture/edit) or leave it.

**Explicitly out of scope for `organize`:** does not rewrite a note's
wording or summarize on its own initiative — step 2's normalization
only wraps already-existing text into the template's structure, never
rephrases it; does not run automatically after every capture.

## `ask` skill

**Trigger:** the user asks a question that should be answered from what's
already in the vault (as opposed to asking Claude to capture something
new).

**Behavior:**

1. Resolve the vault the same way as `capture`.
2. Check `indexes/` first for a topic index matching the question —
   it's a faster, curated map of what exists and where than a cold
   grep. If nothing there covers it, or the question needs more than
   the index's own notes, grep the whole vault (all folders) for terms
   from the question (titles, tags, and body text). Read the notes that
   look relevant — start with a handful, read more only if the question
   clearly needs broader coverage.
3. Answer directly from what those notes say. If the vault doesn't have an
   answer, say so plainly rather than guessing or falling back to general
   knowledge silently — it's fine to answer from general knowledge if
   asked, but say when that's happening versus when it's coming from the
   vault.
4. Cite which notes the answer drew from as `[[wikilink]]`s so the user can
   jump to them in Obsidian.

**`ask` never writes to the vault.** If the user wants to save the answer
itself, that's a separate `capture` of the conversation content (pasted
text), not something `ask` does automatically.

## Error handling

- Missing/unreadable source: report the problem, don't fabricate a summary.
- Note name collision: ask, per capture step 5 above — never silent-overwrite.
- Vault directory not writable: report the error and stop.
- `organize` move collision (target folder already has a same-named file):
  same rule as capture — ask, don't overwrite.

There is no transaction/rollback system in this design. A capture or an
organize pass is a small number of plain file operations (write/move one
note, optionally copy one attachment) done directly by the single acting
agent, with no parallel workers mutating the vault. That doesn't need a
bundle/inspect/apply/recover pipeline — plain writes are already atomic
enough for the actual failure modes (the agent just re-runs a failed
capture, or re-runs organize, which is idempotent by nature: a note
already in the right place just doesn't move). If a future need
reintroduces concurrent writers, that's a reason to revisit this, not a
reason to build it in now.

## Implemented: defuddle and autoresearch

Both were redesigned onto this note format rather than left on the old
transaction-bundle filing step (see their `SKILL.md` files for the
current behavior). Their fetch/safety/evidence logic — `defuddle`'s
HTTPS-only safety contract and `autoresearch`'s bounded research loop —
carried forward close to as-is, since it never depended on the old
system. Only the filing step changed: both now write plain notes via
the same `notes/`/`projects/`/`inbox/` rules as `capture`, with no
bundle and no ledger.

## Testing

No test suite is proposed as part of this spec — there's no Python code to
unit test. Verification is manual: run `capture` against a text source, a
pasted excerpt, and an image, confirming folder placement, `inbox/`
fallback, attachment copying, collision handling, and that links only
appear when genuinely relevant; run `organize` against a populated `inbox/`
and confirm filing, re-linking, and the link-audit mode; run `ask` against
the resulting notes.

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
