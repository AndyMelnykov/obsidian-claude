# Simple capture/organize/ask Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new, minimal Claude Code skills — `capture`, `organize`, `ask` — that file sources into one-note-per-source Markdown, with no Python core and no transaction/ledger/MoC machinery, as a parallel alternative to the existing `claude-obsidian` system.

**Architecture:** Three plain `skills/<name>/SKILL.md` prompt files (frontmatter: `name` + `description` only, matching every existing skill in this repo) plus one shared reference doc holding the note format, folder-placement heuristic, and linking pass that all three skills reuse. No scripts, no `claude_obsidian/` core changes, no changes to any existing skill. Each skill is verified by hand-running it against a scratch vault (there is no code to unit test).

**Tech Stack:** Markdown-only Claude Code Agent Skills (no scripts, no dependencies). Verification uses the Bash tool against a throwaway temp directory.

**Spec:** [docs/superpowers/specs/2026-08-22-simple-capture-design.md](../specs/2026-08-22-simple-capture-design.md)

## Global Constraints

- No Python core, no `claude-obsidian.transaction.v1` bundles, no source/claim ledgers, no MoC/index maintenance, no git checkpointing — plain file read/write/move/copy only.
- `inbox/` is the only required folder; `attachments/` holds copied-in binaries. No `.raw/`, no `wiki/*.md`, no vault marker file.
- Filenames (slugs) must be checked for uniqueness **vault-wide**, not per-folder, before any write or move — Obsidian resolves bare `[[wikilinks]]` by filename regardless of folder.
- Never silently overwrite on a slug/filename collision — always ask the user.
- Images are summarized via Claude's native image understanding only — no OCR, no external tool.
- `capture` does not fetch URLs itself (no network egress in this pass) — URL fetching is deferred to a future `defuddle` redesign.
- `organize` never runs automatically (not as a side effect of `capture` or anything else) — only on an explicit user request.
- `ask` never writes to the vault under any circumstance.
- Existing `skills/`, `agents/`, `claude_obsidian/`, `scripts/`, `templates/` files are left untouched by this plan except the one documentation line added in Task 8.

---

### Task 1: Shared note-format reference

**Files:**
- Create: `skills/capture/references/note-format.md`

**Interfaces:**
- Produces: a Markdown reference doc with stable heading anchors `#note-format`, `#slug-and-filename-uniqueness`, `#folder-placement`, `#linking-pass`. Tasks 2, 4, and 6 link to these anchors from `../capture/references/note-format.md` (organize, ask) or `references/note-format.md` (capture itself).

- [ ] **Step 1: Create the reference file**

Create `skills/capture/references/note-format.md`:

````markdown
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
````

- [ ] **Step 2: Verify required sections are present**

Run: `grep -c "^## " "skills/capture/references/note-format.md"`
Expected: `4` (Note format, Slug and filename uniqueness, Folder placement, Linking pass — "Vault layout" is also a `##` heading, so expected count is actually 5; run the command and confirm every one of the five headings listed above is present by eye).

- [ ] **Step 3: Commit**

```bash
git add skills/capture/references/note-format.md
git commit -m "docs: add shared note-format reference for capture/organize/ask"
```

---

### Task 2: `capture` skill

**Files:**
- Create: `skills/capture/SKILL.md`

**Interfaces:**
- Consumes: `skills/capture/references/note-format.md` (Task 1) via relative link `references/note-format.md`.
- Produces: the `capture` skill, invoked by name once installed/registered by the host the same way every other `skills/<name>/SKILL.md` in this repo is invoked (no separate registration step in this repo layout — confirm by checking that no other skill has an entry anywhere besides its own `SKILL.md` file, e.g. `grep -rl "name: save" skills/ agents/` should only hit `skills/save/SKILL.md`).

- [ ] **Step 1: Create the skill file**

Create `skills/capture/SKILL.md`:

```markdown
---
name: capture
description: "Capture a source — pasted text, a local file path, an image, or a URL — into the vault as one plain Markdown note: derive a title/slug, place it in an existing or new topic folder (or inbox/ if unsure), copy any binary attachment, and add wikilinks to genuinely related notes. Use when the user gives Claude a source and asks to capture/save/file it. This is the minimal note-per-source system (no transactions, ledgers, or MoCs) — see save/wiki-ingest for the legacy transaction-based system."
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
```

