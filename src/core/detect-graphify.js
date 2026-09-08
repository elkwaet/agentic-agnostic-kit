import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

/**
 * Verifie si le binaire `graphify` est disponible sur la machine.
 */
export async function detectGraphifyCli() {
  try {
    await execFileAsync("which", ["graphify"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifie si `uv` (installeur d'outils Python) est disponible sur la machine.
 * Sert a proposer `uv tool install graphifyy` quand le binaire graphify manque.
 */
export async function detectUv() {
  try {
    await execFileAsync("which", ["uv"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifie si un graphe de connaissances graphify existe dans le projet (<cwd>/graphify-out/).
 */
export async function hasProjectGraph(cwd) {
  try {
    const reportPath = path.join(cwd, "graphify-out", "GRAPH_REPORT.md");
    const jsonPath = path.join(cwd, "graphify-out", "graph.json");

    const reportExists = await access(reportPath, fsConstants.F_OK)
      .then(() => true)
      .catch(() => false);

    const jsonExists = await access(jsonPath, fsConstants.F_OK)
      .then(() => true)
      .catch(() => false);

    return reportExists || jsonExists;
  } catch {
    return false;
  }
}
