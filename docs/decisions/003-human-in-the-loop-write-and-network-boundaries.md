# 003: Human-in-the-loop write and network boundaries

## Context

Five skills act on a user's personal knowledge vault with varying
degrees of consequence: reading notes to answer a question is
low-risk; writing new notes is moderate; reaching out to the public
web on the user's behalf is a different trust boundary entirely. The
project needed an explicit, consistent policy for which actions a
skill can take on its own versus which require the user to say yes
first — rather than deciding it ad hoc per skill.

## Options considered

- **Let every skill act freely once invoked** (write, overwrite,
  fetch) since the user already invoked it. Rejected — "the user asked
  for `capture`" is not the same consent as "the user approved
  overwriting this specific existing note" or "the user approved this
  specific URL leaving the machine."
- **Require explicit confirmation before every file write**, even for
  low-risk, easily-reversible actions like filing one new note.
  Rejected as excessive friction — it would make the core `capture`
  loop annoying enough that the product's basic value (fast, low-
  effort filing) is undermined.
- **Tier the boundary by actual consequence and reversibility**: filing
  a genuinely new note or updating an index is autonomous once a skill
  is invoked; anything ambiguous or collision-prone asks first;
  anything that leaves the machine (network egress) or could destroy
  existing user work requires separate, explicit, per-action consent.

## Decision

- **Autonomous** (no extra confirmation beyond invoking the skill):
  `capture` filing a new note, `organize` sorting `inbox/`, either
  skill updating an `indexes/<Topic>.md` page or adding a wikilink,
  `ask` reading and answering (never writing).
- **Requires review / asks first**: an ambiguous project-vs-note
  placement, a filename collision (`capture`/`organize` ask whether to
  update the existing note or create a new one — never silently
  overwrite), an unreviewed `defuddle` extractor binary (its
  provenance and version must be confirmed before first use).
- **Requires explicit approval**: any network egress — `defuddle`
  fetching a URL and `autoresearch` reaching the public web each need
  per-request consent, separate from filing the result as a note,
  which is its own, later consent.
- **Blocked, unconditionally**: `ask` never writes to the vault;
  `organize` never runs as a side effect of another skill and never
  force-links or rephrases a note's existing wording; `autoresearch`
  never treats fetched content as instructions and never fabricates a
  quotation, author, date, URL, or measurement; `defuddle` never
  installs its own extractor or silently substitutes a different one,
  and rejects non-HTTPS, private/local, or credential-bearing URLs
  outright.

## Consequences

- The everyday `capture`/`organize`/`ask` loop stays low-friction —
  no per-note confirmation dialog — while the two network-capable
  skills (`defuddle`, `autoresearch`) stay opt-in per request, matching
  the spec's "a local question should not silently become a web
  research task."
- The boundary is documented once, in `AGENTS.md` and each skill's own
  `SKILL.md`, rather than re-derived per skill — a new skill added
  later should be classified against these same four tiers rather than
  inventing a new policy.
- The one identical rule enforced everywhere is "never silently
  overwrite an existing note" — no skill's write path has an exception
  to this.
