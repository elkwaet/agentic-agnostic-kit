import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export function isAbort(err) {
  return err?.code === "ABORT_ERR" || err?.name === "AbortError";
}

/**
 * Parse une saisie de menu multi-choix ("1,3" / "1 3" / "all" / vide) en
 * tableau d'index 0-based dedupliques, ou null si invalide (index hors
 * limites, aucun token, jeton non numerique). Vide ou "all" (insensible
 * a la casse) selectionne tout - jamais de valeur par defaut differente
 * entre le mode interactif et le mode --yes/non-interactif.
 */
export function parseMultiChoice(answer, choicesLength) {
  const trimmed = answer.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "all") {
    return Array.from({ length: choicesLength }, (_, i) => i);
  }
  const tokens = trimmed.split(/[,\s]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const indexes = tokens.map((t) => Number.parseInt(t, 10) - 1);
  const allValid = indexes.every(
    (idx) => Number.isInteger(idx) && idx >= 0 && idx < choicesLength,
  );
  if (!allValid) return null;
  return [...new Set(indexes)];
}

/**
 * Ctrl+C during an active rl.question() rejects the promise with an
 * AbortError (code ABORT_ERR) instead of the classic SIGINT event - left
 * uncaught, that surfaces as a raw Node stack trace to the user. Treat it
 * as an intentional full-program abort: stop right here, don't keep
 * asking remaining questions (whatever was already applied stays applied,
 * nothing is rolled back).
 */
function abortCleanly(rl) {
  stdout.write("\nAborted (Ctrl+C) — no further changes will be made.\n");
  rl.close();
  process.exit(130);
}

/**
 * Prompts minimalistes sans dependance externe (zero-dep v0.1). Une seule
 * interface readline reutilisee sur toute la duree du wizard.
 */
export function createPrompter() {
  const rl = createInterface({ input: stdin, output: stdout });
  let closed = false;
  rl.on("close", () => {
    closed = true;
  });

  // Si l'entree (pipe, TTY ferme, etc.) se termine avant la fin du wizard,
  // on ne doit jamais planter : chaque confirmation restante est traitee
  // comme "non" (le choix le plus sur, jamais d'ecriture par defaut).
  async function confirm(question, { defaultValue = false } = {}) {
    if (closed) return false;
    const suffix = defaultValue ? "[Y/n]" : "[y/N]";
    try {
      const answer = (await rl.question(`${question} ${suffix} `)).trim().toLowerCase();
      if (answer === "") return defaultValue;
      return answer === "y" || answer === "yes" || answer === "o" || answer === "oui";
    } catch (err) {
      if (isAbort(err)) abortCleanly(rl);
      if (err.code === "ERR_USE_AFTER_CLOSE") return false;
      throw err;
    }
  }

  async function select(question, choices) {
    if (closed) return choices[0]?.value;
    const lines = choices.map((c, i) => `  ${i + 1}) ${c.label}`).join("\n");
    while (true) {
      let answer;
      try {
        answer = (
          await rl.question(`${question}\n${lines}\nChoice [1-${choices.length}]: `)
        ).trim();
      } catch (err) {
        if (isAbort(err)) abortCleanly(rl);
        if (err.code === "ERR_USE_AFTER_CLOSE") return choices[0]?.value;
        throw err;
      }
      const idx = Number.parseInt(answer, 10) - 1;
      if (Number.isInteger(idx) && idx >= 0 && idx < choices.length) {
        return choices[idx].value;
      }
      stdout.write("Invalid choice, try again.\n");
    }
  }

  // Menu multi-choix : saisie "1,3" / "1 3" / "all" / vide (= tout, pour
  // ne jamais bloquer le mode --yes/non-interactif). Redemande sur index
  // hors limites, meme garde closed/abort que select().
  async function selectMultiple(question, choices) {
    if (closed) return choices.map((c) => c.value);
    const lines = choices.map((c, i) => `  ${i + 1}) ${c.label}`).join("\n");
    while (true) {
      let answer;
      try {
        answer = (
          await rl.question(
            `${question}\n${lines}\nChoice(s) [1-${choices.length}, comma/space-separated, or "all"] (default: all): `,
          )
        ).trim();
      } catch (err) {
        if (isAbort(err)) abortCleanly(rl);
        if (err.code === "ERR_USE_AFTER_CLOSE") return choices.map((c) => c.value);
        throw err;
      }
      const parsed = parseMultiChoice(answer, choices.length);
      if (parsed !== null) {
        return parsed.map((idx) => choices[idx].value);
      }
      stdout.write("Invalid choice(s), try again.\n");
    }
  }

  // Retourne null (jamais de valeur inventee) si l'entree est epuisee/fermee
  // ou si l'utilisateur ne saisit rien - l'appelant doit traiter null comme
  // "abandon", jamais comme une valeur par defaut plausible.
  async function promptText(question) {
    if (closed) return null;
    try {
      const answer = (await rl.question(`${question} `)).trim();
      return answer.length > 0 ? answer : null;
    } catch (err) {
      if (isAbort(err)) abortCleanly(rl);
      if (err.code === "ERR_USE_AFTER_CLOSE") return null;
      throw err;
    }
  }

  function close() {
    rl.close();
  }

  return { confirm, select, selectMultiple, promptText, close };
}
