# Phase 3: Mode 4 Hybrid Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Mode 4 (hybrid retrieval) for the context-engineering eval
harness: union Mode 1's index-routed notes with Mode 3's per-note cosine
scores, rerank by a weighted sum, and gate abstention on Mode 1's
existing "no index matched" signal — matching the exact
`{contextText, retrievedSlugs}` contract Modes 1-3 already implement.

**Architecture:** Split into a pure scoring module
(`retrieval/hybridScoring.js` — merges an index-matched slug set with
per-note cosine scores into a ranked, boosted top-K list, zero I/O,
fully unit-tested) and one I/O module (`retrieval/hybridSearch.js` —
calls `retrieveIndexRouting` for the index-matched set, embeds notes
and the question via the existing `embeddings.js` cache, scores every
note via `vectorScoring.js`'s `rankByCosineSimilarity` with no
truncation, then merges via `hybridScoring.js`). This mirrors Phase
0-2's pure/I/O split (`scoring.js`/`indexRouting.js`,
`keywordScoring.js`/`keywordSearch.js`, `vectorScoring.js`/`vectorSearch.js`)
and produces the exact same `{contextText, retrievedSlugs}` return
shape, so it drops into the same `runMode`/`runEval` contract once
Phase 0's Tasks 7-8 exist.

**Tech Stack:** No new dependencies — reuses `embeddings.js`
(`@xenova/transformers`) and `vectorScoring.js` from Phase 2, and
`indexRouting.js` from Phase 0. Node's built-in `node:test` +
`node:assert` for the pure module's tests, matching every prior phase.

