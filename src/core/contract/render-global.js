import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "..", "..", "templates", "global", "AGENTS.md.tpl");

/**
 * Rend le squelette de ~/.agents/AGENTS.md. Ne contient aucune regle
 * presupposee (pas de "tutoiement" ou autre preference propre a un
 * utilisateur precis) - uniquement une structure de sections a completer,
 * dont une section [PREAMBLE] marquee que le hook SessionStart extrait.
 *
 * N'ecrase jamais un contrat existant : c'est a l'appelant (commands/init)
 * de decider de ne pas appeler cette fonction si le fichier existe deja.
 */
export async function renderGlobalContract() {
  return readFile(TEMPLATE_PATH, "utf8");
}
