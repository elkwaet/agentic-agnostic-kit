import { readFile } from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";
const agentsMeta = JSON.parse(readFileSync(new URL("../constants/agents.json", import.meta.url), "utf-8"));
import { expandHome } from "../core/paths.js";
import { removeMarkedBlock } from "../core/fs-safety/ownership-marker.js";
import { planSessionStartRemoval, serializeJson } from "../core/fs-safety/json-merge.js";
import { planFileOp, applyFileOp } from "../core/fs-safety/file-op.js";
import { createPrompter } from "../core/wizard/prompts.js";
import { formatFileOpPreview, formatSummary } from "../core/wizard/preview.js";

const V01_AGENT_IDS = ["claude-code", "qwen-code"];
const PROJECT_AGENT_IDS = ["claude-code"];
// agy (Antigravity CLI) : Inclus en scope Home et Projet.
const STUB_ONLY_AGENT_IDS = ["opencode", "agy", "cursor", "windsurf", "cline", "copilot"];
const STUB_ONLY_PROJECT_AGENT_IDS = ["opencode", "agy", "cursor", "windsurf", "cline", "copilot"];
// gemini-cli retire des listes actives (ADR-0012 : arret officiel +
// refus d'auth en usage reel, remplace par agy). Conserve ici uniquement
// pour que les installations posees par une version anterieure du kit
// restent nettoyables via `uninstall` - jamais propose par init/doctor.
const LEGACY_AGENT_IDS = ["gemini-cli"];
const LEGACY_PROJECT_AGENT_IDS = ["gemini-cli"];
const STUB_BLOCK_ID = "stub-pointer";

async function readJsonIfExists(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw new Error(`Invalid or unreadable JSON file: ${filePath} (${err.message})`);
  }
}

async function readTextIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Retire uniquement le cablage (bloc marque du stub + entree
 * hooks.SessionStart pointant vers hookScriptPath) pour un agent donne.
 * Ne touche jamais au contrat AGENTS.md, au script hook, ni aux scaffolds
 * de skill - ce sont des fichiers de contenu, jamais consideres comme du
 * cablage a retirer (decision utilisateur explicite).
 */
async function uninstallAgent({
  agentLabel,
  stubPath,
  configPath,
  hookScriptPath,
  prompter,
  applied,
  dryRun,
  yes,
  verbose,
  scope,
}) {
  console.log(`\n=== ${agentLabel} ===`);

  const currentStub = await readTextIfExists(stubPath);
  if (currentStub === null) {
    console.log(`No stub at ${stubPath} — nothing to remove.`);
  } else {
    const removed = removeMarkedBlock(currentStub, STUB_BLOCK_ID);
    if (!removed.found) {
      console.log(`No kit-managed block in ${stubPath} — nothing to remove.`);
    } else if (removed.residual === "") {
      const fileOp = await planFileOp({
        targetPath: stubPath,
        proposedContent: "",
        kind: "remove",
      });
      console.log(formatFileOpPreview(fileOp, { verbose }));
      const ok = yes || (await prompter.confirm(`Delete the empty stub? (${agentLabel})`));
      applied.push(
        ok
          ? await applyFileOp(fileOp, { dryRun, scope })
          : { applied: false, skipped: true, dryRun, targetPath: stubPath },
      );
    } else {
      const fileOp = await planFileOp({
        targetPath: stubPath,
        proposedContent: removed.residual + "\n",
        kind: "update-replace-section",
      });
      console.log(formatFileOpPreview(fileOp, { verbose }));
      const ok =
        yes || (await prompter.confirm(`Remove the kit's pointer, keep the rest? (${agentLabel})`));
      applied.push(
        ok
          ? await applyFileOp(fileOp, { dryRun, scope })
          : { applied: false, skipped: true, dryRun, targetPath: stubPath },
      );
    }
  }

  const existingConfig = await readJsonIfExists(configPath);
  const { config, changed } = planSessionStartRemoval(existingConfig, hookScriptPath);
  if (!changed) {
    console.log(`No kit-managed hooks.SessionStart entry in ${configPath} — nothing to remove.`);
    return;
  }
  const fileOp = await planFileOp({
    targetPath: configPath,
    proposedContent: serializeJson(config),
    kind: "update-merge",
  });
  console.log(formatFileOpPreview(fileOp, { verbose }));
  const ok = yes || (await prompter.confirm(`Remove the hooks.SessionStart entry? (${agentLabel})`));
  applied.push(
    ok
      ? await applyFileOp(fileOp, { dryRun, scope })
      : { applied: false, skipped: true, dryRun, targetPath: configPath },
  );
}

/**
 * Retire uniquement le bloc marque du stub d'un agent stub-only (OpenCode,
 * ADR-0010) - pas de config JSON a toucher, il n'y en a pas pour ce
 * mecanisme.
 */
