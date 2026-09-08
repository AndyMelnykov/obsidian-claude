# Phase 4a: Eval Orchestrator + 3-Way Uncertainty Grading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the eval harness's missing API-calling orchestrator
(`runMode.js`, `judge.js`, `runEval.js` — planned in Phase 0 but never
built, per that plan's own Task 7-8 and every later phase's "Global
Constraints" section confirming this) with a 3-way Known/Partially
known/Unknown grading rubric designed in from the start, wire all four
already-built retrieval modes into it, and produce the experiment
table's first real rows from actual Claude API runs.

**Architecture:** `runMode.js` calls the Claude API to answer a
question from a mode's retrieved context, timing it and reading real
token counts off the response (unchanged from the Phase 0 design — no
uncertainty logic lives here, only answering + measurement). `judge.js`
makes a second Claude call that grades two independent things: whether
the agent's stated certainty (`known`/`partial`/`unknown`) matches the
question's ground-truth certainty, and — separately — whether the
specific facts it claimed are accurate. `runEval.js` wires a `MODES` map
(all four retrieval functions from Phases 0-3) through `runMode` +
`judge` + `metrics.js`'s aggregation, one mode per invocation, writing
`eval/results/<mode>.json` and a row of `eval/results/experiment-table.md`
each time.

**Tech Stack:** Node.js, `@anthropic-ai/sdk` (already a harness
dependency), Node's built-in `node:test` + `node:assert`. No new
dependencies.

**Spec:** [docs/superpowers/specs/2026-08-25-context-engineering-experiment.md](../specs/2026-08-25-context-engineering-experiment.md)
sections "Handling uncertainty" (Known / Partially known / Unknown),
"Metrics", "Experiment table", "Citation behavior". Phase context:
[2026-08-25-context-engineering-roadmap.md](2026-08-25-context-engineering-roadmap.md)
Phase 4's first bullet. Prior phases:
[2026-08-25-eval-foundation-and-mode1-baseline.md](2026-08-25-eval-foundation-and-mode1-baseline.md)
(Tasks 1-6 complete and merged; Tasks 7-8 — the orchestrator this plan
finally builds — were designed there but never implemented, confirmed
absent as of this plan: no `eval/harness/runMode.js`, `judge.js`,
`runEval.js`, or `eval/results/` directory exists in the repo),
[2026-08-30-phase1-mode2-keyword-search.md](2026-08-30-phase1-mode2-keyword-search.md),
[2026-09-03-phase2-mode3-vector-retrieval.md](2026-09-03-phase2-mode3-vector-retrieval.md),
[2026-09-06-phase3-mode4-hybrid-retrieval.md](2026-09-06-phase3-mode4-hybrid-retrieval.md)
(all three complete and merged; all three explicitly deferred the
orchestrator to "Phase 0 Tasks 7-8," which is this plan).

## Global Constraints

- Numbers in `experiment-table.md`/`eval/results/*.json` must come from
  actual harness runs against the real Claude API — never hand-typed or
  estimated (spec: "Numbers should come from actual tests, not invented
  examples").
- Every answer the harness records must carry `[[wikilink]]` citations
  to the notes it actually used (spec: "Citation behavior").
- The judge must grade a 3-way certainty label (`known`/`partial`/`unknown`)
  against each question's ground truth, not a binary — this is the
  phase's core deliverable, replacing the old binary `expectedUnknown`
  design Phase 0 sketched but never shipped.
- `skills/ask/SKILL.md` and every other file under `skills/` are **not**
  modified by this plan — unchanged from every prior phase's boundary.
- Requires `ANTHROPIC_API_KEY` in the environment for the API-calling
  steps. Deliberate, explicit, maintainer-run process — not vault-skill
  behavior, same boundary Phase 0's plan documented.
- No new npm dependency — `@anthropic-ai/sdk` is already installed
  (`eval/harness/package.json`).
- Reuses `retrieveIndexRouting`, `retrieveKeywordSearch`,
  `retrieveVectorSearch`, `retrieveHybridSearch` exactly as built in
  Phases 0-3; none of those four files are modified by this plan.

---

### Task 1: Extend the fixed question set with 3-way certainty labels

**Files:**
- Modify: `eval/questions.json`

**Interfaces:**
- Produces: each question object's shape becomes
  `{id, question, type, expectedNotes, expectedCertainty}`, where
  `expectedCertainty` is `"known" | "partial" | "unknown"` — replaces
  the old binary `expectedUnknown` field (which no built code ever
  consumed, since `judge.js` never existed). Consumed by Task 4's
  `judge.js` and Task 5's `runEval.js`.

- [ ] **Step 1: Rewrite the question set**

Replace the full contents of `eval/questions.json` with:

```json
[
  {
    "id": "q1-direct-mcp-authz",
    "question": "What did I conclude about MCP authorization?",
    "type": "direct",
    "expectedNotes": ["mcp-authorization"],
    "expectedCertainty": "known"
  },
  {
    "id": "q2-direct-tool-vs-hitl",
    "question": "What's the difference between tool-using agents and human-in-the-loop design?",
    "type": "direct",
    "expectedNotes": ["tool-using-agents", "human-in-the-loop"],
    "expectedCertainty": "known"
  },
  {
    "id": "q3-synthesis-context-product",
    "question": "How do my notes connect context engineering and product operating models?",
    "type": "synthesis",
    "expectedNotes": ["context-engineering", "product-development-with-agents"],
    "expectedCertainty": "known"
  },
  {
    "id": "q4-synthesis-mcp-eval",
    "question": "How does MCP security relate to what I've written about agent evaluation?",
    "type": "synthesis",
    "expectedNotes": ["mcp-security", "agent-evaluation-august"],
    "expectedCertainty": "known"
  },
  {
    "id": "q5-temporal-agent-eval",
    "question": "What changed in my view on agent evaluation between June and August?",
    "type": "temporal",
    "expectedNotes": ["agent-evaluation-june", "agent-evaluation-august"],
    "expectedCertainty": "known"
  },
  {
    "id": "q6-negative-fine-tuning",
    "question": "What did I write about fine-tuning GPT models?",
    "type": "negative",
    "expectedNotes": [],
    "expectedCertainty": "unknown"
  },
  {
    "id": "q7-negative-quantum",
    "question": "What's my documented opinion on quantum computing hardware roadmaps?",
    "type": "negative",
    "expectedNotes": [],
    "expectedCertainty": "unknown"
  },
  {
    "id": "q8-source-sensitive-tokens",
    "question": "Which source supports the claim that structured context can reduce unnecessary token usage?",
    "type": "source-sensitive",
    "expectedNotes": ["context-management-for-ai-agents"],
    "expectedCertainty": "known"
  },
  {
    "id": "q9-partial-mcp-hitl",
    "question": "Did I conclude that MCP tool calls specifically should require human-in-the-loop approval?",
    "type": "partial",
    "expectedNotes": ["mcp-security", "mcp-authorization", "human-in-the-loop"],
    "expectedCertainty": "partial"
  }
]
```

`q9` is new: `mcp-security`, `mcp-authorization`, and `human-in-the-loop`
are genuinely thematically linked (via `tool-using-agents`' own
"Connections" section) and are real, retrievable evidence — but no note
in the vault actually states that MCP tool calls specifically require
human approval. That gap between "related evidence exists" and "the
specific question isn't directly resolved" is what "partially known"
means, and without this question the 3-way rubric would never see a
real `partial` case among the fixed questions.

- [ ] **Step 2: Verify the question set is well-formed**

Run (from the repo root):

```bash
node -e "
const fs = require('fs');
const path = require('path');
const questions = JSON.parse(fs.readFileSync('eval/questions.json', 'utf8'));
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
const slugs = new Set(walk('eval/vault/notes').map(f => path.basename(f, '.md')));
const validCertainty = new Set(['known', 'partial', 'unknown']);
for (const q of questions) {
  if (!validCertainty.has(q.expectedCertainty)) console.log('BAD certainty', q.id, q.expectedCertainty);
  for (const s of q.expectedNotes) {
    if (!slugs.has(s)) console.log('MISSING slug', s, 'in question', q.id);
  }
}
console.log('checked', questions.length, 'questions;',
  questions.filter(q => q.expectedCertainty === 'partial').length, 'partial case(s)');
"
```

Expected: `checked 9 questions; 1 partial case(s)`, no `BAD certainty` or
`MISSING slug` lines.

- [ ] **Step 3: Commit**

```bash
git add eval/questions.json
git commit -m "feat: extend fixed question set with 3-way certainty labels and a partial-knowledge case"
```

---

### Task 2: Metrics — certainty accuracy alongside content accuracy

**Files:**
- Modify: `eval/harness/metrics.js`
- Modify: `eval/harness/metrics.test.js`

**Interfaces:**
- Produces: `aggregate(perQuestionResults)` gains a `certaintyAccuracy`
  field (average of each row's `certaintyCorrect`, 0/1). Its existing
  `answerAccuracy` field is now sourced from each row's
  `contentAccuracy` (boolean or `null`) instead of the old
  `answerCorrect`, with `null` rows excluded from the average rather
  than counted as failures. Consumed by Task 5's `runEval.js`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `eval/harness/metrics.test.js` with:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retrievalRecallPrecision, aggregate } from './metrics.js';

test('recall/precision for a normal question with expected notes', () => {
  const result = retrievalRecallPrecision({
    retrievedSlugs: ['mcp-authorization', 'mcp-security'],
    expectedNotes: ['mcp-authorization']
  });
  assert.equal(result.recall, 1);
  assert.equal(result.precision, 0.5);
  assert.equal(result.correctlyAbstained, null);
});

test('recall is 0 when the expected note was not retrieved', () => {
  const result = retrievalRecallPrecision({ retrievedSlugs: [], expectedNotes: ['mcp-authorization'] });
  assert.equal(result.recall, 0);
  assert.equal(result.precision, 0);
});

test('negative-knowledge question with correct abstention', () => {
  const result = retrievalRecallPrecision({ retrievedSlugs: [], expectedNotes: [] });
  assert.equal(result.recall, null);
  assert.equal(result.precision, null);
  assert.equal(result.correctlyAbstained, true);
});

test('negative-knowledge question with incorrect over-retrieval', () => {
  const result = retrievalRecallPrecision({ retrievedSlugs: ['some-note'], expectedNotes: [] });
  assert.equal(result.correctlyAbstained, false);
});

test('aggregate computes averages across per-question results, including certainty accuracy', () => {
  const rows = [
    { contentAccuracy: true, certaintyCorrect: true, citationsSupported: true, inputTokens: 1000, latencyMs: 1500, recall: 1, precision: 1 },
    { contentAccuracy: false, certaintyCorrect: true, citationsSupported: true, inputTokens: 2000, latencyMs: 2500, recall: 0.5, precision: 1 }
  ];
  const agg = aggregate(rows);
  assert.equal(agg.answerAccuracy, 0.5);
  assert.equal(agg.certaintyAccuracy, 1);
  assert.equal(agg.citationPrecision, 1);
  assert.equal(agg.avgContextTokens, 1500);
  assert.equal(agg.avgLatencyMs, 2000);
  assert.equal(agg.avgRecall, 0.75);
  assert.equal(agg.avgPrecision, 1);
});

test('aggregate excludes null contentAccuracy (unknown-certainty questions) from answerAccuracy', () => {
  const rows = [
    { contentAccuracy: true, certaintyCorrect: true, citationsSupported: true, inputTokens: 1000, latencyMs: 1000, recall: 1, precision: 1 },
    { contentAccuracy: null, certaintyCorrect: true, citationsSupported: true, inputTokens: 1000, latencyMs: 1000, recall: null, precision: null }
  ];
  const agg = aggregate(rows);
  assert.equal(agg.answerAccuracy, 1);
  assert.equal(agg.certaintyAccuracy, 1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
cd eval/harness && node --test metrics.test.js
```

Expected: the two new/changed `aggregate` tests FAIL — `agg.answerAccuracy`
comes back `0` instead of `0.5`/`1` (current code reads `r.answerCorrect`,
which is `undefined` on these fixtures) and `agg.certaintyAccuracy` is
`undefined`.

- [ ] **Step 3: Write the implementation**

Replace the full contents of `eval/harness/metrics.js` with:

```javascript
export function retrievalRecallPrecision({ retrievedSlugs, expectedNotes }) {
  if (expectedNotes.length === 0) {
    return { recall: null, precision: null, correctlyAbstained: retrievedSlugs.length === 0 };
  }
  const retrievedSet = new Set(retrievedSlugs);
  const hits = expectedNotes.filter(s => retrievedSet.has(s)).length;
  const recall = hits / expectedNotes.length;
  const precision = retrievedSlugs.length === 0 ? 0 : hits / retrievedSlugs.length;
  return { recall, precision, correctlyAbstained: null };
}

function average(numbers) {
  const valid = numbers.filter(n => typeof n === 'number' && !Number.isNaN(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function aggregate(perQuestionResults) {
  return {
    answerAccuracy: average(perQuestionResults.map(r => (r.contentAccuracy === null ? null : (r.contentAccuracy ? 1 : 0)))),
    certaintyAccuracy: average(perQuestionResults.map(r => (r.certaintyCorrect ? 1 : 0))),
    citationPrecision: average(perQuestionResults.map(r => (r.citationsSupported ? 1 : 0))),
    avgContextTokens: average(perQuestionResults.map(r => r.inputTokens)),
    avgLatencyMs: average(perQuestionResults.map(r => r.latencyMs)),
    avgRecall: average(perQuestionResults.map(r => r.recall)),
    avgPrecision: average(perQuestionResults.map(r => r.precision))
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
cd eval/harness && node --test metrics.test.js
```

Expected: PASS, 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add eval/harness/metrics.js eval/harness/metrics.test.js
git commit -m "feat: add certainty accuracy and null-safe content accuracy to metrics aggregation"
```

---

### Task 3: `runMode.js` — Claude API answer runner

**Files:**
- Create: `eval/harness/runMode.js`
- Create: `eval/harness/.env.example`

**Interfaces:**
- Consumes: `@anthropic-ai/sdk`.
- Produces: `async function runMode({question, vaultRoot, retrieve}): Promise<{contextText, retrievedSlugs, answerText, citedSlugs, inputTokens, outputTokens, latencyMs}>`.
  Consumed by Task 5's `runEval.js`. `retrieve` is any of the four
  existing `retrieve<Mode>(question, vaultRoot, topK?)` functions.

- [ ] **Step 1: Document the required environment variable**

Create `eval/harness/.env.example`:

```text
# Required. Export this in your shell before running the harness:
#   export ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_API_KEY=
```

- [ ] **Step 2: Write `runMode.js`**

Create `eval/harness/runMode.js`:

```javascript
import Anthropic from '@anthropic-ai/sdk';

const ANSWER_MODEL = process.env.EVAL_ANSWER_MODEL || 'claude-sonnet-5';

function extractCitedSlugs(answerText) {
  return [...new Set([...answerText.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]))];
}

export async function runMode({ question, vaultRoot, retrieve }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. See eval/harness/.env.example.');
  }
  const client = new Anthropic();

  const { contextText, retrievedSlugs } = await retrieve(question, vaultRoot);

  const systemPrompt = `You answer questions using ONLY the note excerpts provided below. \
Each excerpt is headed by its note slug in [[wikilink]] form — cite the exact slugs of the \
notes you actually drew from, as [[slug]], inline in your answer. \
If the excerpts fully answer the question, answer directly and confidently. \
If the excerpts contain some related information but don't fully or directly resolve the \
question, say what they do show while being explicit that they don't fully answer it — \
don't present a partial answer as a confident, complete one. \
If the excerpts don't contain anything relevant, say plainly that the vault has no relevant \
note on this — do not fill the gap from general knowledge. \
Note excerpts:\n\n${contextText || '(no notes were retrieved for this question)'}`;

  const start = performance.now();
  const response = await client.messages.create({
    model: ANSWER_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: question }]
  });
  const latencyMs = performance.now() - start;

  const answerText = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  return {
    contextText,
    retrievedSlugs,
    answerText,
    citedSlugs: extractCitedSlugs(answerText),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs
  };
}
```

Note: the system prompt now names all three certainty behaviors
(confident / partial-with-caveat / unknown) instead of only
known-vs-unknown, since the judge (Task 4) will grade against a 3-way
ground truth.

- [ ] **Step 3: Manually verify one live call**

Run (requires `export ANTHROPIC_API_KEY=...` first):

```bash
cd eval/harness && node -e "
import('./runMode.js').then(async ({ runMode }) => {
  const { retrieveIndexRouting } = await import('./retrieval/indexRouting.js');
  const result = await runMode({
    question: 'What did I conclude about MCP authorization?',
    vaultRoot: '../vault',
    retrieve: retrieveIndexRouting
  });
  console.log(JSON.stringify(result, null, 2));
});
"
```

Expected: a JSON object with a non-empty `answerText` containing
`[[mcp-authorization]]`, `retrievedSlugs` including `mcp-authorization`,
positive `inputTokens`/`outputTokens`, and a positive `latencyMs`.

- [ ] **Step 4: Commit**

```bash
git add eval/harness/runMode.js eval/harness/.env.example
git commit -m "feat: add Claude API answer runner to eval harness"
```

---

### Task 4: `judge.js` — 3-way certainty + content-accuracy grading

**Files:**
- Create: `eval/harness/judge.js`

**Interfaces:**
- Consumes: `@anthropic-ai/sdk`.
- Produces: `async function judge({question, answerText, contextText, expectedNotes, expectedCertainty}): Promise<{certaintyLabel: 'known'|'partial'|'unknown', certaintyCorrect: boolean, contentAccuracy: boolean|null, citationsSupported: boolean, grounded: boolean, reasoning: string}>`.
  Consumed by Task 5's `runEval.js`.

- [ ] **Step 1: Write `judge.js`**

Create `eval/harness/judge.js`:

```javascript
import Anthropic from '@anthropic-ai/sdk';

const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || 'claude-haiku-4-5-20251001';

function groundTruthText(expectedNotes, expectedCertainty) {
  if (expectedCertainty === 'unknown') {
    return 'The vault has no relevant note. The correct behavior is to say plainly that the vault has no relevant information, rather than guessing or answering from general knowledge. There is no expected answer content.';
  }
  if (expectedCertainty === 'partial') {
    return `The vault contains related evidence (${expectedNotes.join(', ')}) but no note explicitly answers this question with full confidence. The correct behavior is to state what the related notes actually say, while being explicit that the vault doesn't directly/fully answer this specific question — not a confident direct answer, and not a claim of total ignorance.`;
  }
  return `The vault contains sufficient evidence to answer confidently. Expected source notes: ${expectedNotes.join(', ')}.`;
}

export async function judge({ question, answerText, contextText, expectedNotes, expectedCertainty }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. See eval/harness/.env.example.');
  }
  const client = new Anthropic();

  const prompt = `You are grading one answer from a note-retrieval agent.

Question: ${question}

Ground truth: ${groundTruthText(expectedNotes, expectedCertainty)}

Notes actually available to the agent when it answered:
${contextText || '(none were retrieved)'}

The agent's answer:
${answerText}

Grade the following and respond with ONLY a JSON object, no other text:
{
  "certaintyLabel": "known" | "partial" | "unknown", // the certainty level the agent's own
                               // answer actually conveys: "known" if it answers confidently
                               // and directly, "partial" if it gives related evidence while
                               // flagging that it doesn't fully resolve the question,
                               // "unknown" if it says it has no relevant information
  "certaintyCorrect": boolean, // true if certaintyLabel matches the ground truth's expected
                               // certainty ("${expectedCertainty}") above
  "contentAccuracy": boolean | null, // true/false grading whether the specific facts the
                               // agent stated are actually correct per the notes available to
                               // it, when the ground truth is "known" or "partial"; null when
                               // the ground truth is "unknown" (there is no expected content
                               // to grade)
  "citationsSupported": boolean, // true if every [[wikilink]] the agent cited is actually
                               // among the notes available to it above and actually supports
                               // what the agent claimed; false if it cited nothing when it
                               // should have, or cited something unsupported
  "grounded": boolean,        // true if the answer introduces no claim that isn't present in
                               // the notes available to it (ignoring the "I don't know" case)
  "reasoning": string         // one sentence explaining the verdicts above
}`;

  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Judge did not return JSON. Raw response: ${text}`);
  }
  return JSON.parse(jsonMatch[0]);
}
```

- [ ] **Step 2: Manually verify a "known" and a "partial" grading call**

Run (requires `export ANTHROPIC_API_KEY=...`):

```bash
cd eval/harness && node -e "
import('./runMode.js').then(async ({ runMode }) => {
  const { judge } = await import('./judge.js');
  const { retrieveIndexRouting } = await import('./retrieval/indexRouting.js');

  const known = await runMode({
    question: 'What did I conclude about MCP authorization?',
    vaultRoot: '../vault',
    retrieve: retrieveIndexRouting
  });
  console.log('known case:', await judge({
    question: 'What did I conclude about MCP authorization?',
    answerText: known.answerText,
    contextText: known.contextText,
    expectedNotes: ['mcp-authorization'],
    expectedCertainty: 'known'
  }));

  const partial = await runMode({
    question: 'Did I conclude that MCP tool calls specifically should require human-in-the-loop approval?',
    vaultRoot: '../vault',
    retrieve: retrieveIndexRouting
  });
  console.log('partial case:', await judge({
    question: 'Did I conclude that MCP tool calls specifically should require human-in-the-loop approval?',
    answerText: partial.answerText,
    contextText: partial.contextText,
    expectedNotes: ['mcp-security', 'mcp-authorization', 'human-in-the-loop'],
    expectedCertainty: 'partial'
  }));
});
"
```

Expected: the "known case" line shows `certaintyLabel: 'known'`,
`certaintyCorrect: true`. The "partial case" line shows a `reasoning`
that reflects the agent's answer actually hedging or not — if the
answer confidently claims "yes" or "no" instead of citing the related
notes with a caveat, `certaintyLabel` should come back `'known'` or
`'unknown'` and `certaintyCorrect: false`, which is a legitimate
finding about `runMode`'s prompt, not a bug in `judge.js` — record what
you see, don't force it to pass by editing the judge prompt to be more
lenient.

- [ ] **Step 3: Commit**

```bash
git add eval/harness/judge.js
git commit -m "feat: add 3-way certainty and content-accuracy judge to eval harness"
```

---

### Task 5: `runEval.js` — orchestrate all four modes, first real results

**Files:**
- Create: `eval/harness/runEval.js`

**Interfaces:**
- Consumes: `retrieveIndexRouting` (`./retrieval/indexRouting.js`),
  `retrieveKeywordSearch` (`./retrieval/keywordSearch.js`),
  `retrieveVectorSearch` (`./retrieval/vectorSearch.js`),
  `retrieveHybridSearch` (`./retrieval/hybridSearch.js`), `runMode`
  (Task 3), `judge` (Task 4), `retrievalRecallPrecision` + `aggregate`
  (Task 2), `eval/questions.json` (Task 1).
- Produces: `eval/results/<mode>.json` and
  `eval/results/experiment-table.md`, one row per mode, columns
  `Strategy | Answer accuracy | Uncertainty accuracy | Citation precision | Context tokens | Latency`.

- [ ] **Step 1: Write `runEval.js`**

Create `eval/harness/runEval.js`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { retrieveIndexRouting } from './retrieval/indexRouting.js';
import { retrieveKeywordSearch } from './retrieval/keywordSearch.js';
import { retrieveVectorSearch } from './retrieval/vectorSearch.js';
import { retrieveHybridSearch } from './retrieval/hybridSearch.js';
import { runMode } from './runMode.js';
import { judge } from './judge.js';
import { retrievalRecallPrecision, aggregate } from './metrics.js';

const MODES = {
  'index-routing': { label: 'Index routing', retrieve: retrieveIndexRouting },
  'keyword': { label: 'Keyword', retrieve: retrieveKeywordSearch },
  'vector': { label: 'Vector', retrieve: retrieveVectorSearch },
  'hybrid': { label: 'Hybrid', retrieve: retrieveHybridSearch }
};

async function main() {
  const modeKey = process.argv[2] || 'index-routing';
  const mode = MODES[modeKey];
  if (!mode) {
    throw new Error(`Unknown mode "${modeKey}". Known modes: ${Object.keys(MODES).join(', ')}`);
  }

  const questions = JSON.parse(fs.readFileSync('../questions.json', 'utf8'));
  const perQuestionResults = [];

  for (const q of questions) {
    const runResult = await runMode({ question: q.question, vaultRoot: '../vault', retrieve: mode.retrieve });
    const judgment = await judge({
      question: q.question,
      answerText: runResult.answerText,
      contextText: runResult.contextText,
      expectedNotes: q.expectedNotes,
      expectedCertainty: q.expectedCertainty
    });
    const { recall, precision, correctlyAbstained } = retrievalRecallPrecision({
      retrievedSlugs: runResult.retrievedSlugs,
      expectedNotes: q.expectedNotes
    });

    perQuestionResults.push({
      id: q.id,
      question: q.question,
      type: q.type,
      expectedCertainty: q.expectedCertainty,
      retrievedSlugs: runResult.retrievedSlugs,
      citedSlugs: runResult.citedSlugs,
      answerText: runResult.answerText,
      inputTokens: runResult.inputTokens,
      outputTokens: runResult.outputTokens,
      latencyMs: runResult.latencyMs,
      recall,
      precision,
      correctlyAbstained,
      certaintyLabel: judgment.certaintyLabel,
      certaintyCorrect: judgment.certaintyCorrect,
      contentAccuracy: judgment.contentAccuracy,
      citationsSupported: judgment.citationsSupported,
      grounded: judgment.grounded,
      judgeReasoning: judgment.reasoning
    });

    console.log(`${q.id}: certaintyLabel=${judgment.certaintyLabel} (expected ${q.expectedCertainty}) contentAccuracy=${judgment.contentAccuracy} recall=${recall}`);
  }

  const agg = aggregate(perQuestionResults);

  fs.mkdirSync('../results', { recursive: true });
  fs.writeFileSync(
    path.join('../results', `${modeKey}.json`),
    JSON.stringify({ mode: modeKey, label: mode.label, aggregate: agg, perQuestionResults }, null, 2)
  );

  const tablePath = path.join('../results', 'experiment-table.md');
  const header = '| Strategy | Answer accuracy | Uncertainty accuracy | Citation precision | Context tokens | Latency |\n|---|---:|---:|---:|---:|---:|\n';
  const row = `| ${mode.label} | ${(agg.answerAccuracy * 100).toFixed(0)}% | ${(agg.certaintyAccuracy * 100).toFixed(0)}% | ${(agg.citationPrecision * 100).toFixed(0)}% | ${(agg.avgContextTokens / 1000).toFixed(1)}k | ${(agg.avgLatencyMs / 1000).toFixed(1)}s |\n`;

  let existing = fs.existsSync(tablePath) ? fs.readFileSync(tablePath, 'utf8') : header;
  if (!existing.includes(`| ${mode.label} |`)) {
    existing += row;
  }
  fs.writeFileSync(tablePath, existing);

  console.log('\nAggregate:', agg);
  console.log(`Wrote ../results/${modeKey}.json and updated ../results/experiment-table.md`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Run the full suite for Mode 1 (index routing)**

Run (requires `export ANTHROPIC_API_KEY=...`):

```bash
cd eval/harness && npm run eval -- index-routing
```

Expected: 9 lines of per-question console output, then an `Aggregate:`
object with `answerAccuracy`, `certaintyAccuracy`, `citationPrecision`,
`avgContextTokens`, `avgLatencyMs` all non-null. Inspect
`eval/results/index-routing.json`: `q6`/`q7` (unknown) should show
`certaintyLabel: "unknown"` and `contentAccuracy: null`; `q9` (partial)
shows whatever `certaintyLabel` the model actually produced — record it
honestly, don't edit prompts just to force `certaintyCorrect: true`.
Confirm `eval/results/experiment-table.md` now exists with a header and
one `Index routing` row across all six columns.

- [ ] **Step 3: Commit**

```bash
git add eval/harness/runEval.js eval/results/index-routing.json eval/results/experiment-table.md
git commit -m "feat: add eval orchestrator and record first real Mode 1 experiment-table row"
```

---

### Task 6: Run the remaining three modes, complete the experiment table

**Files:**
- Modify: `eval/results/experiment-table.md` (via the script, not by hand)
- Create: `eval/results/keyword.json`, `eval/results/vector.json`, `eval/results/hybrid.json`

**Interfaces:**
- Consumes: Task 5's `runEval.js`, unmodified.
- Produces: the completed 4-row `eval/results/experiment-table.md`.

- [ ] **Step 1: Run Mode 2 (keyword)**

```bash
cd eval/harness && npm run eval -- keyword
```

Expected: same shape of output as Task 5 Step 2; `eval/results/keyword.json`
created; `experiment-table.md` gains a `Keyword` row.

- [ ] **Step 2: Run Mode 3 (vector)**

```bash
cd eval/harness && npm run eval -- vector
```

Expected: same shape; note this mode embeds all 9 notes + the question
via `@xenova/transformers` (Phase 2's cache at
`eval/vault/.embeddings/notes.json` — first run for any new question
text re-embeds only the question, notes are cached by content hash) —
slower than Modes 1-2 but no API-key-adjacent failure mode.
`eval/results/vector.json` created; `experiment-table.md` gains a
`Vector` row.

- [ ] **Step 3: Run Mode 4 (hybrid)**

```bash
cd eval/harness && npm run eval -- hybrid
```

Expected: same shape. `eval/results/hybrid.json` created;
`experiment-table.md` gains a `Hybrid` row.

- [ ] **Step 4: Sanity-check the completed table**

Open `eval/results/experiment-table.md` and confirm: exactly 4 data
rows (`Index routing`, `Keyword`, `Vector`, `Hybrid`), all six columns
populated with plausible values (percentages in `0-100%`, positive
token/latency figures) — this is the spec's "one evaluation table"
requirement (Phase 6 will surface it in the README, out of scope here).

- [ ] **Step 5: Commit**

```bash
git add eval/results/keyword.json eval/results/vector.json eval/results/hybrid.json eval/results/experiment-table.md
git commit -m "feat: run all four retrieval modes and complete the experiment table"
```

---

### Task 7: Update `eval/README.md` to reflect what's now built

**Files:**
- Modify: `eval/README.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Rewrite the "Layout", "Status", and "Running what exists today" sections**

Replace `eval/README.md`'s content from the `## Layout` heading through
the end of the file with:

```markdown
## Layout

```text
eval/
├── vault/              fixed 9-note evaluation vault (2 topics: ai-agents, product)
├── questions.json      9 fixed questions covering all 5 spec question types
│                       (direct, cross-note synthesis, temporal, negative
│                       knowledge, source-sensitive) plus one partial-knowledge
│                       case, each with a 3-way expectedCertainty ground truth
│                       (known / partial / unknown)
├── harness/
│   ├── metrics.js       recall/precision/certainty/aggregate math (pure, unit-tested)
│   ├── runMode.js        calls the Claude API to answer a question from a
│   │                     mode's retrieved context; records tokens/latency
│   ├── judge.js          second Claude call grading certainty-label accuracy,
│   │                     content accuracy, citation correctness, groundedness
│   ├── runEval.js        orchestrator: wires one retrieval mode + runMode +
│   │                     judge + metrics into eval/results/<mode>.json and a
│   │                     row of eval/results/experiment-table.md
│   └── retrieval/
│       ├── scoring.js / indexRouting.js         Mode 1: deterministic index routing
│       ├── keywordScoring.js / keywordSearch.js Mode 2: BM25 keyword search
│       ├── vectorScoring.js / embeddings.js /
│       │   vectorSearch.js                      Mode 3: local-embedding vector search
│       └── hybridScoring.js / hybridSearch.js   Mode 4: index-boosted vector rerank
└── results/             experiment-table.md + one JSON file per mode
```

## Status

**Built:** all four retrieval modes, each as a pure, unit-tested scoring
module with a thin I/O wrapper, plus the full API-driven orchestrator:

- **Mode 1 — deterministic index routing**: infers a topic from the
  question, loads that `indexes/` page's linked notes.
- **Mode 2 — BM25 keyword search**: a suffix-stripping stemmer plus a
  textbook BM25 ranker over note titles and bodies, no external
  dependency.
- **Mode 3 — local-embedding vector search**: `@xenova/transformers`
  (`all-MiniLM-L6-v2`), cosine similarity over cached note embeddings.
- **Mode 4 — hybrid**: unions Mode 1's index-matched notes with Mode 3's
  cosine scores, reranked by a weighted sum; gates abstention on Mode
  1's "no index matched" signal.
- **Orchestrator**: `runMode.js` (answer + timing/tokens), `judge.js`
  (3-way Known/Partially known/Unknown certainty grading plus content
  accuracy, citation correctness, groundedness), `runEval.js` (ties
  everything to `eval/results/`).

`eval/results/experiment-table.md` has one real row per mode, from
actual runs against the live Claude API — see that file for the
current numbers. No number in this repository's README or docs is
invented — see the spec's "Numbers should come from actual tests, not
invented examples."

**Not yet built:** a README-facing writeup of the results (Phase 6 —
architecture diagram, limitations section, demo script) and the product
decision on whether `ask`'s interactive behavior adopts a new default
mode (Phase 5). Both are separate, later phases in
[the roadmap](../docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md).

## Running what exists today

```bash
cd eval/harness
npm install
npm test        # unit tests for scoring.js, keywordScoring.js, vectorScoring.js, hybridScoring.js, metrics.js
```

Running the full evaluation requires `ANTHROPIC_API_KEY` (see
`eval/harness/.env.example`) and makes real API calls (an answer call
plus a judge call per question, per mode):

```bash
cd eval/harness
npm run eval -- index-routing   # or: keyword, vector, hybrid
```

Each run writes `eval/results/<mode>.json` and appends/updates that
mode's row in `eval/results/experiment-table.md`.
```

- [ ] **Step 2: Verify the doc no longer makes stale claims**

Read the file back and confirm it no longer says any mode "isn't
implemented at all yet" or that the orchestrator is "not yet built" —
both were true when originally written and are false as of this plan.

- [ ] **Step 3: Commit**

```bash
git add eval/README.md
git commit -m "docs: update eval harness README to reflect the completed orchestrator and all four modes"
```

---

## Self-review notes

- **Spec coverage:** "Handling uncertainty"'s 3-way Known/Partially
  known/Unknown distinction (Task 1's `q9` + Task 4's `judge.js`),
  citation behavior (Task 3's `runMode.js` prompt + Task 4's
  `citationsSupported`), context efficiency and latency (Task 2's
  `metrics.js`, unchanged from Phase 0 except the new certainty axis),
  "Numbers should come from actual tests" (Tasks 5-6 run the live API,
  nothing hand-typed). Provenance metadata (roadmap Phase 4's second
  bullet) is deliberately out of scope for this plan — it's
  [Phase 4b](2026-09-08-phase4b-provenance-metadata.md), an independent
  subsystem with no shared files.
- **Placeholder scan:** every step has runnable code and a concrete
  expected result; no "add error handling"/"similar to Task N" steps.
- **Type consistency:** `retrieve(question, vaultRoot)` signature
  matches all four existing retrieval modules exactly (each accepts an
  optional third `topK` argument the `MODES` map doesn't pass, using
  each module's own default). `judge()`'s return shape
  (`certaintyLabel`, `certaintyCorrect`, `contentAccuracy`,
  `citationsSupported`, `grounded`, `reasoning`) matches exactly what
  Task 5's `runEval.js` destructures and what Task 2's `metrics.js`
  consumes (`certaintyCorrect`, `contentAccuracy`).

## Execution handoff

Two ways to execute this plan:

1. **Subagent-driven (recommended)** — a fresh subagent per task, with review between tasks.
2. **Inline execution** — run tasks in this session with checkpoints.