- [ ] **Step 2: Verify frontmatter and structure**

Run: `head -n 4 "skills/capture/SKILL.md"` — confirm it starts with `---`, `name: capture`, a `description:` line, then `---`.
Run: `grep -c "^## " "skills/capture/SKILL.md"` — expect `3` (`## Steps`, `## Out of scope`, `## Error handling`).

- [ ] **Step 3: Commit**

```bash
git add skills/capture/SKILL.md
git commit -m "feat: add capture skill for minimal note-per-source filing"
```

---

### Task 3: Verify `capture` against a scratch vault

**Files:**
- None created in the repo. Uses a throwaway temp directory (deleted at the end of this task).

**Interfaces:**
- Consumes: `skills/capture/SKILL.md` and `skills/capture/references/note-format.md` (Tasks 1-2) — this task's executor follows those instructions by hand, playing the role of the skill, exactly as a host invoking the skill would.

There is no automated test harness for a prompt skill — this task *is* the test cycle the spec's "Testing" section calls for. Follow the steps below by hand.

- [ ] **Step 1: Build the scratch vault**

```bash
VAULT=$(mktemp -d)
mkdir -p "$VAULT/climate/policy"
cat > "$VAULT/climate/policy/eu-ai-act-summary.md" <<'EOF'
---
title: EU AI Act summary
date: 2026-01-10
source: pasted
tags: [ai, regulation, eu]
---

## Summary

Overview of the EU AI Act's risk-tiered obligations for AI system providers.

## Notes

- Four risk tiers: unacceptable, high, limited, minimal.
- Providers of high-risk systems face conformity assessment duties.
EOF
echo "$VAULT"
```

Expected: the path printed by the last `echo` exists and contains
`climate/policy/eu-ai-act-summary.md`.

- [ ] **Step 2: Capture a plain text source into an obvious existing folder**

Write a source file:

```bash
cat > "$VAULT/source-eu-data-act.txt" <<'EOF'
The EU Data Act (Regulation 2023/2854) governs access to and use of data
generated by connected devices and related services. It gives users rights
to access data generated by their IoT devices and sets rules for
business-to-business and business-to-government data sharing. It entered
into force in January 2024 with most obligations applying from September
2025.
EOF
```

Now, acting as the `capture` skill against `$VAULT/source-eu-data-act.txt`
with vault root `$VAULT`, follow `skills/capture/SKILL.md` steps 1-8
by hand:

- Step 1: `inbox/` and `attachments/` already implied to exist per the
  vault-init rule — create them if missing: `mkdir -p "$VAULT/inbox" "$VAULT/attachments"`.
- Step 4: derive slug `eu-data-act-summary`; grep the whole vault for that
  filename (`find "$VAULT" -name 'eu-data-act-summary.md'`) — expect no
  match, so continue.
- Step 5: `climate/policy/` exists but is about AI regulation, not an
  obvious fit for the EU Data Act by topic overlap — decide there's no
  confident existing folder. Since this is a second EU-tech-regulation
  source, a new `eu-tech-regulation/` folder is a defensible new grouping;
  either that or `inbox/` is an acceptable outcome for this manual check —
  pick `eu-tech-regulation/` to exercise "create a new topic folder".
- Step 6: write `$VAULT/eu-tech-regulation/eu-data-act-summary.md` with
  frontmatter (`title: EU Data Act summary`, `date` = today, `source:
  source-eu-data-act.txt`, no tags required) and the two required
  `## Summary` / `## Notes` sections, summarizing the pasted text above.
- Step 7: grep note titles/tags across `$VAULT` for overlap — `EU AI Act
  summary` shares the `eu`/regulation theme; add one linking sentence in
  the new note's body, e.g. "Complements the [[eu-ai-act-summary|EU AI Act
  summary]] as a second piece of EU digital-regulation."
- Step 8: report the note path, no attachment, one link added, not in
  `inbox/`.

Expected outcome to confirm:
- [ ] `$VAULT/eu-tech-regulation/eu-data-act-summary.md` exists with valid
      frontmatter and both required sections.
