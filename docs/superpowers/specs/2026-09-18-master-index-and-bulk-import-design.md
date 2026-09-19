# Master index and bulk-import design

## Problem

Two gaps surfaced comparing this project against the "LLM wiki"
pattern (raw sources → derivative index structure → progressive
disclosure) it already follows in spirit:

1. `indexes/<Topic>.md` pages exist per topic, but there's no single
   entry point above them — a person opening the vault in Obsidian (or
   an agent orienting itself) has to already know which topic to look
   for.
2. `capture` and `defuddle` each handle exactly one source per
   invocation. There's no way to hand Claude a folder, a pasted list,
   or a file of sources and have all of them filed in one pass.

This spec covers both, building directly on
[2026-08-22-simple-capture-design.md](2026-08-22-simple-capture-design.md)
and staying inside its existing constraints: no database (ADR 001), no
new retrieval infrastructure (ADR 002), and the same tiered
autonomous/review/approval/blocked boundaries (ADR 003).

## Scope

- A master index page, maintained by `capture` and `organize`.
- A new skill, `bulk-import`, that files many sources in one run by
  reusing `capture`'s and `defuddle`'s existing per-item rules —
  neither of those two skills changes.

Both are additive: no existing skill's trigger phrasing, single-item
behavior, or file layout changes, except the one new maintenance step
described below.

## Master index

**File:** `indexes/README.md` — inside the existing `indexes/` folder
`capture` already creates; not a new top-level skeleton entry.

