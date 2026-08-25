# Eval Foundation and Mode 1 Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fixed evaluation vault + question set, and a Node.js
eval harness that runs that question set through Mode 1 (deterministic
index routing) via the real Claude API, producing the first genuine row
of the experiment table required by the spec.

**Architecture:** `eval/vault/` is a small, self-contained Obsidian-style
vault (independent of any real user vault) covering the spec's 5
question types. `eval/questions.json` pairs each question with
ground-truth `expectedNotes` (slugs) and `expectedUnknown`.
`eval/harness/` is a small Node.js program: a pure, unit-tested scoring
module picks a topic index from the question (Mode 1's "topic
inference"); `runMode.js` loads that index's linked notes as context and
calls the Claude API for an answer, timing it and reading real token
counts off the response; `judge.js` makes a second Claude call to grade
citation correctness, groundedness, and answer accuracy against the
ground truth; `metrics.js` (pure, unit-tested) turns per-question
judgments into recall/precision/aggregate numbers; `runEval.js` wires it
together and writes `eval/results/mode1-index-routing.json` plus a
Markdown row in `eval/results/experiment-table.md`.

**Tech Stack:** Node.js 20+, `@anthropic-ai/sdk`, Node's built-in
`node:test` + `node:assert` for the pure modules (no test framework
dependency). No Python, no database — isolated entirely under `eval/`,
which is a new top-level directory the product's own `skills/` never
reads.

**Spec:** [docs/superpowers/specs/2026-08-25-context-engineering-experiment.md](../specs/2026-08-25-context-engineering-experiment.md)
sections "Evaluation dataset", "Metrics", "Experiment table", "Retrieval
modes → Mode 1". Phase details and later-phase dependencies:
[2026-08-25-context-engineering-roadmap.md](2026-08-25-context-engineering-roadmap.md).

## Global Constraints

- Numbers in `experiment-table.md` must come from an actual harness run
  against the real Claude API — never hand-typed or estimated (spec:
  "Numbers should come from actual tests, not invented examples").
- Every answer the harness records must carry `[[wikilink]]` citations
  to the notes it actually used (spec: "Citation behavior").
- The harness must distinguish Known / Unknown for Mode 1: the answering
  prompt must refuse to fill gaps from general knowledge, and the judge
  must grade `expectedUnknown` questions on whether the model correctly
  said so (spec: "Handling uncertainty").
- The eval vault must include at least one question of each of the 5
  spec question types: direct factual, cross-note synthesis, temporal,
  negative knowledge, source-sensitive.
- `skills/ask/SKILL.md` and every other file under `skills/` are **not**
  modified by this plan — Mode 1's routing logic is re-implemented in
  `eval/harness/retrieval/indexRouting.js` for the harness's own
  reproducibility needs, independent of the interactive skill.
- Requires `ANTHROPIC_API_KEY` in the environment to run the
  API-calling steps (`runMode.js`, `judge.js`, `runEval.js`). This is a
  deliberate, explicit, maintainer-run process — not a vault skill
  invoked implicitly during normal `capture`/`organize`/`ask` use, so it
  does not fall under `defuddle`/`autoresearch`'s per-request network
  consent rules, which govern the *product*, not this dev tool.

---

### Task 1: Fixed evaluation vault

**Files:**
- Create: `eval/vault/templates/note-template.md`
- Create: `eval/vault/notes/ai-agents/tool-using-agents.md`
- Create: `eval/vault/notes/ai-agents/human-in-the-loop.md`
- Create: `eval/vault/notes/ai-agents/agent-evaluation-june.md`
- Create: `eval/vault/notes/ai-agents/agent-evaluation-august.md`
- Create: `eval/vault/notes/ai-agents/mcp-security.md`
- Create: `eval/vault/notes/ai-agents/mcp-authorization.md`
- Create: `eval/vault/notes/ai-agents/context-engineering.md`
- Create: `eval/vault/notes/product/product-development-with-agents.md`
- Create: `eval/vault/notes/product/context-management-for-ai-agents.md`
- Create: `eval/vault/indexes/AI-Agents.md`
- Create: `eval/vault/indexes/Product.md`

**Interfaces:**
- Produces: a fixed vault on disk that Task 4's `indexRouting.js` reads
  by path (`eval/vault/indexes/*.md`, `eval/vault/notes/**/*.md`). No
  code interface — this task is fixture data only.

- [ ] **Step 1: Create the shared note template**

Create `eval/vault/templates/note-template.md`:

```markdown
---
created: {{date}}
tags: []
source:
---

# {{title}}

## Idea

...

## Connections

- [[Related note]] — why it's connected
```

- [ ] **Step 2: Create the `ai-agents` topic notes**

Create `eval/vault/notes/ai-agents/tool-using-agents.md`:

```markdown
---
created: 2026-06-02
tags: [agents, tools]
source: pasted
---

# Tool-using agents

## Idea

An agent is "tool-using" when it can decide, at runtime, which external
function to call and with what arguments, rather than following a fixed
pipeline. The interesting design problem isn't the tool-calling API
itself — it's giving the agent enough context to know *when* a tool
call is warranted versus when it should answer from what it already
has, and enough feedback from the result to recover from a bad call.

## Connections

- [[Human-in-the-loop]] — a human approval step is one way to bound a
  tool-using agent's blast radius before a risky call executes.
- [[MCP security]] — MCP is the emerging standard for exposing tools to
  agents, which is why its security model matters here.
```

Create `eval/vault/notes/ai-agents/human-in-the-loop.md`:

```markdown
---
created: 2026-06-10
tags: [agents, safety]
source: pasted
---

# Human-in-the-loop

## Idea

Human-in-the-loop design means the agent pauses before an irreversible
or high-blast-radius action and waits for explicit approval, rather than
asking forgiveness after the fact. The failure mode to design against
isn't "the agent asks too often" (annoying but safe) — it's silent
scope creep, where an agent that was approved for one narrow action
reuses that approval for a broader one without re-asking.

## Connections

- [[Tool-using agents]] — the approval gate usually sits right before a
  tool call, not before the agent's reasoning in general.
```

Create `eval/vault/notes/ai-agents/agent-evaluation-june.md`:

```markdown
---
created: 2026-06-15
tags: [agents, evaluation]
source: pasted
---

# Agent evaluation (June)

## Idea

As of June, my view was that agent evaluation should focus almost
entirely on final-answer correctness: give the agent a task, check if
the end result is right, and treat everything in between as an
implementation detail. Trajectory (which tools it called, in what
order) felt like premature optimization to measure.

## Connections

- [[Agent evaluation (August)]] — this view changed within a couple of
  months; see that note for what shifted.
```

Create `eval/vault/notes/ai-agents/agent-evaluation-august.md`:

```markdown
---
created: 2026-08-20
tags: [agents, evaluation]
source: pasted
---

# Agent evaluation (August)

## Idea

By August I'd reversed course on final-answer-only evaluation: two
agents can reach the same correct answer through very different
trajectories, and the one that got there by guessing or by calling a
destructive tool it shouldn't have touched is not equivalent to the one
that reasoned soundly, even though both "passed." Evaluation now needs
to score the trajectory (tool calls made, in what order, with what
justification) alongside the final answer, not just the final answer.

## Connections

- [[Agent evaluation (June)]] — the earlier, final-answer-only view this
  supersedes.
- [[Human-in-the-loop]] — trajectory scoring is what would have caught
  an agent that reached a correct answer via an action a human
  reviewer would have blocked.
```

Create `eval/vault/notes/ai-agents/mcp-security.md`:

```markdown
---
created: 2026-07-01
tags: [mcp, security]
source: pasted
---

# MCP security

## Idea

The main MCP security risk in practice isn't the transport (stdio vs.
HTTP) — it's a tool server advertising a tool description that's
actually a prompt-injection vector aimed at the calling agent, plus
overly broad tool permissions that let one compromised server reach far
more than the task at hand needs. Treat every MCP server's tool
descriptions as untrusted input, same as any other retrieved text.

## Connections

- [[MCP authorization]] — permission scoping is the main mitigation for
  the "overly broad reach" half of this.
- [[Tool-using agents]] — this is the security-specific case of the
  general tool-calling trust problem.
```

Create `eval/vault/notes/ai-agents/mcp-authorization.md`:

```markdown
---
created: 2026-07-05
tags: [mcp, security, authorization]
source: pasted
---

# MCP authorization

## Idea

My conclusion on MCP authorization: scope every connected server to the
least set of capabilities the current task needs, not the most the
server offers — request-time scoping, not connection-time scoping. A
server that can read a calendar and send email should not be trusted
with both permissions simultaneously just because a user approved it
once; each capability should require its own explicit grant, re-checked
per session rather than cached indefinitely.

## Connections

- [[MCP security]] — authorization scoping is the primary lever against
  the "overly broad reach" risk described there.
```

Create `eval/vault/notes/ai-agents/context-engineering.md`:

```markdown
---
created: 2026-08-01
tags: [context, agents]
source: pasted
---

# Context Engineering

## Idea

Context engineering is the discipline of deciding what an agent should
see at each step — not "give it everything," but actively curating
durable facts, working state, and retrieved material so the model's
limited attention is spent on what's actually relevant. A well-engineered
context is smaller and more targeted than a naive "dump everything"
context, and that reduction is itself the value: less noise for the
model to weigh, not just lower token cost.

## Connections

- [[Product Development with Agents]] — an agent product's operating
  model is really a context-engineering decision at the product layer,
  not just a prompting trick inside one call.
```

- [ ] **Step 3: Create the `product` topic notes**

Create `eval/vault/notes/product/product-development-with-agents.md`:

```markdown
---
created: 2026-08-05
tags: [product, agents]
source: pasted
---

# Product Development with Agents

## Idea

Building a product around an agent changes the operating model, not
just the tech stack: instead of shipping a fixed feature and iterating
on it, you're shipping a policy for what the agent is allowed to decide
on its own versus what it must ask about. Getting that boundary right —
which is really a context-engineering question about what the agent
sees and when it's required to check in — matters more to the product's
success than the underlying model's raw capability.

## Connections

- [[Context Engineering]] — the product's write-boundary decisions
  (what the agent may do autonomously) are the productized form of this.
```

Create `eval/vault/notes/product/context-management-for-ai-agents.md`:

```markdown
---
created: 2026-08-10
tags: [context, agents]
source: "https://example.com/context-management-for-ai-agents"
---

# Context Management for AI Agents

## Idea

The source argues that durable context (facts that stay true across an
entire session or longer) should be kept separate from working context
(the current task's transient state), because mixing them causes stale
assumptions to leak into later turns and degrade the agent's decisions.
It specifically ties this separation to token efficiency: a durable/working
split lets an agent reload only the working context on each turn instead
of re-sending everything, which measurably reduces unnecessary token
usage without losing anything the agent actually needs.

## Connections

- [[Context Engineering]] — this note is the source-backed evidence for
  the token-efficiency claim referenced there.
```

- [ ] **Step 4: Create the topic indexes**

Create `eval/vault/indexes/AI-Agents.md`:

```markdown
# AI Agents

## Core notes

- [[Tool-using agents]] — deciding when a tool call is warranted.
- [[Human-in-the-loop]] — approval gates before high-blast-radius actions.
- [[Agent evaluation (June)]] — earlier final-answer-only evaluation view.
- [[Agent evaluation (August)]] — revised view that scores trajectory too.
- [[MCP security]] — tool descriptions as untrusted input, permission scope.
- [[MCP authorization]] — least-capability, request-time scoping conclusion.
- [[Context Engineering]] — curating what an agent sees at each step.
```

Create `eval/vault/indexes/Product.md`:

```markdown
# Product

## Core notes

- [[Product Development with Agents]] — an agent product's operating
  model as a context-engineering decision.
- [[Context Management for AI Agents]] — source-backed case for
  durable/working context separation and its token-efficiency effect.
```

- [ ] **Step 5: Verify slugs are unique and every wikilink resolves**

Run (from the repo root):

```bash
node -e "
const fs = require('fs');
const path = require('path');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
const files = walk('eval/vault').filter(f => f.endsWith('.md'));
const slugs = files.filter(f => f.includes('/notes/') || f.includes('\\\\notes\\\\'))
  .map(f => path.basename(f, '.md'));
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
console.log('note files:', slugs.length, 'dupes:', dupes);
const titleToSlug = {};
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const m = text.match(/^# (.+)$/m);
  if (m) titleToSlug[m[1].trim()] = path.basename(f, '.md');
}
const allText = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const links = [...allText.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
const unresolved = links.filter(l => !(l in titleToSlug));
console.log('unresolved wikilinks:', [...new Set(unresolved)]);
"
```

Expected: `dupes: []` and `unresolved wikilinks: []`. If any wikilink
shows up unresolved, its target note's `# Title` heading doesn't
exactly match the link text — fix the heading or the link text in the
files created above so they match exactly.

- [ ] **Step 6: Commit**

```bash
git add eval/vault
git commit -m "test: add fixed evaluation vault for context-engineering experiment"
```

---

### Task 2: Fixed question set

**Files:**
- Create: `eval/questions.json`

**Interfaces:**
- Produces: an array of `{id, question, type, expectedNotes, expectedUnknown}`
  objects, consumed by `runEval.js` (Task 8) and `metrics.js` (Task 6).

- [ ] **Step 1: Create the question set**

Create `eval/questions.json`:

```json
[
  {
    "id": "q1-direct-mcp-authz",
    "question": "What did I conclude about MCP authorization?",
    "type": "direct",
    "expectedNotes": ["mcp-authorization"],
    "expectedUnknown": false
  },
  {
    "id": "q2-direct-tool-vs-hitl",
    "question": "What's the difference between tool-using agents and human-in-the-loop design?",
    "type": "direct",
    "expectedNotes": ["tool-using-agents", "human-in-the-loop"],
    "expectedUnknown": false
  },
  {
    "id": "q3-synthesis-context-product",
    "question": "How do my notes connect context engineering and product operating models?",
    "type": "synthesis",
    "expectedNotes": ["context-engineering", "product-development-with-agents"],
    "expectedUnknown": false
  },
  {
    "id": "q4-synthesis-mcp-eval",
    "question": "How does MCP security relate to what I've written about agent evaluation?",
    "type": "synthesis",
    "expectedNotes": ["mcp-security", "agent-evaluation-august"],
    "expectedUnknown": false
  },
  {
    "id": "q5-temporal-agent-eval",
    "question": "What changed in my view on agent evaluation between June and August?",
    "type": "temporal",
    "expectedNotes": ["agent-evaluation-june", "agent-evaluation-august"],
    "expectedUnknown": false
  },
  {
    "id": "q6-negative-fine-tuning",
    "question": "What did I write about fine-tuning GPT models?",
    "type": "negative",
    "expectedNotes": [],
    "expectedUnknown": true
  },
  {
    "id": "q7-negative-quantum",
    "question": "What's my documented opinion on quantum computing hardware roadmaps?",
    "type": "negative",
    "expectedNotes": [],
    "expectedUnknown": true
  },
  {
    "id": "q8-source-sensitive-tokens",
    "question": "Which source supports the claim that structured context can reduce unnecessary token usage?",
    "type": "source-sensitive",
    "expectedNotes": ["context-management-for-ai-agents"],
    "expectedUnknown": false
  }
]
```

- [ ] **Step 2: Verify every `expectedNotes` slug exists in the vault**

Run:

```bash
node -e "
const fs = require('fs');
const questions = JSON.parse(fs.readFileSync('eval/questions.json', 'utf8'));
const path = require('path');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
const slugs = new Set(walk('eval/vault/notes').map(f => path.basename(f, '.md')));
for (const q of questions) {
  for (const s of q.expectedNotes) {
    if (!slugs.has(s)) console.log('MISSING slug', s, 'in question', q.id);
  }
}
console.log('checked', questions.length, 'questions');
"
```

Expected: `checked 8 questions` with no `MISSING slug` lines.

- [ ] **Step 3: Commit**

```bash
git add eval/questions.json
git commit -m "test: add fixed question set for context-engineering experiment"
```

---

### Task 3: Harness scaffolding

**Files:**
- Create: `eval/harness/package.json`
- Create: `.gitignore` (modify repo root, or create if absent)

**Interfaces:**
- Produces: an npm project at `eval/harness/` with `@anthropic-ai/sdk`
  installed, that Tasks 4-8 add files into.

- [ ] **Step 1: Create `eval/harness/package.json`**

Create `eval/harness/package.json`:

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
    "@anthropic-ai/sdk": "^0.32.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
cd eval/harness && npm install
```

Expected: `node_modules/@anthropic-ai/sdk` exists, `package-lock.json`
created, no errors.

- [ ] **Step 3: Ignore harness-local artifacts**

Add to the repo root `.gitignore` (create the section if the file
doesn't already have one; append if it exists):

```gitignore
# Eval harness (dev tool)
eval/harness/node_modules/
eval/harness/.env
```

- [ ] **Step 4: Commit**

```bash
git add eval/harness/package.json eval/harness/package-lock.json .gitignore
git commit -m "chore: scaffold eval harness Node project"
```

---

### Task 4: Pure scoring module (topic inference for Mode 1)

**Files:**
- Create: `eval/harness/retrieval/scoring.js`
- Test: `eval/harness/retrieval/scoring.test.js`

**Interfaces:**
- Produces: `tokenize(text: string): string[]` and
  `scoreIndex(questionTokens: string[], indexEntry: {title: string, slugs: string[], text: string}): number`
  and `pickBestIndexes(questionTokens: string[], indexEntries: Array<{title, slugs, text}>, threshold: number): Array<{title, slugs, text, score}>`.
  Consumed by Task 5's `indexRouting.js`.

- [ ] **Step 1: Write the failing test**

Create `eval/harness/retrieval/scoring.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, scoreIndex, pickBestIndexes } from './scoring.js';