async function uninstallStubOnlyAgent({
  agentLabel,
  stubPath,
  prompter,
  applied,
  dryRun,
  yes,
  verbose,
  scope,
}) {
  console.log(`\n=== ${agentLabel} ===`);

  const currentStub = await readTextIfExists(stubPath);
  if (currentStub === null) {
    console.log(`No stub at ${stubPath} — nothing to remove.`);
    return;
  }
  const removed = removeMarkedBlock(currentStub, STUB_BLOCK_ID);
  if (!removed.found) {
    console.log(`No kit-managed block in ${stubPath} — nothing to remove.`);
    return;
  }
  if (removed.residual === "") {
    const fileOp = await planFileOp({ targetPath: stubPath, proposedContent: "", kind: "remove" });
    console.log(formatFileOpPreview(fileOp, { verbose }));
    const ok = yes || (await prompter.confirm(`Delete the empty stub? (${agentLabel})`));
    applied.push(
      ok
        ? await applyFileOp(fileOp, { dryRun, scope })
        : { applied: false, skipped: true, dryRun, targetPath: stubPath },
    );
    return;
  }
  const fileOp = await planFileOp({
    targetPath: stubPath,
    proposedContent: removed.residual + "\n",
    kind: "update-replace-section",
  });
  console.log(formatFileOpPreview(fileOp, { verbose }));
  const ok =
    yes || (await prompter.confirm(`Remove the kit's pointer, keep the rest? (${agentLabel})`));
  applied.push(
    ok
      ? await applyFileOp(fileOp, { dryRun, scope })
      : { applied: false, skipped: true, dryRun, targetPath: stubPath },
  );
}

export async function runUninstall({ scope = "home", dryRun = false, yes = false, verbose = false } = {}) {
  const prompter = createPrompter();
  const applied = [];
  const contentFiles = [];

  try {
    console.log(`agentic-agnostic — uninstall (scope: ${scope})\n`);
    console.log(
      "Removes only the kit's wiring (SessionStart hook + pointer in the stubs). " +
        "The AGENTS.md contract, the hook script, and skill scaffolds are never " +
        "deleted automatically.\n",
    );

    if (scope === "project") {
      const cwd = process.cwd();
      const hookScriptPath = path.join(cwd, ".agents", "hooks", "session-start-contract.sh");
      for (const id of [...PROJECT_AGENT_IDS, ...LEGACY_PROJECT_AGENT_IDS]) {
        const agentMeta = agentsMeta[id];
        await uninstallAgent({
          agentLabel: agentMeta.label,
          stubPath: path.join(cwd, agentMeta.project.contractStubProject),
          configPath: path.join(cwd, agentMeta.project.configFileProject),
          hookScriptPath,
          prompter,
          applied,
          dryRun,
          yes,
          verbose,
          scope,
        });
      }
      for (const id of STUB_ONLY_PROJECT_AGENT_IDS) {
        const agentMeta = agentsMeta[id];
        await uninstallStubOnlyAgent({
          agentLabel: agentMeta.label,
          stubPath: path.join(cwd, agentMeta.project.contractStubProject),
          prompter,
          applied,
          dryRun,
          yes,
          verbose,
          scope,
        });
      }
      contentFiles.push(
        path.join(cwd, ".agents", "AGENTS.md"),
        hookScriptPath,
        `${path.join(cwd, ".agents", "skills")} (any scaffolds, not listed here)`,
      );
    } else {
      const hookScriptPath = expandHome("~/.agents/hooks/session-start-contract.sh");
      for (const id of [...V01_AGENT_IDS, ...LEGACY_AGENT_IDS]) {
        const agentMeta = agentsMeta[id];
        await uninstallAgent({
          agentLabel: agentMeta.label,
          stubPath: expandHome(agentMeta.contractStubHome),
          configPath: expandHome(agentMeta.configFileHome),
          hookScriptPath,
          prompter,
          applied,
          dryRun,
          yes,
          verbose,
          scope,
        });
      }
      for (const id of STUB_ONLY_AGENT_IDS) {
        const agentMeta = agentsMeta[id];
        await uninstallStubOnlyAgent({
          agentLabel: agentMeta.label,
          stubPath: expandHome(agentMeta.contractStubHome),
          prompter,
          applied,
          dryRun,
          yes,
          verbose,
          scope,
        });
      }
      contentFiles.push(expandHome("~/.agents/AGENTS.md"), hookScriptPath);
    }

    console.log(formatSummary(applied));
    console.log("\nContent files never touched by uninstall:");
    for (const f of contentFiles) {
      console.log(`  - ${f}`);
    }
  } finally {
    prompter.close();
  }
}
