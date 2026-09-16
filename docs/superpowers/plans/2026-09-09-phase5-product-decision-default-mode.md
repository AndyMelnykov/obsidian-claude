# Phase 5: Product Decision — Default Retrieval Mode for `ask` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decide, using only real (not invented) experiment-table numbers,
whether `ask`'s interactive retrieval behavior should adopt a new default
mode instead of index-routing-only — and settle, now and independent of
that data, whether `ask` should ever expose a user-facing mode switch.
Apply the mode-default decision mechanically via a rule committed *before*
seeing the real numbers, so the outcome can't be rationalized after the
fact.

**Architecture:** Two independent decisions.

1. **Mode-switch exposure** — decided now, in Task 1, with no dependency
   on the experiment table. Produces a decision record only; no code
   changes.
2. **Default-mode selection** — gated behind a precondition check for
   `eval/results/experiment-table.md`'s 4 real rows (Task 2 — **expected
   to fail today**, since Phase 4a's orchestrator, which produces that
   file, hasn't been executed: no `runMode.js`, `judge.js`, `runEval.js`,
   or `eval/results/` directory exists in this repo as of this plan). Once
   real numbers exist, Task 3 applies a fixed decision rule to them and
   Task 4 branches into exactly one of three fully pre-specified outcomes:
   stays index-routing (record only, Task 4a), becomes keyword search
   (full `skills/ask/SKILL.md` rewrite, provided in this plan, Task 4b —
   eligible because Mode 2 is pure grep/counting with no runtime
   dependency), or vector/hybrid numerically wins but is **escalated
   rather than auto-adopted** (Task 4c — both require the
   `@xenova/transformers` ONNX embedding runtime, which the roadmap's
   "Decisions already locked in" section confines to `eval/harness/` as a
   dev tool, not something a vault user's Claude Code session loads;
   adopting either as the interactive default is a bigger product call
   than this phase is scoped to make unilaterally).

**Tech Stack:** No new dependencies. Reads `eval/results/experiment-table.md`
(produced by Phase 4a). Edits `skills/ask/SKILL.md` (plain Markdown) only
in the Task 4b branch.

**Spec:** [docs/superpowers/specs/2026-08-25-context-engineering-experiment.md](../specs/2026-08-25-context-engineering-experiment.md)
sections "Retrieval modes", "Experiment table" ("Numbers should come from
actual tests, not invented examples"), "Avoid" ("chat with your notes",
"a generic vector database tutorial"). Phase context:
[2026-08-25-context-engineering-roadmap.md](2026-08-25-context-engineering-roadmap.md)
Phase 5. Depends on:
[2026-09-08-phase4a-uncertainty-orchestrator.md](2026-09-08-phase4a-uncertainty-orchestrator.md)
(planned, **not yet executed** — see Global Constraints).

## Global Constraints

