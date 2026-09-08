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
  "session-start-contract.project.sh.tpl",
);

/**
 * Script hook scope Projet, partage par Claude Code et Gemini CLI (memes
 * agents que planNativeHookMerge scope projet - qwen-code exclu, precedence
 * project>Home non verifiee). Reproduit le pattern reel valide sur
 * oteli-mono-staging/.agents/hooks/session-start-contract.sh, generalise
 * (decouverte dynamique des skills, pas de logique produit en dur).
 */
export async function renderProjectHookScript() {
  return readFile(TEMPLATE_PATH, "utf8");
}
