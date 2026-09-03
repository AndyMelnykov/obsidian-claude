# Phase 2: Mode 3 Vector Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Mode 3 (vector retrieval) for the context-engineering eval
harness: a local-embedding-model-based retrieval module that matches
Mode 1/2's exact `{contextText, retrievedSlugs}` contract, with note
embeddings cached to a flat JSON file keyed by content hash.

**Architecture:** Split into a pure scoring module
(`retrieval/vectorScoring.js` — cosine similarity + top-K ranking, zero
I/O, fully unit-tested) and two I/O modules: `retrieval/embeddings.js`
(loads the local embedding model, embeds text, reads/writes the
content-hash-keyed cache) and `retrieval/vectorSearch.js` (loads real
notes from `eval/vault/notes/**/*.md`, gets their embeddings via the
cache, embeds the question, ranks via `vectorScoring.js`, returns the
top-K matches). This mirrors Phase 0/1's pure/I/O split
(`scoring.js`/`indexRouting.js`, `keywordScoring.js`/`keywordSearch.js`)
and produces the exact same `{contextText, retrievedSlugs}` return
shape, so it drops into the same `runMode`/`runEval` contract once
Phase 0's Tasks 7-8 exist.

**Tech Stack:** `@xenova/transformers` (ONNX runtime, `Xenova/all-MiniLM-L6-v2`
model) for local, no-API-key embeddings — the one new npm dependency
this phase needs, already locked in by the roadmap. Node's built-in
`node:test` + `node:assert` + `node:crypto` for the pure/cache modules'
tests, matching Phase 0/1's pattern.

**Spec:** [docs/superpowers/specs/2026-08-25-context-engineering-experiment.md](../specs/2026-08-25-context-engineering-experiment.md)
section "Retrieval modes → Mode 3: Vector retrieval" ("Question →
Embedding → Vector search → Top-k notes/chunks → Answer"). Phase
context: [2026-08-25-context-engineering-roadmap.md](2026-08-25-context-engineering-roadmap.md)
Phase 2 — decision point resolved below. Prior phases:
[2026-08-25-eval-foundation-and-mode1-baseline.md](2026-08-25-eval-foundation-and-mode1-baseline.md)
(Tasks 1-6 complete and merged; Tasks 7-8 not yet built — see Global
Constraints), [2026-08-30-phase1-mode2-keyword-search.md](2026-08-30-phase1-mode2-keyword-search.md)
(complete and merged).

## Decision: chunking granularity

The roadmap named an open decision for this phase: "Chunking decision
needed at plan time: whole-note vs. paragraph-level chunks (spec calls
out 'chunking can destroy context' as a named weakness — the plan
should pick one and say why)."

**Resolved: embed whole notes, not paragraph-level chunks.** Reasoning:

- The spec's own "Note quality rules" require every note to "represent
  one coherent idea" and "be understandable independently." The eval
  vault's fixture notes (`eval/vault/notes/**/*.md`) were built to that
  rule — each is a short, single-idea note (one `## Idea` section, a
  few sentences, plus `## Connections`). Splitting an already-atomic
  note into paragraph chunks would cut the `## Idea` prose away from
  the `## Connections` that explain why it matters — the exact
  "chunking can destroy context" failure the spec warns about — for no
  retrieval benefit, since these notes are already short enough to
  embed whole.
- Choosing a chunk size (by paragraph, by token count, with what
  overlap) is itself an unmeasured hyperparameter. Phase 1's plan
  rejected a hand-built synonym dictionary for the same reason: tuning
  a knob to this fixed 9-note vault risks a dishonest, overfit result
  rather than a generically useful technique. Whole-note embedding has
  no such knob to tune.
- Whole-note embedding matches the roadmap's own phrasing exactly:
  "embed every note (cached ... keyed by content hash so unchanged
  notes skip re-embedding)" — one embedding per note, not per chunk.

Paragraph-level chunking remains a documented option if a later,
larger vault makes whole-note embeddings too coarse — not decided
here, since no such evidence exists yet.

