# AGENTIC AGNOSTIC KIT

This framework is a wizard that configures a global behavior contract (`~/.agents/AGENTS.md`)
and injects it at session startup, without ever silently overwriting
an existing contract. It is based on extensive experimentation and empirical findings drawn from official documentation and the observed behavior of the various agent-based systems on the market that it supports. The goal is to centralize contracts on a single system (and across projects) even when the operator/user must switch between “multi-platform AI” work sessions.

**WARNING: This is purely CLI-oriented / For terminal-based coding assistant platforms**.

## Prerequisites

- **Node.js**: Strictly requires `>= 18.0.0`. For optimal performance and compatibility, the latest LTS version (e.g. 20.x or 22.x) is strongly recommended.

## Installation

The npm package is called `agentic-agnostic-kit`; the installed command is called `agentic-agnostic` (shortcut, the old name `agentic-agnostic-kit` remains available as an alias).

> ⚠️ NPMJS's own "Install" widget on this package's page shows `npm i agentic-agnostic-kit`, without `-g`. That installs the package **locally** in the current folder, not globally: the `agentic-agnostic` command then lands in `node_modules/.bin/`, not on your shell's `PATH`, so running it directly fails with "command not found". Use one of the two options below instead.

### 1. Install

For a CLI you can run from anywhere on your machine, install it globally with `-g`:

```bash
npm install -g agentic-agnostic-kit
```

Prefer not installing anything permanently? Run it on demand instead, no install step, via `npx`:

```bash
npx agentic-agnostic-kit init --dry-run
```

### 2. First run

Once installed globally, preview what the wizard would do without writing anything:

```bash
agentic-agnostic init --dry-run
```

Then run it for real:

```bash
agentic-agnostic init
```

By default, `init` processes every agent it detects on the machine, asking for a menu-driven subset only when more than one is detected (skip the menu with `--yes`, which always keeps everything). To restrict it non-interactively to specific agents, pass `--agent` with a comma-separated list of ids:

```bash
agentic-agnostic init --agent agy
agentic-agnostic init --agent claude-code,opencode
```

`--agent` errors out (rather than silently ignoring anything) if an id is unknown or not detected on the machine.

### Local installation in an existing project

If you're installing the kit locally as a project dependency (rather than globally with `-g`), use the package manager already set up in that project—it's not necessarily `npm`:

```bash
pnpm add -D agentic-agnostic-kit   # pnpm project (pnpm-lock.yaml present)
yarn add -D agentic-agnostic-kit   # yarn project (yarn.lock present)
npm install agentic-agnostic-kit  # npm project (package-lock.json present)
```

> Running `npm install` in a directory where the `node_modules/` directory was created by another package manager (e.g., pnpm, which uses symlinks to a `.pnpm/` store) can cause `npm` to crash with an error like `Cannot read properties of null (reading 'matches')` — this is a known bug in `npm`/`@npmcli/arborist` when encountering a dependency tree it did not build itself, not a flaw in this package.

## Scope v1.0

- Agents supported in the **Home** scope: **Claude Code, Qwen-code** (native `SessionStart` hook) + **Antigravity CLI (`agy`)** and **OpenCode** (native stub, no hook — both load their instruction file natively at startup).
- Agents supported in the **Project** scope: **Claude Code only** (priority `project > Home` for the `SessionStart` hook verified) + **OpenCode** (native stub `<project>/AGENTS.md`, combined with the Home stub — no priority to resolve, both are loaded). `qwen-code` and `agy` are excluded until their project/Home precedence is verified.
- **OpenCode**: integrated via its native `AGENTS.md` file-loading mechanism—no plugin or permission configuration required. The **mechanism** for loading is 100% reliable (native file reading, documented by OpenCode); **content accuracy** with the template selected in OpenCode varies depending on the template—this is not a flaw in the kit.
- **Gemini CLI has been removed from the kit** (2026-08-30): officially discontinued since June 18, 2026, and observed refusing authentication in real-world use. **Antigravity CLI (`agy`)** is now the kit's sole agent for the Google/Gemini ecosystem.