- [ ] It contains a `[[eu-ai-act-summary]]`-style wikilink worked into a
      sentence, not a bare bullet.
- [ ] Nothing was written to `inbox/` for this capture.

- [ ] **Step 3: Capture with no confident folder match (inbox fallback)**

```bash
cat > "$VAULT/source-recipe.txt" <<'EOF'
A simple sourdough starter recipe: mix 50g flour and 50g water daily,
discard half before each feeding, ready to bake with after about a week
once it reliably doubles in volume within 4-6 hours of feeding.
EOF
```

Follow `capture` by hand again: derive slug `sourdough-starter-recipe`, no
collision, and at step 5 there is no existing folder about baking/food and
no clear new grouping worth creating for a single unrelated note — file it
to `$VAULT/inbox/sourdough-starter-recipe.md` instead.

Expected outcome to confirm:
- [ ] `$VAULT/inbox/sourdough-starter-recipe.md` exists with valid
      frontmatter and both required sections.
- [ ] No new topic folder was invented for one unrelated note.
- [ ] No wikilinks were added (nothing in the vault is genuinely related).

- [ ] **Step 4: Capture a binary attachment (image)**

```bash
python3 -c "
import struct, zlib
def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))
width, height = 4, 4
raw = b''.join(b'\x00' + bytes([255,0,0]*width) for _ in range(height))
ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
open('$VAULT/source-red-square.png', 'wb').write(png)
"
```

Follow `capture` by hand: view the image (a small solid-red square — note
this in the summary as a synthetic test image), copy it into
`$VAULT/attachments/red-square.png`, derive slug `red-square-test-image`,
write `$VAULT/inbox/red-square-test-image.md` (no confident folder match)
embedding `![[attachments/red-square.png]]`.

Expected outcome to confirm:
- [ ] `$VAULT/attachments/red-square.png` exists (copied, not moved from
      its original location — confirm the source file still exists too).
- [ ] `$VAULT/inbox/red-square-test-image.md` embeds
      `![[attachments/red-square.png]]` and has a summary describing the
      image content.

- [ ] **Step 5: Collision handling**

Re-run step 2's capture verbatim (same title "EU Data Act summary", same
source text) against the same `$VAULT`. Per step 4 of the skill, this must
detect the existing `eu-tech-regulation/eu-data-act-summary.md` by
vault-wide slug search and ask the user to choose update-vs-new, rather
than silently overwriting.

Expected outcome to confirm:
- [ ] The dry run identifies the collision (do not actually overwrite the
      file — this is a decision-point check, not a file-write check).

- [ ] **Step 6: Clean up**

```bash
rm -rf "$VAULT"
```

- [ ] **Step 7: No commit for this task**

This task produces no repo changes — it only exercises Task 2's file. If
Step 1-5 above surfaced a wording problem in `skills/capture/SKILL.md` or
`skills/capture/references/note-format.md`, fix it now, re-run the
relevant step to confirm, then commit the fix:

```bash
git add skills/capture/SKILL.md skills/capture/references/note-format.md
git commit -m "fix: clarify capture skill wording found during manual verification"
```

(Skip the commit entirely if no fix was needed.)

---

### Task 4: `organize` skill

**Files:**
- Create: `skills/organize/SKILL.md`

**Interfaces:**
- Consumes: `../capture/references/note-format.md` (Task 1) via relative link.
- Produces: the `organize` skill.

- [ ] **Step 1: Create the skill file**

Create `skills/organize/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Verify frontmatter and structure**

Run: `head -n 4 "skills/organize/SKILL.md"` — confirm `---`/`name: organize`/`description:`/`---`.
Run: `grep -c "^## " "skills/organize/SKILL.md"` — expect `4` (`## Filing mode`, `## Link audit mode`, `## Out of scope`, `## Error handling`).

- [ ] **Step 3: Commit**

```bash
git add skills/organize/SKILL.md
git commit -m "feat: add organize skill for inbox filing and link auditing"
```

---

### Task 5: Verify `organize` against a scratch vault

**Files:**
- None created in the repo. Uses a throwaway temp directory (deleted at the end of this task).

