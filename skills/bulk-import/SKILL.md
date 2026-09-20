---
name: bulk-import
description: "File many sources into the vault in one run — a directory, an inline list of paths/URLs in the request, or a listing file where each line is a path or URL — reusing capture's per-item write rules and defuddle's fetch/safety contract for any URLs, with one upfront batch consent for network egress. Use when the user hands Claude more than one source to file in a single request (e.g. 'import everything in this folder', a pasted list of links, a listing file) — not for a single source (use capture) or a research question (use autoresearch). Sequential processing only; collisions and ambiguous placement are skipped/defaulted rather than asked, so one bad item doesn't block the batch."
---

# Bulk-import many sources at once

Read [the note format and vault layout reference](../capture/references/note-format.md)
and [capture's SKILL.md](../capture/SKILL.md) first — this skill reuses
capture's per-item write rules almost unchanged and only adds a batch
wrapper around them. Also read
[defuddle's safety contract](../defuddle/SKILL.md#safety-contract) if the
batch has any URLs.

This skill files *many* sources in one pass. It does not run
automatically — only when the user hands Claude more than one source to
file: a directory ("import everything in this folder"), an inline list of
paths/URLs in the request text, or a plain text/Markdown file where each
line is a path or URL. A single source is `capture`'s job, not this
skill's; a research question to investigate (rather than a list of
sources to file as-is) is `autoresearch`'s job.

## Steps

1. **Resolve the vault** per
   [Resolving the vault](../capture/references/note-format.md#resolving-the-vault),
   the same way `capture` does. Create `inbox/`, `notes/`, `projects/`,
   `indexes/`, `templates/`, and `attachments/` in it if any don't already
   exist.
2. **Build the source list:**
   - **Directory:** list its immediate contents only — one level, no
     recursion into subdirectories, matching the vault's own shallow-
     nesting rule. A nested directory the user clearly means to include
     should be named explicitly in a separate request; don't expand it
     automatically.
   - **Inline list:** each path or URL the user wrote directly in the
     request text is one source.
   - **Listing file:** read the file; each non-blank line is one source
     (strip a leading `-`/`*` bullet marker and surrounding whitespace if
     present).

   Classify each entry: starts with `https://` → URL; starts with
   `http://` or otherwise looks like a URL but isn't `https://` → still a
   URL, which the safety contract in step 3 will reject; anything else →
   local path.
3. **If the batch includes any URLs**, before fetching anything:
   1. Validate each URL against
      [defuddle's safety contract](../defuddle/SKILL.md#safety-contract)
      (HTTPS only; no embedded credentials; no private/local hosts; no
      sensitive query parameters; etc.). Drop any that fail validation —
      record each as skipped (`skipped: rejected — <reason>`) in this
      run's report; a rejected URL never appears in the consent list
      below.
   2. Check whether a reviewed Defuddle-style extractor is available —
      the same one-time check `defuddle` itself does:
      - **Not found:** skip every remaining URL source for this run
        (each reported as `skipped: no extractor`) and continue to step 4
        with only the local sources. Don't block a batch that's mostly
        local files on one missing external tool.
      - **Found, unreviewed:** show its resolved path and get the user
        to confirm its provenance and version once, for the whole batch
        — not once per URL.
      - **Found and already reviewed this session:** continue.
   3. If any URLs survived validation and an extractor is available, get
      **one upfront batch consent**: list every surviving URL and its
      host, state plainly that all of them will leave the machine, and
      stop for explicit approval before fetching any of them. This single
      approval covers every URL in the list — no per-source consent
      inside an already-approved batch.
4. **Process each source in sequence** — not in parallel:
   - **Local source:** apply `capture`'s steps 3, 4, 5, 6, 7, 8, and 10
     (read/view the source, copy a binary attachment, derive a
     title/slug, decide the destination, write the note, update the
     topic index if it landed in `notes/<topic>/`, and the linking pass)
     to this one source. Skip `capture`'s step 9 (regenerating the master
     index) — this skill regenerates it once, after the whole batch, in
     step 5 below.
   - **URL source:** apply
     [defuddle's fetch-and-clean step](../defuddle/SKILL.md#fetch-after-consent)
     (its redirect policy and fail-closed rules — already covered by this
     run's batch consent), then the same `capture` steps as the
     local-source case above, using defuddle's cleaned Markdown as the
     source content.
   - **Bulk-specific overrides to those per-item rules** (apply instead
     of the ask-first behavior `capture`'s steps 5 and 6 normally use):
     - A filename collision (`capture` step 5) is **skipped, not asked**:
       record it in this run's report (`skipped: collision with <existing
       path>`) and move to the next source. The user resolves it
       afterward with a normal `capture` or a manual edit.
     - Genuinely ambiguous project-vs-note placement (`capture` step 6)
       **defaults to `inbox/`, not asked**: file it there and record it
       as filed-to-inbox in the report. The user triages `inbox/`
       afterward with `organize`.
     - Any other per-item failure — unreadable file, empty or failed
       fetch, a defuddle extraction error — is recorded
       (`skipped: <reason>`) and the batch keeps going.
5. **After the whole batch finishes**, regenerate `indexes/README.md`
   once per
   [Master index](../capture/references/note-format.md#master-index) —
   one full rescan at the end covers every change the batch made, so
   there's no need to regenerate per item.
6. **Report** a per-source summary, grouped into: filed (path, and which
   topic index was updated, if any), filed to `inbox/` (ambiguous
   placement), and skipped (with each one's specific reason) — so the
   user can see exactly what happened across the whole batch and what
   still needs attention.

## Out of scope

No real fan-out/parallelism — sources are processed one at a time, in
order; see the design spec's "Rejected: real fan-out parallelism" for
why. No recursive directory expansion. No new ledger, transaction
bundle, or persistent run log — the end-of-batch report in the
conversation is the only record, same as every other skill in this
project.

## Error handling

- Missing or unreadable source, empty/failed fetch, or an extraction
  error: record as skipped with the reason, don't stop the batch.
- Filename collision: skip, don't ask — see step 4's override above.
- Ambiguous project-vs-note placement: default to `inbox/`, don't ask —
  see step 4's override above.
- No reviewed Defuddle-style extractor available: skip all URL sources
  (`skipped: no extractor`), keep going with local sources.
- Vault directory not writable: report the error and stop the whole
  batch (same as `capture`).
