import { mkdir, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { kitBackupDir, timestampSlug } from "../paths.js";

/**
 * Copie targetPath vers ~/.agents/.agentic-agnostic-kit/backups/<scope>/<timestamp>/<basename>
 * avant toute reecriture. Ne supprime jamais rien - filet, pas cache.
 * No-op si le fichier n'existe pas encore (rien a sauvegarder).
 * Retourne le chemin du backup, ou null si aucun backup necessaire.
 */
export async function backupBeforeWrite(targetPath, scope) {
  try {
    await access(targetPath);
  } catch {
    return null; // fichier absent, rien a sauvegarder
  }

  const dir = kitBackupDir(scope, timestampSlug());
  await mkdir(dir, { recursive: true });
  const dest = path.join(dir, path.basename(targetPath));
  await copyFile(targetPath, dest);
  return dest;
}