test('tokenize lowercases and strips punctuation and stopwords', () => {
  const tokens = tokenize("What did I conclude about MCP authorization?");
  assert.deepEqual(tokens, ['conclude', 'mcp', 'authorization']);
});

test('scoreIndex counts overlap between question tokens and index title+slugs+text', () => {
  const index = {
    title: 'AI Agents',
    slugs: ['mcp-authorization', 'mcp-security'],
    text: 'MCP authorization least capability scoping'
  };
  const score = scoreIndex(['mcp', 'authorization'], index);
  assert.ok(score > 0, 'expected a positive score for overlapping tokens');
});

test('scoreIndex returns 0 for no overlap', () => {
  const index = { title: 'Product', slugs: ['product-development-with-agents'], text: 'operating model' };
  const score = scoreIndex(['quantum', 'hardware'], index);
  assert.equal(score, 0);
});

test('pickBestIndexes returns only indexes at or above threshold, highest first', () => {
  const indexes = [
    { title: 'AI Agents', slugs: [], text: 'mcp authorization least capability' },
    { title: 'Product', slugs: [], text: 'operating model context' }
  ];
  const picked = pickBestIndexes(['mcp', 'authorization'], indexes, 1);
  assert.equal(picked.length, 1);
  assert.equal(picked[0].title, 'AI Agents');
});