- Numbers used for the default-mode decision (Task 3) must come from real
  `eval/results/experiment-table.md` rows produced by actual Claude API
  runs (spec: "Numbers should come from actual tests, not invented
  examples"). Task 2 enforces this as a hard gate. Do not substitute the
  by-hand retrieval-only recall/precision numbers computed in
  [2026-09-06-phase3-mode4-hybrid-retrieval.md](2026-09-06-phase3-mode4-hybrid-retrieval.md)
  — those cover recall/precision only, not answer accuracy, citation
  precision, context tokens, or latency, and were explicitly scoped there
  for a narrower purpose (picking Mode 4's merge weight), not this
  decision.
- `ask` never exposes a user-facing mode switch, in any outcome (Task 1 —
  decided now, not gated on data).
- Only index-routing (current default) or keyword search may become
  `ask`'s default automatically under this plan. If vector or hybrid's
  numbers would otherwise win the decision rule in Task 3, that triggers
  escalation (Task 4c), never an automatic `skills/ask/SKILL.md` edit.
- If `ask`'s default changes, `skills/ask/SKILL.md` is the only file
  edited. Confirmed against `AGENTS.md`, which states behavior/scope
  details live solely in each skill's own `SKILL.md` ("this file doesn't
  duplicate them") — so no `AGENTS.md` edit is needed under any outcome.

---

### Task 1: Decide and record — no user-facing mode switch (executable now)

**Files:**
- Create: `docs/superpowers/decisions/2026-09-09-ask-no-mode-switch.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Write the decision record**

Create `docs/superpowers/decisions/2026-09-09-ask-no-mode-switch.md`:

```markdown
# Decision: `ask` will not expose a user-facing retrieval-mode switch

**Date:** 2026-09-09
**Phase:** Roadmap Phase 5 (docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md)

## Decision

`ask` exposes exactly one retrieval behavior at a time, chosen by the
maintainer and hard-coded into `skills/ask/SKILL.md`. It never grows a
`--mode` flag, a settings note, or a runtime prompt asking the user which
retrieval strategy to use.

## Why

The spec's "Avoid" section rules out "chat with your notes" feature creep
and "a generic vector database tutorial." A mode picker is exactly that
shape of feature: it turns a one-question-one-answer tool into a small
retrieval-configuration UI, which contradicts the project's stated
interest ("the interesting part is the context architecture and the
measurable retrieval trade-offs" — not exposing that architecture as a
knob to end users).

This decision does not depend on the experiment table's numbers and is
not gated on Phase 4a. No plausible combination of accuracy, latency, or
cost numbers argues for a mode switch: if one mode is clearly better, it
becomes *the* default (see this plan's Task 3); if modes trade off
differently by question type, the fix is a better single default or a
smarter single mode (hybrid's whole premise), not a menu handed to the
user.

## Scope

This closes the "whether to expose a mode switch to the user at all" half
of roadmap Phase 5. The "does a mode become the new default" half is
decided separately, gated on real `eval/results/experiment-table.md`
data, in this plan's Task 3.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/decisions/2026-09-09-ask-no-mode-switch.md
git commit -m "docs: decide ask will never expose a user-facing mode switch"
```

---

### Task 2: Precondition gate — real experiment table must exist

**Files:** none created or modified (a verification step only).

**Interfaces:**
- Consumes: `eval/results/experiment-table.md` (produced by Phase 4a's
  `runEval.js`, once that plan is executed).

- [ ] **Step 1: Run the gate check**

```bash
node -e "
const fs = require('fs');
const p = 'eval/results/experiment-table.md';
if (!fs.existsSync(p)) {
  console.log('BLOCKED: eval/results/experiment-table.md does not exist yet.');
  console.log('Run Phase 4a first: docs/superpowers/plans/2026-09-08-phase4a-uncertainty-orchestrator.md');
  console.log('(builds runMode.js/judge.js/runEval.js; requires ANTHROPIC_API_KEY; makes real API calls).');
  process.exit(1);
}
const rows = fs.readFileSync(p, 'utf8').split('\n')
  .filter(l => l.startsWith('| ') && !l.startsWith('| Strategy') && !l.startsWith('|---'));
console.log(rows.length + ' data row(s) found in experiment-table.md.');
if (rows.length < 4) {
  console.log('BLOCKED: fewer than 4 modes have real results.');
  console.log('Run the missing modes: cd eval/harness && npm run eval -- <mode>');
  console.log('for each of: index-routing, keyword, vector, hybrid.');
  process.exit(1);
}
console.log('OK: 4 real rows present. Proceed to Task 3.');
"
```

Expected **today**: `BLOCKED: eval/results/experiment-table.md does not
exist yet.` with exit code 1 — this is the correct, expected result right
now, not a bug in this check. This task's gate is satisfied only once the
script prints `OK: 4 real rows present.`, which requires Phase 4a's Tasks
5-6 to have actually run against the live API. Re-run this exact command
after Phase 4a completes; do not proceed to Task 3 on anything short of
`OK`.

No files change in this task, so there is nothing to commit.

---

### Task 3: Apply the decision rule to the real experiment table

**Precondition:** Task 2 printed `OK: 4 real rows present.`

**Files:**
- Create: `docs/superpowers/decisions/2026-09-09-ask-default-mode.md`

**Interfaces:**
- Consumes: `eval/results/experiment-table.md`'s four rows (`Strategy`,
  `Answer accuracy`, `Uncertainty accuracy`, `Citation precision`,
  `Context tokens`, `Latency` — the exact columns Phase 4a's `runEval.js`
  writes).
- Produces: the decision record consumed by Task 4's branch choice.

## Decision rule (fixed now, before this data exists)

Let `IR` be the Index routing row (current `skills/ask/SKILL.md`
behavior). For each challenger mode `M` in `{Keyword, Vector, Hybrid}`,
`M` is **eligible** only if all three gates hold:

1. **Accuracy gate:** `AnswerAccuracy(M) >= AnswerAccuracy(IR) + 5`
   (percentage points) **and** `UncertaintyAccuracy(M) >= UncertaintyAccuracy(IR)`.
   A challenger must clearly beat the default on content correctness and
   never regress on knowing-what-it-doesn't-know — the spec treats
   uncertainty handling as safety-relevant, not a metric to trade away for
   a small accuracy gain.
2. **Citation gate:** `CitationPrecision(M) >= CitationPrecision(IR) - 3`
   (percentage points). Small tolerance only — "Transparent retrieval" is
   a named product principle, not a metric to sacrifice for accuracy.
3. **Cost gate:** `ContextTokens(M) <= 2 * ContextTokens(IR)` **and**
   `Latency(M) <= 2 * Latency(IR)`. Index routing's spec-named strengths
   are "low cost, predictable" — a challenger can cost more, but not by
   more than double, without that tradeoff itself needing a separate
   decision beyond this rule's scope.

Among eligible challengers, the **winner** is the one with the highest
`AnswerAccuracy`; ties break toward the lower `ContextTokens`. If no
challenger is eligible, the default **stays Index routing** — this is the
expected outcome under the spec's "Avoid" bias toward "one good mode,"
absorbed into the rule as "no challenger, no change" rather than a
separate judgment call made after seeing the numbers.

These specific margins (5pp / 3pp / 2x) are this plan's own conservative
defaults, chosen now — without seeing the data — specifically so that a
marginal or noisy difference on a fixed 9-question set can't flip `ask`'s
default; they are not derived from the (nonexistent) real numbers.

- [ ] **Step 1: Read the real experiment table and compute each gate**

Open `eval/results/experiment-table.md` and, for each of Keyword, Vector,
and Hybrid, compute the three gates above against the Index routing row.

- [ ] **Step 2: Write the decision record**

Create `docs/superpowers/decisions/2026-09-09-ask-default-mode.md`,
filling in the real numbers and the resulting branch:

```markdown
# Decision: does `ask` adopt a new default retrieval mode?

**Date:** <date this task actually runs>
**Data source:** eval/results/experiment-table.md

## Real experiment table

<paste the actual 4-row table here verbatim>

## Rule applied (committed 2026-09-09, before this table existed)

See docs/superpowers/plans/2026-09-09-phase5-product-decision-default-mode.md
Task 3 for the full rule text. Summary: a challenger needs >=5pp higher
answer accuracy, no worse uncertainty accuracy, >=-3pp citation precision,
and <=2x context tokens/latency versus Index routing to be eligible;
highest-accuracy eligible challenger wins; no eligible challenger means
no change.

## Gates per challenger

| Mode | Accuracy gate | Citation gate | Cost gate | Eligible? |
|---|---|---|---|---|
| Keyword | <pass/fail with numbers> | <pass/fail> | <pass/fail> | <yes/no> |
| Vector | <pass/fail with numbers> | <pass/fail> | <pass/fail> | <yes/no> |
| Hybrid | <pass/fail with numbers> | <pass/fail> | <pass/fail> | <yes/no> |

## Result

<Exactly one of:>
- "No challenger cleared all three gates; `ask` stays on index routing. →
  Task 4a."
- "Keyword search cleared all gates and has the highest answer accuracy
  among eligible challengers; adopting it as `ask`'s new default. →
  Task 4b."
- "Vector and/or Hybrid cleared all gates on paper, but per this plan's
  Global Constraints, adopting either requires accepting a new
  embedding-model runtime dependency in the product, which is outside
  this phase's authority. Escalating to the maintainer instead of
  auto-editing skills/ask/SKILL.md. → Task 4c."
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/decisions/2026-09-09-ask-default-mode.md
git commit -m "docs: apply Phase 5 decision rule to the real experiment table"
```

Then proceed to exactly one of Task 4a, 4b, or 4c, per the "Result" line
just written.

---

### Task 4a: Branch — index routing stays the default

**Precondition:** Task 3's decision record's "Result" says "stays on
index routing."

**Files:**
- Modify: `docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md`

**Interfaces:** none.

- [ ] **Step 1: Confirm no product-code change is needed**

`skills/ask/SKILL.md` is unchanged — Task 3's decision record is the only
artifact this branch produces.

- [ ] **Step 2: Mark Phase 5 resolved in the roadmap**

In `docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md`,
under the "### Phase 5" heading, add a line:

```markdown
**Resolved <date>:** stays index-routing-only; no user-facing mode
switch. See
[2026-09-09-ask-default-mode.md](../decisions/2026-09-09-ask-default-mode.md)
and
[2026-09-09-ask-no-mode-switch.md](../decisions/2026-09-09-ask-no-mode-switch.md).
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md
git commit -m "docs: resolve Phase 5 — ask stays on index routing"
```

---

### Task 4b: Branch — keyword search becomes the new default

**Precondition:** Task 3's decision record's "Result" says keyword search
wins.

**Files:**
- Modify: `skills/ask/SKILL.md`
- Modify: `docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md`

**Interfaces:** none (Markdown skill instructions only — no code).

- [ ] **Step 1: Replace `skills/ask/SKILL.md`'s content**

Replace the full contents of `skills/ask/SKILL.md` with:

```markdown
---
name: ask
description: "Answer a question from what's already captured in the vault: derive stemmed search terms from the question, rank notes across the vault by term coverage and specificity (a lightweight keyword-search ranking, not a plain grep-and-guess), read the top-ranked notes, and answer directly from their content with [[wikilink]] citations — saying plainly when the vault doesn't have an answer rather than silently falling back to general knowledge. Read-only, never writes to the vault. Use when the question should be answered from existing vault notes, not when the user is handing Claude something new to capture."
---

# Ask the vault

This skill is read-only. It never creates, edits, or moves a note. If the
user wants the answer itself saved, that's a separate `capture` of the
conversation content (pasted text) — `ask` doesn't do that automatically.

## Steps

1. **Resolve the vault** per
   [Resolving the vault](../capture/references/note-format.md#resolving-the-vault)
   — an explicit directory named in the request, then the
   `OBSIDIAN_VAULT` environment variable, then the current directory.
   The `OBSIDIAN_VAULT` fallback is what lets this work consistently
   from an unrelated project directory or a different chat session,
   without repeating the vault path every time.
2. **Derive search terms and rank notes.** Pull the meaningful content
   words out of the question (drop stopwords like "the", "what", "did",
   "about"). Reduce each to a simple stem by dropping common suffixes
   (`-ing`, `-ed`, plural `-s`/`-es`, `-ies` → `-y`) so "conclusions" and
   "concluded" both match a stem like "conclu[de]". Grep the whole vault
   — all folders, note titles and body text — for each stemmed term.
   Rank the notes that matched at least one term by, in order:
   1. how many *distinct* stemmed terms they matched (more is better);
   2. among ties, prefer a match in the note's title/heading over one
      only in the body;
   3. among remaining ties, prefer a term that appears in fewer other
      notes overall (a rare, specific term matching is stronger evidence
      than a common word every note happens to contain) and a shorter
      note (a hit is a larger fraction of a short note's content).
   Read the top 3 ranked notes. If no note matched any term, treat the
   vault as not having an answer for this question rather than falling
   back to a broader, unranked grep.
3. **Answer directly from what those notes say.** If the vault doesn't
   have an answer, say so plainly rather than guessing or silently
   falling back to general knowledge. It's fine to answer from general
   knowledge if the user asks for that too — just say explicitly when
   that's what's happening, versus when the answer is coming from the
   vault.
4. **Cite** which notes the answer drew from as `[[wikilink]]`s, so the
   user can jump to them in Obsidian.

## Out of scope

No embeddings, vector search, or index-based routing — ranking is by
term coverage and specificity over a Grep/glob search, not semantic
similarity or a curated `indexes/` lookup. No vault writes of any kind.
```

Note what changed from the prior version: Step 2 no longer checks
`indexes/` first (Mode 2's harness implementation never reads
`indexes/` — it ranks directly over note titles/bodies) and now
specifies the term-coverage/specificity ranking instead of "grep and read
what looks relevant." The "Out of scope" line no longer excludes BM25 (it
is now the mechanism) but still excludes embeddings/vector search.

- [ ] **Step 2: Manually verify against the eval vault's fixed questions**

Using a real Claude Code session with `OBSIDIAN_VAULT` (or an explicit
directory argument) pointed at `eval/vault/`, ask each question from
`eval/questions.json` and confirm: the notes it reads and cites are
plausible given each question's `expectedNotes`, and it plainly says "no
relevant note" for `q6-negative-fine-tuning` and
`q7-negative-quantum` rather than guessing. This is a manual check — the
skill is prose an agent follows, not code with an automated test — record
any question where the ranking picked clearly wrong notes as a follow-up,
not a reason to silently rewrite the ranking heuristic here.

- [ ] **Step 3: Mark Phase 5 resolved in the roadmap**

In `docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md`,
under the "### Phase 5" heading, add:

```markdown
**Resolved <date>:** `ask` now defaults to keyword-search ranking
(ported from `eval/harness/retrieval/keywordScoring.js`'s design); no
user-facing mode switch. See
[2026-09-09-ask-default-mode.md](../decisions/2026-09-09-ask-default-mode.md)
and
[2026-09-09-ask-no-mode-switch.md](../decisions/2026-09-09-ask-no-mode-switch.md).
```

- [ ] **Step 4: Commit**

```bash
git add skills/ask/SKILL.md docs/superpowers/plans/2026-08-25-context-engineering-roadmap.md
git commit -m "feat: adopt keyword-search ranking as ask's default retrieval behavior"
```

---

### Task 4c: Branch — vector or hybrid numerically wins → escalate, do not auto-adopt

**Precondition:** Task 3's decision record's "Result" says vector and/or
hybrid cleared the gates.

**Files:**
- Create: `docs/superpowers/decisions/2026-09-09-ask-default-mode-escalation.md`

**Interfaces:** none. `skills/ask/SKILL.md` is **not** touched by this
task under any circumstance.

- [ ] **Step 1: Write the escalation note**

Create `docs/superpowers/decisions/2026-09-09-ask-default-mode-escalation.md`:

```markdown
# Escalation: vector/hybrid numerically wins Phase 5's decision rule

**Date:** <date this task actually runs>

Per docs/superpowers/decisions/2026-09-09-ask-default-mode.md, <Vector
and/or Hybrid> cleared every gate in this plan's decision rule and would
otherwise become `ask`'s new default.

This plan does not adopt it automatically. Doing so would mean `ask` —
today Markdown-and-grep-only, with no runtime dependency — starts loading
`@xenova/transformers`' ONNX embedding model on every interactive
question. That contradicts the roadmap's own "Decisions already locked
in": the embedding runtime is confined to `eval/harness/` as a dev tool
specifically so it "doesn't compromise" the product's Markdown-only
positioning (docs/superpowers/specs/2026-08-22-simple-capture-design.md:
"no Python, no database").

**Options for the maintainer to choose between (not decided by this
plan):**

1. Accept the new runtime dependency and adopt <Vector/Hybrid> as `ask`'s
   default — requires revisiting the "no Python, no database"/local-first
   positioning commitments, not just editing `skills/ask/SKILL.md`.
2. Decline the runtime dependency and instead adopt Keyword search (the
   next-best eligible challenger, if any) or keep Index routing, accepting
   the accuracy gap this rule measured as the cost of staying
   dependency-free.
3. Explore an agent-native approximation of semantic ranking (e.g. having
   Claude itself judge topical relevance across note excerpts, no vector
   math) as a fifth mode in a future phase, rather than porting the
   harness's literal cosine-similarity implementation.

No `skills/ask/SKILL.md` change is made until the maintainer picks one of
the above.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/decisions/2026-09-09-ask-default-mode-escalation.md
git commit -m "docs: escalate Phase 5 default-mode decision — vector/hybrid wins numerically but needs a runtime-dependency call"
```

---

## Self-review notes

- **Spec coverage:** roadmap Phase 5's two questions — "does a mode
  become the new default" (Tasks 2-4, gated on real data, fixed rule) and
  "whether to expose a mode switch at all" (Task 1, decided now) — are
  both covered. The spec's "Numbers should come from actual tests, not
  invented examples" is enforced structurally: Task 2 is a hard gate that
  fails today, and Task 3's rule is written before the data exists so it
  can't be reverse-fitted to a preferred outcome. The "Avoid" section's
  "one good mode, not a menu" bias is encoded as the default outcome (no
  eligible challenger → no change) and Task 1's standing no-switch
  decision.
- **Placeholder scan:** every task has a concrete, runnable action.
  Task 4b's `SKILL.md` rewrite is written out in full, not "port whichever
  mode wins" — vector/hybrid deliberately do NOT get a pre-written
  `SKILL.md` rewrite, because Global Constraints established they can't
  be auto-adopted regardless of their numbers, so writing one would be
  speculative work this plan explicitly rules out taking.
- **Type consistency:** the decision record filenames referenced from
  Task 1 forward (`2026-09-09-ask-no-mode-switch.md`,
  `2026-09-09-ask-default-mode.md`,
  `2026-09-09-ask-default-mode-escalation.md`) are identical between the
  task that creates each file and every later task that links to it.

## Execution handoff

Tasks 1 and 2 are executable right now — Task 1 has no dependency on
Phase 4a, and Task 2 is *supposed* to fail today (that failure is the
correct signal that Phase 4a must run first). Tasks 3 and 4a/4b/4c cannot
run until `eval/results/experiment-table.md` has 4 real rows.

Two ways to execute what's runnable today:

1. **Subagent-driven (recommended)** — a fresh subagent per task, with
   review between tasks.
2. **Inline execution** — run tasks in this session with checkpoints.

Which approach — and would you like Task 1 and Task 2 run now, with Tasks
3+ picked up once Phase 4a's real experiment table exists?
