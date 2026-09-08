import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { backupBeforeWrite } from "./backup.js";
import { computeOwnership, recordWrite } from "./ownership-marker.js";

/**
 * Diff texte minimal (pas de dependance externe) : LCS classique sur les
 * lignes, O(n*m) - largement suffisant vu la taille des fichiers concernes
 * (contrats, configs, quelques dizaines de lignes). Contrairement a un
 * simple diff par ensemble, respecte l'ordre reel du fichier et ne
 * duplique jamais une ligne commune entre les deux blocs.
 */
export function lineDiff(oldText, newText) {
  const a = (oldText ?? "").split("\n");
  const b = (newText ?? "").split("\n");
  const m = a.length;
  const n = b.length;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lines = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push(`- ${a[i]}`);
      i++;
    } else {
      lines.push(`+ ${b[j]}`);
      j++;
    }
  }
  while (i < m) {
    lines.push(`- ${a[i]}`);
    i++;
  }
  while (j < n) {
    lines.push(`+ ${b[j]}`);
    j++;
  }

  return lines.join("\n") || "(no textual difference)";
}

/**
 * Construit une FileOp a partir de l'etat actuel du fichier cible et du
 * contenu propose. Ne fait AUCUNE ecriture - calcule juste ownership +
 * preview, pour que le wizard puisse afficher avant de demander
 * confirmation.
 */
export async function planFileOp({ targetPath, proposedContent, kind }) {
  const { ownership, currentContent } = await computeOwnership(targetPath);
  const diffPreview =
    ownership === "absent"
      ? proposedContent
      : lineDiff(currentContent, proposedContent);

  return {
    targetPath,
    kind, // "create" | "update-merge" | "update-replace-section" | "remove"
    ownership, // "absent" | "kit-owned" | "mixed" | "user-owned"
    currentContent,
    proposedContent,
    diffPreview,
  };
}

/**
 * Applique une FileOp deja planifiee et confirmee par l'utilisateur.
 * dryRun=true : ne fait rien, retourne le rapport tel quel.
 * dryRun=false, kind="remove" : backup -> suppression du fichier (utilise
 * par `uninstall` sur un stub devenu un pointeur vide apres retrait du
 * bloc marque - jamais sur les fichiers de contenu du kit).
 * dryRun=false, autre kind : backup (si le fichier existait) -> ecriture
 * -> enregistre le hash pour la detection d'ownership au prochain run.
 */
export async function applyFileOp(fileOp, { dryRun, scope }) {
  if (dryRun) {
    return { applied: false, dryRun: true, ...fileOp };
  }

  if (fileOp.kind === "remove") {
    const backupPath = await backupBeforeWrite(fileOp.targetPath, scope);
    await unlink(fileOp.targetPath);
    return { applied: true, dryRun: false, backupPath, ...fileOp };
  }

  await mkdir(path.dirname(fileOp.targetPath), { recursive: true });
  const backupPath = await backupBeforeWrite(fileOp.targetPath, scope);
  await writeFile(fileOp.targetPath, fileOp.proposedContent, "utf8");
  await recordWrite(fileOp.targetPath, fileOp.proposedContent);

  return { applied: true, dryRun: false, backupPath, ...fileOp };
}