## Decision: similarity threshold

Not adding one. `retrieveVectorSearch` always returns the top-K notes
by cosine similarity, with no minimum-score cutoff. Reasoning: a cutoff
value is exactly the kind of unmeasured, fixture-vault-tuned knob the
"chunking granularity" decision above already rejected for the same
reason. This has a real, known consequence — see Task 3's manual
verification step — which is honest signal for the eventual experiment
table, not a defect to engineer away before it's ever been measured.

## Global Constraints

- New dependency: `@xenova/transformers` (^2.17.2) in
  `eval/harness/package.json` — the one deliberate exception to Phase
  1's "no new npm dependencies" rule, because implementing a neural
  embedding model from scratch is not reasonable, unlike BM25. Already
  locked in by the roadmap: "a local embedding model
  (`@xenova/transformers`, ONNX runtime, e.g. `all-MiniLM-L6-v2`) — no
  network call [at inference], no API key, consistent with
  local-first."
- `retrieveVectorSearch(question, vaultRoot, topK)` must return exactly
  `{contextText, retrievedSlugs}` — the same shape Task 5's
  `retrieveIndexRouting` and Phase 1's `retrieveKeywordSearch` return,
  since all three will eventually plug into the same
  `runMode({question, vaultRoot, retrieve})` contract (Phase 0 Task 7)
  and the same `MODES` map (Phase 0 Task 8).
- Note embeddings are cached to `<vaultRoot>/.embeddings/notes.json`,
  keyed by note slug, storing `{hash, vector}` per note — `hash` is a
  SHA-256 of the note's raw text (`node:crypto`, no new dependency for
  hashing). A note whose content hash hasn't changed since the last run
  skips re-embedding. The question's embedding is never cached (each
  question differs; roadmap only calls for caching note embeddings).
- The embedding model itself downloads once from Hugging Face on first
  use and is cached by `@xenova/transformers` in its own on-disk cache
  (separate from our `.embeddings/notes.json` vector cache) — this
  needs network access the first time only, not per run.
- `eval/vault/.embeddings/` (the generated vector cache) is a build
  artifact, not fixture data — add it to the repo root `.gitignore`.
- This plan does NOT modify `runEval.js` or produce an
  `eval/results/experiment-table.md` row — Phase 0's Tasks 7-8
  (`runMode.js`, `judge.js`, `runEval.js`) still don't exist in this
  repo. Wiring Mode 3 into the orchestrator is deferred until Phase 0
  completes; this plan produces only the retrieval module, ready to be
  plugged in at that point.
- `skills/ask/SKILL.md` and every other file under `skills/` are NOT
  modified by this plan.

---

### Task 1: Pure vector-scoring module (cosine similarity + ranking)

**Files:**
- Create: `eval/harness/retrieval/vectorScoring.js`
- Test: `eval/harness/retrieval/vectorScoring.test.js`

**Interfaces:**
- Produces: `cosineSimilarity(a: number[], b: number[]): number` and
  `rankByCosineSimilarity(queryVector: number[], noteVectors: Array<{slug: string, vector: number[]}>, topK: number): Array<{slug: string, score: number}>`
  (sorted descending by score, sliced to `topK`).
  Consumed by Task 3's `vectorSearch.js`.

- [ ] **Step 1: Write the failing test**

