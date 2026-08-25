# Context-engineering experiment

> Saved verbatim (encoding artifacts in box-drawing/arrow characters
> cleaned up) from the positioning document handed to the agent on
> 2026-08-25. This spec **revises** two decisions in
> [2026-08-22-simple-capture-design.md](2026-08-22-simple-capture-design.md):
> its "Non-goals" line "Any retrieval beyond Grep and the `indexes/`
> entry points (BM25, embeddings, reranking)", and `skills/ask/SKILL.md`'s
> "Out of scope" line "No retrieval beyond Grep/glob text search." Both
> are superseded for the *evaluation harness* introduced here — the
> interactive `ask` skill itself is unchanged until/unless a later phase
> (see the roadmap) decides a winning mode should become its new default.

## Purpose

Obsidian Claude should demonstrate practical context engineering for personal and team knowledge systems.

The project already has a strong foundation:

- local-first operation
- plain Markdown
- capture and organization skills
- read-only question answering
- bounded research
- explicit network consent
- no unnecessary database dependency

The next step should not be to turn it into a generic RAG chatbot.

Instead, evolve it into a clear demonstration of how different retrieval and context strategies affect:

- answer quality
- grounding
- citation quality
- context size
- latency
- maintainability

The project should become a concrete context-engineering experiment.

---

## Product positioning

### Short positioning statement

**A local-first knowledge agent for Markdown and Obsidian that captures, organizes, retrieves, and cites personal knowledge using transparent context architecture.**

### Target users

- product managers
- researchers
- knowledge workers
- founders
- developers using agentic coding tools
- people who want local ownership of notes
- users who dislike opaque cloud knowledge systems

---

## Product philosophy

The system should preserve several strong principles.

### Local-first

Users own their notes.

No mandatory hosted database.

---

### Markdown-native

Notes remain readable without the agent.

The AI layer should enhance the knowledge base, not create lock-in.

---

### Transparent retrieval

Users should be able to understand why a note was used.

---

### Read-only answering

The `ask` capability should not silently modify the knowledge base.

Reading and writing should be separate operations.

---

### Explicit consent for network activity

A local question should not silently become a web research task.

Network use should be deliberate.

---

## Core workflows

### Capture

Input:

- pasted text
- document
- image
- note
- summary

Output:

- one structured note
- appropriate folder
- links to related notes
- source metadata where relevant

---

### Organize

The agent:

- processes inbox
- identifies topic
- files note
- updates links
- detects orphan notes
- creates index references when necessary

---

### Ask

The agent:

1. receives question
2. identifies likely topic
3. checks index
4. loads relevant notes
5. answers only from available knowledge
6. cites source notes
7. distinguishes missing knowledge from known knowledge

---

### Defuddle

Given one approved URL:

- fetch page
- remove irrelevant layout/noise
- extract useful content
- create a note
- retain source reference

---

### Autoresearch

Given an explicit research request:

- define bounded question
- research within approved scope
- synthesize findings
- preserve sources
- write research notes

The project should keep strong boundaries around this capability.

---

## Context architecture

A useful structure:

```text
vault/
├── inbox/
├── notes/
│   ├── ai/
│   ├── product/
│   ├── leadership/
│   └── technology/
├── projects/
├── indexes/
├── sources/
└── templates/
```

Indexes should act as lightweight routers.

Example:

```markdown
# AI Agents

## Core notes

- [[Tool-using agents]]
- [[Human-in-the-loop]]
- [[Agent evaluation]]
- [[MCP security]]

## Related areas

- [[Context Engineering]]
- [[Product Development with Agents]]
```

---

## The key product question

The project should explicitly explore:

> When is structured navigation better than vector search, and when does semantic retrieval improve the system?

This is a much stronger project than simply adding embeddings.

---

## Retrieval modes

Implement several modes.

### Mode 1: Deterministic index routing

Flow:

```text
Question
  ↓
Topic inference
  ↓
Relevant index
  ↓
Linked notes
  ↓
Answer
```

Strengths:

- transparent
- low cost
- predictable
- easy to debug

Weaknesses:

- depends on good organization
- can miss cross-topic semantic relationships

---

### Mode 2: Keyword search

Flow:

```text
Question
  ↓
Term expansion
  ↓
Search note titles/content
  ↓
Rank results
  ↓
Answer
```

Useful baseline.

---

### Mode 3: Vector retrieval

Flow:

```text
Question
  ↓
Embedding
  ↓
Vector search
  ↓
Top-k notes/chunks
  ↓
Answer
```

Strengths:

- finds semantically related notes
- works with weak structure

Weaknesses:

- retrieval can be opaque
- chunking can destroy context
- may load irrelevant material
- adds infrastructure

---

### Mode 4: Hybrid

Example:

```text
Question
  ↓
Index routing
  +
Semantic search
  ↓
Merge + rerank
  ↓
Answer
```

This should probably become the best-performing mode if implemented carefully.

---

## Evaluation dataset

Create a small fixed knowledge base and question set.

Example question types:

### Direct factual

> What did I conclude about MCP authorization?

