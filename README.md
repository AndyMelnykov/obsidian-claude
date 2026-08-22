<p align="center">
  <img src="assets/cover.png" alt="claude-obsidian cover featuring an astronaut, the Obsidian crystal, and a connected knowledge graph" width="100%">
</p>

<h1 align="center">claude-obsidian</h1>

<p align="center">
  <strong>Turn Obsidian into a knowledge base that gets more useful every time you use it.</strong><br>
  Capture sources, write connected notes, get grounded answers, keep the vault clean—all as plain files you own.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2563eb.svg" alt="MIT license"></a>
  <a href="https://agentskills.io"><img src="https://img.shields.io/badge/Agent%20Skills-compatible-2563eb" alt="Agent Skills compatible"></a>
  <a href="https://code.claude.com/docs/en/plugins"><img src="https://img.shields.io/badge/Claude%20Code-plugin-7c3aed" alt="Claude Code plugin"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/release-v2.1.0-d97745" alt="Release v2.1.0"></a>
</p>

claude-obsidian is a local-first knowledge system for Claude Code and other
[Agent Skills](https://agentskills.io) hosts. It turns source material into
linked, source-cited Obsidian notes, answers questions from what's already in
your vault, and keeps everything as normal Markdown—no plugin lockup, no
cloud database, no silent uploads.

## Quick start

```bash
git clone https://github.com/AgriciDaniel/claude-obsidian.git
cd claude-obsidian

# create a separate vault for your notes (previews the plan first)
python3 scripts/claude-obsidian.py init "$HOME/Documents/MyKnowledgeVault" --apply
```

Open that vault in Obsidian, then run Claude Code from inside it:

```bash
cd "$HOME/Documents/MyKnowledgeVault"
claude --plugin-dir /absolute/path/to/claude-obsidian
```

```text
/claude-obsidian:wiki
```

Drop a file in `inbox/` and run `/claude-obsidian:wiki-ingest`. Ask questions
with `/claude-obsidian:wiki-query`. Save a specific answer with
`/claude-obsidian:save`.

Adopting an existing vault, other hosts (Codex, OpenCode, Gemini), and full
setup details are in the [installation guide](docs/install-guide.md) (see
also [Windows & WSL](docs/windows-wsl.md)).

## What it does

- **Captures sources**, not just summaries—originals are kept, notes cite
  back to them.
- **Grounds claims** in vault evidence; unsupported or contradictory claims
  stay visible instead of being smoothed over.
- **Connects notes** into indexes, Maps of Content, and Canvas views.
- **Answers from the vault** instead of starting every conversation from
  zero.
- **Writes safely**—one operation at a time, previewed before it's applied,
  recoverable if interrupted.

## Skills

| Core | | Extended | |
|---|---|---|---|
| `wiki` | Init/adopt a vault, route work | `autoresearch` | Bounded web research |
| `save` | Save one scoped answer | `canvas` | Obsidian Canvas maintenance |
| `wiki-ingest` | Sources → linked pages | `defuddle` | Clean web content pre-ingest |
| `wiki-query` | Read-only answers from the vault | `wiki-fold` | Rollups of the operation log |
| `wiki-lint` | Find dead links, orphans, gaps | `wiki-mode` | Generic/LYT/PARA/Zettelkasten filing |
| — | — | `wiki-retrieve` | BM25 + optional reranking |
| — | — | `wiki-cli` | Obsidian CLI reads/search |

Plus reference skills for Obsidian Markdown, Bases, and a structured review
loop (`think`). Each skill's exact contract lives in `skills/<name>/SKILL.md`.

## Requirements

- Python 3.11+
- Obsidian (optional, for the visual experience)
- Git, for development or explicit checkpoints

Native Windows supports read-only/dry-run commands only; vault writes require
WSL. See the [Windows & WSL guide](docs/windows-wsl.md).

## Development

```bash
make test
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the
[Compound Vault architecture](docs/compound-vault-guide.md) for the
transaction model and provenance contracts behind the safety claims above.

## Lineage, license, and attribution

The design follows
[Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
and uses [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
as the reference substrate for Obsidian Markdown, Bases, and JSON Canvas
syntax.

MIT licensed. See [ATTRIBUTION.md](ATTRIBUTION.md) and
[CITATION.cff](CITATION.cff).
