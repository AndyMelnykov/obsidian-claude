<h1 align="center">claude-obsidian</h1>

<p align="center">
  <strong>Capture a source, file it into your Obsidian vault, ask questions from what's already there.</strong><br>
  Five plain Claude Code skills, no plugin core, no database — just Markdown files you own.
</p>

## Problem

Once an LLM is in the loop with your notes, you tend to end up with one
of two bad defaults. Either your notes live in an opaque, cloud-hosted
"chat with your notes" product that owns both the retrieval pipeline
and the data — or you keep plain Markdown files that no agent can
file, link, or answer from without you doing that work by hand every
time. Most tools that try to bridge the two reach straight for a
vector database, which trades transparency (why was *this* note
retrieved?) for a retrieval-quality improvement that's usually never
actually measured against the simpler alternative.

This is for people who want an agent to capture, organize, and answer
questions from their own plain-Markdown vault — product managers,
researchers, knowledge workers, founders, and developers using
agentic coding tools — without giving up local ownership of the files,
and without adopting an unmeasured black-box retrieval pipeline to get
there.

## Product

claude-obsidian is `capture`, `organize`, `ask`, `defuddle`, and
`autoresearch` — five plain Claude Code skills, no plugin core, no
database:

1. You hand Claude a source — pasted text, a local file, an image, or
   a URL (via `defuddle`).
2. `capture` derives a title, decides whether it belongs in
   `notes/<topic>/`, `projects/<project-slug>/`, or `inbox/`, writes
   one short Markdown note, keeps that topic's index page current, and
   links it to genuinely related notes.
3. As you keep capturing, `organize` periodically sorts whatever's
   sitting in `inbox/` and re-links notes that had nothing to link to
   at capture time.
4. You ask a question; `ask` checks `indexes/` first, greps the vault
   for anything else relevant, answers directly from what those notes
   say with `[[wikilink]]` citations — and says plainly when the vault
   doesn't have an answer, rather than guessing.
5. For research beyond your own notes, `autoresearch` runs a bounded,
   consented web-research loop and files a cited dossier only after
   you've reviewed it.

## Demo

