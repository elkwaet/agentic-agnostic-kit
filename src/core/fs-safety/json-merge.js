/**
 * Merge JSON sur mesure, jamais generique/aveugle : chaque type de cle
 * connue a sa propre strategie explicite. Toute cle non reconnue par le
 * kit n'est jamais touchee (on part d'un clone profond de l'existant, on
 * ne fait qu'ajouter/modifier ce qui est explicitement vise).
 *
 * Regle issue d'un bug reel (ADR-0005, agentic-bootstrap) : une cle
 * "plugin" dupliquee 3x dans un fichier JSON edite a la main a fait que
 * seule la derniere occurrence survivait (JSON.parse ne garde que la
 * derniere cle dupliquee). Consequence pour ce module : on merge toujours
 * sur l'objet deja parse (un seul "hooks"/"plugin"/etc par definition),
 * jamais par concatenation de texte brut.
 */

function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/**
 * Strategie "replace-matcher" pour hooks.SessionStart (Claude Code /
 * Gemini CLI / Qwen-code). Cherche une entree existante avec le meme
 * matcher :
 * - absente -> l'ajoute, changed=true, warning=null
 * - presente et pointe deja vers hookSpec.command -> rien a faire,
 *   changed=false (idempotent)
 * - presente et pointe vers autre chose -> ne modifie PAS l'objet
 *   retourne par defaut ; signale un warning, laisse l'appelant decider
 *   (le wizard doit demander confirmation explicite avant d'ecraser)
 *
 * hookSpec: { matcher, command, timeout }
 */
export function planSessionStartMerge(existingConfig, hookSpec) {
  const config = deepClone(existingConfig) ?? {};
  config.hooks = config.hooks ?? {};
  const sessionStart = Array.isArray(config.hooks.SessionStart)
    ? config.hooks.SessionStart
    : [];

  const idx = sessionStart.findIndex((entry) => entry.matcher === hookSpec.matcher);
  const desiredHook = {
    type: "command",
    command: hookSpec.command,
    ...(hookSpec.timeout != null ? { timeout: hookSpec.timeout } : {}),
  };

  if (idx === -1) {
    sessionStart.push({ matcher: hookSpec.matcher, hooks: [desiredHook] });
    config.hooks.SessionStart = sessionStart;
    return { config, changed: true, warning: null };
  }

  const existingHooks = Array.isArray(sessionStart[idx].hooks) ? sessionStart[idx].hooks : [];
  const alreadyThere = existingHooks.some((h) => h.command === hookSpec.command);
  if (alreadyThere) {
    return { config: deepClone(existingConfig), changed: false, warning: null };
  }

  const pointsElsewhere = existingHooks.length > 0;
  return {
    config: deepClone(existingConfig), // ne pas modifier tant que non confirme
    changed: false,
    warning: pointsElsewhere
      ? `A SessionStart hook already exists for matcher "${hookSpec.matcher}" and points elsewhere (${existingHooks.map((h) => h.command).join(", ")}). Explicit confirmation is required to replace it.`
      : null,
    pendingReplace: pointsElsewhere
      ? () => {
          const forced = deepClone(existingConfig) ?? {};
          forced.hooks = forced.hooks ?? {};
          const list = Array.isArray(forced.hooks.SessionStart) ? forced.hooks.SessionStart : [];
          list[idx] = { matcher: hookSpec.matcher, hooks: [desiredHook] };
          forced.hooks.SessionStart = list;
          return forced;
        }
      : null,
  };
}

/**
 * Retire l'entree hooks.SessionStart posee par ce kit (celle dont un
 * hooks[].command === hookCommand), et uniquement celle-la. Ne touche a
 * aucune autre entree/matcher/cle (meme contrainte que
 * planSessionStartMerge, ADR-0005). Nettoie les structures vides en
 * cascade (hooks[] vide -> retire l'entree matcher ; SessionStart[] vide
 * -> retire la cle ; hooks{} vide -> retire la cle).
 *
 * Retourne { config, changed }. changed=false si aucune entree ne
 * correspondait a hookCommand (rien a proposer, deja "desinstalle").
 */
export function planSessionStartRemoval(existingConfig, hookCommand) {
  const config = deepClone(existingConfig) ?? {};
  const sessionStart = Array.isArray(config.hooks?.SessionStart)
    ? config.hooks.SessionStart
    : [];

  let changed = false;
  const nextSessionStart = sessionStart
    .map((entry) => {
      const hooks = Array.isArray(entry.hooks) ? entry.hooks : [];
      const filtered = hooks.filter((h) => h.command !== hookCommand);
      if (filtered.length !== hooks.length) changed = true;
      return { ...entry, hooks: filtered };
    })
    .filter((entry) => entry.hooks.length > 0);

  if (!changed) {
    return { config: deepClone(existingConfig), changed: false };
  }

  if (nextSessionStart.length > 0) {
    config.hooks.SessionStart = nextSessionStart;
  } else {
    delete config.hooks.SessionStart;
  }
  if (config.hooks && Object.keys(config.hooks).length === 0) {
    delete config.hooks;
  }

  return { config, changed: true };
}

export function serializeJson(obj) {
  return JSON.stringify(obj, null, 2) + "\n";
}
