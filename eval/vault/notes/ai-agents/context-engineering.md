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