**Content**, regenerated in full from a fresh scan each time (never
incrementally patched, so it can't drift):

- Every `indexes/<Topic>.md`, one line each: `[[Topic]] — ` followed by
  that index's own one-line description.
- Every `projects/<slug>/` folder, one line each, with the project's
  title.
- One line for `inbox/`: a count of items currently sitting in it
  (`N items awaiting triage`) — a count only, not a per-item list, to
  keep this page short and avoid duplicating `inbox/`'s own contents.

**Maintenance:** `capture` and `organize` already touch one of
`indexes/<Topic>.md`, `projects/<slug>/`, or `inbox/`'s contents on
most of their steps. Add one step to each — regenerate
`indexes/README.md` after any of those three change. Same invocation
points that already exist; no new trigger.

**Tier (ADR 003):** autonomous — the same tier as "updating an
`indexes/<Topic>.md` page," since this is the same kind of index
maintenance, just at one level up. No new consent question.

**`ask` is unaffected.** Its contract (`indexes/` lookup, then grep)
does not change. The master index is a human/Obsidian navigation aid,
not a new hop in `ask`'s retrieval path — adding one would change a
contract that already works for topic routing, for no measured
benefit (consistent with ADR 002's stance on not adding structure
before it's shown to help).

**Touches:** `skills/capture/references/note-format.md` (a new
"Master index" subsection next to the existing "Indexes" one, since
both `capture` and `organize` read that shared reference), plus one
added step in each of `skills/capture/SKILL.md` and
`skills/organize/SKILL.md`.

## `bulk-import` skill

**Trigger:** the user hands Claude more than one source to file in a
single request — a directory ("import everything in this folder"), an
inline list of paths/URLs in the request text, or a plain text/Markdown
file where each line is a path or URL. Distinct from `capture`'s
trigger (one source) and from `autoresearch` (a research question, not
a list of sources to file as-is).

**Why a new skill, not a mode inside `capture`:** `capture`'s own
contract states it does one thing — one source, one note. `defuddle`
and `autoresearch` already follow the pattern of reusing `capture`'s
write rules for their own filing step rather than folding into
`capture` itself; `bulk-import` follows the same precedent, and reuses
`defuddle`'s fetch/safety contract for any URL sources in the batch.

**Behavior:**

1. **Resolve the vault** the same way as `capture`.
2. **Build the source list**: expand a directory (shallow, one level —
   matching the vault's own "keep nesting shallow" rule; a nested
   directory the user clearly means to include should be named
   explicitly), read an inline list from the request, or read a
   listing file's lines. Classify each entry as a local path or an
   HTTPS URL.
3. **If the batch includes any URLs**, get one upfront batch consent
   before fetching anything: list every URL/domain in the batch, state
   plainly that all of them will leave the machine, and stop for
   explicit approval — this satisfies ADR 003's "per-request consent"
   because the bulk request itself enumerates every URL being
   approved, rather than asking once per source inside an
   already-approved batch. If no reviewed Defuddle-style extractor is
   available (checked once, same as `defuddle`'s own check), skip
   every URL source for this run (each reported as skipped: no
   extractor) and continue with the local sources — don't block a
   batch that's mostly local files on one missing external tool.
4. **Process each source in sequence** (not in parallel — see
   "Rejected: real fan-out" below):
   - Local source: apply `capture`'s existing steps 3–9 (read/view,
     copy binary attachment, derive title/slug, collision check, write
     note, update the note's topic index, linking pass) to this one
     source.
   - URL source: apply `defuddle`'s fetch-and-clean step (its safety
     contract, redirect policy, and fail-closed rules, already
     covered by this run's batch consent), then the same write rules
     as the local-source case, using `defuddle`'s cleaned Markdown as
     the source content.
   - **Bulk-specific overrides to those per-item rules:**
     - A filename collision is **skipped, not asked** — record it in
       this run's report and move to the next source, rather than
       interrupting a batch that may have dozens of items. The user
       resolves flagged collisions afterward with a normal `capture`
       or a manual edit.
     - Genuinely ambiguous project-vs-note placement **defaults to
       `inbox/`, not asked** — same fallback `capture` already uses
       when it isn't confident, applied automatically instead of only
       on an explicit "add to inbox" request. The user triages
       `inbox/` afterward with `organize`.
     - Any other per-item failure (unreadable file, empty/failed
       fetch, extraction error) is recorded and skipped; the batch
       keeps going.
5. **After the whole batch finishes**, regenerate
   `indexes/README.md` once (not once per item — it's a full rescan
   either way, so doing it once at the end is sufficient and avoids N
   redundant rewrites for an N-item batch).
6. **Report** a per-source summary: filed (path, and index updated if
   any), filed to `inbox/` (ambiguous placement), and skipped (with a
   reason) — so the user can see exactly what happened across the
   whole batch and what still needs attention.

**No new ledger, transaction bundle, or persistent run log.** The
end-of-batch report in the conversation is the only record, consistent
with every existing skill's "no transaction bundle, no ledger"
stance — a bulk run is just many individual writes, not a unit that
needs its own audit trail.

## Rejected: real fan-out parallelism

The inspiring pattern processes independent sources concurrently via
separate agents. Considered and set aside for now, not ruled out
permanently:

- **Real fan-out** (dispatching parallel subagents for independent
  fetch/read steps, then a single sequential pass for writes) would be
  faster for large batches, but adds coordination complexity this
  project's "plain file reads/writes, no infra" ethos (ADR 001, ADR 002)
  argues against taking on without evidence it's needed — and isn't
  available in every Agent Skills host this README targets, only
  Claude Code specifically.
- **Sequential processing** (chosen) matches ADR 002's own precedent:
  ship the simple version, measure, add complexity only if the numbers
  justify it. If batch size or latency becomes a real problem in
  practice, that's a reason to revisit this as its own follow-up, with
  real numbers in hand — not a reason to build it in now.

## Non-goals (explicitly deferred, not decided against)

- The entities/concepts promotion layer and raw/derivative immutable
  source split from the inspiring pattern — a materially bigger
  addition (new page types, a mention-count threshold, new write
  paths) than either feature in this spec; a candidate for its own
  future spec, not bundled in here.
- Real fan-out parallelism for bulk-import (see above).
- Recursive directory expansion in `bulk-import`'s directory mode.

## Rejected (considered and decided against, not merely deferred)

- **`ask` checking the master index before topic indexes** — the
  master index is a navigation aid, not a retrieval hop; `ask`'s
  existing, working contract doesn't change.
- **Per-URL consent inside a bulk batch** — one upfront batch approval
  covers the whole enumerated list instead.
- **Stopping the whole batch on the first collision or failure** —
  skip-and-continue, reported at the end, so a large batch doesn't die
  on one bad item.

## Testing

No test suite is proposed — there's no code to unit test, same as the
base capture/organize/ask design. Verification is manual:

- Master index: run `capture` and `organize` against a vault with
  multiple topics, projects, and inbox items; confirm
  `indexes/README.md` lists all three correctly and stays correct
  after a new topic, a new project, and an inbox change.
- `bulk-import`: run it against a mixed batch (a directory of local
  text/image files, an inline list, and a listing file) containing at
  least one filename collision, one unreadable file, one genuinely
  ambiguous placement, and 2-3 URLs — confirm the single upfront batch
  consent prompt lists every URL, confirm collisions/ambiguous
  items/failures are skipped rather than interrupting, and confirm the
  final report and `indexes/README.md` accurately reflect what
  happened.