Create `eval/harness/retrieval/vectorScoring.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, rankByCosineSimilarity } from './vectorScoring.js';

test('cosineSimilarity returns 1 for identical vectors', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
});

test('cosineSimilarity returns 0 for orthogonal vectors', () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test('cosineSimilarity returns -1 for opposite vectors', () => {
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
});

test('cosineSimilarity returns 0 when either vector is all zeros', () => {
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
  assert.equal(cosineSimilarity([1, 1], [0, 0]), 0);
});

test('rankByCosineSimilarity sorts descending and slices to topK', () => {
  const query = [1, 0];
  const noteVectors = [
    { slug: 'far', vector: [0, 1] },
    { slug: 'near', vector: [1, 0] },
    { slug: 'mid', vector: [1, 1] }
  ];
  const ranked = rankByCosineSimilarity(query, noteVectors, 2);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].slug, 'near');
  assert.equal(ranked[1].slug, 'mid');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('rankByCosineSimilarity returns all notes when topK exceeds the count', () => {
  const query = [1, 0];
  const noteVectors = [{ slug: 'a', vector: [1, 0] }];
  const ranked = rankByCosineSimilarity(query, noteVectors, 5);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].slug, 'a');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd eval/harness && node --test retrieval/vectorScoring.test.js
```

Expected: FAIL — `Cannot find module './vectorScoring.js'`.

- [ ] **Step 3: Write the implementation**

Create `eval/harness/retrieval/vectorScoring.js`:

```javascript
export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function rankByCosineSimilarity(queryVector, noteVectors, topK) {
  return noteVectors
    .map(({ slug, vector }) => ({ slug, score: cosineSimilarity(queryVector, vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd eval/harness && node --test retrieval/vectorScoring.test.js
```

Expected: PASS, 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add eval/harness/retrieval/vectorScoring.js eval/harness/retrieval/vectorScoring.test.js
git commit -m "feat: add pure cosine-similarity ranking module for Mode 3 vector retrieval"
```

---

### Task 2: Embedding model + content-hash-keyed cache

**Files:**
- Modify: `eval/harness/package.json` (add `@xenova/transformers` dependency)
- Create: `eval/harness/retrieval/embeddings.js`
- Test: `eval/harness/retrieval/embeddings.test.js`
- Modify: repo root `.gitignore` (ignore the generated embedding cache)

**Interfaces:**
- Produces: `hashContent(text: string): string`,
  `loadCache(cachePath: string): Record<string, {hash: string, vector: number[]}>`,
  `saveCache(cachePath: string, cache: object): void`,
  `embedText(text: string): Promise<number[]>`,
  `embedNotesWithCache(notes: Array<{slug: string, text: string}>, cachePath: string): Promise<Array<{slug: string, vector: number[]}>>`.
  Consumed by Task 3's `vectorSearch.js`.

- [ ] **Step 1: Add the dependency**

Edit `eval/harness/package.json`'s `dependencies` to add
`@xenova/transformers`:

```json
{
  "name": "obsidian-claude-eval-harness",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Context-engineering experiment eval harness (dev tool, not part of the skills product).",
  "scripts": {
    "test": "node --test",
    "eval": "node runEval.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "@xenova/transformers": "^2.17.2"
  }
}
```

Run:

```bash
cd eval/harness && npm install
```

Expected: `node_modules/@xenova/transformers` exists, `package-lock.json`
updated, no errors.

- [ ] **Step 2: Ignore the generated embedding cache**

Add to the repo root `.gitignore` (append to the existing "Eval harness
(dev tool)" section):

```gitignore
eval/vault/.embeddings/
```

- [ ] **Step 3: Write the failing test for the pure/cache parts**

Create `eval/harness/retrieval/embeddings.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hashContent, loadCache, saveCache } from './embeddings.js';

test('hashContent returns the same hash for identical content', () => {
  assert.equal(hashContent('hello world'), hashContent('hello world'));
});

test('hashContent returns different hashes for different content', () => {
  assert.notEqual(hashContent('hello'), hashContent('world'));
});

test('loadCache returns an empty object when the cache file does not exist', () => {
  const missingPath = path.join(os.tmpdir(), `embeddings-cache-missing-${Date.now()}.json`);
  assert.deepEqual(loadCache(missingPath), {});
});

