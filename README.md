<h1 align="center">claude-obsidian</h1>

<p align="center">
  <strong>Capture a source, file it into your Obsidian vault, ask questions from what's already there.</strong><br>
  Five plain Claude Code skills, no plugin core, no database — just Markdown files you own.
</p>

claude-obsidian is a local-first note system for Claude Code and other
[Agent Skills](https://agentskills.io) hosts. `capture`, `organize`, and
`ask` turn a source (pasted text, a file, an image) into one short,
linked Markdown note, sorted into a folder structure that makes sense —
no transactions, ledgers, or index maintenance required. `defuddle` and
`autoresearch` extend that to web pages and bounded research, each behind
its own explicit network consent.

## Quick start

Point Claude Code at any directory you treat as your vault — a fresh
folder, or one already open in Obsidian — and ask it to capture something:

```text
Capture this into my vault: <paste text, a file path, or an image>
```

`capture` creates `inbox/` and `attachments/` on first use, derives a
title, files the note in an existing or new topic folder (or `inbox/` if
it isn't confident), and links it to genuinely related notes.

Once you've captured a few things:

```text
Organize the inbox
Ask the vault: <question>
```

`organize` sorts whatever's sitting in `inbox/` into topic folders and
re-links notes that had nothing to link to yet; `ask` answers a question
from the vault's own notes and never writes to it.

Full design details are in
[docs/superpowers/specs/2026-08-22-simple-capture-design.md](docs/superpowers/specs/2026-08-22-simple-capture-design.md).

## Skills

| Skill | What it does |
|---|---|
| `capture` | Source → one filed, linked Markdown note |
| `organize` | Sort `inbox/` into topic folders; audit for unlinked notes |
| `ask` | Read-only, source-cited answers from the vault |
| `defuddle` | Fetch and clean one HTTPS page (explicit consent), then file it like `capture` |
| `autoresearch` | Bounded web research (explicit consent), filed as one or more notes |

Each skill's exact contract lives in `skills/<name>/SKILL.md`; the note
format and folder-placement rules they share live in
[skills/capture/references/note-format.md](skills/capture/references/note-format.md).

## Requirements

- Just Claude Code (or another Agent Skills host). No Python, no database,
  no Obsidian plugin — Obsidian itself is optional, for the visual graph
  and wikilink navigation.

## Lineage and license

The design follows
[Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
and uses [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
as the reference substrate for Obsidian Markdown, Bases, and JSON Canvas
syntax.

MIT licensed.
