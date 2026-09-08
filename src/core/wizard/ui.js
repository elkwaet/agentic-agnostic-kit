import path from "node:path";
import { homedir } from "node:os";
import { bold, dim, green, yellow, cyan } from "./colors.js";

// Largeur de reference pour les cadres et filets. Bornee : lisible mais pas
// demesuree sur un terminal large ; fallback 80 hors TTY.
export const WIDTH = Math.min(process.stdout.columns || 80, 72);

/**
 * Cadre a coins arrondis. `title` en gras, `subtitleLines` en attenue.
 * Toutes les entrees sont du texte brut (la couleur est appliquee ici,
 * apres calcul de la largeur).
 */
// Tronque par la gauche (garde la fin, ex. le nom de dossier d'un chemin).
function truncate(s, max) {
  return s.length <= max ? s : "…" + s.slice(s.length - Math.max(0, max - 1));
}

export function banner(title, subtitleLines = []) {
  const inner = Math.min(
    WIDTH - 4,
    Math.max(title.length, ...subtitleLines.map((l) => l.length)),
  );
  const pad = (s) => {
    const t = truncate(s, inner);
    return `  ${t}${" ".repeat(Math.max(0, inner - t.length))}  `;
  };
  const bar = "─".repeat(inner + 4);
  const out = [dim(`╭${bar}╮`)];
  out.push(dim("│") + bold(pad(title)) + dim("│"));
  for (const sub of subtitleLines) {
    out.push(dim("│") + dim(pad(sub)) + dim("│"));
  }
  out.push(dim(`╰${bar}╯`));
  return "\n" + out.join("\n");
}

let stepIndex = 0;
let stepTotal = 0;

/** (Re)demarre la numerotation des etapes. Deux appels possibles si le
 * wizard Projet enchaine le wizard Home. */
export function beginWizard(total) {
  stepIndex = 0;
  stepTotal = total;
}

/** En-tete d'etape : `STEP n/N · titre` + filet. */
export function step(title) {
  stepIndex += 1;
  const counter = stepTotal ? `${stepIndex}/${stepTotal}` : `${stepIndex}`;
  const head = bold(`  STEP ${counter} · ${title}`);
  const rule = dim("  " + "┈".repeat(Math.max(0, WIDTH - 2)));
  return `\n${head}\n${rule}`;
}

const bullet = (icon, text, pad = "  ") => `${pad}${icon} ${text}`;
export const ok = (t) => bullet(green("✓"), t);
export const add = (t) => bullet(green("+"), t);
export const warn = (t) => bullet(yellow("⚠"), t);
export const note = (t) => bullet(dim("·"), dim(t));
export const skip = (t) => bullet(dim("–"), dim(t));
export const run = (t) => bullet(cyan("▸"), t);

/** Sous-titre de bloc (remplace `=== label ===`). */
export function sectionTitle(label) {
  return `\n  ${cyan(bold("▸ " + label))}`;
}

/**
 * Chemin lisible : relatif au cwd (`./x`), sinon `~/…` si sous HOME,
 * sinon absolu tel quel.
 */
export function relPath(cwd, abs) {
  if (!abs) return abs;
  if (cwd) {
    const rel = path.relative(cwd, abs);
    if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
      return `./${rel}`;
    }
  }
  const home = homedir();
  if (abs === home) return "~";
  if (abs.startsWith(home + path.sep)) return `~/${abs.slice(home.length + 1)}`;
  return abs;
}

/** Cadre de cloture avec comptes et prochaines etapes. */
export function successBox({ appliedCount = 0, ignoredCount = 0, dryRun = false, nextSteps = [] }) {
  const title = dryRun ? "Aperçu (dry-run)" : "✔ Terminé";
  const counts = dryRun
    ? `${appliedCount} changement(s) prévus, ${ignoredCount} inchangé(s)`
    : `${appliedCount} changement(s) appliqués, ${ignoredCount} inchangé(s)`;
  const lines = [banner(title, [counts])];
  if (nextSteps.length > 0) {
    lines.push(`\n  ${bold("Prochaines étapes")}`);
    for (const s of nextSteps) lines.push(note(s));
  }
  return lines.join("\n");
}
