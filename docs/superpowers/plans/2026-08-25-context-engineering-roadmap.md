# Context-Engineering Experiment: Roadmap

> This is a **roadmap**, not a single executable plan — the spec it
> implements ([2026-08-25-context-engineering-experiment.md](../specs/2026-08-25-context-engineering-experiment.md))
> spans multiple independent subsystems (an eval harness, three new
> retrieval modes, provenance metadata, README evidence). Per
> `superpowers:writing-plans`' scope check, each phase below gets its
> own detailed, task-by-task plan — written when that phase starts,
> using the actual numbers/decisions the prior phase produced. Phase 0's
> plan is written now, in full:
> [2026-08-25-eval-foundation-and-mode1-baseline.md](2026-08-25-eval-foundation-and-mode1-baseline.md).

## Decisions already locked in

- **Harness architecture:** a small, isolated Node.js eval harness under
  `eval/harness/`, using the Claude API directly (`@anthropic-ai/sdk`),
  drives the fixed question set through each retrieval mode and computes
  real numbers. The interactive `skills/*/SKILL.md` contracts are
  **not** touched by the harness — it re-implements retrieval logic in
  plain JS for reproducibility, deterministic timing, and exact token
  counts, none of which a live Claude Code session can measure about
  itself.
- **Vector embeddings:** a local embedding model (`@xenova/transformers`,
  ONNX runtime, e.g. `all-MiniLM-L6-v2`) — no network call, no API key,
  consistent with local-first. Embeddings are cached to a flat JSON file
  under `eval/vault/.embeddings/`, not a database.
- **Why isolate this from the product core:** the existing spec
  ([2026-08-22-simple-capture-design.md](../specs/2026-08-22-simple-capture-design.md))
  deliberately keeps `skills/` Markdown-only with "no Python, no
  database." The eval harness is a dev/measurement tool the maintainer
  runs explicitly (`node eval/harness/runEval.js ...`), not something a
  vault user's Claude Code session loads — so it doesn't compromise that
  positioning. If a later phase decides a new mode should become the
  *default* interactive behavior, that's a deliberate, separate decision
  (Phase 5), not a side effect of building the harness.

## Phase sequence

Each phase produces working, independently-verifiable output before the
next starts. Numbers from each phase feed the experiment table, which
only grows real rows — never invented ones (spec requirement).

### Phase 0 — Eval foundation + Mode 1 baseline (plan written, ready to execute)

- Fixed evaluation vault (`eval/vault/`) covering all 5 question types
  from the spec, reusing the spec's own example notes/questions where
  given.
- Fixed question set (`eval/questions.json`) with ground-truth
  `expected_notes` and `expected_unknown` per question.
- Harness core: `retrieval/scoring.js` (pure, unit-tested), `retrieval/indexRouting.js`
  (Mode 1), `runMode.js` (API call + timing/tokens), `metrics.js`
  (recall/precision/aggregate, unit-tested), `judge.js` (citation
  correctness + groundedness + answer-accuracy grading via a second
  Claude call), `runEval.js` (orchestrator).
- Output: `eval/results/mode1-index-routing.json` +
  first real row of `eval/results/experiment-table.md`.
- **Blocks everything after it** — Phases 1-3 each add one new
  `retrieval/<mode>.js` module plugged into the same `runMode`/`metrics`
  contract; they can't be measured without this scaffold.

### Phase 1 — Mode 2: keyword search

- `retrieval/keywordSearch.js`: term expansion (synonym/stem list or a
  cheap Claude call for expansion terms — decide at plan time, tradeoff
  is determinism vs. recall), BM25-style ranking over note titles +
  body text, top-k selection.
- Run `runEval.js --mode keyword` over the same question set; append row
  to `experiment-table.md`.
- Decision point for this phase's plan: fixed small stopword/synonym
  list (deterministic, no extra API calls) vs. an LLM-based term
  expansion call (costs tokens/latency, may recall better) — worth
  measuring both if cheap to do.

### Phase 2 — Mode 3: vector retrieval

- `retrieval/embeddings.js`: load `@xenova/transformers`, embed every
  note (cached to `eval/vault/.embeddings/*.json` keyed by content
  hash so unchanged notes skip re-embedding), embed the question,
  cosine-similarity top-k.
- Chunking decision needed at plan time: whole-note vs. paragraph-level
  chunks (spec calls out "chunking can destroy context" as a named
  weakness — the plan should pick one and say why).
- Run `runEval.js --mode vector`; append row.

### Phase 3 — Mode 4: hybrid

- `retrieval/hybrid.js`: union of Mode 1's index-routed notes and Mode
  3's top-k vector hits, reranked (simplest defensible approach: weighted
  sum of index-match boost + cosine score — decide exact weights at plan
  time from Phase 0-2's actual numbers, not guessed upfront).
- Run `runEval.js --mode hybrid`; append row. This completes the
  experiment table's 4 rows with real numbers — first point where the
  spec's "which mode wins, and when" question has an actual answer.

### Phase 4 — Uncertainty handling + provenance metadata

- Standardize Known / Partially known / Unknown grading across all 4
  modes' judge prompts (Phase 0's judge already grades `expected_unknown`
  for Mode 1; extend the rubric to a 3-way label instead of binary once
  all 4 modes exist, so partial-knowledge cases are visible in the table).
- Add `source_type` / `source_url` / `captured_at` / `author` /
  `original_file` frontmatter fields to `templates/note-template.md`'s
  seed and to `capture`/`defuddle`/`autoresearch`'s write steps —
  touches `skills/capture/references/note-format.md` and all three
  `SKILL.md` files that write notes. This is a product change (not
  eval-only), reviewed against the existing "Agent write boundaries"
  rules already in the spec.

### Phase 5 — Product decision: does a mode become the new default?

- With 4 real rows in the experiment table, decide whether `ask`'s
  interactive behavior stays index-routing-only (current
  `skills/ask/SKILL.md`) or adopts hybrid (or another mode) as its
  default — and whether to expose a mode switch to the user at all
  (spec's "Avoid" section warns against "chat with your notes" feature
  creep, so the default posture should stay "one good mode," not a
  menu, unless the numbers clearly argue otherwise).
- If a mode changes, that's an edit to `skills/ask/SKILL.md` (and
  possibly `AGENTS.md`), reusing the harness's now-proven retrieval
  logic — ported from `eval/harness/retrieval/*.js` reference
  implementations into skill instructions Claude Code executes directly
  (no runtime dependency on Node/the harness inside the product itself).

### Phase 6 — README evidence + demo

- Architecture diagram, the real `eval/vault/` as the "one example
  vault," `eval/questions.json` as the "one benchmark dataset,"
  `eval/results/experiment-table.md` as the "one evaluation table," one
  saved `eval/results/*.json` run as the "one full query trace," and an
  explicit limitations section (per spec's "README evidence" list).
- Demo script per spec's "Demo" section, using the real vault/questions
  built in Phase 0.

## Open decisions deferred to their own phase (not decided now)

- Keyword mode's term-expansion approach (Phase 1).
- Vector mode's chunking granularity (Phase 2).
- Hybrid's merge/rerank weighting (Phase 3).
- Whether `ask` adopts a new default mode (Phase 5).

Each gets decided with real Phase 0-3 numbers in hand, not guessed here.
