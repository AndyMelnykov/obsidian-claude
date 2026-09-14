# Installing claude-obsidian

This guide covers getting `capture`, `organize`, `ask`, `defuddle`, and
`autoresearch` working against **your own existing Obsidian vault** —
not a fresh demo vault — and using them from three different places:
VS Code, Obsidian itself, and a browser.

Installing is non-destructive: nothing here touches your existing
notes. The skills only ever create the fixed top-level skeleton
(`inbox/`, `notes/`, `projects/`, `indexes/`, `templates/`,
`attachments/`) the first time you capture something, and only if
those folders don't already exist.

## What you're actually installing

There's no plugin core, database, or vault-side install step. The
"install" is a one-time step that makes five `SKILL.md` files
discoverable by Claude Code, wherever you run it from. Everything
after that is just choosing which front end — VS Code, Obsidian, or a
browser — you talk to Claude Code through.

## Prerequisites

- [Claude Code](https://code.claude.com) installed and authenticated
  (`claude` works from a terminal — run `claude` once and sign in if
  you haven't).
- An Obsidian vault — any folder of Markdown files, whether or not
  Obsidian has ever opened it. Obsidian itself is optional; it's only
  needed for Mode 2 below and for browsing your notes visually.
- This repository cloned or downloaded somewhere on disk. It does
  **not** need to live inside your vault, and your vault does not
  need to live inside it.

## One-time setup

This applies once, regardless of which mode(s) you use afterward —
all three modes ultimately run the same Claude Code skills.

### 1. Make the skills globally discoverable

This repo keeps its skills at `skills/<name>/SKILL.md`. Claude Code
auto-discovers skills from your **personal** skills folder,
`~/.claude/skills/`, in every session regardless of which directory
you're in — but it does not scan a bare `skills/` folder sitting in
some other repo. Copy (or link) the five skill folders across once:

**Windows (PowerShell) — plain copy:**

```powershell
$repo   = "C:\path\to\claude-obsidian"          # wherever you cloned this repo
$target = "$env:USERPROFILE\.claude\skills"
New-Item -ItemType Directory -Force -Path $target | Out-Null
foreach ($skill in "capture","organize","ask","defuddle","autoresearch") {
  Copy-Item -Recurse -Force "$repo\skills\$skill" "$target\$skill"
}
```

**Windows — junction instead (stays in sync with the repo, no admin
rights needed, unlike a real symlink):**

```powershell
foreach ($skill in "capture","organize","ask","defuddle","autoresearch") {
  cmd /c mklink /J "$target\$skill" "$repo\skills\$skill"
}
```

**macOS / Linux:**

```bash
target=~/.claude/skills
mkdir -p "$target"
cd /path/to/claude-obsidian
for skill in capture organize ask defuddle autoresearch; do
  ln -s "$(pwd)/skills/$skill" "$target/$skill"   # or: cp -r "skills/$skill" "$target/$skill"
done
```

A plain copy is simplest; a symlink/junction means `git pull`-ing this
repo later updates your installed skills automatically. Either way,
start a new Claude Code session afterward — skills are read at
session start.

### 2. Point Claude Code at your vault

If you always run Claude Code (or open VS Code, or launch the Obsidian
plugin below) with your vault folder as the working directory, skip
this — the skills fall back to the current directory automatically.

If you'll invoke Claude Code from somewhere else (a different
project's terminal, this repo's own directory, etc.) and still want it
to find your vault, set `OBSIDIAN_VAULT` once:

```powershell
# PowerShell — add to $PROFILE to persist across sessions
$env:OBSIDIAN_VAULT = "C:\path\to\your\vault"
```

```bash
# bash/zsh — add to your shell profile
export OBSIDIAN_VAULT=/path/to/your/vault
```

An explicit path named in a request (e.g. "capture this into
`D:\notes`") always overrides this.

### 3. Verify it works

From any of the modes below, say:

```text
Capture this into my vault: installation check
```

You should see the six skeleton folders appear (if they weren't
already there) and one new note filed under `notes/` or `inbox/`.
Delete that test note when you're done — nothing else was touched.

## Mode 1 — VS Code, vault open as a folder

1. Install the **Claude Code** extension for VS Code.
2. `File > Open Folder…` and pick your vault.
3. Open the Claude Code panel and talk to it normally — `Capture this
   into my vault: <paste text, a file, an image>`, `Organize the
   inbox`, `Ask the vault: <question>`.

Since VS Code's working directory is the vault itself, `OBSIDIAN_VAULT`
isn't needed here.

## Mode 2 — Calling Claude from inside Obsidian

There's no official Anthropic or Obsidian plugin for this yet, but two
actively maintained **community plugins** cover it. Both are
third-party — reviewed like any other community plugin, not published
by Anthropic or Obsidian — and both require the Claude Code CLI
installed, authenticated, and on your `PATH`, plus Obsidian desktop
(neither works on mobile).

**Recommended: [Claude Code Skills](https://community.obsidian.md/plugins/claude-code-skills)**
— embeds a real chat sidebar inside Obsidian. Highlight text, right-
click, pick a skill (`ask`, `capture`, etc.) and get a streaming
response in a persistent panel without leaving the app; you can also
open the panel and just chat freely. Install via `Settings → Community
plugins → Browse → "Claude Code Skills"`.

**Alternative: [Claude Code IDE](https://community.obsidian.md/plugins/claude-code-ide)**
— a lighter bridge, not a chat panel. It runs a local MCP server so a
Claude Code session in a normal terminal can see which note and
selection you have open in Obsidian (via `/ide` inside that session).
Use this if you'd rather keep Claude Code in a terminal and just want
Obsidian-awareness, not an in-app chat panel.

Either plugin uses your global `~/.claude/skills/` from the one-time
setup above — no separate skill install inside Obsidian.

## Mode 3 — Clipping from a browser into the vault

Install Obsidian's own **[Web Clipper](https://obsidian.md/clipper)**
browser extension (Chrome, Edge, Firefox, Safari). In its settings,
point it at your vault and a target folder — `inbox/` is the natural
default, since `organize` already knows how to sort and re-link
whatever lands there later; pick a `notes/<topic>` folder directly
instead if you already know where a clip belongs.

Clipping a page or a highlight writes a plain Markdown file straight
into your vault — no Claude Code session is involved at clip time.
Next time you're in Claude Code (Mode 1 or 2), say:

```text
Organize the inbox
```

and it will fold whatever you clipped into `notes/` or `projects/`,
without changing your wording.

This effectively replaces `defuddle` for browser-based capture — Web
Clipper does its own page-to-Markdown extraction, so no extractor
binary is needed. `defuddle` remains useful when you already have a
URL in hand inside a Claude Code chat and want it fetched and cleaned
without opening a browser; that still requires the same explicit,
per-request network consent described in
[ADR 003](docs/decisions/003-human-in-the-loop-write-and-network-boundaries.md).

## Using more than one mode together

All three modes write to the same plain-Markdown folders on disk, so
you can freely switch between VS Code, Obsidian, and browser clipping
from session to session — there's no sync step, no separate state to
reconcile.

## Troubleshooting

- **Claude Code never invokes a skill.** Confirm
  `~/.claude/skills/<name>/SKILL.md` exists for each of the five names
  (a common mistake is nesting one level too deep, e.g.
  `~/.claude/skills/skills/capture/...`). Start a new Claude Code
  session after copying/linking — skills load at session start.
- **Wrong vault, or "vault not found."** Check `OBSIDIAN_VAULT` and
  your current working directory; an explicit path in the request
  always wins over both.
- **Windows: `mklink` fails with "you do not have sufficient
  privilege."** Plain `mklink` needs Developer Mode or admin rights.
  Use `mklink /J` (a junction — no admin required) or fall back to a
  plain copy.
- **The Obsidian plugin can't find the Claude Code CLI.** Make sure
  `claude` is on your system `PATH` and you've run `claude` once from
  a terminal to complete login.

## Uninstalling

- Delete the five folders under `~/.claude/skills/`.
- Disable/remove the Obsidian community plugin(s) and the Web Clipper
  browser extension.
- Your vault's `inbox/`, `notes/`, `projects/`, `indexes/`,
  `templates/`, and `attachments/` folders are plain Markdown you
  already own — nothing to migrate or roll back.