**Spec:** [docs/superpowers/specs/2026-08-25-context-engineering-experiment.md](../specs/2026-08-25-context-engineering-experiment.md)
section "Retrieval modes → Mode 4: Hybrid" ("Question → Index routing +
Semantic search → Merge + rerank → Answer"). Phase context:
[2026-08-25-context-engineering-roadmap.md](2026-08-25-context-engineering-roadmap.md)
Phase 3 — decision point resolved below with real numbers. Prior
phases: [2026-08-25-eval-foundation-and-mode1-baseline.md](2026-08-25-eval-foundation-and-mode1-baseline.md)
(Tasks 1-6 complete and merged; Tasks 7-8 — `runMode.js`, `judge.js`,
`runEval.js` — still not built, see Global Constraints),
[2026-08-30-phase1-mode2-keyword-search.md](2026-08-30-phase1-mode2-keyword-search.md)
(complete and merged), [2026-09-03-phase2-mode3-vector-retrieval.md](2026-09-03-phase2-mode3-vector-retrieval.md)
(complete and merged).

## Decision: merge/rerank weighting

The roadmap named an open decision for this phase: "decide exact
weights at plan time from Phase 0-2's actual numbers, not guessed
upfront." Since Phase 0 Tasks 7-8 (the API-calling orchestrator) don't
exist yet, no mode has ever produced answer-accuracy/citation numbers —
but Modes 1-3's **retrieval** logic is pure/deterministic (Mode 1, 2)
or cached-deterministic (Mode 3) and needs no API key, so real
retrieval recall/precision numbers were computed directly against
`eval/questions.json` and `eval/vault/` before writing this plan (see
below) — not invented.

**Measured baseline (all 3 existing modes, run directly, no API key
needed):**

| Mode | avgRecall (6 non-negative Qs) | avgPrecision | Correctly abstains (q6, q7) |
|---|---:|---:|---|
| Mode 1 (index) | 1.000 | 0.190 | true, true |
| Mode 2 (keyword, top-3) | 0.917 | 0.500 | false, true |
| Mode 3 (vector, top-3) | 0.917 | 0.500 | false, false |

Mode 1 always has perfect recall (an index, once matched, is a
superset containing every note the question needs) but floods context
with everything the matched index links (7-9 of the vault's 9 notes),
tanking precision. Modes 2/3 cap at top-3, which more than doubles
precision but costs some recall (q4 misses `agent-evaluation-august`
in both). Mode 1 also has a real, already-built signal Modes 2/3
structurally lack: `retrieveIndexRouting` returns `retrievedSlugs: []`
exactly when no index's tokens overlap the question (Phase 0's
`pickBestIndexes` threshold) — Mode 3 has no such signal (Phase 2's
plan documented this: top-K "always returns something," so it can
never correctly abstain).

**Resolved design**, chosen to combine Mode 1's abstention signal and
Mode 3's precision, not to invent a new hyperparameter beyond what's
strictly needed for "merge + rerank":

1. **Union + weighted rerank:** score every note in the vault as
   `cosineScore + (0.15 if the note's slug is in Mode 1's
   retrievedSlugs, else 0)`, then take the top-3 by that combined
   score. `0.15` is not a free-floating tuned constant — it was picked
   by inspecting the actual cosine score spread computed above (per-note
   scores across the 8 questions range roughly 0.05-0.68), so it's
   large enough to lift a borderline in-index note above a similarly-scored
   out-of-index one, without exceeding the smallest real gap between two
   in-index notes that matters (q4's 0.5458 vs 0.5178, ~0.03) enough to
   scramble ranking *within* the already-relevant set.
2. **Abstention gate:** if Mode 1's `retrievedSlugs` is empty (no index
   matched anything), hybrid returns `{contextText: '', retrievedSlugs: []}`
   immediately, without even computing vector scores. This reuses Mode
   1's existing, already-tested threshold — it is not a new invented
   knob — and is the only way hybrid can structurally do what neither
   Mode 2 nor Mode 3 can do reliably: abstain correctly on both
   negative-knowledge questions.
3. **topK = 3**, matching Modes 2/3's existing `DEFAULT_TOP_K` — Phase
   3 doesn't get to silently change the harness-wide top-K convention.

**Simulated against the real fixture data** (worked out by hand from
the measured cosine/index-match numbers, then implemented and verified
live in Task 3): this design reproduces Modes 2/3's exact avgRecall
(0.917) and avgPrecision (0.500) on this vault — because the fixture
vault's two indexes (`AI-Agents`, `Product`) between them cover 7-9 of
9 notes for every non-negative question, so the +0.15 boost, applied
near-uniformly across almost the whole vault, rarely changes which 3
notes make the cut over pure cosine ranking alone. This is a real,
disclosed limitation of the fixture vault (two broad, overlapping
indexes), not something to hide — it means today's numbers can't show
the boost's precision-lifting value; a less redundant vault would. What
the design *does* verifiably fix, on real data: hybrid correctly
abstains on **both** q6 and q7 (2/2), beating vector's 0/2 and
keyword's 1/2, while keeping Mode 2/3's precision instead of Mode 1's
0.190. That is hybrid's real, honest value on this vault: it inherits
Mode 1's "know when you don't know" signal at Mode 3's precision, at
the cost of not yet demonstrating better recall/precision than Modes
2/3 alone here — an accurate, not invented, first data point for the
eventual experiment table.

## Global Constraints

- `retrieveHybridSearch(question, vaultRoot, topK)` must return exactly
  `{contextText, retrievedSlugs}` — the same shape Modes 1-3 return,
  since all four will eventually plug into the same
  `runMode({question, vaultRoot, retrieve})` contract (Phase 0 Task 7,
  not yet built) and the same `MODES` map (Phase 0 Task 8, not yet
  built).
- No new npm dependency — reuses `embeddings.js` and `vectorScoring.js`
  (Phase 2) and `indexRouting.js` (Phase 0) exactly as they exist
  today; none of those three files are modified by this plan.
- This plan does NOT modify `runEval.js` or produce an
  `eval/results/experiment-table.md` row — Phase 0's Tasks 7-8
  (`runMode.js`, `judge.js`, `runEval.js`) still don't exist in this
  repo (confirmed: no `eval/harness/runMode.js`, `judge.js`,
  `runEval.js`, or `eval/results/` directory exists as of this plan).
  Phase 1 and Phase 2 deferred the same wiring for the same reason;
  Phase 3 follows the same precedent. Wiring all four modes into the
  orchestrator, running the real question set through the live Claude
  API, and writing the experiment table's first real rows is a
  separate, already-scoped piece of work (Phase 0 Tasks 7-8) that
  blocks all of Phases 1-3 equally — not something this plan should
  quietly take on under Phase 3's name.
- `skills/ask/SKILL.md` and every other file under `skills/` are NOT
  modified by this plan.

---

### Task 1: Pure hybrid merge/rerank module

**Files:**
- Create: `eval/harness/retrieval/hybridScoring.js`
- Test: `eval/harness/retrieval/hybridScoring.test.js`

**Interfaces:**
- Produces: `mergeAndRank({ indexMatchedSlugs: string[], scoredNotes: Array<{slug: string, score: number}>, topK: number, indexBoost: number }): Array<{slug: string, score: number}>`
  (empty array when `indexMatchedSlugs` is empty; otherwise sorted
  descending by boosted score, sliced to `topK`). Consumed by Task 2's
  `hybridSearch.js`.

- [ ] **Step 1: Write the failing test**

Create `eval/harness/retrieval/hybridScoring.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeAndRank } from './hybridScoring.js';

test('returns an empty array when indexMatchedSlugs is empty (abstention gate)', () => {
  const ranked = mergeAndRank({
    indexMatchedSlugs: [],
    scoredNotes: [{ slug: 'a', score: 0.9 }, { slug: 'b', score: 0.8 }],
    topK: 3,
    indexBoost: 0.15
  });
  assert.deepEqual(ranked, []);
});

test('adds indexBoost only to notes in indexMatchedSlugs and reranks accordingly', () => {
  const ranked = mergeAndRank({
    indexMatchedSlugs: ['b'],
    scoredNotes: [{ slug: 'a', score: 0.5 }, { slug: 'b', score: 0.4 }],
    topK: 2,
    indexBoost: 0.15
  });
  assert.equal(ranked[0].slug, 'b');
  assert.equal(ranked[0].score, 0.55);
  assert.equal(ranked[1].slug, 'a');
  assert.equal(ranked[1].score, 0.5);
});

test('sorts descending and slices to topK after boosting', () => {
  const ranked = mergeAndRank({
    indexMatchedSlugs: ['a', 'b'],
    scoredNotes: [
      { slug: 'a', score: 0.3 },
      { slug: 'b', score: 0.6 },
      { slug: 'c', score: 0.2 }
    ],
    topK: 2,
    indexBoost: 0.15
  });
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].slug, 'b');
  assert.equal(ranked[1].slug, 'a');
});

test('returns all scored notes when topK exceeds the count', () => {
  const ranked = mergeAndRank({
    indexMatchedSlugs: ['a'],
    scoredNotes: [{ slug: 'a', score: 0.5 }],
    topK: 5,
    indexBoost: 0.15
  });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].slug, 'a');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd eval/harness && node --test retrieval/hybridScoring.test.js
```

Expected: FAIL — `Cannot find module './hybridScoring.js'`.

- [ ] **Step 3: Write the implementation**

Create `eval/harness/retrieval/hybridScoring.js`:

```javascript
export function mergeAndRank({ indexMatchedSlugs, scoredNotes, topK, indexBoost }) {
  if (indexMatchedSlugs.length === 0) return [];

  const indexSet = new Set(indexMatchedSlugs);
  return scoredNotes
    .map(({ slug, score }) => ({
      slug,
      score: score + (indexSet.has(slug) ? indexBoost : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd eval/harness && node --test retrieval/hybridScoring.test.js
```

Expected: PASS, 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add eval/harness/retrieval/hybridScoring.js eval/harness/retrieval/hybridScoring.test.js
git commit -m "feat: add pure merge/rerank module for Mode 4 hybrid retrieval"
```

---

### Task 2: Mode 4 retrieval over the real vault

**Files:**
- Create: `eval/harness/retrieval/hybridSearch.js`

**Interfaces:**
- Consumes: `retrieveIndexRouting` from Phase 0's `./indexRouting.js`;
  `embedText`, `embedNotesWithCache` from Phase 2's `./embeddings.js`;
  `rankByCosineSimilarity` from Phase 2's `./vectorScoring.js`;
  `mergeAndRank` from Task 1's `./hybridScoring.js`.
- Produces: `async function retrieveHybridSearch(question: string, vaultRoot: string, topK?: number): Promise<{contextText: string, retrievedSlugs: string[]}>`,
  matching `retrieveIndexRouting`, `retrieveKeywordSearch`, and
  `retrieveVectorSearch`'s signature and return shape exactly.

- [ ] **Step 1: Write the implementation**

Create `eval/harness/retrieval/hybridSearch.js`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { retrieveIndexRouting } from './indexRouting.js';
import { embedText, embedNotesWithCache } from './embeddings.js';
import { rankByCosineSimilarity } from './vectorScoring.js';
import { mergeAndRank } from './hybridScoring.js';

const DEFAULT_TOP_K = 3;
const INDEX_BOOST = 0.15;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

function loadNotes(vaultRoot) {
  const noteFiles = walk(path.join(vaultRoot, 'notes')).filter(f => f.endsWith('.md'));
  return noteFiles.map(file => {
    const text = fs.readFileSync(file, 'utf8');
    const slug = path.basename(file, '.md');
    return { slug, text };
  });
}

export async function retrieveHybridSearch(question, vaultRoot, topK = DEFAULT_TOP_K) {
  const { retrievedSlugs: indexMatchedSlugs } = await retrieveIndexRouting(question, vaultRoot);

  const notes = loadNotes(vaultRoot);
  const cachePath = path.join(vaultRoot, '.embeddings', 'notes.json');
  const noteVectors = await embedNotesWithCache(notes, cachePath);
  const questionVector = await embedText(question);
  const scoredNotes = rankByCosineSimilarity(questionVector, noteVectors, noteVectors.length);

  const ranked = mergeAndRank({
    indexMatchedSlugs,
    scoredNotes,
    topK,
    indexBoost: INDEX_BOOST
  });

  if (ranked.length === 0) {
    return { contextText: '', retrievedSlugs: [] };
  }

  const noteBySlug = new Map(notes.map(n => [n.slug, n]));
  const contextParts = ranked.map(({ slug }) => `## [[${slug}]]\n\n${noteBySlug.get(slug).text}`);

  return {
    contextText: contextParts.join('\n\n---\n\n'),
    retrievedSlugs: ranked.map(r => r.slug)
  };
}
```

- [ ] **Step 2: Manually verify retrieval against all 8 fixture questions**

Create a throwaway check (not committed — delete after running) at
`eval/harness/_manual-check-hybrid.js`:

```javascript
import { retrieveHybridSearch } from './retrieval/hybridSearch.js';
import fs from 'node:fs';

