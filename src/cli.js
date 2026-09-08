import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runUninstall } from "./commands/uninstall.js";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = { scope: "home", dryRun: false, yes: false, verbose: false, agentFilter: null };
  for (const arg of rest) {
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--yes" || arg === "-y") flags.yes = true;
    else if (arg === "--verbose" || arg === "-v") flags.verbose = true;
    else if (arg.startsWith("--scope=")) flags.scope = arg.split("=")[1];
    else if (arg === "--scope") flags.scope = rest[rest.indexOf(arg) + 1];
    else if (arg.startsWith("--agent=")) {
      flags.agentFilter = arg
        .split("=")[1]
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    } else if (arg === "--agent") {
      flags.agentFilter = (rest[rest.indexOf(arg) + 1] ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }
  return { command, flags };
}

export async function main(argv = process.argv.slice(2)) {
  const { command, flags } = parseArgs(argv);

  if (flags.scope !== "home" && flags.scope !== "project") {
    console.error(`Invalid scope: "${flags.scope}" (expected: home | project)`);
    process.exitCode = 1;
    return;
  }

  switch (command) {
    case "init":
      await runInit(flags);
      break;
    case "doctor":
      await runDoctor({ scope: flags.scope });
      break;
    case "uninstall":
      await runUninstall(flags);
      break;
    case undefined:
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

function printHelp() {
  console.log(`agentic-agnostic — v1.0 (alias: agentic-agnostic-kit)

Home scope    : Claude Code / Antigravity CLI (agy) / Qwen-code.
Project scope : Claude Code only (project>Home precedence not verified for
                qwen-code/agy yet). Processes ONE project (the current
                directory) per run — rerun it from any other project
                directory at any time.

Usage:
  agentic-agnostic init [--scope home|project] [--dry-run] [--yes] [--verbose] [--agent <id1,id2,...>]
  agentic-agnostic doctor [--scope home|project]
  agentic-agnostic uninstall [--scope home|project] [--dry-run] [--yes] [--verbose]

By default, each proposed change is shown as a short, plain-language
status line. Pass --verbose (or -v) to also see the full line-by-line diff.

By default, init processes every detected agent. Pass --agent to restrict
it to a subset (e.g. --agent agy, or --agent claude-code,opencode) —
skips the interactive selection menu that otherwise appears when more
than one agent is detected. Errors out if an id is unknown or not
detected, rather than silently ignoring it. Valid ids: claude-code,
qwen-code, agy, opencode.

uninstall only removes the kit's wiring (SessionStart hook + pointer in
stubs) — the AGENTS.md contract, the hook script, and skill scaffolds are
never deleted automatically.
`);
}
