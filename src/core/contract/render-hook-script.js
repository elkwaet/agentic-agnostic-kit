import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "templates",
  "hooks",
  "session-start-contract.sh.tpl",
);

/**
 * Script hook partage par Claude Code, Gemini CLI et Qwen-code (meme
 * fichier physique, un seul FileOp quel que soit le nombre d'agents
 * selectionnes qui l'utilisent) - reproduit ~/.agents/hooks/session-start-contract.sh.
 */
export async function renderHookScript() {
  return readFile(TEMPLATE_PATH, "utf8");
}
