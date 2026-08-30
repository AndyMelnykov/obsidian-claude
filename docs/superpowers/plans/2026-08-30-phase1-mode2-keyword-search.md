# Phase 1: Mode 2 Keyword Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Mode 2 (keyword search) retrieval for the context-engineering
eval harness: a pure, unit-tested BM25-ranking module plus a small
suffix-stripping stemmer for term expansion, and an I/O module that runs
both over the real eval vault, matching Mode 1's retrieval interface
exactly.

**Architecture:** Split into a pure scoring module
(`retrieval/keywordScoring.js` — stemmer, BM25 math, ranking, zero I/O,
fully unit-tested) and an I/O module (`retrieval/keywordSearch.js` — loads
real notes from `eval/vault/notes/**/*.md`, stems their content, ranks
against the question, returns the top-K matches). This mirrors Phase 0's
Mode 1 split (`scoring.js` pure / `indexRouting.js` I/O) and produces the
exact same `{contextText, retrievedSlugs}` return shape, so it drops into
the same `runMode`/`runEval` contract once Phase 0's Tasks 7-8 exist.

**Tech Stack:** Plain Node.js (no new npm dependencies — BM25 and
suffix-stripping are simple enough to implement directly, consistent with
the harness's "small, isolated" design). Node's built-in `node:test` +
`node:assert` for the pure module's tests, matching Phase 0's pattern.

**Spec:** [docs/superpowers/specs/2026-08-25-context-engineering-experiment.md](../specs/2026-08-25-context-engineering-experiment.md)
section "Retrieval modes → Mode 2: Keyword search" ("Question → Term
expansion → Search note titles/content → Rank results → Answer").
Phase context: [2026-08-25-context-engineering-roadmap.md](2026-08-25-context-engineering-roadmap.md)
Phase 1 — decision point resolved below. Prior phase:
[2026-08-25-eval-foundation-and-mode1-baseline.md](2026-08-25-eval-foundation-and-mode1-baseline.md)
(Tasks 1-6 complete and merged; Tasks 7-8 not yet built — see Global
Constraints).

## Decision: term expansion approach

The roadmap named an open decision for this phase: "fixed small
stopword/synonym list (deterministic, no extra API calls) vs. an
LLM-based term expansion call (costs tokens/latency, may recall better) —
worth measuring both if cheap to do."

**Resolved: deterministic suffix-stripping stemmer, not an LLM call, not a
hand-built synonym dictionary.** Reasoning:

- An LLM-based expansion call requires `ANTHROPIC_API_KEY`, which isn't
  configured yet (Phase 0's Tasks 7-8 are blocked on it for the same
  reason) — it can't even be tried right now, let alone measured against
  the deterministic option.
- A hand-built synonym dictionary (e.g. mapping "conclude" ↔ "conclusion")
  risks being reverse-engineered from this fixed 8-question vault rather
  than being a generically useful technique — that would make any later
  experiment-table numbers for Mode 2 dishonest (the spec requires real,
  unforced measurements, not tuned-to-pass ones).
- A suffix-stripping stemmer (strip common inflectional endings — plurals,
  `-ed`, `-ing` — before matching) is a standard, generic information-
  retrieval technique that normalizes word *forms*, not domain vocabulary.
  It's deterministic, needs no API access, and is exactly the kind of
  "small stopword/synonym list" alternative the roadmap named.

## Global Constraints

- No new npm dependencies — implement BM25 and stemming directly in plain
  JS (spec: "No Python, no database"; roadmap: eval harness stays a small,
  isolated Node.js tool).
- `retrieveKeywordSearch(question, vaultRoot)` must return exactly
  `{contextText, retrievedSlugs}` — the same shape Task 5's
  `retrieveIndexRouting` returns, since both will eventually plug into the
  same `runMode({question, vaultRoot, retrieve})` contract (Phase 0 Task
  7) and the same `MODES` map (Phase 0 Task 8).
- Reuse `tokenize()` from the already-committed `eval/harness/retrieval/scoring.js`
  rather than reimplementing tokenization/stopword-filtering — avoids a
  second, divergent stopword list.
- This plan does NOT modify `runEval.js` or produce an
  `eval/results/experiment-table.md` row — Phase 0's Tasks 7-8
  (`runMode.js`, `judge.js`, `runEval.js`) require `ANTHROPIC_API_KEY`,
  not yet configured, and don't exist in this repo yet. Wiring Mode 2 into
  the orchestrator is deferred until Phase 0 completes; this plan produces
  only the retrieval module, ready to be plugged in at that point.
- `skills/ask/SKILL.md` and every other file under `skills/` are NOT
  modified by this plan.

---

### Task 1: Pure keyword-scoring module (stemmer + BM25 + ranking)

**Files:**
- Create: `eval/harness/retrieval/keywordScoring.js`
- Test: `eval/harness/retrieval/keywordScoring.test.js`

**Interfaces:**
- Consumes: `tokenize(text: string): string[]` from the already-committed
  `./scoring.js`.
- Produces: `stem(word: string): string`,
  `tokenizeAndStem(text: string): string[]`,
  `buildCorpusStats(docsStems: string[][]): {totalDocs: number, avgDocLength: number, docFrequency: Record<string, number>}`,
  `bm25Score(queryStems: string[], docStems: string[], corpusStats: object, k1?: number, b?: number): number`,
  `rankNotes(queryStems: string[], notes: Array<{slug: string, stems: string[]}>): Array<{slug: string, score: number}>`
  (sorted descending by score, only score > 0 entries included).
  Consumed by Task 2's `keywordSearch.js`.

- [ ] **Step 1: Write the failing test**

Create `eval/harness/retrieval/keywordScoring.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stem, tokenizeAndStem, buildCorpusStats, bm25Score, rankNotes } from './keywordScoring.js';

test('stem strips common inflectional suffixes', () => {
  assert.equal(stem('agents'), 'agent');
  assert.equal(stem('documenting'), 'document');
  assert.equal(stem('documented'), 'document');
  assert.equal(stem('categories'), 'category');
  assert.equal(stem('boxes'), 'box');
});

test('stem leaves words with no matching suffix, or a double-s ending, unchanged', () => {
  assert.equal(stem('class'), 'class');
  assert.equal(stem('mcp'), 'mcp');
});

test('tokenizeAndStem tokenizes (stopwords removed) then stems each token', () => {
  const result = tokenizeAndStem('What did I conclude about documented agents?');
  assert.deepEqual(result, ['conclude', 'document', 'agent']);
});

test('buildCorpusStats computes totalDocs, avgDocLength, and per-term document frequency', () => {
  const docsStems = [
    ['mcp', 'authorization', 'scope'],
    ['mcp', 'security', 'tool'],
    ['agent', 'context', 'engine']
  ];
  const stats = buildCorpusStats(docsStems);
  assert.equal(stats.totalDocs, 3);
  assert.equal(stats.avgDocLength, 3);
  assert.deepEqual(stats.docFrequency, {
    mcp: 2, authorization: 1, scope: 1,
    security: 1, tool: 1,
    agent: 1, context: 1, engine: 1
  });
});

test('bm25Score matches the textbook BM25 formula for a known corpus and query', () => {
  const corpusStats = {
    totalDocs: 3,
    avgDocLength: 3,
    docFrequency: {
      mcp: 2, authorization: 1, scope: 1,
      security: 1, tool: 1,
      agent: 1, context: 1, engine: 1
    }
  };
  const k1 = 1.5;
  const b = 0.75;
  const docLength = 3;

  function expectedTermScore(term, tf) {
    const df = corpusStats.docFrequency[term] || 0;
    const idf = Math.log((corpusStats.totalDocs - df + 0.5) / (df + 0.5) + 1);
    return idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / corpusStats.avgDocLength)));
  }

  const doc1Stems = ['mcp', 'authorization', 'scope'];
  const expectedDoc1Score = expectedTermScore('mcp', 1) + expectedTermScore('authorization', 1);
  const actualDoc1Score = bm25Score(['mcp', 'authorization'], doc1Stems, corpusStats, k1, b);
  assert.ok(Math.abs(actualDoc1Score - expectedDoc1Score) < 1e-9);

  const doc2Stems = ['mcp', 'security', 'tool'];
  const expectedDoc2Score = expectedTermScore('mcp', 1); // 'authorization' has tf=0 in doc2, contributes 0
  const actualDoc2Score = bm25Score(['mcp', 'authorization'], doc2Stems, corpusStats, k1, b);
  assert.ok(Math.abs(actualDoc2Score - expectedDoc2Score) < 1e-9);
});

test('rankNotes filters out zero-score notes and sorts the rest descending', () => {
  const notes = [
    { slug: 'doc1', stems: ['mcp', 'authorization', 'scope'] },
    { slug: 'doc2', stems: ['mcp', 'security', 'tool'] },
    { slug: 'doc3', stems: ['agent', 'context', 'engine'] }
  ];
  const ranked = rankNotes(['mcp', 'authorization'], notes);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].slug, 'doc1');
  assert.equal(ranked[1].slug, 'doc2');
  assert.ok(ranked[0].score > ranked[1].score);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd eval/harness && node --test retrieval/keywordScoring.test.js
```

Expected: FAIL — `Cannot find module './keywordScoring.js'`.

- [ ] **Step 3: Write the implementation**

Create `eval/harness/retrieval/keywordScoring.js`:

```javascript
import { tokenize } from './scoring.js';

export function stem(word) {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 4 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 3 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function tokenizeAndStem(text) {
  return tokenize(text).map(stem);
}

export function buildCorpusStats(docsStems) {
  const totalDocs = docsStems.length;
  const totalLength = docsStems.reduce((sum, stems) => sum + stems.length, 0);
  const avgDocLength = totalDocs === 0 ? 0 : totalLength / totalDocs;

  const docFrequency = {};
  for (const stems of docsStems) {
    for (const term of new Set(stems)) {
      docFrequency[term] = (docFrequency[term] || 0) + 1;
    }
  }

  return { totalDocs, avgDocLength, docFrequency };
}

export function bm25Score(queryStems, docStems, corpusStats, k1 = 1.5, b = 0.75) {
  const { totalDocs, avgDocLength, docFrequency } = corpusStats;
  const docLength = docStems.length;

  const termFreq = {};
  for (const t of docStems) termFreq[t] = (termFreq[t] || 0) + 1;

  let score = 0;
  for (const term of queryStems) {
    const df = docFrequency[term] || 0;
    const tf = termFreq[term] || 0;
    if (df === 0 || tf === 0) continue;

    const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
    score += idf * (numerator / denominator);
  }
  return score;
}

export function rankNotes(queryStems, notes) {
  const corpusStats = buildCorpusStats(notes.map(n => n.stems));
  return notes
    .map(note => ({ slug: note.slug, score: bm25Score(queryStems, note.stems, corpusStats) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd eval/harness && node --test retrieval/keywordScoring.test.js
```

Expected: PASS, 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add eval/harness/retrieval/keywordScoring.js eval/harness/retrieval/keywordScoring.test.js
git commit -m "feat: add pure BM25 keyword-scoring module with suffix-stripping stemmer"
```

---

### Task 2: Keyword retrieval over the real vault

**Files:**
- Create: `eval/harness/retrieval/keywordSearch.js`

**Interfaces:**
- Consumes: `tokenizeAndStem`, `rankNotes` from Task 1's `./keywordScoring.js`.
- Produces: `async function retrieveKeywordSearch(question: string, vaultRoot: string, topK?: number): Promise<{contextText: string, retrievedSlugs: string[]}>`,
  matching Task 5's `retrieveIndexRouting` signature and return shape
  exactly — both are ready to plug into `runMode`'s `retrieve(question, vaultRoot)`
  contract once Phase 0's Task 7 exists.

- [ ] **Step 1: Write the implementation**

Create `eval/harness/retrieval/keywordSearch.js`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { tokenizeAndStem, rankNotes } from './keywordScoring.js';

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
    const titleMatch = text.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;
    return { slug, text, stems: tokenizeAndStem(`${title} ${text}`) };
  });
}

export async function retrieveKeywordSearch(question, vaultRoot, topK = DEFAULT_TOP_K) {
  const queryStems = tokenizeAndStem(question);
  const notes = loadNotes(vaultRoot);
  const ranked = rankNotes(queryStems, notes).slice(0, topK);

  if (ranked.length === 0) {
    return { contextText: '', retrievedSlugs: [] };
  }

  const noteBySlug = new Map(notes.map(n => [n.slug, n]));
  const contextParts = ranked.map(({ slug }) => {
    const note = noteBySlug.get(slug);
    return `## [[${slug}]]\n\n${note.text}`;
  });

  return {
    contextText: contextParts.join('\n\n---\n\n'),
    retrievedSlugs: ranked.map(r => r.slug)
  };
}
```

- [ ] **Step 2: Manually verify retrieval against all 8 fixture questions**

Create a throwaway check (not committed — delete after running) at
`eval/harness/_manual-check-keyword.js`:

```javascript
import { retrieveKeywordSearch } from './retrieval/keywordSearch.js';
import fs from 'node:fs';