### Cross-note synthesis

> How do my notes connect context engineering and product operating models?

### Temporal

> What changed in my view on agent evaluation between June and August?

### Negative knowledge

> What did I write about fine-tuning GPT models?

Correct answer may be:

> No relevant note exists.

### Source-sensitive

> Which source supports the claim that structured context can reduce unnecessary token usage?

---

## Metrics

### Retrieval recall

Did the retrieval system fetch the notes needed to answer?

```text
retrieval recall = relevant notes retrieved / relevant notes available
```

---

### Precision

How much retrieved content was actually useful?

---

### Citation correctness

Does each citation support the claim?

---

### Groundedness

Does the answer introduce information not present in the vault?

---

### Context efficiency

Measure:

```text
input tokens per correct answer
```

This is a particularly useful metric for the project's positioning.

---

### Latency

Compare retrieval strategies.

---

## Experiment table

Example:

| Strategy | Answer accuracy | Citation precision | Context tokens | Latency |
|---|---:|---:|---:|---:|
| Index routing | 86% | 97% | 3.8k | 1.8s |
| Keyword | 78% | 93% | 5.0k | 1.5s |
| Vector | 89% | 91% | 7.4k | 3.1s |
| Hybrid | 94% | 96% | 5.2k | 2.8s |

Numbers should come from actual tests, not invented examples.

---

## Citation behavior

Every answer should show note-level citations.

Example:

```text
You concluded that durable context should be separated from working
context because stale assumptions can degrade agent performance.

Sources:
- [[Context Management for AI Agents]]
- [[AI-Native Product Development]]
```

Optionally cite heading or paragraph identifiers.

---

## Handling uncertainty

The system should explicitly distinguish:

### Known

Relevant notes contain sufficient evidence.

### Partially known

Some evidence exists but not enough for a confident answer.

### Unknown

No relevant notes exist.

The agent should not fill unknowns from general model knowledge unless the user explicitly requests external knowledge.

---

## Source provenance

Captured notes should preserve:

```yaml
source_type:
source_url:
captured_at:
author:
original_file:
```

Where appropriate.

This allows users to distinguish:

- their own synthesis
- external source material
- research generated by the agent

---

## Note quality rules

A note should ideally:

- represent one coherent idea
- be understandable independently
- use user's own words when possible
- link to related notes
- explain important connections
- preserve source reference
- avoid unnecessary copied text

---

## Agent write boundaries

The agent may:

- create notes
- add links
- update indexes
- move inbox items

The agent should not:

- rewrite large existing notes without explicit permission
- delete notes autonomously
- merge notes destructively without approval
- overwrite user-written interpretation with generated text

---

## Security and privacy

### Secrets

Do not store API keys in the vault.

Use:

- environment variables
- OS credential storage

### Network

Network-capable skills should clearly indicate when network access is required.

### Local data

Users should know what data is sent to an external model.

Possible future option:

```text
local model mode
```

---

## Architecture

```text
User
  ↓
Claude Code / Agent host
  ↓
Skills
  ├── capture
  ├── organize
  ├── ask
  ├── defuddle
  └── autoresearch
  ↓
Vault filesystem
  ↓
Indexes + notes + projects
```

Optional retrieval layer:

```text
Vault
  ↓
Indexer
  ├── keyword index
  └── vector index
```

---

## Product decisions worth documenting

### Why Markdown?

- portable
- inspectable
- versionable
- low lock-in
- readable by humans and agents

### Why not require a database?

The initial product can rely on the filesystem because the source of truth is the note collection.

### Why read-only `ask`?

Questions should not mutate knowledge.

### Why explicit network consent?

Knowledge retrieval and web research are different trust boundaries.

### Why compare retrieval approaches?

Because RAG is a design choice, not a default architecture.

---

## Demo

A strong demo should show:

1. capture several notes
2. organize inbox
3. ask a question
4. show citations
5. ask something absent from the vault
6. show correct refusal/unknown behavior
7. compare retrieval modes for one difficult question

---

## README evidence

The README should eventually include:

- one architecture diagram
- one example vault
- one benchmark dataset
- one evaluation table
- one full query trace
- explicit limitations

---

## Suggested extensions

- hybrid retrieval
- embedding cache
- note deduplication
- contradiction detection
- stale-note detection
- source-quality metadata
- temporal queries
- relationship graph
- automatic index suggestions
- local embeddings option
- local LLM support
- MCP interface for external agents
- team vault mode with read permissions

---

## What this project should signal

A hiring manager should conclude:

- understands context engineering
- understands RAG but does not treat it dogmatically
- understands retrieval evaluation
- understands knowledge provenance
- understands local-first product design
- understands AI boundaries and trust
- can design a useful agent product around a real workflow

---

## Avoid

Do not turn the project into:

- "chat with your notes"
- a generic vector database tutorial
- an Obsidian plugin with dozens of UI features
- an opaque agent that rewrites user knowledge
- a system where web research and local retrieval are mixed invisibly

The interesting part is the context architecture and the measurable retrieval trade-offs.
