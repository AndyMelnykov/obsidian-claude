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