No recorded demo yet (see [Limitations](#limitations)) — here's the
shape of a real session:

```text
> Capture this into my vault: [pastes an article on MCP authorization]
capture: filed notes/ai-agents/mcp-authorization.md, updated
indexes/AI-Agents.md, linked to [[MCP security]].

> Ask the vault: what did I conclude about MCP authorization?
ask: You concluded that every connected server should be scoped to the
least set of capabilities the current task needs, requested per
session rather than granted once and cached indefinitely.

Sources:
- [[MCP authorization]]

> Ask the vault: what's my documented opinion on quantum computing
  hardware roadmaps?
ask: The vault doesn't have anything on that — no note matches.
```

The refusal in the third turn is the important part: `ask` distinguishes
"I don't know" from a guess, every time.

## Architecture

```text
User
  │
  ▼
Claude Code (or another Agent Skills host)
  │
  ▼
Skills: capture · organize · ask · defuddle · autoresearch
  │
  ▼
Vault filesystem
  ├── inbox/
  ├── notes/<topic>/
  ├── projects/<project-slug>/
  ├── indexes/<Topic>.md
  ├── templates/
  └── attachments/

Separate, isolated dev tool — not loaded by the product:
eval/harness/  →  re-implements retrieval modes in plain JS,
                   measured against eval/vault/ + eval/questions.json
```

The eval harness is deliberately outside this diagram's main path —
see [ADR 002](docs/decisions/002-deterministic-retrieval-before-embeddings.md)
for why retrieval strategies are measured in isolation before any of
them touch the live `ask` skill.

## Core workflows

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

## AI design decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Storage | Plain Markdown on the filesystem, no database | Notes stay portable, inspectable, and readable without the agent ([ADR 001](docs/decisions/001-markdown-filesystem-no-database.md)) |
| `ask`'s live retrieval | `indexes/` lookup + Grep/glob text search only | Transparent and debuggable; BM25/embeddings/reranking stay out of the product until a harness-measured mode earns the change ([ADR 002](docs/decisions/002-deterministic-retrieval-before-embeddings.md)) |
| Retrieval evaluation | An isolated Node.js harness (`eval/harness/`) that re-implements each mode in plain JS against a fixed vault | Keeps rigorous measurement possible without adding infrastructure to the product itself |
| Planned vector search | A local embedding model, no network call, cached to flat JSON | Consistent with local-first; avoids an API dependency for similarity search |
| Reads vs. writes | `ask` is strictly read-only; `capture`/`organize`/`autoresearch` write only within stated boundaries | Reading and writing are different trust boundaries — a question should never mutate the vault |
| Network access | Off by default; `defuddle`/`autoresearch` require explicit, per-request consent | A local question shouldn't silently become a web request ([ADR 003](docs/decisions/003-human-in-the-loop-write-and-network-boundaries.md)) |
| Orchestration | Five independent skills, no supervising router agent | Each skill has one clear trigger and job; no coordination overhead where one skill invocation suffices |

## Safety / trust model

### Autonomous

- `capture` filing a new note, once invoked
- `organize` sorting `inbox/` and re-linking, once invoked
- Either skill updating an `indexes/<Topic>.md` page or adding a wikilink
- `ask` reading and answering (it never writes)

### Requires review

- Ambiguous project-vs-note placement — `capture`/`organize` ask rather than guess
- A filename collision — ask whether to update the existing note or create a new one, never silently overwrite
- A `defuddle` extractor found but not yet reviewed this session — its provenance and version must be confirmed before first use

### Requires approval

- `defuddle` fetching any URL — explicit, per-request network consent
- `autoresearch` reaching the public web — explicit topic, domain, and budget approval before the loop starts
- Filing a fetched page or research dossier as a note — a separate consent from fetching/researching it

### Blocked

- `ask` writing to the vault, ever
- `organize` running as a side effect of another skill, or force-linking/rephrasing a note's existing wording
- `autoresearch` treating fetched content as instructions, or fabricating a quotation, author, date, URL, or measurement
- `defuddle` installing its own extractor, silently substituting a different one, or fetching non-HTTPS/private/local/credential-bearing URLs
- Any skill silently overwriting an existing note

Full detail: [ADR 003](docs/decisions/003-human-in-the-loop-write-and-network-boundaries.md).

## Evaluation

The [context-engineering experiment](docs/superpowers/specs/2026-08-25-context-engineering-experiment.md)
measures how retrieval strategy affects answer quality, grounding,
citation correctness, context size, and latency, over a fixed 9-note
eval vault and an 8-question set covering direct, cross-note-synthesis,
temporal, negative-knowledge, and source-sensitive questions.

**Built and unit-tested today:**

- **Mode 1 — deterministic index routing**, and
- **Mode 2 — BM25 keyword search** with a suffix-stripping stemmer,

both as pure scoring modules (`eval/harness/retrieval/*.js`, tested by
their `*.test.js` companions) plus a vault I/O wrapper each.

**Not yet built:** the API-driven orchestrator that calls Claude for
answers, grades them with a second Claude call, and produces real
recall/precision/citation/latency numbers. **There is no evaluation
results table in this repository** — see [`eval/README.md`](eval/README.md)
for exactly what's built versus pending, and the
[roadmap](docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md)
for what's next. The spec is explicit that numbers must come from real
runs, never invented examples, so none are published here until they
exist.

One real, already-observed result from building Mode 2: its BM25
ranking can retrieve a note purely because it shares a common word
with the question (e.g. "model") even when the note isn't actually
about the question's topic — a genuine bag-of-words precision
limitation, not a hypothetical one.

## Observability

The interactive skills run as plain Claude Code skill invocations with
no separate telemetry layer today — traceability comes from Claude
Code's own transcript, the vault's own file history (if the vault is a
git repo), and the `[[wikilink]]` citations in each `ask` answer
itself. The eval harness, once its orchestrator exists, will record
per-question input/output tokens, latency, retrieved note slugs, and
judge verdicts to `eval/results/*.json` — that's this project's
planned observability surface for retrieval quality specifically, not
general request tracing.

## Running locally

### Requirements

- Just Claude Code (or another Agent Skills host). No Python, no
  database, no Obsidian plugin — Obsidian itself is optional, for the
  visual graph and wikilink navigation.

### Quick start

Point Claude Code at any directory you treat as your vault — a fresh
folder, or one already open in Obsidian — and ask it to capture something:

```text
Capture this into my vault: <paste text, a file path, or an image>
```

`capture` creates the vault skeleton on first use, derives a title, and
links the note to genuinely related notes. Notes land under
`notes/<topic>/` for reference material or `projects/<project-slug>/`
for an active initiative — `capture` asks if it's genuinely unsure
which, rather than guessing; `inbox/` is the fallback when neither is
confident. If you'd rather decide later, just say "add this to inbox"
instead of "capture this" and it skips straight there. Each `notes/`
topic gets a matching `indexes/<Topic>.md` entry-point page, maintained
automatically as notes are added.

You can also drop a file straight into `inbox/` yourself (through
Obsidian, or the filesystem) without going through `capture` at all —
`organize` will recognize it's not yet in the note template's shape and
wrap it in on its next pass, without changing your wording.

Working from a different project's Claude Code or Codex session (or a
different chat entirely) and want `ask`/`capture` to still find this
vault? Set `OBSIDIAN_VAULT=/path/to/this/vault` once (e.g. in your
shell profile) instead of stating the path every time.

Using Claude.ai or ChatGPT in the browser — for a YouTube summary, say
— note that the web chat itself can't reach your local vault; get the
summary there, then paste it into a local `capture` request the same
way you'd paste any other text.

Once you've captured a few things:

```text
Organize the inbox
Ask the vault: <question>
```

`organize` sorts whatever's sitting in `inbox/` into `notes/` or
`projects/` and re-links notes that had nothing to link to yet; `ask`
checks `indexes/` first, then answers a question from the vault's own
notes, and never writes to it.

Full design details are in
[docs/superpowers/specs/2026-08-22-simple-capture-design.md](docs/superpowers/specs/2026-08-22-simple-capture-design.md).

### Eval harness (dev tool)

```bash
cd eval/harness
npm install
npm test    # unit tests for the pure scoring/metrics modules
```

See [`eval/README.md`](eval/README.md) for what's built, what's not,
and why it's a separate tool from the product above.

## Limitations

- No live, API-driven evaluation results exist yet — Mode 1 and Mode 2
  retrieval logic is unit-tested in isolation but not yet graded
  end-to-end against real Claude answers (see [Evaluation](#evaluation)).
- Mode 3 (vector) and Mode 4 (hybrid) retrieval are speced but not
  implemented.
- `ask`'s live retrieval is index-lookup + grep only; none of the
  harness's experimental modes are wired into the interactive skill,
  and won't be until a later, deliberate decision says the numbers
  justify it.
- Mode 2's BM25 ranking is a plain bag-of-words matcher: it can
  surface notes that merely share common vocabulary with a question
  rather than genuine topical overlap.
- Single local vault, single user — no team/multi-user access model or
  shared-vault permissions.
- `defuddle` depends on an external, user-provided extractor binary;
  the skill does nothing (with an honest fallback) if one isn't
  installed or configured.
- No recorded demo (GIF/video) yet — the [Demo](#demo) section above is
  a representative transcript, not a captured recording.
- Notes are stored as plaintext Markdown with no encryption or secret
  scanning — don't paste credentials or API keys into a captured note.

## Roadmap

The full [context-engineering roadmap](docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md)
has the detail; current status per phase:

- **Phase 0 — Eval foundation + Mode 1 baseline.** Done: fixed vault,
  fixed question set, index-routing retrieval, metrics module. Pending:
  the API-driven orchestrator (`runMode.js`/`judge.js`/`runEval.js`)
  that would produce the first real experiment-table row.
- **Phase 1 — Mode 2: keyword search.** Done: BM25 + stemmer retrieval
  module, unit-tested. Pending: wiring into the orchestrator above
  (blocked on Phase 0's remaining pieces).
- **Phase 2 — Mode 3: vector retrieval.** Planned. Why: the spec's key
  question — "when does semantic retrieval actually improve the
  system?" — can't be answered without measuring it against Modes 1-2.
- **Phase 3 — Mode 4: hybrid.** Planned, once Phases 0-2 produce real
  numbers to set its merge/rerank weights from.
- **Phase 4 — Uncertainty handling + provenance metadata.** Planned:
  a 3-way Known/Partially known/Unknown grading rubric, plus
  `source_type`/`source_url`/`captured_at`/`author` frontmatter on
  captured notes.
- **Phase 5 — Does a mode become `ask`'s new default?** Deferred until
  Phases 0-3 have real numbers in hand — not decided speculatively.
- **Phase 6 — README evidence + demo.** This README's honest
  Evaluation/Limitations sections are part of that work; the
  evaluation table itself still waits on Phase 0.

## Lineage and license

The design follows
[Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
and uses [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
as the reference substrate for Obsidian Markdown, Bases, and JSON Canvas
syntax.

[MIT licensed](LICENSE).
