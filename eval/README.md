# Eval harness

A small, isolated Node.js dev tool that measures how different
retrieval strategies affect answer quality, grounding, citation
correctness, context size, and latency over a fixed vault and question
set — the context-engineering experiment described in
[`docs/superpowers/specs/2026-08-25-context-engineering-experiment.md`](../docs/superpowers/specs/2026-08-25-context-engineering-experiment.md).

This is a maintainer-run measurement tool, not part of the product.
Nothing under `skills/` depends on it, and a vault user's Claude Code
session never loads it — see
[ADR 002](../docs/decisions/002-deterministic-retrieval-before-embeddings.md)
for why retrieval modes are measured here first rather than built
directly into the live `ask` skill.

## Layout

```text
eval/
├── vault/              fixed 9-note evaluation vault (2 topics: ai-agents, product)
├── questions.json      8 fixed questions covering all 5 spec question types
│                       (direct, cross-note synthesis, temporal, negative
│                       knowledge, source-sensitive)
├── harness/
│   ├── metrics.js       recall/precision/aggregate math (pure, unit-tested)
│   └── retrieval/
│       ├── scoring.js          Mode 1 topic-scoring (pure, unit-tested)
│       ├── indexRouting.js     Mode 1: deterministic index routing (I/O)
│       ├── keywordScoring.js   Mode 2 stemmer + BM25 ranking (pure, unit-tested)
│       └── keywordSearch.js    Mode 2: keyword search over the vault (I/O)
└── results/             not yet created — see Status below
```

## Status

**Built:** the fixed vault and question set, and two retrieval modes
as pure, unit-tested scoring modules with a thin I/O wrapper each:

- **Mode 1 — deterministic index routing**: infers a topic from the
  question, loads that `indexes/` page's linked notes.
- **Mode 2 — BM25 keyword search**: a suffix-stripping stemmer plus a
  textbook BM25 ranker over note titles and bodies, no external
  dependency.

**Not yet built:** the API-driven orchestrator (`runMode.js` — calls
Claude for an answer and records real token counts/latency;
`judge.js` — a second Claude call grades citation correctness,
groundedness, and answer accuracy; `runEval.js` — wires both together
and writes `eval/results/<mode>.json` plus a row in
`eval/results/experiment-table.md`). Until that exists and is run
against the real Claude API, **there are no end-to-end recall,
precision, citation-precision, or latency numbers for any mode** —
see the [roadmap](../docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md)
Phase 0 for what's left. Modes 3 (vector) and 4 (hybrid) aren't
implemented at all yet.

No number is published anywhere in this repository's README or docs
until it comes from an actual run — see the spec's "Numbers should
come from actual tests, not invented examples."

## Running what exists today

```bash
cd eval/harness
npm install
npm test        # unit tests for scoring.js, keywordScoring.js, metrics.js
```

Once `runEval.js` exists (requires `ANTHROPIC_API_KEY`):

```bash
cd eval/harness
npm run eval -- index-routing   # or: keyword
```
