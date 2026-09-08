import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  wrapWithMarker,
  extractMarkedBlock,
} from "../fs-safety/ownership-marker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "..", "..", "templates", "stubs");
const PROJECT_TEMPLATES_DIR = path.join(__dirname, "..", "..", "templates", "stubs-project");

const TEMPLATE_FILE_BY_AGENT = {
  "claude-code": "claude.CLAUDE.md.tpl",
  agy: "agy.GEMINI.md.tpl",
  "qwen-code": "qwen.QWEN.md.tpl",
  opencode: "opencode.AGENTS.md.tpl",
};

const PROJECT_TEMPLATE_FILE_BY_AGENT = {
  "claude-code": "claude.CLAUDE.md.tpl",
  opencode: "opencode.AGENTS.md.tpl",
};

const BLOCK_ID = "stub-pointer";

/** Logique de preservation partagee entre stub Home et stub Projet. */
async function renderStubFrom(templatesDir, templateFile, currentContent) {
  const templateContent = await readFile(path.join(templatesDir, templateFile), "utf8");
  const markedBlock = wrapWithMarker(BLOCK_ID, templateContent);

  if (!currentContent) {
    return markedBlock + "\n";
  }

  const extracted = extractMarkedBlock(currentContent, BLOCK_ID);
  if (extracted.found) {
    // Deja gere par le kit : on remplace uniquement le bloc marque, tout
    // le reste (avant/apres) est du contenu residuel a preserver tel quel.
    const before = extracted.before.trimEnd();
    const after = extracted.after.trimStart();
    return [before, markedBlock, after].filter(Boolean).join("\n\n") + "\n";
  }

  // Premier passage sur un fichier existant non gere par le kit : on ne
  // supprime rien, on prepend le bloc marque et on garde tout le contenu
  // existant en dessous.
  return markedBlock + "\n\n" + currentContent.trimStart();
}

/**
 * Rend le stub Home d'un agent en preservant tout contenu residuel deja
 * present dans le fichier existant (ADR-0003 : QWEN.md garde son bloc
 * "Qwen Added Memories" en dessous du pointeur ; meme logique
 * generalisee aux autres agents pour tout contenu propre non-kit,
 * ex: bloc graphify de CLAUDE.md, bloc PWA de GEMINI.md).
 *
 * currentContent: contenu actuel du fichier cible (ou null si absent).
 * Retourne le nouveau contenu complet a ecrire.
 */
export async function renderStub(agentId, currentContent) {
  const templateFile = TEMPLATE_FILE_BY_AGENT[agentId];
  if (!templateFile) {
    throw new Error(`No stub template for agent "${agentId}"`);
  }
  return renderStubFrom(TEMPLATES_DIR, templateFile, currentContent);
}

/**
 * Rend le stub Projet (CLAUDE.md/GEMINI.md a la racine du projet, pointant
 * vers .agents/AGENTS.md local) - meme logique de preservation que le stub
 * Home, agents.json.<id>.project.contractStubProject donne le nom de
 * fichier. qwen-code n'a pas de template projet (v0.2 scope Projet limite
 * a claude-code, precedence verifiee).
 */
export async function renderProjectStub(agentId, currentContent) {
  const templateFile = PROJECT_TEMPLATE_FILE_BY_AGENT[agentId];
  if (!templateFile) {
    throw new Error(`No project stub template for agent "${agentId}"`);
  }
  return renderStubFrom(PROJECT_TEMPLATES_DIR, templateFile, currentContent);
}
