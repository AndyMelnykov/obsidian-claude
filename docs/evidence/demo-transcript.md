# Demo transcript

> This is the actual recorded output of a live Claude Code session
> against this repo's real skills and the real `eval/vault/` fixture —
> not a hypothetical "shape of a session." Recorded 2026-09-12.

## 1. Capture

Vault: a fresh scratch directory outside the repo,
`C:\Users\andym\AppData\Local\Temp\claude-obsidian-demo-vault` (empty
before this session — `capture` created `inbox/`, `notes/`, `projects/`,
`indexes/`, `templates/`, and `attachments/` in it on first use).

**Q:** Capture this into my vault: I keep noticing that the best
context-engineering demos measure retrieval trade-offs against a fixed
dataset instead of cherry-picking one impressive query — a single
benchmark table is worth more than ten anecdotes.

**Reply:**

Filed `notes/context-engineering/benchmark-tables-over-anecdotes.md`
(title: "Benchmark tables over anecdotes", source: pasted). This was the
vault's first note, so no `notes/` topic folder or index existed yet —
created `indexes/Context-Engineering.md` seeded with an entry for the
new note. No other notes existed in the vault to link to, so the
Connections section was omitted rather than forced.

## 2. Organize

Then, outside of `capture`, I created `inbox/raw-drop.txt` directly in
the scratch vault containing:

```text
Notes on why local-first tools should avoid hidden network calls: users
can't audit what they can't see leave the machine.
```

**Q:** Organize the inbox

**Reply:**

Found one item in `inbox/`: `raw-drop.txt`, with no frontmatter and no
source/content/connections structure — a raw manual drop, not something
filed via `capture`. Normalized it into the note template's shape without
rewriting the wording: derived the title "Local-first tools should avoid
hidden network calls" and slug `local-first-tools-avoid-hidden-network-calls`,
set `source: raw-drop.txt` (the original filename), and placed the
original two-line text verbatim under the Idea heading — no rephrasing.

Decided this was general reference material, not an active project, so
it belongs in `notes/<topic>/` rather than `projects/`. No existing topic
fit, so created `notes/local-first/` and moved the normalized note there
as `notes/local-first/local-first-tools-avoid-hidden-network-calls.md`,
removing the original `raw-drop.txt` from `inbox/` (a move, not a copy).
Created `indexes/Local-First.md` since this is the first note in that
topic.

Re-ran the linking pass against the fuller vault: checked this note
against `benchmark-tables-over-anecdotes` (the only other note in the
vault) and found no genuine topical overlap (local-first/privacy vs.
context-engineering evaluation methodology), so no links were added — not
forced.

`inbox/` is now empty; nothing remains unplaced.

## 3. Ask — known question, with citation

Vault: `eval/vault/` (read-only; nothing under it was modified — verified
with `git status --porcelain -- eval/vault` before and after, no output
either time).

**Q:** Using the vault at eval/vault, ask: What did I conclude about MCP
authorization?

**Reply:**

Checked `indexes/AI-Agents.md` first, which lists
`[[MCP authorization]] — least-capability, request-time scoping
conclusion.` — pointing directly at
`notes/ai-agents/mcp-authorization.md`. Read that note's content:

You concluded that MCP authorization should scope every connected server
to the least set of capabilities the current task needs, not the most
the server offers — enforced at request time, not connection time. A
server that can read a calendar and send email shouldn't be trusted with
both permissions simultaneously just because a user approved it once;
each capability should require its own explicit grant, re-checked per
session rather than cached indefinitely.

Sources:
- [[MCP authorization]]

This confirms the citation: the note's filename is `mcp-authorization.md`
(displayed here as its title, "MCP authorization", the same convention
the vault's own `indexes/AI-Agents.md` uses) — the same note the brief
asks to confirm is cited.

## 4. Ask — negative knowledge, correct refusal

**Q:** Using the vault at eval/vault, ask: What did I write about
fine-tuning GPT models?

**Reply:**

Checked both topic indexes (`indexes/AI-Agents.md` and
`indexes/Product.md`) — neither mentions fine-tuning or GPT models. Then
grepped every note under `notes/` (all 9) for "fine-tun", "finetune", and
"gpt", case-insensitive, across titles, frontmatter tags, and body text —
no matches anywhere in the vault.

The vault doesn't have anything on fine-tuning GPT models — no note
matches. I'm not aware of any note in this vault covering that topic, and
I'm not going to answer from general knowledge instead.

## 5. Compare retrieval modes on one difficult question

**Q:** How does MCP security relate to what I have written about agent
evaluation?

```text
index-routing: [
  'tool-using-agents',
  'human-in-the-loop',
  'agent-evaluation-june',
  'agent-evaluation-august',
  'mcp-security',
  'mcp-authorization',
  'context-engineering',
  'product-development-with-agents',
  'context-management-for-ai-agents'
]
keyword: [ 'mcp-security', 'mcp-authorization', 'tool-using-agents' ]
vector: [ 'tool-using-agents', 'mcp-security', 'agent-evaluation-june' ]
hybrid: [ 'tool-using-agents', 'mcp-security', 'agent-evaluation-june' ]
```

Keyword search retrieved both MCP notes (`mcp-security`,
`mcp-authorization`) but zero agent-evaluation notes despite the question
explicitly asking about agent evaluation, while vector and hybrid
(identical results here) retrieved `agent-evaluation-june` but missed
`mcp-authorization` entirely, and index-routing returned effectively the
whole vault (all 9 of the vault's notes, unfiltered) rather than
narrowing to what's actually relevant.