**Interfaces:**
- Consumes: `skills/organize/SKILL.md` and `skills/capture/references/note-format.md` (Tasks 1, 4).

- [ ] **Step 1: Build a scratch vault with a populated inbox**

```bash
VAULT=$(mktemp -d)
mkdir -p "$VAULT/climate/policy" "$VAULT/inbox" "$VAULT/attachments"

cat > "$VAULT/climate/policy/eu-ai-act-summary.md" <<'EOF'
---
title: EU AI Act summary
date: 2026-01-10
source: pasted
tags: [ai, regulation, eu]
---

## Summary

Overview of the EU AI Act's risk-tiered obligations for AI system providers.

## Notes

- Four risk tiers: unacceptable, high, limited, minimal.
EOF

cat > "$VAULT/inbox/eu-data-act-summary.md" <<'EOF'
---
title: EU Data Act summary
date: 2026-01-11
source: pasted
tags: [regulation, eu]
---

## Summary

Overview of the EU Data Act's rules for IoT data access and B2B/B2G sharing.

## Notes

- Entered into force January 2024; most obligations from September 2025.
EOF

cat > "$VAULT/inbox/sourdough-starter-recipe.md" <<'EOF'
---
title: Sourdough starter recipe
date: 2026-01-11
source: pasted
tags: []
---

## Summary

A daily-feeding sourdough starter recipe ready to bake with in about a week.

## Notes

- 50g flour + 50g water daily, discard half before each feeding.
EOF

echo "$VAULT"
```

- [ ] **Step 2: Run filing mode by hand**

Following `skills/organize/SKILL.md`'s Filing mode against `$VAULT`:

- `eu-data-act-summary.md`: now that `climate/policy/` exists alongside an
  EU-regulation note, decide whether `climate/policy/` is a topic fit —
  it's AI-specific, not a general EU-regulation folder, so create
  `$VAULT/eu-tech-regulation/` and move the note there (`mv
  "$VAULT/inbox/eu-data-act-summary.md" "$VAULT/eu-tech-regulation/"`, after
  `mkdir -p "$VAULT/eu-tech-regulation"`). Re-run the uniqueness check
  first (`find "$VAULT" -name eu-data-act-summary.md` before moving —
  expect exactly one hit, in `inbox/`).
- After moving, re-run the linking pass: `eu-ai-act-summary.md` is now a
  clear match — add a wikilink sentence to the moved note pointing at
  `[[eu-ai-act-summary]]`.
- `sourdough-starter-recipe.md`: still nothing in the vault relates to it
  and no clear grouping — leave it in `inbox/`.

Expected outcome to confirm:
- [ ] `$VAULT/eu-tech-regulation/eu-data-act-summary.md` exists;
      `$VAULT/inbox/eu-data-act-summary.md` no longer does.
- [ ] The moved note now contains a `[[eu-ai-act-summary]]` wikilink in a
      sentence.
- [ ] `$VAULT/inbox/sourdough-starter-recipe.md` is unchanged and still in
      `inbox/`.

- [ ] **Step 3: Run link audit mode by hand**

Following the Link audit mode against the post-filing `$VAULT`:

```bash
grep -rlo '\[\[[^]]*\]\]' "$VAULT" --include='*.md'
```

Build the outgoing/incoming map by hand from the grep output. Expect:
- `eu-tech-regulation/eu-data-act-summary.md` → outgoing link to
  `eu-ai-act-summary`.
- `climate/policy/eu-ai-act-summary.md` → no outgoing link, but has one
  incoming link (not an orphan).
- `inbox/sourdough-starter-recipe.md` → no outgoing, no incoming — this is
  the one orphan to report.

Expected outcome to confirm:
- [ ] The audit reports exactly `sourdough-starter-recipe.md` as the
      orphan, and doesn't flag `eu-ai-act-summary.md` (it has an incoming
      link even with no outgoing one).
- [ ] Nothing was rewritten by the audit itself — it's report-only.

- [ ] **Step 4: Clean up**

```bash
rm -rf "$VAULT"
```

- [ ] **Step 5: No commit for this task**

Fix and commit only if verification surfaced a wording problem, same as
Task 3 Step 7:

