---
name: defuddle
description: "With explicit network consent, fetch one HTTPS article-like page through an external Defuddle-style extractor and clean it into Markdown, then optionally file it as a plain vault note via the same rules as capture. Use for defuddle, clean this URL, strip page clutter, readable Markdown from a web page, or preparing a web source before capturing it. Requires an external extractor the user provides/configures — this skill never installs one."
---

# Defuddle: fetch and clean a web page

Defuddle is a fetch-and-clean step, not a filing step. Cleaning a page and
filing it as a note are separate operations, each requiring its own
consent — this skill does the first and, only when asked, hands off to
the same note-writing rules `capture` uses for the second.

Treat Defuddle as an optional external extractor the host environment
provides — this skill never installs one, executes a placeholder, or
silently substitutes another fetcher.

## Safety contract

- Accept remote input only as an HTTPS URL.
- Reject: credentials embedded in the URL, URL fragments used as a
  smuggling vector, private/local hosts (`localhost`, loopback,
  link-local, RFC1918 ranges, etc.), non-public IP literals, control
  characters, and sensitive query parameters (tokens, keys, session ids).
- Never interpolate the URL into a shell string — pass it as a single
  argv element to the extractor.
- Treat a redirect to a different host as denied until that host is
  explicitly approved.
- State plainly that the URL and request metadata will leave the
  machine. Do not fetch without explicit consent in the current request
  (or a separate confirmation the user already gave for this URL).
- Do not claim a fixed token reduction or extraction quality — inspect
  the actual output.

## Plan before fetching

Validate the URL against the safety contract above yourself — there's no
script to run this for you. Report the normalized host, what leaves the
machine, the redirect policy, and that no network call has happened yet.

Check whether an external Defuddle-style extractor is available (e.g.
`command -v defuddle`, or ask the user). Three outcomes:

- **Not found:** stop here. Offer honest fallbacks: the user
  installs/configures one, pastes the page content directly for
  `capture` to use instead, or leaves the URL for later.
- **Found, unreviewed:** this skill has no bundled verifier for a
  discovered executable. Show its resolved path and require the user to
  confirm its provenance and version before the first use — never
  silently trust a `command -v` hit.
- **Found and already reviewed this session:** continue.

## Fetch after consent

Invoke the reviewed executable with an argv equivalent to:

```text
defuddle parse HTTPS_URL --md
```

Fail closed on: non-zero exit, empty output, unexpected binary output,
an unapproved redirect, or a response that's clearly an auth/error page.
Preserve headings, links, code fences, tables, and quotations exactly —
never invent missing content.

Preview the cleaned Markdown and report extraction limitations. If the
user only wanted to read or analyze it, stop here — the result stays
transient, nothing is written.

## File as a note (optional, separate consent)

If the user wants the cleaned page kept, file it the same way `capture`
would — read
[the note format and vault layout reference](../capture/references/note-format.md)
and follow its rules:

1. Derive a title and slug from the page; check the whole vault for a
   filename collision before writing (never silently overwrite).
2. Decide where the note belongs using the folder-placement heuristic,
   or `inbox/` if unsure.
3. Write the note: frontmatter with `source: <the HTTPS URL>`, a 2-6
   sentence `## Summary`, and a `## Notes` section holding the cleaned
   page's key points or a short excerpt — not the full cleaned page
   verbatim unless it's already short. Keep the original cleaned
   Markdown available in the conversation in case the user wants more
   of it; don't dump the entire page into the vault by default.
4. Run the linking pass against the rest of the vault.
5. Report the note's path and any links added.

No transaction bundle, no ledger, no `.raw/` payload store. This skill
never marks anything as canonical or ingested on its own.
