import { spawn } from "node:child_process";

/**
 * Actions Graphify que `init --scope project` peut proposer, dans l'ordre.
 *
 * Fonction pure : ne touche ni au disque ni au PATH, se contente de decrire
 * quoi lancer selon l'etat detecte. L'appelant prompte puis execute.
 *
 * @param {object} state
 * @param {boolean} state.hasCli      binaire `graphify` present sur la machine
 * @param {boolean} state.hasGraph    graphe local `graphify-out/` deja present
 * @param {boolean} state.hasUv       `uv` present (pour installer le CLI)
 * @param {boolean} state.wireOpencode  OpenCode fait partie des agents actifs
 * @returns {Array<{id: string, label: string, cmd: string[], skipUnderYes: boolean}>}
 */
export function planGraphifyActions({ hasCli, hasGraph, hasUv, wireOpencode }) {
  const actions = [];

  if (!hasCli) {
    // Sans binaire : seule action possible, l'installer - et uniquement si uv
    // est la (jamais de fallback pip automatique, cf. prudence toolchain).
    if (hasUv) {
      actions.push({
        id: "install-cli",
        label: "install the Graphify CLI (uv tool install graphifyy)",
        cmd: ["uv", "tool", "install", "graphifyy"],
        skipUnderYes: true,
      });
    }
    return actions;
  }

  // CLI present : cabler OpenCode (idempotent, non destructif) puis, si aucun
  // graphe encore, proposer le build initial AST-only.
  if (wireOpencode) {
    actions.push({
      id: "wire-opencode",
      label: "wire Graphify into OpenCode (graphify install --platform opencode --project)",
      cmd: ["graphify", "install", "--platform", "opencode", "--project"],
      skipUnderYes: false,
    });
  }

  if (!hasGraph) {
    actions.push({
      id: "build",
      label: "build the initial Graphify graph (graphify ., AST-only, no API key)",
      cmd: ["graphify", "."],
      skipUnderYes: true,
    });
  }

  return actions;
}

/**
 * Execute une action Graphify. Fail-open : ne throw jamais, retourne
 * { ok, code } (ou { skipped: true } en dry-run). stdio herite pour que
 * l'utilisateur voie la progression d'un build potentiellement long.
 */
const defaultLogger = {
  run: (t) => console.log(`  running: ${t}`),
  skip: (t) => console.log(`  ${t}`),
};

export function runGraphifyAction(action, { cwd, dryRun = false, logger = defaultLogger } = {}) {
  const printable = action.cmd.join(" ");
  if (dryRun) {
    logger.skip(`would run: ${printable}`);
    return Promise.resolve({ skipped: true });
  }
  logger.run(printable);
  return new Promise((resolve) => {
    const child = spawn(action.cmd[0], action.cmd.slice(1), {
      cwd,
      stdio: "inherit",
    });
    child.on("error", (err) => {
      logger.skip(`${action.id} failed to start: ${err.message}`);
      resolve({ ok: false, code: null });
    });
    child.on("close", (code) => {
      if (code !== 0) logger.skip(`${action.id} exited with code ${code}`);
      resolve({ ok: code === 0, code });
    });
  });
}