```bash
git add skills/organize/SKILL.md skills/capture/references/note-format.md
git commit -m "fix: clarify organize skill wording found during manual verification"
```

(Skip if no fix was needed.)

---

### Task 6: `ask` skill

**Files:**
- Create: `skills/ask/SKILL.md`

**Interfaces:**
- Consumes: nothing from Tasks 1-5 directly (no shared-reference link needed — `ask` only reads notes, it doesn't need the write-side rules), but assumes the note format from Task 1 when reading frontmatter/tags/body.
- Produces: the `ask` skill.

- [ ] **Step 1: Create the skill file**

Create `skills/ask/SKILL.md`:

```markdown
---
name: ask
description: "Answer a question from what's already captured in the vault: grep across every folder for relevant terms, read the matching notes, and answer directly from their content with [[wikilink]] citations — saying plainly when the vault doesn't have an answer rather than silently falling back to general knowledge. Read-only, never writes to the vault. Use when the question should be answered from existing vault notes, not when the user is handing Claude something new to capture."
---

# Ask the vault

This skill is read-only. It never creates, edits, or moves a note. If the
user wants the answer itself saved, that's a separate `capture` of the
conversation content (pasted text) — `ask` doesn't do that automatically.

## Steps

1. **Resolve the vault**, the same way as `capture`.
2. **Grep the whole vault** — all folders, not just one — for terms from
   the question: note titles, frontmatter tags, and body text. Read the
   notes that look relevant, starting with a handful; read more only if
   the question clearly needs broader coverage.
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
```

- [ ] **Step 2: Verify frontmatter and structure**

Run: `head -n 4 "skills/ask/SKILL.md"` — confirm `---`/`name: ask`/`description:`/`---`.
Run: `grep -c "^## " "skills/ask/SKILL.md"` — expect `2` (`## Steps`, `## Out of scope`).

- [ ] **Step 3: Commit**

```bash
git add skills/ask/SKILL.md
git commit -m "feat: add ask skill for read-only vault Q&A"
```

---

### Task 7: Verify `ask` against a scratch vault

**Files:**
- None created in the repo. Uses a throwaway temp directory (deleted at the end of this task).

**Interfaces:**
- Consumes: `skills/ask/SKILL.md` (Task 6) and the notes produced by Task 5's setup pattern.

- [ ] **Step 1: Build a scratch vault with two related notes and one unrelated note**

```bash
VAULT=$(mktemp -d)
mkdir -p "$VAULT/eu-tech-regulation" "$VAULT/inbox"

cat > "$VAULT/eu-tech-regulation/eu-ai-act-summary.md" <<'EOF'
---
title: EU AI Act summary
date: 2026-01-10
source: pasted
tags: [ai, regulation, eu]
---

## Summary

Overview of the EU AI Act's risk-tiered obligations for AI system
providers: four tiers (unacceptable, high, limited, minimal); high-risk
providers face conformity assessment duties.

## Notes

- Four risk tiers: unacceptable, high, limited, minimal.
- Providers of high-risk systems face conformity assessment duties.
EOF

cat > "$VAULT/eu-tech-regulation/eu-data-act-summary.md" <<'EOF'
---
title: EU Data Act summary
date: 2026-01-11
source: pasted
tags: [regulation, eu]
---

## Summary

The EU Data Act (Regulation 2023/2854) governs IoT data access rights and
B2B/B2G data sharing rules; in force since January 2024, most obligations
apply from September 2025.

## Notes

- Entered into force January 2024; most obligations from September 2025.

Complements the [[eu-ai-act-summary]] as a second piece of EU digital
regulation.
EOF

cat > "$VAULT/inbox/sourdough-starter-recipe.md" <<'EOF'
---
title: Sourdough starter recipe
date: 2026-01-11
source: pasted
tags: []
---

## Summary

A daily-feeding sourdough starter recipe ready to bake with in about a week.

## Notes

- 50g flour + 50g water daily, discard half before each feeding.
EOF
```

- [ ] **Step 2: Ask a question the vault can answer**

Question: "How many risk tiers does the EU AI Act define, and does the EU
Data Act relate to it?"

Following `skills/ask/SKILL.md`:

```bash
grep -rli "ai act\|risk tier\|data act" "$VAULT" --include='*.md'
```

Read the two matched notes, then answer by hand from their content: four
tiers (unacceptable, high, limited, minimal); yes, the Data Act note
explicitly cross-references the AI Act note as a related piece of EU
digital regulation.

Expected outcome to confirm:
- [ ] The answer states the four tiers correctly, sourced from
      `eu-ai-act-summary.md`.
- [ ] The answer cites both notes as `[[eu-ai-act-summary]]` and
      `[[eu-data-act-summary]]`.
- [ ] No file in `$VAULT` was created, edited, or moved by this step
      (confirm with `git status`-equivalent: re-run the Step 1 heredocs'
      `diff` mentally, or just `ls -la` the three files and check
      timestamps are unchanged).

- [ ] **Step 3: Ask a question the vault cannot answer**

Question: "What does the vault say about GDPR consent requirements?"

Following `skills/ask/SKILL.md`:

```bash
grep -rli "gdpr\|consent" "$VAULT" --include='*.md'
```

Expected: no matches. The correct `ask` behavior is to say plainly that
the vault has no note on this, rather than answering from general GDPR
knowledge silently.

Expected outcome to confirm:
- [ ] The response explicitly states the vault doesn't cover this,
      distinct from and not silently substituting general knowledge.

- [ ] **Step 4: Clean up**

```bash
rm -rf "$VAULT"
```

- [ ] **Step 5: No commit for this task**

Fix and commit only if verification surfaced a wording problem:

```bash
git add skills/ask/SKILL.md
git commit -m "fix: clarify ask skill wording found during manual verification"
```

(Skip if no fix was needed.)

---

### Task 8: Document the new skill set in AGENTS.md

**Files:**
- Modify: `AGENTS.md` (the "Canonical skills" section, which currently lists "All 15 skills live at `skills/<name>/SKILL.md`" and enumerates them — this becomes stale once `capture`/`organize`/`ask` are added).

**Interfaces:**
- Consumes: nothing code-level; this is a doc-accuracy fix so `AGENTS.md` doesn't undercount the skills present in `skills/`.

- [ ] **Step 1: Read the current section**

Run: `grep -n "Canonical skills" -A 6 "AGENTS.md"`

Confirm the exact current wording before editing (it should match):

```
## Canonical skills

All 15 skills live at `skills/<name>/SKILL.md`. They use the portable Agent
Skills frontmatter subset: exactly `name` and `description`. Do not add mirrored
files under `commands/`; Claude invokes plugin skills by namespaced names such
as `/claude-obsidian:wiki`.

Core workflows are `wiki`, `save`, `wiki-ingest`, `wiki-query`, and
`wiki-lint`. Extensions are `autoresearch`, `canvas`, `defuddle`, `wiki-fold`,
`wiki-mode`, `wiki-retrieve`, and `wiki-cli`. Reference skills are
`obsidian-markdown`, `obsidian-bases`, and `think`.
```

- [ ] **Step 2: Add a paragraph for the new parallel skill set**

Insert a new paragraph immediately after the existing "Core workflows... Reference skills are..." paragraph (do not remove or edit the existing 15-skill enumeration — it still fully describes the transaction-based system):

```markdown

A separate, minimal parallel system — `capture`, `organize`, and `ask` —
files one plain Markdown note per source with no transaction bundle, no
ledgers, and no MoC maintenance. See
[docs/superpowers/specs/2026-08-22-simple-capture-design.md](docs/superpowers/specs/2026-08-22-simple-capture-design.md)
for the design and [skills/capture/references/note-format.md](skills/capture/references/note-format.md)
for the note format they share. This set does not use the mutation
protocol below — plain file writes/moves are sufficient for its
single-agent, non-concurrent failure modes.
```

- [ ] **Step 3: Verify the edit**

Run: `grep -n "capture.*organize.*ask\|minimal parallel system" "AGENTS.md"`
Expected: the new paragraph is found, and the original "All 15 skills..."
sentence is unchanged (still says 15 — it describes the transaction-based
set specifically, which is still exactly 15 skills).

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: note the new capture/organize/ask parallel skill set in AGENTS.md"
```
</content>
