import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { kitStateDir, kitStateFile } from "../paths.js";

const KIT_TAG = "agentic-agnostic-kit";

export function markerBegin(blockId, version = "v1") {
  return `<!-- ${KIT_TAG}:begin:${blockId} ${version} -->`;
}

export function markerEnd(blockId) {
  return `<!-- ${KIT_TAG}:end:${blockId} -->`;
}

/** Enveloppe content dans un bloc marque stable, reperable et remplacable au run suivant. */
export function wrapWithMarker(blockId, content, version = "v1") {
  return `${markerBegin(blockId, version)}\n${content.trim()}\n${markerEnd(blockId)}`;
}

/**
 * Cherche un bloc marque existant dans fileContent.
 * Retourne { before, marked, after, found: true } ou { found: false }.
 */
export function extractMarkedBlock(fileContent, blockId) {
  const beginRe = new RegExp(
    `<!--\\s*${KIT_TAG}:begin:${blockId}[^>]*-->`,
  );
  const endRe = new RegExp(`<!--\\s*${KIT_TAG}:end:${blockId}\\s*-->`);
  const beginMatch = beginRe.exec(fileContent);
  const endMatch = endRe.exec(fileContent);
  if (!beginMatch || !endMatch || endMatch.index < beginMatch.index) {
    return { found: false };
  }
  const before = fileContent.slice(0, beginMatch.index);
  const marked = fileContent.slice(
    beginMatch.index,
    endMatch.index + endMatch[0].length,
  );
  const after = fileContent.slice(endMatch.index + endMatch[0].length);
  return { found: true, before, marked, after };
}

/**
 * Retire le bloc marque blockId de fileContent, garde tout le reste
 * (residu utilisateur avant/apres) recombine proprement. Utilise par
 * `uninstall` pour retirer le pointeur pose par le kit sans jamais toucher
 * au contenu residuel (ex: bloc "Qwen Added Memories" sous le stub).
 *
 * Retourne { found: false } si aucun bloc blockId n'existe dans le
 * fichier (rien a faire - deja retire ou jamais gere par le kit).
 * Retourne { found: true, residual } sinon ; residual === "" signifie que
 * le fichier ne contenait que le bloc du kit et peut etre supprime.
 */
export function removeMarkedBlock(fileContent, blockId) {
  const extracted = extractMarkedBlock(fileContent, blockId);
  if (!extracted.found) {
    return { found: false };
  }
  const before = extracted.before.trim();
  const after = extracted.after.trim();
  const residual = [before, after].filter(Boolean).join("\n\n");
  return { found: true, residual };
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

async function readState() {
  try {
    const raw = await readFile(kitStateFile(), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeState(state) {
  await mkdir(kitStateDir(), { recursive: true });
  await writeFile(kitStateFile(), JSON.stringify(state, null, 2) + "\n", "utf8");
}

/**
 * Determine l'ownership d'un fichier cible :
 * - "absent"     : le fichier n'existe pas encore
 * - "kit-owned"  : hash actuel == derniere ecriture connue du kit (rien touche depuis)
 * - "mixed"      : fichier existant, une ecriture kit anterieure connue, mais hash different
 *                  (modifie par l'utilisateur ou un autre outil depuis)
 * - "user-owned" : fichier existant, aucune ecriture kit connue pour ce chemin
 */
export async function computeOwnership(targetPath) {
  let currentContent;
  try {
    currentContent = await readFile(targetPath, "utf8");
  } catch {
    return { ownership: "absent", currentContent: null };
  }

  const state = await readState();
  const known = state[path.resolve(targetPath)];
  if (!known) {
    return { ownership: "user-owned", currentContent };
  }
  const currentHash = sha256(currentContent);
  if (currentHash === known.sha256) {
    return { ownership: "kit-owned", currentContent };
  }
  return { ownership: "mixed", currentContent };
}

/** A appeler juste apres une ecriture reussie, pour que le run suivant reconnaisse ce contenu. */
export async function recordWrite(targetPath, writtenContent) {
  const state = await readState();
  state[path.resolve(targetPath)] = {
    sha256: sha256(writtenContent),
    writtenAt: new Date().toISOString(),
  };
  await writeState(state);
}
