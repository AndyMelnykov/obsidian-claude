# Phase 6: README Evidence + Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the README the five concrete evidence artifacts the spec's
"README evidence" list requires (architecture diagram, example vault,
benchmark dataset, evaluation table, full query trace) plus an honest
limitations section — all pointing at real files already in this repo,
none invented — and replace the README's illustrative Demo transcript
with one actually run through the live skills.

**Architecture:** Two independent halves, split the same way Phase 5 was:

1. **The demo transcript (Task 1)** — runs today. It only needs
   `capture`/`organize`/`ask` (already shipped) and the four
   `retrieve*` functions in `eval/harness/retrieval/*.js` (built in
   Phases 0-3). No dependency on the orchestrator or on Phase 5's
   decision.
2. **The evaluation evidence (Tasks 2-6)** — gated behind a precondition
   check (Task 2 — **expected to fail today**: Phase 4a's orchestrator
   (`runMode.js`/`judge.js`/`runEval.js`) has not been run, so
   `eval/results/` does not exist, and Phase 5's Tasks 2-4 are blocked
   on the same missing data, so
   `docs/superpowers/decisions/2026-09-09-ask-default-mode.md` doesn't
   exist yet either). Once both preconditions are real, Tasks 3-6 pull
   the real 4-row table, one real per-question trace, and Phase 5's
   actual outcome into the README — never hand-typed numbers.

**Tech Stack:** Markdown only. One Node one-liner per task to read real
JSON/Markdown output already on disk — no new dependency, no new code
file under `eval/harness/`.

**Spec:** [docs/superpowers/specs/2026-08-25-context-engineering-experiment.md](../specs/2026-08-25-context-engineering-experiment.md)
sections "README evidence" (the five-item list this plan satisfies) and
"Demo" (the seven-step script Task 1 actually runs). Phase context:
[2026-08-25-context-engineering-roadmap.md](2026-08-25-context-engineering-roadmap.md)
Phase 6. Depends on:
[2026-09-08-phase4a-uncertainty-orchestrator.md](2026-09-08-phase4a-uncertainty-orchestrator.md)
(planned, **not yet executed**) and
[2026-09-09-phase5-product-decision-default-mode.md](2026-09-09-phase5-product-decision-default-mode.md)
(Task 1 executed; Tasks 2-4 blocked on Phase 4a — see Global Constraints).

## Global Constraints

- Every number this plan writes into the README must be copied verbatim
  from a real file already on disk (`eval/results/experiment-table.md`,
  `eval/results/<mode>.json`) — never hand-typed or estimated (spec:
  "Numbers should come from actual tests, not invented examples").
- The demo transcript (Task 1) must be the actual recorded output of a
  live session, not an invented "shape of a session" — applying the
  same "real, not invented" rule to prose instead of numbers.
- `skills/*/SKILL.md` are **not** modified by this plan. Phase 6 only
  documents what Phases 0-5 already decided; it doesn't re-decide
  `ask`'s retrieval behavior.
- `eval/vault/` is never written to by this plan's demo steps — it's
  the fixed fixture the harness reuses for every mode's measurements.
  The capture/organize portion of the demo runs against a throwaway
  scratch directory instead.
- Tasks 3-6 do not run until Task 2 prints `OK`. Re-run Task 2's exact
  check after Phase 4a and Phase 5 Tasks 2-4 complete; do not
  hand-substitute placeholder numbers to unblock this plan early.

---

### Task 1: Real demo transcript (runs today, no data dependency)

**Files:**
- Create: `docs/evidence/demo-transcript.md`
- Modify: `README.md` (`## Demo` section)

**Interfaces:**
- Consumes: the live `capture`, `organize`, `ask` skills (via a real
  Claude Code session) and `retrieveIndexRouting` /
  `retrieveKeywordSearch` / `retrieveVectorSearch` / `retrieveHybridSearch`
  from `eval/harness/retrieval/*.js` (all built in Phases 0-3, signature
  `retrieve(question, vaultRoot)` unchanged).
- Produces: `docs/evidence/demo-transcript.md`, linked from README's
  `## Demo` section. Consumed by Task 4's evidence table.

