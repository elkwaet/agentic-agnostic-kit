import { access, constants as fsConstants } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expandHome } from "./paths.js";

const execFileAsync = promisify(execFile);

async function binOnPath(bin) {
  try {
    // "which" existe sur macOS/Linux ; pas de support Windows dans ce v0.1
    // (coherent avec le scope du chantier source, macOS uniquement).
    const { stdout } = await execFileAsync("which", [bin]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function dirExists(p) {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detecte, pour un agent donne (entree de constants/agents.json), s'il
 * est installe sur cette machine. Jamais de supposition de version -
 * juste presence du binaire et/ou du dossier de config.
 */
export async function detectAgent(agentMeta) {
  const configDir = expandHome(agentMeta.detect.configDirHome);
  const [hasBin, hasConfigDir] = await Promise.all([
    binOnPath(agentMeta.detect.bin),
    dirExists(configDir),
  ]);
  return {
    id: agentMeta.id,
    label: agentMeta.label,
    installed: hasBin || hasConfigDir,
    hasBin,
    hasConfigDir,
    configDir,
  };
}

export async function detectAllAgents(agentsMeta) {
  const entries = Object.values(agentsMeta);
  const results = await Promise.all(entries.map(detectAgent));
  return results;
}
