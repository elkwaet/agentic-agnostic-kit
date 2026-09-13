import path from "node:path";
import { readFileSync } from "node:fs";
const agentsMeta = JSON.parse(readFileSync(new URL("../constants/agents.json", import.meta.url), "utf-8"));
import { expandHome } from "../core/paths.js";
import { detectAllAgents } from "../core/detect-agents.js";
import { computeOwnership } from "../core/fs-safety/ownership-marker.js";
import { detectGraphifyCli, hasProjectGraph } from "../core/detect-graphify.js";
import { detectHookTools, missingHookTools } from "../core/detect-hook-tools.js";

// gemini-cli retire du kit (ADR-0012) - conserve dans agents.json pour
// `uninstall` uniquement, jamais dans une liste active.
const V01_AGENT_IDS = ["claude-code", "qwen-code"];
const PROJECT_AGENT_IDS = ["claude-code"];
// agy (Antigravity CLI) : Inclus en scope Home et Projet.
const STUB_ONLY_AGENT_IDS = ["opencode", "agy", "cursor", "windsurf", "cline", "copilot"];
const STUB_ONLY_PROJECT_AGENT_IDS = ["opencode", "agy", "cursor", "windsurf", "cline", "copilot"];

function agentDisplayLabel(agentMeta) {
  return agentMeta.deprecatedSince
    ? `${agentMeta.label} (deprecated since ${agentMeta.deprecatedSince})`
    : agentMeta.label;
}

async function printHookToolsStatus() {
  const detected = await detectHookTools();
  const missing = missingHookTools(detected);
  const status = Object.entries(detected)
    .map(([name, ok]) => `${name}=${ok ? "ok" : "MISSING"}`)
    .join(", ");
  console.log(`Hook tools required (bash/awk/jq): ${status}`);
  if (missing.length > 0) {
    console.log(`  -> ${missing.join(", ")} missing: the Bash hook will fail. The Node.js hook fallback is available.`);
  }
}

async function runDoctorHome() {
  const v01Meta = Object.fromEntries(V01_AGENT_IDS.map((id) => [id, agentsMeta[id]]));
  const detections = await detectAllAgents(v01Meta);

  const globalContractPath = expandHome("~/.agents/AGENTS.md");
  const globalOwnership = await computeOwnership(globalContractPath);
  console.log(`Global contract (${globalContractPath}): ${globalOwnership.ownership}`);

  const hookScriptPath = expandHome("~/.agents/hooks/session-start-contract.sh");
  const hookOwnership = await computeOwnership(hookScriptPath);
  console.log(`Hook script (${hookScriptPath}): ${hookOwnership.ownership}`);
  await printHookToolsStatus();

  console.log("\nPer agent:");
  for (const d of detections) {
    const agentMeta = v01Meta[d.id];
    const label = agentDisplayLabel(agentMeta);
    if (!d.installed) {
      console.log(`  - ${label}: not detected`);
      continue;
    }
    const stubPath = expandHome(agentMeta.contractStubHome);
    const configPath = expandHome(agentMeta.configFileHome);
    const stubOwnership = await computeOwnership(stubPath);
    const configOwnership = await computeOwnership(configPath);
    console.log(
      `  - ${label}: stub=${stubOwnership.ownership}, config=${configOwnership.ownership}`,
    );
  }

  const stubOnlyMeta = Object.fromEntries(STUB_ONLY_AGENT_IDS.map((id) => [id, agentsMeta[id]]));
  const stubOnlyDetections = await detectAllAgents(stubOnlyMeta);
  for (const d of stubOnlyDetections) {
    const agentMeta = stubOnlyMeta[d.id];
    const label = agentDisplayLabel(agentMeta);
    if (!d.installed) {
      console.log(`  - ${label}: not detected`);
      continue;
    }
    const stubPath = expandHome(agentMeta.contractStubHome);
    const stubOwnership = await computeOwnership(stubPath);
    console.log(`  - ${label}: stub=${stubOwnership.ownership} (native instruction file, no hook/config)`);
  }
}

/** Read-only, scope Projet : verifie l'etat du cwd, ne remonte jamais l'arborescence. */
async function runDoctorProject() {
  const cwd = process.cwd();
  const projectMeta = Object.fromEntries(
    PROJECT_AGENT_IDS.map((id) => [id, agentsMeta[id]]),
  );
  const detections = await detectAllAgents(projectMeta);

  const projectContractPath = path.join(cwd, ".agents", "AGENTS.md");
  const projectContractOwnership = await computeOwnership(projectContractPath);
  console.log(`Project contract (${projectContractPath}): ${projectContractOwnership.ownership}`);

  const hookScriptPath = path.join(cwd, ".agents", "hooks", "session-start-contract.sh");
  const hookOwnership = await computeOwnership(hookScriptPath);
  console.log(`Project hook script (${hookScriptPath}): ${hookOwnership.ownership}`);
  await printHookToolsStatus();

  const hasGraphifyCli = await detectGraphifyCli();
  const hasGraph = await hasProjectGraph(cwd);
  console.log(`Graphify CLI: ${hasGraphifyCli ? "available" : "not detected"}`);
  console.log(`Project graph (graphify-out/): ${hasGraph ? "present" : "absent"}`);
  if (hasGraphifyCli && !hasGraph) {
    console.log(
      "  -> run `graphify .` to build it, or re-run `agentic-agnostic init --scope project`",
    );
  } else if (!hasGraphifyCli) {
    console.log(
      "  -> `init --scope project` can install it for you when `uv` is available",
    );
  }

  console.log(
    "\nPer agent (claude-code only — qwen-code/agy out of v0.2 Project scope):",
  );
  for (const d of detections) {
    const agentMeta = projectMeta[d.id];
    const label = agentDisplayLabel(agentMeta);
    if (!d.installed) {
      console.log(`  - ${label}: not detected`);
      continue;
    }
    const stubPath = path.join(cwd, agentMeta.project.contractStubProject);
    const configPath = path.join(cwd, agentMeta.project.configFileProject);
    const stubOwnership = await computeOwnership(stubPath);
    const configOwnership = await computeOwnership(configPath);
    console.log(
      `  - ${label}: stub=${stubOwnership.ownership}, config=${configOwnership.ownership}`,
    );
  }

  const stubOnlyMeta = Object.fromEntries(
    STUB_ONLY_PROJECT_AGENT_IDS.map((id) => [id, agentsMeta[id]]),
  );
  const stubOnlyDetections = await detectAllAgents(stubOnlyMeta);
  for (const d of stubOnlyDetections) {
    const agentMeta = stubOnlyMeta[d.id];
    const label = agentDisplayLabel(agentMeta);
    if (!d.installed) {
      console.log(`  - ${label}: not detected`);
      continue;
    }
    const stubPath = path.join(cwd, agentMeta.project.contractStubProject);
    const stubOwnership = await computeOwnership(stubPath);
    console.log(`  - ${label}: stub=${stubOwnership.ownership} (native instruction file, no hook/config)`);
  }
}

/** Read-only : aucune question, aucune ecriture. Utile en CI. */
export async function runDoctor({ scope = "home" } = {}) {
  if (scope === "project") {
    return runDoctorProject();
  }
  return runDoctorHome();
}