const questions = JSON.parse(fs.readFileSync('../questions.json', 'utf8'));
for (const q of questions) {
  const { retrievedSlugs } = await retrieveKeywordSearch(q.question, '../vault');
  console.log(q.id, '-> retrieved:', retrievedSlugs, '| expected:', q.expectedNotes);
}
```

Run:

```bash
cd eval/harness && node _manual-check-keyword.js
```

Expected qualitative behavior (Mode 2 ranks by term overlap, so — unlike
Mode 1's index routing — matches are not guaranteed to be perfect; that
imprecision is real signal for the eventual experiment table, not a bug
to eliminate here):

- `q1` ("What did I conclude about MCP authorization?"): `mcp-authorization`
  should appear in `retrievedSlugs` (both the question and that note share
  the stems `mcp` and `authoriz`/`authorization`-derived terms after
  tokenization).
- `q7` ("What's my documented opinion on quantum computing hardware
  roadmaps?"): `retrievedSlugs` must be `[]` — no note in the vault
  contains any stem overlapping "quantum", "computing", "hardware", or
  "roadmaps", so every note scores 0 and is filtered out.
- `q6` ("What did I write about fine-tuning GPT models?"): unlike Mode 1,
  this is **not** expected to return `[]`. The word "model" (stemmed from
  "models") appears as ordinary vocabulary in unrelated notes — e.g.
  `context-engineering.md`'s "the model's limited attention" and
  `product-development-with-agents.md`'s "the underlying model's raw
  capability" — so BM25 term overlap alone can retrieve
  `context-engineering`, `product-development-with-agents`, and
  `tool-using-agents` for this question even though none of them discuss
  fine-tuning or GPT specifically. This is a genuine, expected limitation
  of bag-of-words keyword matching (it can't distinguish "a model" as a
  generic word from "GPT model fine-tuning" as a topic) — it's real signal
  for the eventual experiment table, not something to fix here. Fixing it
  would mean hand-tuning against this specific vault's vocabulary, which
  both Global Constraints and the term-expansion decision above rule out.
- For the remaining questions (`q2`-`q5`, `q8`), at least one of each
  question's `expectedNotes` slugs should appear somewhere in
  `retrievedSlugs` — if none do for a given question, read that question's
  actual retrieved notes and their scores before concluding anything is
  broken: Mode 2 ranking on a 9-note vault with short notes can plausibly
  under- or over-match on some questions, and that's a real result to
  report later, not necessarily an implementation defect. Only treat it as
  a defect if you can point to a specific logic error (e.g. a stemming or
  scoring mistake), not merely "the ranking wasn't what I expected."

Delete the throwaway file when done:

```bash
rm eval/harness/_manual-check-keyword.js
```

- [ ] **Step 3: Commit**

```bash
git add eval/harness/retrieval/keywordSearch.js
git commit -m "feat: implement Mode 2 BM25 keyword search over the eval vault"
```

---

## Self-review notes

- **Spec coverage:** Mode 2's flow ("Question → Term expansion → Search
  note titles/content → Rank results") is fully covered: term expansion
  via `tokenizeAndStem`'s stemming (Task 1), search + ranking via
  `rankNotes`/`bm25Score` over note titles+content (Task 1), wired to the
  real vault via `retrieveKeywordSearch` (Task 2). Wiring into
  `runEval.js`/the experiment table is explicitly out of scope per Global
  Constraints (blocked on Phase 0 Tasks 7-8).
- **Placeholder scan:** every step has runnable code and a concrete
  expected result; no "add error handling"/"similar to Task N" steps.
- **Type consistency:** `retrieveKeywordSearch(question, vaultRoot, topK)`
  return shape (`{contextText, retrievedSlugs}`) matches Task 5's
  `retrieveIndexRouting` exactly. `rankNotes`' input shape
  (`Array<{slug, stems}>`) matches what Task 2's `loadNotes` produces.
  `bm25Score`'s `corpusStats` parameter shape matches
  `buildCorpusStats`' return shape exactly in both the test and the
  implementation.

## Execution handoff

Two ways to execute this plan:

1. **Subagent-driven (recommended)** — a fresh subagent per task, with review between tasks.
2. **Inline execution** — run tasks in this session with checkpoints.
