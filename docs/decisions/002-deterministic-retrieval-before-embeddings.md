# 002: Deterministic retrieval first, embeddings only if measured to help

## Context

The natural instinct when an agent needs to "search notes" is to add a
vector database and embed everything. The project's own positioning
spec explicitly names avoiding that reflex as a design goal: "The
project should become a concrete context-engineering experiment,"
answering "When is structured navigation better than vector search,
and when does semantic retrieval improve the system?" rather than
assuming the answer.

## Options considered

- **Ship embeddings/vector search as the default `ask` retrieval
  mechanism** from the start. Rejected — it would add infrastructure
  (an embedding step, a vector index, a caching strategy) before any
  evidence that it outperforms simpler alternatives for this product's
  actual note sizes and question types, and it makes retrieval more
  opaque (a user can't easily tell *why* a note was retrieved).
- **Index-lookup + grep only, forever.** Simple and fully transparent,
  but the spec calls out real weaknesses (misses cross-topic semantic
  relationships, depends on the vault being reasonably well-organized)
  that are worth measuring against alternatives rather than assuming
  away.
- **Build each retrieval strategy as an isolated, measurable mode in a
  separate eval harness** (`eval/harness/`), re-implementing each
  mode's logic in plain JS against a fixed vault and question set, and
  only promote a mode into the live `ask` skill if its measured
  numbers justify the added complexity.

## Decision

The interactive `ask` skill retrieves via `indexes/` lookup plus
Grep/glob text search only — no BM25, embeddings, or reranking in the
product itself. Every other retrieval strategy (BM25 keyword search,
local-embedding vector search, a hybrid of the two) is built and
measured first in the isolated `eval/harness/` against a fixed
`eval/vault/` and `eval/questions.json`, producing real recall,
precision, citation-correctness, context-token, and latency numbers.

## Consequences

- `ask` stays simple, transparent, and dependency-free today; nothing
  about its live behavior changes until a later, deliberate decision
  (roadmap Phase 5) says a measured mode should become the new
  default.
- The harness duplicates some retrieval logic that would otherwise
  live in one place — an accepted cost, because the harness's
  reproducibility needs (deterministic timing, exact token counts, a
  fixed vault) are different from what a live Claude Code session
  needs, and coupling them would make either harder to reason about.
- No retrieval-mode comparison numbers are published until the harness
  actually produces them from a real run against the Claude API — an
  invented or estimated table is explicitly out of bounds (see
  [`docs/superpowers/specs/2026-08-25-context-engineering-experiment.md`](../superpowers/specs/2026-08-25-context-engineering-experiment.md),
  "Experiment table": "Numbers should come from actual tests, not
  invented examples").
