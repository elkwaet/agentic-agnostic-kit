import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "templates",
  "project",
  "AGENTS.project.md.tpl",
);

/**
 * Contrat projet local (<cwd>/.agents/AGENTS.md). A la difference des
 * stubs par agent, ce fichier n'a jamais de bloc marque : c'est du contenu
 * propre a l'utilisateur des sa creation. Ne doit donc etre propose que si
 * absent (ownership 'absent') - jamais de merge sur un contrat projet
 * existant, quel que soit son contenu.
 */
export async function renderProjectContract() {
  return readFile(TEMPLATE_PATH, "utf8");
}
