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
