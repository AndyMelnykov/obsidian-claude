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
