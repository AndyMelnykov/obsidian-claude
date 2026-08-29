---
created: 2026-07-01
tags: [mcp, security]
source: pasted
---

# MCP security

## Idea

The main MCP security risk in practice isn't the transport (stdio vs.
HTTP) — it's a tool server advertising a tool description that's
actually a prompt-injection vector aimed at the calling agent, plus
overly broad tool permissions that let one compromised server reach far
more than the task at hand needs. Treat every MCP server's tool
descriptions as untrusted input, same as any other retrieved text.

## Connections

- [[MCP authorization]] — permission scoping is the main mitigation for
  the "overly broad reach" half of this.
- [[Tool-using agents]] — this is the security-specific case of the
  general tool-calling trust problem.
