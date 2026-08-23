# claude-obsidian: Agent Instructions

claude-obsidian is `capture`, `organize`, `ask`, `defuddle`, and
`autoresearch` — five plain-Markdown Claude Code skills at
`skills/<name>/SKILL.md`, with no Python core, no transaction bundles, no
ledgers, no MoC maintenance. `capture`, `organize`, and `ask` need no
network access; `defuddle` and `autoresearch` require explicit,
per-request consent before any egress, and `defuddle` additionally
requires an external Defuddle-style extractor the user provides. Notes
are filed under `notes/<topic>/` or `projects/<project-slug>/` (never
at the vault root directly), and `indexes/<Topic>.md` pages give a
fast entry point into each `notes/` topic. See
[docs/superpowers/specs/2026-08-22-simple-capture-design.md](docs/superpowers/specs/2026-08-22-simple-capture-design.md)
for the design and
[skills/capture/references/note-format.md](skills/capture/references/note-format.md)
for the note format all five skills share.

## Primary system: capture / organize / ask / defuddle / autoresearch

No product/vault distinction, no marker file, no registration step. The
user just points Claude Code at whatever directory they treat as their
vault (opened in Obsidian or not) and invokes a skill.

1. Read the skill completely from `skills/<name>/SKILL.md`.
2. Read [skills/capture/references/note-format.md](skills/capture/references/note-format.md)
   — all five skills share this note format, folder-placement heuristic,
   slug-uniqueness rule, and linking pass. `autoresearch` additionally
   reads its own [program.md](skills/autoresearch/references/program.md)
   for research budget and evidence-discipline defaults.
3. Resolve the vault: an explicit directory named in the request, then
   the `OBSIDIAN_VAULT` environment variable if set, then the current
   directory. Set `OBSIDIAN_VAULT` once to use `ask`/`capture`/etc. from
   any other project's Claude Code or Codex session without repeating
   the path. `capture` creates `inbox/`, `notes/`, `projects/`,
   `indexes/`, `templates/`, and `attachments/` in the resolved vault on
   first use if any don't exist.

Behavior, triggers, and out-of-scope boundaries for each skill are fully
specified in its own `SKILL.md` — this file doesn't duplicate them.
`organize` never runs automatically; `ask` never writes to the vault;
`defuddle` and `autoresearch` never fetch or research without explicit
per-request consent, and never file a note without a separate, later
consent to keep the result. None of the five uses transactions, ledgers,
or an index/MoC.

## Reference

- Public canonical repository: https://github.com/AgriciDaniel/claude-obsidian
- LLM Wiki pattern: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Obsidian primitives: https://github.com/kepano/obsidian-skills
