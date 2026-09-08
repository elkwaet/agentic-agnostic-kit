import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "templates",
  "skills",
  "SKILL.scaffold.md.tpl",
);

/**
 * Scaffold vide d'un skill produit projet (<cwd>/.agents/skills/<nom>/SKILL.md).
 * Seule interpolation : le nom fourni par l'utilisateur. Zero contenu
 * genere par Q&A au-dela de ce nom - un skill "v0" rempli par des reponses
 * generiques donnerait une fausse impression de contexte fiable, contraire
 * a la regle "jamais de supposition" du contrat.
 */
export async function renderSkillScaffold(skillName) {
  const template = await readFile(TEMPLATE_PATH, "utf8");
  return template.replaceAll("__SKILL_NAME__", skillName);
}
