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