- [ ] **Step 1: Capture two notes into a scratch vault**

Create an empty scratch directory outside the repo (so nothing here
touches `eval/vault/` or the repo's own working tree), e.g.
`%TEMP%\demo-vault` on Windows or `/tmp/demo-vault` elsewhere.

In a live Claude Code session with that directory as the working
directory (or passed explicitly to `capture`), send:

```text
Capture this into my vault: I keep noticing that the best
context-engineering demos measure retrieval trade-offs against a fixed
dataset instead of cherry-picking one impressive query — a single
benchmark table is worth more than ten anecdotes.
```

Record Claude's actual reply (the filed path, the index it updated, any
links it made) verbatim — this is real output, not something to
paraphrase.

Then drop a second, unfiled item straight into `inbox/` yourself (no
`capture` invocation) — create `inbox/raw-drop.txt` in the scratch vault
containing:

```text
Notes on why local-first tools should avoid hidden network calls: users
can't audit what they can't see leave the machine.
```

Send:

```text
Organize the inbox
```

Record Claude's actual reply (where it filed `raw-drop.txt`, whether it
rewrote the wording — it shouldn't have).

- [ ] **Step 2: Ask a known question against the real eval vault and record the citation**

Using the same or a new Claude Code session, with `eval/vault/` as the
vault (read-only — `ask` never writes), send:

```text
Using the vault at eval/vault, ask: What did I conclude about MCP
authorization?
```

Record the actual reply verbatim. Confirm it cites `[[mcp-authorization]]`
— if it doesn't, that's a real finding to note in Task 1's Step 4
write-up, not something to edit away.

- [ ] **Step 3: Ask a negative-knowledge question and record the refusal**

Send:

```text
Using the vault at eval/vault, ask: What did I write about fine-tuning
GPT models?
```

Record the actual reply verbatim. Confirm it plainly states the vault
has no relevant note rather than guessing from general knowledge.

- [ ] **Step 4: Compare all four retrieval modes on one cross-note question**

Run (from the repo root):

```bash
cd eval/harness && node -e "
Promise.all([
  import('./retrieval/indexRouting.js'),
  import('./retrieval/keywordSearch.js'),
  import('./retrieval/vectorSearch.js'),
  import('./retrieval/hybridSearch.js')
]).then(async ([ir, ks, vs, hs]) => {
  const question = 'How does MCP security relate to what I have written about agent evaluation?';
  const modes = {
    'index-routing': ir.retrieveIndexRouting,
    'keyword': ks.retrieveKeywordSearch,
    'vector': vs.retrieveVectorSearch,
    'hybrid': hs.retrieveHybridSearch
  };
  for (const [name, retrieve] of Object.entries(modes)) {
    const { retrievedSlugs } = await retrieve(question, '../vault');
    console.log(name + ':', retrievedSlugs);
  }
});
"
```