test('pickBestIndexes returns empty array when nothing meets threshold', () => {
  const indexes = [{ title: 'AI Agents', slugs: [], text: 'mcp authorization' }];
  const picked = pickBestIndexes(['quantum', 'hardware'], indexes, 1);
  assert.deepEqual(picked, []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd eval/harness && node --test retrieval/scoring.test.js
```

Expected: FAIL — `Cannot find module './scoring.js'`.

- [ ] **Step 3: Write the implementation**

Create `eval/harness/retrieval/scoring.js`:

```javascript
const STOPWORDS = new Set([
  'a', 'about', 'am', 'an', 'and', 'are', 'as', 'at', 'be', 'between',
  'by', 'did', 'do', 'does', 'for', 'from', 'has', 'have', 'how', 'i',
  'in', 'is', 'it', 'my', 'of', 'on', 'opinion', 'or', 'that', 'the',
  'to', 'view', 'was', 'were', 'what', "what's", 'which', 'who',
  'why', 'with', 'write', 'wrote', 'written'
]);

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0 && !STOPWORDS.has(t));
}

export function scoreIndex(questionTokens, indexEntry) {
  const indexTokens = new Set(tokenize(`${indexEntry.title} ${indexEntry.slugs.join(' ')} ${indexEntry.text}`));
  let score = 0;
  for (const t of questionTokens) {
    if (indexTokens.has(t)) score += 1;
  }
  return score;
}

export function pickBestIndexes(questionTokens, indexEntries, threshold = 1) {
  return indexEntries
    .map(entry => ({ ...entry, score: scoreIndex(questionTokens, entry) }))
    .filter(entry => entry.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd eval/harness && node --test retrieval/scoring.test.js
```

Expected: PASS, 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add eval/harness/retrieval/scoring.js eval/harness/retrieval/scoring.test.js
git commit -m "feat: add pure topic-scoring module for Mode 1 index routing"
```

---

### Task 5: Mode 1 retrieval (index routing over the real vault)

**Files:**
- Create: `eval/harness/retrieval/indexRouting.js`

**Interfaces:**
- Consumes: `tokenize`, `pickBestIndexes` from Task 4's `./scoring.js`.
- Produces: `async function retrieveIndexRouting(question: string, vaultRoot: string): Promise<{contextText: string, retrievedSlugs: string[]}>`,
  consumed by Task 8's `runEval.js`.

- [ ] **Step 1: Write the implementation**

Create `eval/harness/retrieval/indexRouting.js`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { tokenize, pickBestIndexes } from './scoring.js';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

function loadIndexes(vaultRoot) {
  const indexDir = path.join(vaultRoot, 'indexes');
  return fs.readdirSync(indexDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const text = fs.readFileSync(path.join(indexDir, f), 'utf8');
      const title = f.replace(/\.md$/, '');
      const slugs = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
      return { title, slugs, text };
    });
}

function buildTitleToSlugMap(vaultRoot) {
  const noteFiles = walk(path.join(vaultRoot, 'notes')).filter(f => f.endsWith('.md'));
  const map = new Map();
  for (const file of noteFiles) {
    const text = fs.readFileSync(file, 'utf8');
    const m = text.match(/^# (.+)$/m);
    if (m) map.set(m[1].trim(), { slug: path.basename(file, '.md'), file, text });
  }
  return map;
}

export async function retrieveIndexRouting(question, vaultRoot) {
  const questionTokens = tokenize(question);
  const indexes = loadIndexes(vaultRoot);
  const picked = pickBestIndexes(questionTokens, indexes, 1);

  if (picked.length === 0) {
    return { contextText: '', retrievedSlugs: [] };
  }

  const titleToSlug = buildTitleToSlugMap(vaultRoot);
  const seenSlugs = new Set();
  const contextParts = [];

  for (const index of picked) {
    for (const linkTitle of index.slugs) {
      const entry = titleToSlug.get(linkTitle);
      if (entry && !seenSlugs.has(entry.slug)) {
        seenSlugs.add(entry.slug);
        contextParts.push(`## [[${entry.slug}]]\n\n${entry.text}`);
      }
    }
  }

  return {
    contextText: contextParts.join('\n\n---\n\n'),
    retrievedSlugs: [...seenSlugs]
  };
}
```

- [ ] **Step 2: Manually verify retrieval against all 8 fixture questions**

Create a throwaway check (not committed — delete after running) at
`eval/harness/_manual-check.js`:

```javascript
import { retrieveIndexRouting } from './retrieval/indexRouting.js';
import fs from 'node:fs';

const questions = JSON.parse(fs.readFileSync('../questions.json', 'utf8'));
for (const q of questions) {
  const { retrievedSlugs } = await retrieveIndexRouting(q.question, '../vault');
  console.log(q.id, '-> retrieved:', retrievedSlugs, '| expected:', q.expectedNotes);
}
```

Run:

```bash
cd eval/harness && node _manual-check.js
```

Expected: for `q1`, `q2`, `q3`, `q4`, `q5`, `q8`, `retrieved` contains at
least the corresponding `expected` slugs (it may also contain extra
slugs from the same index — that's Mode 1's real, expected imprecision,
not a bug). For `q6` and `q7` (negative-knowledge), `retrieved` is `[]`
since no index matches "fine-tuning" or "quantum" — this is the correct
behavior the spec calls "Unknown."

Delete the throwaway file when done:

```bash
rm eval/harness/_manual-check.js
```

- [ ] **Step 3: Commit**

```bash
git add eval/harness/retrieval/indexRouting.js
git commit -m "feat: implement Mode 1 deterministic index routing over the eval vault"
```

---

### Task 6: Metrics module

**Files:**
- Create: `eval/harness/metrics.js`
- Test: `eval/harness/metrics.test.js`

**Interfaces:**
- Produces: `retrievalRecallPrecision({retrievedSlugs, expectedNotes}): {recall: number|null, precision: number|null, correctlyAbstained: boolean|null}`
  and `aggregate(perQuestionResults: Array<object>): {answerAccuracy, citationPrecision, avgContextTokens, avgLatencyMs, avgRecall, avgPrecision}`.
  Consumed by Task 8's `runEval.js`.

- [ ] **Step 1: Write the failing test**

Create `eval/harness/metrics.test.js`:

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

test('aggregate computes averages across per-question results', () => {
  const rows = [
    { answerCorrect: true, citationsSupported: true, inputTokens: 1000, latencyMs: 1500, recall: 1, precision: 1 },
    { answerCorrect: false, citationsSupported: true, inputTokens: 2000, latencyMs: 2500, recall: 0.5, precision: 1 }
  ];
  const agg = aggregate(rows);
  assert.equal(agg.answerAccuracy, 0.5);
  assert.equal(agg.citationPrecision, 1);
  assert.equal(agg.avgContextTokens, 1500);
  assert.equal(agg.avgLatencyMs, 2000);
  assert.equal(agg.avgRecall, 0.75);
  assert.equal(agg.avgPrecision, 1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd eval/harness && node --test metrics.test.js
```

Expected: FAIL — `Cannot find module './metrics.js'`.

- [ ] **Step 3: Write the implementation**

Create `eval/harness/metrics.js`:

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
    answerAccuracy: average(perQuestionResults.map(r => (r.answerCorrect ? 1 : 0))),
    citationPrecision: average(perQuestionResults.map(r => (r.citationsSupported ? 1 : 0))),
    avgContextTokens: average(perQuestionResults.map(r => r.inputTokens)),
    avgLatencyMs: average(perQuestionResults.map(r => r.latencyMs)),
    avgRecall: average(perQuestionResults.map(r => r.recall)),
    avgPrecision: average(perQuestionResults.map(r => r.precision))
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd eval/harness && node --test metrics.test.js
```

Expected: PASS, 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add eval/harness/metrics.js eval/harness/metrics.test.js
git commit -m "feat: add recall/precision/aggregate metrics module"
```

---

### Task 7: API-calling modules — `runMode.js` and `judge.js`

**Files:**
- Create: `eval/harness/runMode.js`
- Create: `eval/harness/judge.js`
- Create: `eval/harness/.env.example`

**Interfaces:**
- Consumes: `@anthropic-ai/sdk`.
- Produces: `async function runMode({question, vaultRoot, retrieve}): Promise<{contextText, retrievedSlugs, answerText, citedSlugs, inputTokens, outputTokens, latencyMs}>`
  and `async function judge({question, answerText, contextText, expectedNotes, expectedUnknown}): Promise<{answerCorrect: boolean, citationsSupported: boolean, grounded: boolean, reasoning: string}>`.
  Both consumed by Task 8's `runEval.js`.

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
If the excerpts don't contain enough information to answer, say plainly that the vault \
has no relevant note on this — do not fill the gap from general knowledge. \
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

- [ ] **Step 3: Write `judge.js`**

Create `eval/harness/judge.js`:

```javascript
import Anthropic from '@anthropic-ai/sdk';

const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || 'claude-haiku-4-5-20251001';

export async function judge({ question, answerText, contextText, expectedNotes, expectedUnknown }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. See eval/harness/.env.example.');
  }
  const client = new Anthropic();

  const groundTruthNote = expectedUnknown
    ? 'The correct behavior is to say the vault has no relevant information — there is no expected answer content.'
    : `The answer should be grounded in these expected source notes: ${expectedNotes.join(', ')}.`;

  const prompt = `You are grading one answer from a note-retrieval agent.

Question: ${question}

Ground truth: ${groundTruthNote}

Notes actually available to the agent when it answered:
${contextText || '(none were retrieved)'}

The agent's answer:
${answerText}

Grade three things and respond with ONLY a JSON object, no other text:
{
  "answerCorrect": boolean,   // true if the answer matches the ground truth expectation above
                               // (for an "unknown" ground truth, true means the agent correctly
                               // said it didn't have relevant information, rather than guessing)
  "citationsSupported": boolean, // true if every [[wikilink]] the agent cited is actually
                                  // among the notes available to it above and actually supports
                                  // what the agent claimed; false if it cited nothing when it
                                  // should have, or cited something unsupported
  "grounded": boolean,        // true if the answer introduces no claim that isn't present in
                               // the notes available to it (ignoring the "I don't know" case)
  "reasoning": string         // one sentence explaining the three verdicts above
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

- [ ] **Step 4: Manually verify one live call of each**

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

- [ ] **Step 5: Commit**

```bash
git add eval/harness/runMode.js eval/harness/judge.js eval/harness/.env.example
git commit -m "feat: add Claude API answer runner and grading judge to eval harness"
```

---

### Task 8: Orchestrator and first real experiment-table row

**Files:**
- Create: `eval/harness/runEval.js`

**Interfaces:**
- Consumes: `retrieveIndexRouting` (Task 5), `runMode` + `judge` (Task 7),
  `retrievalRecallPrecision` + `aggregate` (Task 6), `eval/questions.json`
  (Task 2).
- Produces: `eval/results/mode1-index-routing.json` and a row appended
  to `eval/results/experiment-table.md`.

- [ ] **Step 1: Write `runEval.js`**

Create `eval/harness/runEval.js`:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { retrieveIndexRouting } from './retrieval/indexRouting.js';
import { runMode } from './runMode.js';
import { judge } from './judge.js';
import { retrievalRecallPrecision, aggregate } from './metrics.js';

const MODES = {
  'index-routing': { label: 'Index routing', retrieve: retrieveIndexRouting }
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
      expectedUnknown: q.expectedUnknown
    });
    const { recall, precision, correctlyAbstained } = retrievalRecallPrecision({
      retrievedSlugs: runResult.retrievedSlugs,
      expectedNotes: q.expectedNotes
    });

    perQuestionResults.push({
      id: q.id,
      question: q.question,
      type: q.type,
      retrievedSlugs: runResult.retrievedSlugs,
      citedSlugs: runResult.citedSlugs,
      answerText: runResult.answerText,
      inputTokens: runResult.inputTokens,
      outputTokens: runResult.outputTokens,
      latencyMs: runResult.latencyMs,
      recall,
      precision,
      correctlyAbstained,
      answerCorrect: judgment.answerCorrect,
      citationsSupported: judgment.citationsSupported,
      grounded: judgment.grounded,
      judgeReasoning: judgment.reasoning
    });

    console.log(`${q.id}: answerCorrect=${judgment.answerCorrect} citationsSupported=${judgment.citationsSupported} recall=${recall}`);
  }

  const agg = aggregate(perQuestionResults);

  fs.mkdirSync('../results', { recursive: true });
  fs.writeFileSync(
    path.join('../results', `${modeKey}.json`),
    JSON.stringify({ mode: modeKey, label: mode.label, aggregate: agg, perQuestionResults }, null, 2)
  );

  const tablePath = path.join('../results', 'experiment-table.md');
  const header = '| Strategy | Answer accuracy | Citation precision | Context tokens | Latency |\n|---|---:|---:|---:|---:|\n';
  const row = `| ${mode.label} | ${(agg.answerAccuracy * 100).toFixed(0)}% | ${(agg.citationPrecision * 100).toFixed(0)}% | ${(agg.avgContextTokens / 1000).toFixed(1)}k | ${(agg.avgLatencyMs / 1000).toFixed(1)}s |\n`;

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

- [ ] **Step 2: Run the full suite for Mode 1**

Run (requires `export ANTHROPIC_API_KEY=...`):

```bash
cd eval/harness && npm run eval -- index-routing
```

Expected: 8 lines of per-question console output, then an `Aggregate:`
object with `answerAccuracy`, `citationPrecision`, `avgContextTokens`,
`avgLatencyMs` all non-null, followed by confirmation that
`eval/results/index-routing.json` and `experiment-table.md` were
written. Inspect `eval/results/index-routing.json`: for `q6`/`q7` (negative-knowledge),
confirm `answerCorrect: true` (the model correctly said it didn't know)
and `retrievedSlugs: []`. For `q1`, confirm `citedSlugs` includes
`mcp-authorization`.

If `answerAccuracy` comes back lower than expected, inspect
`judgeReasoning` in the JSON for each failing question before changing
any code — a wrong judgment might mean the judge prompt needs
tightening, not that `runMode`/`indexRouting` are broken. Treat this as
real experimental signal, not a bug to silently patch away.

- [ ] **Step 3: Commit**

```bash
git add eval/harness/runEval.js eval/results/
git commit -m "feat: add eval orchestrator and record first real Mode 1 experiment-table row"
```

---

## Self-review notes

- **Spec coverage:** evaluation dataset with all 5 question types (Task
  1-2), retrieval recall/precision (Task 6), citation correctness +
  groundedness (Task 7's `judge.js`), context efficiency via
  `avgContextTokens` (Task 6/8), latency (Task 7/8), a real
  experiment-table row from an actual run (Task 8), Known/Unknown
  distinction enforced in the answering prompt and graded by the judge
  (Task 7). Mode 2-4, provenance frontmatter, README evidence, and the
  `ask` skill's own default behavior are explicitly out of scope for
  this plan — they're Phases 1-6 in the roadmap, each gets its own plan
  once this one's numbers exist.
- **Placeholder scan:** every step has runnable code and a concrete
  expected result; no "add error handling" or "similar to Task N" steps.
- **Type consistency:** `retrieve(question, vaultRoot)` signature is
  identical in Task 5's `indexRouting.js`, Task 7's `runMode.js`
  (`retrieve` param), and Task 8's `MODES` map. `judge()`'s return shape
  (`answerCorrect`, `citationsSupported`, `grounded`, `reasoning`)
  matches exactly what Task 8 reads off `judgment`. `retrievalRecallPrecision`'s
  return shape (`recall`, `precision`, `correctlyAbstained`) matches
  what Task 8 destructures.

## Execution handoff

Two ways to execute this plan:

1. **Subagent-driven (recommended)** — a fresh subagent per task, with review between tasks.
2. **Inline execution** — run tasks in this session with checkpoints.