> NOTE: Antigravity CLI (`agy`) is integrated as a **native-stub agent** (like OpenCode): the kit relies on `agy`'s confirmed native reading of `GEMINI.md`/`AGENTS.md`, without a hook. Official Antigravity docs (`antigravity.google/docs/hooks`) list a different hook system (`PreToolUse`/`PostToolUse`/`PreInvocation`/`PostInvocation`/`Stop` via a `hooks.json` file — no `SessionStart` event exists for this agent), and real-world testing of that mechanism failed twice. No hook is wired for `agy` until one is verified working — the native stub alone already gives `agy` the same contract coverage as OpenCode.

### Project scope — key points

- `init --scope project` processes **only one project (the current directory) per run** — you can rerun it from any other project directory at any time; there is no multi-project batch mode.
- Requires a global contract (`~/.agents/AGENTS.md`) to already be in place: if absent, the wizard halts and offers to proceed to the Home wizard in the same session.
- Detects the local project contract only at the root of the current folder (`<cwd>/.agents/AGENTS.md`) — no traversal up the directory tree.
- A project-scope `SessionStart` hook **completely replaces** (no merge) the Home hook for this project: the generated hook therefore always includes the global contract in addition to the project contract, and an explicit warning is displayed before confirmation.
- Optional skill: if no skill already exists under `<cwd>/.agents/skills/`, the wizard offers an **empty scaffold** (name provided by the user, zero content generated by Q&A).
- Content scaffolds created when absent: `ARCHIVES_R/README.md`, `Backlog.md`, and an `ADRs/` directory (with a template `README.md`) whose location is your choice — project root `ADRs/` or `.agents/ADRs/`. The generated project contract includes the matching `[ARCHIVES]`, `[ADR]`, and `[BACKLOG]` sections.
- Graphify: if the `graphify` CLI is present, the wizard offers (opt-in) to wire OpenCode and to run the initial graph build (`graphify .`, AST extraction, no API key); if it's absent, it offers to install it via `uv tool install graphifyy` when `uv` is available.

## Graphify integration