Record the actual printed `retrievedSlugs` for all four modes verbatim.
Expect them to differ (that's the point of the comparison) — write one
sentence noting the actual difference you observed (e.g. which mode
pulled in a note the others missed, or missed one the others caught),
not a generic "results varied" line.

- [ ] **Step 5: Assemble the transcript file**

Create `docs/evidence/demo-transcript.md`:

```markdown
# Demo transcript

> This is the actual recorded output of a live Claude Code session
> against this repo's real skills and the real `eval/vault/` fixture —
> not a hypothetical "shape of a session." Recorded <date>.

## 1. Capture

<paste Step 1's actual capture reply verbatim>

## 2. Organize

<paste Step 1's actual organize reply verbatim>

## 3. Ask — known question, with citation

**Q:** What did I conclude about MCP authorization?

<paste Step 2's actual reply verbatim>

## 4. Ask — negative knowledge, correct refusal

**Q:** What did I write about fine-tuning GPT models?

<paste Step 3's actual reply verbatim>

## 5. Compare retrieval modes on one difficult question

**Q:** How does MCP security relate to what I have written about agent
evaluation?

<paste Step 4's actual four `retrievedSlugs` lines verbatim>

<one sentence on the actual difference observed>
```

- [ ] **Step 6: Update README's Demo section**

Replace README.md's `## Demo` section (currently the "No recorded demo
yet ... here's the shape of a real session" block) with:

```markdown
## Demo

A real, recorded session — capture, organize, a cited answer, a correct
refusal, and a four-way retrieval-mode comparison on one question — is
in [`docs/evidence/demo-transcript.md`](docs/evidence/demo-transcript.md).
Short excerpt:

\`\`\`text
> Ask the vault: what did I conclude about MCP authorization?
ask: You concluded that every connected server should be scoped to the
least set of capabilities the current task needs, requested per
session rather than granted once and cached indefinitely.

Sources:
- [[MCP authorization]]

> Ask the vault: what's my documented opinion on quantum computing
  hardware roadmaps?
ask: The vault doesn't have anything on that — no note matches.
\`\`\`

The refusal in the second turn is the important part: `ask`
distinguishes "I don't know" from a guess, every time.
```

(Fill the excerpt's exact wording from Step 5's real transcript rather
than reusing this illustrative text if the actual recorded reply
differs in phrasing — keep the shape, use the real words.)

- [ ] **Step 7: Commit**

```bash
git add docs/evidence/demo-transcript.md README.md
git commit -m "docs: replace illustrative demo transcript with a real recorded session"
```

---

### Task 2: Precondition gate — real evaluation table and Phase 5 decision must exist

**Files:** none created or modified (a verification step only).

**Interfaces:**
- Consumes: `eval/results/experiment-table.md` (Phase 4a's `runEval.js`),
  `docs/superpowers/decisions/2026-09-09-ask-default-mode.md` (Phase 5
  Task 3).

- [ ] **Step 1: Run the gate check**

```bash
node -e "
const fs = require('fs');
const tablePath = 'eval/results/experiment-table.md';
if (!fs.existsSync(tablePath)) {
  console.log('BLOCKED: eval/results/experiment-table.md does not exist yet.');
  console.log('Run Phase 4a first: docs/superpowers/plans/2026-09-08-phase4a-uncertainty-orchestrator.md');
  process.exit(1);
}
const rows = fs.readFileSync(tablePath, 'utf8').split('\n')
  .filter(l => l.startsWith('| ') && !l.startsWith('| Strategy') && !l.startsWith('|---'));
console.log(rows.length + ' data row(s) found in experiment-table.md.');
if (rows.length < 4) {
  console.log('BLOCKED: fewer than 4 modes have real results.');
  console.log('Run the missing modes: Phase 4a Task 6.');
  process.exit(1);
}
const decisionPath = 'docs/superpowers/decisions/2026-09-09-ask-default-mode.md';
if (!fs.existsSync(decisionPath)) {
  console.log('BLOCKED: ' + decisionPath + ' does not exist yet.');
  console.log('Run Phase 5 Task 3: docs/superpowers/plans/2026-09-09-phase5-product-decision-default-mode.md');
  process.exit(1);
}
const decisionText = fs.readFileSync(decisionPath, 'utf8');
if (decisionText.includes('<Exactly one of:>') || decisionText.includes('<date this task actually runs>')) {
  console.log('BLOCKED: ' + decisionPath + ' still has unfilled placeholders — Phase 5 Task 3 has not actually run.');
  process.exit(1);
}
console.log('OK: 4 real experiment-table rows and a resolved Phase 5 decision record are present. Proceed to Task 3.');
"
```

Expected **today**: `BLOCKED: eval/results/experiment-table.md does not
exist yet.` with exit code 1 — this is the correct, expected result
right now (confirmed by this plan's own exploration: no `eval/results/`
directory and no `docs/superpowers/decisions/2026-09-09-ask-default-mode.md`
exist in this repo as of 2026-09-12). This task's gate is satisfied only
once the script prints `OK:`, which requires Phase 4a's Tasks 5-6 and
Phase 5's Tasks 2-3 to have actually run against the live API. Re-run
this exact command after those complete; do not proceed to Task 3 on
anything short of `OK`.

No files change in this task, so there is nothing to commit.

---

### Task 3: One full query trace, from real recorded output

**Precondition:** Task 2 printed `OK:`.

**Files:**
- Create: `docs/evidence/query-trace-example.md`

**Interfaces:**
- Consumes: `eval/results/<mode>.json`'s `perQuestionResults` array
  (shape fixed by Phase 4a Task 5:
  `{id, question, type, expectedCertainty, retrievedSlugs, citedSlugs,
  answerText, inputTokens, outputTokens, latencyMs, recall, precision,
  correctlyAbstained, certaintyLabel, certaintyCorrect, contentAccuracy,
  citationsSupported, grounded, judgeReasoning}`), and
  `docs/superpowers/decisions/2026-09-09-ask-default-mode.md`'s Result
  line (to pick which mode's JSON is `ask`'s live default).
- Produces: `docs/evidence/query-trace-example.md`, linked from Task 4's
  README evidence table.

- [ ] **Step 1: Determine which mode's JSON to pull the trace from**

Run:

```bash
node -e "
const fs = require('fs');
const decisionText = fs.readFileSync('docs/superpowers/decisions/2026-09-09-ask-default-mode.md', 'utf8');
let modeFile;
if (/stays on index routing/i.test(decisionText) || /[Ee]scalat/.test(decisionText)) {
  modeFile = 'index-routing.json';
} else if (/[Kk]eyword search cleared/.test(decisionText)) {
  modeFile = 'keyword.json';
} else {
  console.log('Could not determine ask default mode from decision record text — read', 'docs/superpowers/decisions/2026-09-09-ask-default-mode.md', 'by hand and pick eval/results/<mode>.json manually.');
  process.exit(1);
}
console.log('Using eval/results/' + modeFile);
const results = JSON.parse(fs.readFileSync('eval/results/' + modeFile, 'utf8'));
const trace = results.perQuestionResults.find(r => r.id === 'q9-partial-mcp-hitl');
console.log(JSON.stringify(trace, null, 2));
"
```

`q9-partial-mcp-hitl` is the fixed question set's one partial-knowledge
case (added by Phase 4a Task 1) — it's the single most illustrative
trace in the set: it shows retrieval, an answer that must hedge rather
than confidently assert or refuse, citations, and the judge's certainty
grading all at once, which a `known`-case trace wouldn't exercise.

- [ ] **Step 2: Write the trace file**

Create `docs/evidence/query-trace-example.md`, filling in the real
values printed by Step 1:

```markdown
# Query trace example

One full end-to-end trace for `ask`'s live default mode
(`<modeFile from Step 1, e.g. index-routing>`), question
`q9-partial-mcp-hitl`, copied verbatim from
`eval/results/<modeFile>.json`. Not hand-typed — see
[docs/superpowers/specs/2026-08-25-context-engineering-experiment.md](../superpowers/specs/2026-08-25-context-engineering-experiment.md)'s
"Numbers should come from actual tests, not invented examples."

**Question:** Did I conclude that MCP tool calls specifically should
require human-in-the-loop approval?

**Expected certainty:** partial

## Retrieved notes

<paste the real `retrievedSlugs` array>

## Answer

<paste the real `answerText` verbatim>

## Citations the answer actually used

<paste the real `citedSlugs` array>

## Judge grading

| Field | Value |
|---|---|
| Certainty label | `<real certaintyLabel>` |
| Certainty correct? | `<real certaintyCorrect>` |
| Content accuracy | `<real contentAccuracy>` |
| Citations supported? | `<real citationsSupported>` |
| Grounded? | `<real grounded>` |
| Judge reasoning | <real judgeReasoning> |

## Cost

| Metric | Value |
|---|---|
| Input tokens | `<real inputTokens>` |
| Output tokens | `<real outputTokens>` |
| Latency | `<real latencyMs>` ms |
```

- [ ] **Step 3: Commit**

```bash
git add docs/evidence/query-trace-example.md
git commit -m "docs: add one full real query trace as README evidence"
```

---

### Task 4: README — real evaluation table, evidence pointer table, and updated design-decisions row

**Precondition:** Task 2 printed `OK:`.

**Files:**
- Modify: `README.md` (`## Evaluation` section, `## AI design decisions`
  table)

**Interfaces:**
- Consumes: `eval/results/experiment-table.md` (verbatim table),
  `docs/superpowers/decisions/2026-09-09-ask-default-mode.md`'s Result
  line, Task 3's `docs/evidence/query-trace-example.md`.

- [ ] **Step 1: Replace README's `## Evaluation` section**

Replace README.md's `## Evaluation` section content (currently ending
"...none are published here until they exist." through the BM25
precision-limitation paragraph) with:

```markdown
## Evaluation

The [context-engineering experiment](docs/superpowers/specs/2026-08-25-context-engineering-experiment.md)
measures how retrieval strategy affects answer quality, grounding,
citation correctness, context size, and latency, over a fixed 9-note
eval vault ([`eval/vault/`](eval/vault/)) and a fixed 9-question set
([`eval/questions.json`](eval/questions.json)) covering direct,
cross-note-synthesis, temporal, negative-knowledge, source-sensitive,
and partial-knowledge questions.

**Experiment table** (copied verbatim from
[`eval/results/experiment-table.md`](eval/results/experiment-table.md),
produced by actual Claude API runs — see that file for the
authoritative source):

<paste the real 4-row table from eval/results/experiment-table.md here
verbatim, header and all>

**`ask`'s live retrieval:** <exactly one of the three lines below, per
docs/superpowers/decisions/2026-09-09-ask-default-mode.md's Result>

- If the Result says "stays on index routing": "unchanged —
  `indexes/` lookup + Grep/glob text search, per
  [the Phase 5 decision](docs/superpowers/decisions/2026-09-09-ask-default-mode.md):
  no challenger mode cleared the decision rule's gates."
- If the Result says keyword search won: "now uses stemmed
  keyword-search ranking (BM25-style term coverage + specificity), per
  [the Phase 5 decision](docs/superpowers/decisions/2026-09-09-ask-default-mode.md)
  — keyword search cleared every gate and had the highest eligible
  answer accuracy."
- If the Result says vector/hybrid won on paper but escalated: "still
  index-routing + Grep — vector/hybrid numerically cleared the
  decision rule's gates but adopting either was
  [escalated to the maintainer](docs/superpowers/decisions/2026-09-09-ask-default-mode-escalation.md)
  rather than auto-adopted, since either requires accepting a new
  embedding-runtime dependency in the product."

`ask` never exposes a user-facing mode switch in any of the three
outcomes above — see
[the standing decision](docs/superpowers/decisions/2026-09-09-ask-no-mode-switch.md).

**README evidence**, per the spec's list:

| Evidence | Where |
|---|---|
| Architecture diagram | [Architecture](#architecture) below |
| Example vault | [`eval/vault/`](eval/vault/) — 9 notes, 2 topics |
| Benchmark dataset | [`eval/questions.json`](eval/questions.json) — 9 fixed questions, 6 question types |
| Evaluation table | [`eval/results/experiment-table.md`](eval/results/experiment-table.md), copied above |
| Full query trace | [`docs/evidence/query-trace-example.md`](docs/evidence/query-trace-example.md) |

One real, already-observed result from building Mode 2: its BM25
ranking can retrieve a note purely because it shares a common word
with the question (e.g. "model") even when the note isn't actually
about the question's topic — a genuine bag-of-words precision
limitation, not a hypothetical one.
```

- [ ] **Step 2: Update the `ask`'s live retrieval row in `## AI design decisions`**

In README.md's `## AI design decisions` table, replace the row:

```markdown
| `ask`'s live retrieval | `indexes/` lookup + Grep/glob text search only | Transparent and debuggable; BM25/embeddings/reranking stay out of the product until a harness-measured mode earns the change ([ADR 002](docs/decisions/002-deterministic-retrieval-before-embeddings.md)) |
```

with exactly one of:

- If index routing stayed the default:

```markdown
| `ask`'s live retrieval | `indexes/` lookup + Grep/glob text search only | Transparent and debuggable; no challenger cleared the [Phase 5 decision rule](docs/superpowers/decisions/2026-09-09-ask-default-mode.md)'s gates against real measured numbers ([ADR 002](docs/decisions/002-deterministic-retrieval-before-embeddings.md)) |
```

- If keyword search became the default:

```markdown
| `ask`'s live retrieval | Stemmed keyword-search ranking (BM25-style term coverage + specificity) + Grep | Cleared every gate in the [Phase 5 decision rule](docs/superpowers/decisions/2026-09-09-ask-default-mode.md) against real measured numbers; still no embeddings or index-based routing dependency |
```

- If vector/hybrid won numerically but escalated:

```markdown
| `ask`'s live retrieval | `indexes/` lookup + Grep/glob text search only | Vector/hybrid measured better on the [Phase 5 decision rule](docs/superpowers/decisions/2026-09-09-ask-default-mode.md) but adopting either was [escalated, not auto-adopted](docs/superpowers/decisions/2026-09-09-ask-default-mode-escalation.md) — it would add a new embedding-runtime dependency to the product ([ADR 002](docs/decisions/002-deterministic-retrieval-before-embeddings.md)) |
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: publish real evaluation table and evidence pointers in the README"
```

---

### Task 5: README — rewrite Limitations with the real, current state

**Precondition:** Task 2 printed `OK:`.

**Files:**
- Modify: `README.md` (`## Limitations` section)

**Interfaces:**
- Consumes: `skills/capture/references/note-format.md` (checked for
  whether Phase 4b's `source_type` field landed).

- [ ] **Step 1: Check whether Phase 4b's provenance field has landed**

```bash
node -e "
const fs = require('fs');
const text = fs.readFileSync('skills/capture/references/note-format.md', 'utf8');
console.log(text.includes('source_type') ? 'PROVENANCE_DONE' : 'PROVENANCE_PENDING');
"
```

- [ ] **Step 2: Replace README's `## Limitations` section**

Replace the full `## Limitations` bullet list with:

```markdown
## Limitations

- The experiment table above reflects one fixed 9-note vault and 9
  fixed questions — real measurements, but on a small, hand-built
  corpus, not a general-purpose retrieval benchmark. A different vault
  (larger, messier, differently organized) could rank the four modes
  differently.
- Citation correctness, groundedness, and certainty grading come from
  a second Claude call (`eval/harness/judge.js`), not a formal,
  deterministic checker — it carries its own model noise/subjectivity,
  same as any LLM-as-judge setup.
- `ask`'s live retrieval is whatever
  [the Phase 5 decision](docs/superpowers/decisions/2026-09-09-ask-default-mode.md)
  settled on (see Evaluation above) — it never exposes a mode switch
  to the user, so a user can't pick a different strategy per question
  even if one would measurably help.
- Single local vault, single user — no team/multi-user access model or
  shared-vault permissions.
- `defuddle` depends on an external, user-provided extractor binary;
  the skill does nothing (with an honest fallback) if one isn't
  installed or configured.
- Notes are stored as plaintext Markdown with no encryption or secret
  scanning — don't paste credentials or API keys into a captured note.
```

If Step 1 printed `PROVENANCE_PENDING`, add one more bullet before the
last one:

```markdown
- Captured notes don't yet carry `source_type`/provenance frontmatter
  (planned, not yet executed — see roadmap Phase 4's second bullet) —
  there's no way today to tell a pasted note from a `defuddle`d one by
  reading its frontmatter alone.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README limitations to reflect real evaluation results"
```

---

### Task 6: README Roadmap section + mark Phase 6 resolved in the roadmap doc

**Precondition:** Task 2 printed `OK:`, and Tasks 1, 3, 4, 5 committed.

**Files:**
- Modify: `README.md` (`## Roadmap` section)
- Modify: `docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md`

**Interfaces:** none.

- [ ] **Step 1: Replace README's `## Roadmap` section**

Replace the full `## Roadmap` section with:

```markdown
## Roadmap

The full [context-engineering roadmap](docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md)
has the detail; all six phases are complete:

- **Phase 0 — Eval foundation + Mode 1 baseline.** Fixed vault, fixed
  question set, index-routing retrieval, metrics module, the
  API-driven orchestrator.
- **Phase 1 — Mode 2: keyword search.** BM25 + stemmer retrieval,
  unit-tested and wired into the orchestrator.
- **Phase 2 — Mode 3: vector retrieval.** Local-embedding cosine
  similarity, unit-tested and wired into the orchestrator.
- **Phase 3 — Mode 4: hybrid.** Index-boosted vector rerank, unit-tested
  and wired into the orchestrator. All four modes have real rows in
  [`eval/results/experiment-table.md`](eval/results/experiment-table.md).
- **Phase 4 — Uncertainty handling + provenance metadata.** 3-way
  Known/Partially known/Unknown grading across all four modes' judge
  prompts; provenance frontmatter status is in
  [Limitations](#limitations) above.
- **Phase 5 — Does a mode become `ask`'s new default?** Decided from
  the real experiment table — see
  [the decision record](docs/superpowers/decisions/2026-09-09-ask-default-mode.md)
  and [the no-mode-switch decision](docs/superpowers/decisions/2026-09-09-ask-no-mode-switch.md).
- **Phase 6 — README evidence + demo.** This README's Evaluation,
  Limitations, and Demo sections above, plus
  [`docs/evidence/demo-transcript.md`](docs/evidence/demo-transcript.md)
  and [`docs/evidence/query-trace-example.md`](docs/evidence/query-trace-example.md).
```

- [ ] **Step 2: Mark Phase 6 resolved in the roadmap doc**

In `docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md`,
under the `### Phase 6 — README evidence + demo` heading, add:

```markdown
**Resolved <date>:** README's Evaluation/Limitations/Demo sections
published with real data; see
[2026-09-12-phase6-readme-evidence-and-demo.md](2026-09-12-phase6-readme-evidence-and-demo.md).
```

- [ ] **Step 3: Read the full README once more and confirm no stale claims remain**

Search README.md for the phrases `"not yet"`, `"no live"`, `"No recorded
demo"`, `"Not yet built"` — none should remain describing work this
plan just completed (a hit inside a decision-record link's anchor text
is fine; a hit in prose describing current state is not).

- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md
git commit -m "docs: mark roadmap Phase 6 resolved and update README roadmap summary"
```

---

## Self-review notes

- **Spec coverage:** all five "README evidence" items are satisfied —
  architecture diagram (already existed, now cross-referenced from the
  new evidence table, Task 4), example vault + benchmark dataset
  (existing files, linked, Task 4), evaluation table (real, Task 4),
  full query trace (new file, real data, Task 3). The spec's "Demo"
  seven-step list is fully covered by Task 1's Steps 1-4 (capture,
  organize, cited answer, refusal, mode comparison — spec's step 6
  "compare retrieval modes" maps to Task 1 Step 4). "Numbers should
  come from actual tests, not invented examples" is enforced
  structurally by Task 2's hard gate, exactly as Phase 5's plan did.
- **Placeholder scan:** every `<paste the real ...>` instance is an
  instruction to copy real, already-produced output into a file — the
  same convention Phase 5's plan used for its own decision-record
  table — not a "TBD implement later." Every task has concrete,
  runnable steps and exact replacement text (including all pre-written
  branches for Phase 5's three possible outcomes).
- **Type consistency:** `eval/results/<mode>.json`'s
  `perQuestionResults` field names used in Task 3
  (`retrievedSlugs`, `citedSlugs`, `answerText`, `certaintyLabel`,
  `certaintyCorrect`, `contentAccuracy`, `citationsSupported`,
  `grounded`, `judgeReasoning`, `inputTokens`, `outputTokens`,
  `latencyMs`) match exactly what Phase 4a's `runEval.js` (Task 5)
  writes. `retrieve(question, vaultRoot)`'s signature in Task 1 Step 4
  matches all four existing retrieval modules unchanged.

## Execution handoff

Task 1 is executable right now — no dependency on Phase 4a or Phase 5.
Task 2 is *supposed* to fail today; that failure is the correct signal
that Phase 4a and Phase 5 must run first. Tasks 3-6 cannot run until
Task 2 prints `OK:`.

Two ways to execute what's runnable today:

1. **Subagent-driven (recommended)** — a fresh subagent per task, with
   review between tasks.
2. **Inline execution** — run tasks in this session with checkpoints.

Which approach — and would you like Task 1 run now, with Tasks 2-6
picked up once Phase 4a and Phase 5 have produced real data?
