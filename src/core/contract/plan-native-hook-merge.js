import { readFile } from "node:fs/promises";
import { planSessionStartMerge, serializeJson } from "../fs-safety/json-merge.js";
import { planFileOp } from "../fs-safety/file-op.js";

async function readJsonIfExists(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw new Error(`Invalid or unreadable JSON file: ${filePath} (${err.message})`);
  }
}

/**
 * Planifie le merge de hooks.SessionStart dans le settings.json d'un agent
 * a hook natif (Claude Code, Gemini CLI, Qwen-code). Ne merge que la cle
 * hooks.SessionStart pour le matcher vise ; le reste du fichier existant
 * (autres plugins, permissions, etc.) n'est jamais touche - cf.
 * ADR-0005 pour la raison de cette prudence sur les fichiers JSON.
 *
 * agentMeta: l'entree correspondante de constants/agents.json
 * hookScriptPath: chemin absolu resolu vers le script hook partage
 * configFilePath: chemin absolu resolu du fichier de config a merger
 *   (Home ou Projet - jamais lu depuis agentMeta, toujours fourni par
 *   l'appelant pour que cette fonction reste agnostique du scope)
 */
export async function planNativeHookMerge(agentMeta, hookScriptPath, configFilePath) {
  const existingConfig = await readJsonIfExists(configFilePath);

  const hookSpec = {
    matcher: agentMeta.injection.matcher,
    command: hookScriptPath,
    timeout:
      agentMeta.injection.defaultTimeout != null
        ? agentMeta.injection.defaultTimeout
        : undefined,
  };

  const result = planSessionStartMerge(existingConfig, hookSpec);

  if (!result.changed && !result.warning) {
    // Deja en place tel quel : rien a proposer.
    return { fileOp: null, warning: null, alreadyConfigured: true };
  }

  const proposedConfig = result.warning ? existingConfig : result.config;
  const fileOp = await planFileOp({
    targetPath: configFilePath,
    proposedContent: serializeJson(
      result.warning ? existingConfig : result.config,
    ),
    kind: "update-merge",
  });

  return {
    fileOp,
    warning: result.warning,
    pendingReplace: result.pendingReplace ?? null,
    alreadyConfigured: false,
  };
}

/**
 * Si l'utilisateur confirme malgre l'avertissement (hook existant pointant
 * ailleurs), reconstruit la FileOp avec le remplacement force.
 */
export async function planForcedReplace(agentMeta, pendingReplace, configFilePath) {
  const forcedConfig = pendingReplace();
  return planFileOp({
    targetPath: configFilePath,
    proposedContent: serializeJson(forcedConfig),
    kind: "update-merge",
  });
}
