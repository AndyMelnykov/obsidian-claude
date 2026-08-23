# claude-obsidian: Agent Instructions

This repository now holds two systems:

- **`capture` / `organize` / `ask` / `defuddle` / `autoresearch`** — the
  current, primary system. Five plain-Markdown Claude Code skills at
  `skills/<name>/SKILL.md`, with no Python core, no transaction bundles,
  no ledgers, no MoC maintenance. `capture`, `organize`, and `ask` need no
  network access; `defuddle` and `autoresearch` require explicit,
  per-request consent before any egress, and `defuddle` additionally
  requires an external Defuddle-style extractor the user provides. See
  [docs/superpowers/specs/2026-08-22-simple-capture-design.md](docs/superpowers/specs/2026-08-22-simple-capture-design.md)
  for the original design (its "Deferred" section is what
  `defuddle`/`autoresearch` originally postponed, now implemented) and
  [skills/capture/references/note-format.md](skills/capture/references/note-format.md)
  for the note format all five skills share.
- **The legacy transaction-based system** — everything else this repo used
  to be (12 skills, the `claude_obsidian/` Python core, `scripts/`,
  `templates/`, `agents/`, `examples/`, and the older top-level docs). It is
  preserved under `archive/` for reference, unchanged in content, but is no
  longer wired up as active plugin skills — a host's normal skill discovery
  only looks at `skills/`, not `archive/skills/`. See "Archived legacy
  system" below for its own instructions, which still apply verbatim to
  code and docs that now live under `archive/`.

Start with the primary system below unless you're specifically working on
something under `archive/`.

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
3. Resolve the vault as the current directory, or one the user names.
   `capture` creates `inbox/` and `attachments/` in it on first use if they
   don't exist.

Behavior, triggers, and out-of-scope boundaries for each skill are fully
specified in its own `SKILL.md` — this file doesn't duplicate them.
`organize` never runs automatically; `ask` never writes to the vault;
`defuddle` and `autoresearch` never fetch or research without explicit
per-request consent, and never file a note without a separate, later
consent to keep the result. None of the five uses transactions, ledgers,
or an index/MoC.

## Archived legacy system

Everything below described the repository before the `archive/` move and
still applies to the content now under `archive/` — only the paths moved.

### Product and vault boundaries

- `archive/` is the product source for this system. It is not the default
  user vault.
- A user vault is the directory containing `.claude-obsidian.json`, `wiki/`,
  and `.raw/`. Mutable state always belongs there.
- `archive/templates/vault/` is the distributable seed. Root `wiki/`,
  `.raw/`, and `.vault-meta/` are contributor state and are excluded from
  public artifacts.
- Never derive a user vault from the plugin cache or `${CLAUDE_PLUGIN_ROOT}`.
- A checkout containing contributor-vault state has no marketplace catalog.
  `config/public-marketplace.json` is injected as
  `.claude-plugin/marketplace.json` only inside the audited release artifact.
  An extracted distribution-clean artifact may retain that exact manifest and
  rebuild idempotently. A public default branch must be populated from the clean
  artifact, never by pushing contributor-vault state.

Resolve a vault in this order: explicit `--vault`,
`CLAUDE_OBSIDIAN_VAULT`, nearest `.claude-obsidian.json`, then an unambiguous
vault at or above the current directory. Fail closed when no vault is selected.

### Bootstrap

1. Read this file. In a development checkout, also read the host-only root
   `CLAUDE.md` when present; release artifacts intentionally omit it.
2. Read the selected skill completely.
3. Read only the references that skill routes to.
4. Resolve the user vault. If `wiki/hot.md` exists, read it silently.
5. For a new vault, run `python3 archive/scripts/claude-obsidian.py init PATH`
   first; apply only after reviewing the dry run. Use `adopt` for an
   existing vault.

### Canonical skills

All 15 skills live at `archive/skills/<name>/SKILL.md`. They use the
portable Agent Skills frontmatter subset: exactly `name` and `description`.
Because they now live outside `skills/`, a host's normal skill discovery
will not pick them up automatically — invoking one requires pointing the
host at `archive/skills/<name>/SKILL.md` explicitly. Do not add mirrored
files under `commands/`; the original design invoked plugin skills by
namespaced names such as `/claude-obsidian:wiki`.

Core workflows are `wiki`, `save`, `wiki-ingest`, `wiki-query`, and
`wiki-lint`. Extensions are `autoresearch`, `canvas`, `defuddle`, `wiki-fold`,
`wiki-mode`, `wiki-retrieve`, and `wiki-cli`. Reference skills are
`obsidian-markdown`, `obsidian-bases`, and `think`.

### Mutation protocol

One logical knowledge operation is one recoverable transaction:

1. Read targets and record expected SHA-256 values.
2. Let parallel workers return drafts and evidence only.
3. Merge drafts into one `claude-obsidian.transaction.v1` bundle.
4. Inspect the bundle, then apply it once through
   `archive/scripts/claude-obsidian.py`.
5. Report the operation ID and exact changed paths.

Do not use direct shared writes, the deprecated `wiki-lock.sh` helper, or
generic lifecycle auto-commits. Git checkpointing is separate and explicit.
Raw source payloads are create-only; `.raw/.manifest.json` is the only mutable
legacy raw metadata file. Destructive repairs, remote egress, and canonical
research merges require explicit consent.

### Vault conventions

- `inbox/`: visible capture intake; never deleted automatically.
- `.raw/`: immutable source payloads and legacy delta manifest.
- `wiki/`: generated knowledge pages.
- `wiki/meta/ledgers/`: source and claim provenance.
- `wiki/hot.md`: bounded recent context, never a transcript.
- `wiki/log.md`: operation history, newest first.
- `.vault-meta/`: ignored runtime locks, journals, indexes, queues, and config.

Use Obsidian Flavored Markdown: flat YAML properties, `YYYY-MM-DD` dates,
wikilinks, embeds, and valid callouts. Never fabricate evidence locators,
quotations, page numbers, or confidence.

### Verification

Run `make test` after behavioral changes. It executes every Python and shell
suite plus the product, capability, package, hook, and manifest contracts.
Public artifacts are built locally with `release build` and audited without
publishing. No agent may push, tag, open or mutate issues, or publish a release
without explicit owner approval.

Claude SessionStart context injection is disabled by default. Treat
`CLAUDE_OBSIDIAN_SESSION_CONTEXT=1` as explicit user consent to place bounded
`wiki/hot.md` data in the model context; never set it automatically. A
workspace-configured vault outside the project also requires an exact
`CLAUDE_OBSIDIAN_SESSION_CONTEXT_VAULT` path.

## Reference

- Public canonical repository: https://github.com/AgriciDaniel/claude-obsidian
- LLM Wiki pattern: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Obsidian primitives: https://github.com/kepano/obsidian-skills