const questions = JSON.parse(fs.readFileSync('../questions.json', 'utf8'));
for (const q of questions) {
  const { retrievedSlugs } = await retrieveHybridSearch(q.question, '../vault');
  console.log(q.id, '-> retrieved:', retrievedSlugs, '| expected:', q.expectedNotes);
}
```

Run:

```bash
cd eval/harness && node _manual-check-hybrid.js
```

Expected exact output (matches the "Simulated against the real fixture
data" numbers worked out in the Decision section above — this step
confirms the implementation actually produces them, not just the
by-hand simulation):

- `q1-direct-mcp-authz` -> `["mcp-authorization", "mcp-security", "tool-using-agents"]`
- `q2-direct-tool-vs-hitl` -> `["human-in-the-loop", "tool-using-agents", "agent-evaluation-june"]`
- `q3-synthesis-context-product` -> `["context-engineering", "product-development-with-agents", "context-management-for-ai-agents"]`
- `q4-synthesis-mcp-eval` -> `["agent-evaluation-june", "tool-using-agents", "mcp-security"]` (misses `agent-evaluation-august` — same real miss Modes 2/3 already have; see Decision section for why the boost doesn't fix this on this vault's two broad, overlapping indexes)
- `q5-temporal-agent-eval` -> `["agent-evaluation-june", "agent-evaluation-august", "tool-using-agents"]`
- `q6-negative-fine-tuning` -> `[]` (correct abstention — Mode 1's index-match signal gates this, unlike Mode 3 alone)
- `q7-negative-quantum` -> `[]` (correct abstention)
- `q8-source-sensitive-tokens` -> `["context-management-for-ai-agents", "context-engineering", "product-development-with-agents"]`

If any line differs, check first whether `eval/vault/.embeddings/notes.json`
is stale (delete it and rerun to force re-embedding) before suspecting
`mergeAndRank` or `retrieveIndexRouting` — those are already unit-tested
and manually verified in prior phases.

Delete the throwaway file when done:

```bash
rm eval/harness/_manual-check-hybrid.js
```

- [ ] **Step 3: Compute and record real aggregate recall/precision/abstention**

Still using the throwaway script's output (or re-run it), compute by
hand (or extend the script temporarily) the same aggregate `metrics.js`
would produce via `retrievalRecallPrecision`/`aggregate` over the 8
questions, and confirm it matches: avgRecall = 0.917 (5.5/6 across
q1,2,3,4,5,8), avgPrecision = 0.500 (3/6), correctlyAbstained = `[true, true]`
for q6/q7. This is the same real data already computed in the Decision
section — this step is a sanity check that the shipped code reproduces
it, not a new measurement to invent.

- [ ] **Step 4: Commit**

```bash
git add eval/harness/retrieval/hybridSearch.js
git commit -m "feat: implement Mode 4 hybrid retrieval (index-boosted vector rerank) over the eval vault"
```

---

## Self-review notes

- **Spec coverage:** Mode 4's flow ("Question → Index routing + Semantic
  search → Merge + rerank → Answer") is fully covered: index-matched
  set via `retrieveIndexRouting` (Phase 0, reused unmodified), cosine
  scores via `embeddings.js`/`vectorScoring.js` (Phase 2, reused
  unmodified), merge + rerank via `hybridScoring.js`'s `mergeAndRank`
  (Task 1), wired to the real vault via `retrieveHybridSearch` (Task
  2). The roadmap's exact phrasing ("union of Mode 1's index-routed
  notes and Mode 3's top-k vector hits, reranked... weighted sum of
  index-match boost + cosine score") is implemented literally, with the
  weight (0.15) and the abstention gate both derived from real,
  computed numbers in the Decision section rather than guessed. Wiring
  into `runEval.js`/the experiment table is explicitly out of scope per
  Global Constraints (blocked on Phase 0 Tasks 7-8, same as Phases 1-2).
- **Placeholder scan:** every step has runnable code and a concrete
  expected result (including exact expected `retrievedSlugs` arrays in
  Task 2 Step 2, derived from real computation, not "should work");
  no "add error handling"/"similar to Task N" steps.
- **Type consistency:** `retrieveHybridSearch(question, vaultRoot, topK)`
  return shape (`{contextText, retrievedSlugs}`) matches
  `retrieveIndexRouting`, `retrieveKeywordSearch`, and
  `retrieveVectorSearch` exactly. `mergeAndRank`'s `scoredNotes`
  parameter shape (`Array<{slug, score}>`) matches what
  `rankByCosineSimilarity` returns. `indexMatchedSlugs` matches the
  `retrievedSlugs` field `retrieveIndexRouting` already returns.

## Execution handoff

Two ways to execute this plan:

1. **Subagent-driven (recommended)** — a fresh subagent per task, with review between tasks.
2. **Inline execution** — run tasks in this session with checkpoints.