test('saveCache then loadCache round-trips the cache contents', () => {
  const cachePath = path.join(os.tmpdir(), `embeddings-cache-roundtrip-${Date.now()}.json`);
  const cache = { 'my-note': { hash: 'abc123', vector: [0.1, 0.2, 0.3] } };
  saveCache(cachePath, cache);
  assert.deepEqual(loadCache(cachePath), cache);
  fs.unlinkSync(cachePath);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run:

```bash
cd eval/harness && node --test retrieval/embeddings.test.js
```

Expected: FAIL — `Cannot find module './embeddings.js'`.

- [ ] **Step 5: Write the implementation**

Create `eval/harness/retrieval/embeddings.js`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

let extractorPromise;
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_NAME);
  }
  return extractorPromise;
}

export function hashContent(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function loadCache(cachePath) {
  if (!fs.existsSync(cachePath)) return {};
  return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

export function saveCache(cachePath, cache) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

export async function embedText(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export async function embedNotesWithCache(notes, cachePath) {
  const cache = loadCache(cachePath);
  const results = [];
  let cacheChanged = false;

  for (const note of notes) {
    const hash = hashContent(note.text);
    const cached = cache[note.slug];
    if (cached && cached.hash === hash) {
      results.push({ slug: note.slug, vector: cached.vector });
      continue;
    }
    const vector = await embedText(note.text);
    cache[note.slug] = { hash, vector };
    cacheChanged = true;
    results.push({ slug: note.slug, vector });
  }

  if (cacheChanged) saveCache(cachePath, cache);
  return results;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run:

```bash
cd eval/harness && node --test retrieval/embeddings.test.js
```

Expected: PASS, 4 tests passing. (This test file never calls
`embedText`/`embedNotesWithCache`, so it needs no network access and no
model download.)

- [ ] **Step 7: Manually verify one live embedding call**

Run (requires network access the first time, to download the model —
subsequent runs use the library's own model cache):

```bash
cd eval/harness && node -e "
import('./retrieval/embeddings.js').then(async ({ embedText }) => {
  const vector = await embedText('What did I conclude about MCP authorization?');
  console.log('vector length:', vector.length);
  console.log('first 5 values:', vector.slice(0, 5));
});
"
```

Expected: `vector length: 384` (the model's embedding dimension) and 5
finite numbers, no error. The first run downloads the model and may
take up to a minute; later runs are fast.

- [ ] **Step 8: Commit**

```bash
git add eval/harness/package.json eval/harness/package-lock.json eval/harness/retrieval/embeddings.js eval/harness/retrieval/embeddings.test.js .gitignore
git commit -m "feat: add local embedding model wrapper and content-hash-keyed cache"
```

---

### Task 3: Mode 3 retrieval over the real vault

**Files:**
- Create: `eval/harness/retrieval/vectorSearch.js`

**Interfaces:**
- Consumes: `embedText`, `embedNotesWithCache` from Task 2's
  `./embeddings.js`; `rankByCosineSimilarity` from Task 1's
  `./vectorScoring.js`.
- Produces: `async function retrieveVectorSearch(question: string, vaultRoot: string, topK?: number): Promise<{contextText: string, retrievedSlugs: string[]}>`,
  matching Task 5's `retrieveIndexRouting` and Phase 1's
  `retrieveKeywordSearch` signature and return shape exactly.

- [ ] **Step 1: Write the implementation**

Create `eval/harness/retrieval/vectorSearch.js`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { embedText, embedNotesWithCache } from './embeddings.js';
import { rankByCosineSimilarity } from './vectorScoring.js';

const DEFAULT_TOP_K = 3;

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

export async function retrieveVectorSearch(question, vaultRoot, topK = DEFAULT_TOP_K) {
  const notes = loadNotes(vaultRoot);
  const cachePath = path.join(vaultRoot, '.embeddings', 'notes.json');
  const noteVectors = await embedNotesWithCache(notes, cachePath);
  const questionVector = await embedText(question);
  const ranked = rankByCosineSimilarity(questionVector, noteVectors, topK);

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
`eval/harness/_manual-check-vector.js`:

```javascript
import { retrieveVectorSearch } from './retrieval/vectorSearch.js';
import fs from 'node:fs';

const questions = JSON.parse(fs.readFileSync('../questions.json', 'utf8'));
for (const q of questions) {
  const { retrievedSlugs } = await retrieveVectorSearch(q.question, '../vault');
  console.log(q.id, '-> retrieved:', retrievedSlugs, '| expected:', q.expectedNotes);
}
```

Run (first run downloads the model if Task 2 Step 7 hasn't already):

```bash
cd eval/harness && node _manual-check-vector.js
```

Expected qualitative behavior (Mode 3 has no similarity threshold — see
"Decision: similarity threshold" above — so `retrievedSlugs` is never
empty, unlike Modes 1-2):

- `q1`-`q5`, `q8` (questions with real `expectedNotes`): at least one
  expected slug should appear in the top 3 for most of these — if one
  doesn't, read the actual top-3 scores before concluding anything is
  broken; a 9-note vault gives embeddings little to discriminate
  against, and a miss here is real signal for the eventual experiment
  table, not necessarily an implementation defect. Only treat it as a
  defect if you can point to a specific logic error (e.g. the cache
  returning a stale vector, or `rankByCosineSimilarity` sorting
  ascending instead of descending).
- `q6`/`q7` (negative-knowledge — correct answer is "no relevant note
  exists"): `retrievedSlugs` will contain 3 slugs, **not** `[]`. This
  is the expected, documented consequence of having no similarity
  threshold (top-K always returns something) — it means Mode 3, as
  built, cannot structurally produce a correct `correctlyAbstained`
  result the way Modes 1-2 can. This is real experimental signal about
  a genuine weakness of naive top-K vector search, not a bug to silently
  patch by adding an untested threshold.
- Verify caching works: run the script a second time immediately after.
  It should complete noticeably faster than the first run (no
  re-embedding), and `eval/vault/.embeddings/notes.json` should exist
  containing one entry per note in `eval/vault/notes/`.

Delete the throwaway file when done:

```bash
rm eval/harness/_manual-check-vector.js
```

- [ ] **Step 3: Commit**

```bash
git add eval/harness/retrieval/vectorSearch.js
git commit -m "feat: implement Mode 3 local-embedding vector retrieval over the eval vault"
```

---

## Self-review notes

- **Spec coverage:** Mode 3's flow ("Question → Embedding → Vector
  search → Top-k notes/chunks") is fully covered: embedding via
  `embedText`/`embedNotesWithCache` (Task 2), cosine-similarity ranking
  (Task 1), wired to the real vault via `retrieveVectorSearch` (Task
  3). The spec's named weakness "chunking can destroy context" is
  explicitly addressed by the "Decision: chunking granularity" section
  (whole-note embedding, no chunking). Caching (roadmap: "cached to
  `eval/vault/.embeddings/*.json` keyed by content hash so unchanged
  notes skip re-embedding") is implemented in Task 2 and verified in
  Task 3 Step 2. Wiring into `runEval.js`/the experiment table is
  explicitly out of scope per Global Constraints (blocked on Phase 0
  Tasks 7-8, same as Phase 1).
- **Placeholder scan:** every step has runnable code and a concrete
  expected result; no "add error handling"/"similar to Task N" steps.
- **Type consistency:** `retrieveVectorSearch(question, vaultRoot, topK)`
  return shape (`{contextText, retrievedSlugs}`) matches Task 5's
  `retrieveIndexRouting` and Phase 1's `retrieveKeywordSearch` exactly.
  `rankByCosineSimilarity`'s `noteVectors` parameter shape
  (`Array<{slug, vector}>`) matches what Task 2's
  `embedNotesWithCache` returns and what Task 3's `vectorSearch.js`
  passes in. `embedNotesWithCache`'s `notes` parameter shape
  (`Array<{slug, text}>`) matches what Task 3's `loadNotes` produces.

## Execution handoff

Two ways to execute this plan:

1. **Subagent-driven (recommended)** — a fresh subagent per task, with review between tasks.
2. **Inline execution** — run tasks in this session with checkpoints.
