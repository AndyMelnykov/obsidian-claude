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
