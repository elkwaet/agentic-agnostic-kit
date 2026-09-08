import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// bash/awk/jq are what the generated SessionStart hook actually shells out
// to (see templates/hooks/*.sh.tpl) - not installed by the kit itself, only
// detected so the wizard/doctor can warn before a hook that would silently
// fail at every session start.
export const REQUIRED_HOOK_TOOLS = ["bash", "awk", "jq"];

async function detectBinary(name) {
  try {
    await execFileAsync("which", [name]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retourne { bash: bool, awk: bool, jq: bool }.
 */
export async function detectHookTools() {
  const entries = await Promise.all(
    REQUIRED_HOOK_TOOLS.map(async (name) => [name, await detectBinary(name)]),
  );
  return Object.fromEntries(entries);
}

export function missingHookTools(detected) {
  return REQUIRED_HOOK_TOOLS.filter((name) => !detected[name]);
}
