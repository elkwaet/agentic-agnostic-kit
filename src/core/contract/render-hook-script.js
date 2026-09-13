import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_BASH_PATH = path.join(
  __dirname,
  "..",
  "..",
  "templates",
  "hooks",
  "session-start-contract.sh.tpl",
);

const TEMPLATE_NODE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "templates",
  "hooks",
  "session-start-contract.js.tpl",
);

/**
 * Script hook partage par Claude Code, Gemini CLI et Qwen-code (meme
 * fichier physique, un seul FileOp quel que soit le nombre d'agents
 * selectionnes qui l'utilisent).
 */
export async function renderHookScript(engine = "bash") {
  const tplPath = engine === "node" ? TEMPLATE_NODE_PATH : TEMPLATE_BASH_PATH;
  return readFile(tplPath, "utf8");
}
