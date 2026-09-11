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