[Graphify](https://www.npmjs.com/package/graphifyy) is a separate, optional CLI that builds a **per-project knowledge graph** of a codebase (AST-only, no LLM call, no API key required for basic use) — it lets an agent query "what calls X", "what's the shortest path between A and B", or get a scoped explanation of a symbol, instead of grepping blindly or reading the whole repo into context. It isn't bundled with this kit and isn't a dependency of it; `agentic-agnostic-kit` only **detects, guides, and wires it in** where it's already installed. Concretely, during `init --scope project`:

- **Detection**: the wizard checks whether the `graphify` CLI is on `PATH` and whether a graph already exists under `graphify-out/` in the current project, and reports both.
- **Setup guidance**: if the CLI is missing or no graph exists yet, the wizard prints the exact commands to install it and build the initial graph — and is explicit that the basic workflow (`graphify update .`, `graphify query`, `graphify path`, `graphify explain`) needs **no API key**; a key is only required for LLM-based community naming or ingesting non-code content.
- **Contract section**: the generated project contract (`.agents/AGENTS.md`) includes a `[GRAPHIFY]` section instructing the agent to query the graph before any broad exploratory search, and to refresh it (`graphify update .`) after structurally significant code changes.
- **Cross-agent auto-sync**: the generated project `SessionStart` hook re-runs `graphify opencode/antigravity install --project` on every session start when the CLI is present — so if you update Graphify, or work across multiple AI agents on the same project, the wiring for platforms without a native hook mechanism stays current without a manual step.

Why this matters for a **multi-agent** kit specifically: every agent this kit supports has its own context window and its own default way of "getting familiar" with a codebase (some grep broadly, some read files one by one). A shared, per-project code graph gives all of them the same scoped, factual answer to "where does this live and what does it touch" regardless of which agent is driving the session — one less place for agent-specific drift to creep in, on top of the shared behavior contract this kit already centralizes.

## Compatibility — Requirements & OS

Tested on macOS only at this stage. Your **interactive login shell** (bash on most Linux distros, zsh on modern macOS — usually one or the other, not necessarily both) **does not matter** for this: the generated hook declares its own shebang (`#!/bin/bash`) and runs as an independent subprocess, never inside your current shell. What actually matters is that the `bash` **binary** is present on `PATH`, regardless of which shell you use day to day — true by default on macOS and virtually every Linux distro, even when zsh (or fish, etc.) is your login shell.

**System requirements for the `SessionStart` hook to work** (not installed by the kit — must be in place before `init`; `init` and `doctor` detect and report on these three, warning you if any is missing, but never install them for you):

- `bash`
- `awk` (extraction of the `[PREAMBLE]` section from the contract)
- `jq` (constructing the hook’s output JSON)

These three tools are present by default on macOS and most desktop Linux distributions, but their presence isn’t guaranteed on a minimal Linux system (container, bare-metal server). If `doctor` or `init` reports one as missing, install it first:

```bash
# macOS (Homebrew)
brew install bash awk jq   # awk (as `gawk`/onetrueawk) ships with macOS by default, brew install rarely needed

# Debian / Ubuntu
sudo apt install bash gawk jq

# Fedora / RHEL
sudo dnf install bash gawk jq

# Arch
sudo pacman -S bash gawk jq
```

| Environment                       | Status                                                                                                                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS (bash or zsh)                | ✅ Tested, working                                                                                                                                                                                                              |
| Common desktop Linux               | ⚠️ Not tested, same mechanism as macOS — should work if `bash`/`awk`/`jq` are present                                                                                                                                          |
| WSL (Windows Subsystem for Linux)  | ⚠️ Not tested. Likely to work (real Linux environment) but no validation done — don't assume it works without checking                                                                                                        |
| Native Windows (no WSL)            | ❌ Not supported. Agent detection uses the Unix binary `which` (not natively available; `where.exe` has different syntax), and the generated hook is a bash script (`#!/bin/bash`) with no PowerShell/cmd equivalent provided |

Native Windows support is out of scope for now (would require cross-OS
detection and an alternative PowerShell hook) — not planned unless there's
demand for a dedicated iteration.

## Usage

```bash
agentic-agnostic init --dry-run              # preview only, writes nothing (home scope)
agentic-agnostic init                        # interactive wizard, per-file confirmation
agentic-agnostic init --yes                   # accepts all proposals (scripted usage)
agentic-agnostic init --scope project         # project scope, run from the target project root
agentic-agnostic init --scope project --dry-run
agentic-agnostic doctor                       # current state, home scope, read-only
agentic-agnostic doctor --scope project       # current state, project scope (cwd), read-only
agentic-agnostic uninstall --dry-run          # preview the wiring removal (home scope)
agentic-agnostic uninstall --scope project    # remove the wiring, project scope (cwd)
```

By default, each proposed change is shown as a short, plain-language status line (e.g. "New file — will be created", "You've customized this file — review before confirming"). Pass `--verbose` (or `-v`) to `init`/`uninstall` to also see the full line-by-line diff:

```bash
agentic-agnostic init --dry-run --verbose
```

### `uninstall`

Remove **only the configuration** added by the kit: the `hooks.SessionStart` entry in each agent’s `settings.json`, and the block marked in the stubs (`CLAUDE.md`/`QWEN.md`, `GEMINI.md` for Antigravity CLI, `AGENTS.md` for OpenCode — Home or Project). OpenCode and Antigravity CLI have no `hooks.SessionStart` entry to remove (stub only). `uninstall` also cleans up a `gemini-cli` hook left by a version of the kit prior to 2026-08-30, even though `gemini-cli` is no longer offered by `init`/`doctor`.

A stub that contained only the kit’s pointer is deleted; if it contained residual content (added later by the user), only the marked block is removed, and the residual content is kept as-is.

**Never** automatically delete the `AGENTS.md` contract, the hook script, or the skill scaffolds—these are content files that the user updates, not configuration. `uninstall` lists them at the end of execution as “still present, untouched”; removing them remains a manual and deliberate action.

## Security Model

- All writes go through `FileOp`: read → diff → explicit
  confirmation → timestamped backup → write. Never a direct overwrite.
- Ownership detected by marked block (`<!-- agentic-agnostic-kit:begin:... -->`)
  - hash of the last known write (`~/.agents/.agentic-agnostic-kit/state.json`).
    Residual content not managed by the kit (e.g., a real `QWEN.md` file containing personal notes) is always preserved and never lost.
- JSON merge by key, never by overwriting the entire file.
- `--dry-run` and actual execution share the same code (`FileOp.apply`).

## Tests

```bash
npm test
```

## Authors

- Elkwaet [Linkedin](https://linkedin.com/in/elkwaet) , [Gitlab: @elkwaet](https://gitlab.com/elkwaet)
- Next contributors 🤕 XOXO.

## License

[MIT](./LICENSE)
