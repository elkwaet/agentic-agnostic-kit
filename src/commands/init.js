import { chmod, access, readdir, lstat, rename, symlink, mkdir, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
const agentsMeta = JSON.parse(readFileSync(new URL("../constants/agents.json", import.meta.url), "utf-8"));
import { expandHome, kitStateDir } from "../core/paths.js";
import { detectAllAgents } from "../core/detect-agents.js";
import { computeOwnership } from "../core/fs-safety/ownership-marker.js";
import { planFileOp, applyFileOp } from "../core/fs-safety/file-op.js";
import { renderGlobalContract } from "../core/contract/render-global.js";
import { renderStub } from "../core/contract/render-stub.js";
import { renderHookScript } from "../core/contract/render-hook-script.js";
import { renderProjectHookScript } from "../core/contract/render-hook-script-project.js";
import { renderProjectContract } from "../core/contract/render-project-contract.js";
import { renderProjectStub } from "../core/contract/render-stub.js";
import { renderSkillScaffold } from "../core/contract/render-skill-scaffold.js";
import { renderArchivesReadme } from "../core/contract/render-archives-readme.js";
import { renderAdrsReadme } from "../core/contract/render-adrs-readme.js";
import { renderBacklog } from "../core/contract/render-backlog.js";
import { detectGraphifyCli, detectUv, hasProjectGraph } from "../core/detect-graphify.js";
import { planGraphifyActions, runGraphifyAction } from "../core/graphify-actions.js";
import { detectHookTools, missingHookTools } from "../core/detect-hook-tools.js";
import {
  planNativeHookMerge,
  planForcedReplace,
} from "../core/contract/plan-native-hook-merge.js";
import { createPrompter } from "../core/wizard/prompts.js";
import { formatFileOpPreview, formatSummary } from "../core/wizard/preview.js";
import {
  banner,
  beginWizard,
  step,
  sectionTitle,
  ok,
  warn,
  note,
  skip,
  run,
  relPath,
} from "../core/wizard/ui.js";

/**
 * Averti (jamais bloquant) si bash/awk/jq manquent sur le PATH avant de
 * proposer le hook SessionStart - sans ca, le hook echoue silencieusement
 * a chaque demarrage de session plutot qu'a l'installation, ou l'erreur
 * est visible et actionnable.
 */
// Gestion Graphify en scope Projet : propose (opt-in) le cablage OpenCode, le
// build initial du graphe et, si le binaire manque, son installation via uv.
// Fail-open : aucune erreur ici n'interrompt `init`.
async function manageProjectGraphify({ cwd, prompter, dryRun, yes, hasGraph, wireOpencode }) {
  let hasCli = await detectGraphifyCli();
  const hasUv = hasCli ? false : await detectUv();

  if (!hasCli && !hasUv) {
    console.log(note("Graphify CLI not found, and `uv` isn't available to install it."));
    console.log(note("Install `uv tool install graphifyy` (or `pip install graphifyy --user`),"));
    console.log(note("then re-run init — the graph build is AST-only, free, no API key."));
    return;
  }

  const prompts = {
    "install-cli": {
      q: "Graphify CLI not found — install it now with `uv tool install graphifyy`?",
      defaultValue: false,
    },
    "wire-opencode": {
      q: "Wire Graphify into OpenCode for this project (graphify install --platform opencode --project)?",
      defaultValue: true,
    },
    build: {
      q: "Build the initial Graphify graph now (graphify ., AST-only, no API key)?",
      defaultValue: true,
    },
  };

  const done = new Set();
  // Boucle : apres une install-cli reussie, de nouvelles actions (wire/build)
  // deviennent eligibles et sont proposees a leur tour.
  for (let pass = 0; pass < 3; pass++) {
    const actions = planGraphifyActions({ hasCli, hasGraph, hasUv, wireOpencode }).filter(
      (a) => !done.has(a.id),
    );
    if (actions.length === 0) break;

    for (const action of actions) {
      done.add(action.id);
      if (yes && action.skipUnderYes) {
        console.log(skip(`skipped under --yes — to ${action.label}, run it yourself`));
        continue;
      }
      const p = prompts[action.id];
      const confirmed = yes
        ? true
        : await prompter.confirm(`\n${p.q}`, { defaultValue: p.defaultValue });
      if (!confirmed) {
        console.log(skip(action.label));
        continue;
      }
      const res = await runGraphifyAction(action, { cwd, dryRun, logger: { run, skip } });
      if (action.id === "wire-opencode" && res.ok && !dryRun) {
        try {
          const opencodeSkillPath = path.join(cwd, ".opencode", "skills", "graphify");
          const agentsSkillDir = path.join(cwd, ".agents", "skills");
          const agentsSkillPath = path.join(agentsSkillDir, "graphify");
          const agentsSkillBakPath = path.join(agentsSkillDir, "graphify-bak");

          const stat = await lstat(opencodeSkillPath).catch(() => null);
          if (stat && stat.isDirectory() && !stat.isSymbolicLink()) {
            await mkdir(agentsSkillDir, { recursive: true });

            const agentsStat = await lstat(agentsSkillPath).catch(() => null);
            if (agentsStat) {
              const bakStat = await lstat(agentsSkillBakPath).catch(() => null);
              if (bakStat) {
                await rm(agentsSkillBakPath, { recursive: true, force: true });
              }
              await rename(agentsSkillPath, agentsSkillBakPath);
            }

            await rename(opencodeSkillPath, agentsSkillPath);
            await symlink("../../.agents/skills/graphify", opencodeSkillPath, "junction");

            console.log(note("Graphify skill centralized to .agents/skills/graphify and symlinked for OpenCode"));
          }
        } catch (err) {
          console.log(warn(`Failed to centralize Graphify skill: ${err.message}`));
        }
      }
      if (action.id === "install-cli" && res.ok && !dryRun) {
        hasCli = await detectGraphifyCli();
      }
      if (action.id === "build" && res.ok && !dryRun) {
        console.log(
          note("graphify-out/ is now present — version it or .gitignore it depending on repo privacy"),
        );
      }
    }
  }
}

async function selectHookEngine(prompter, yes) {
  const detected = await detectHookTools();
  const missing = missingHookTools(detected);
  
  if (missing.length > 0) {
    console.log(
      warn(
        `Missing on PATH: ${missing.join(", ")}. The Bash hook requires them.`
      )
    );
    console.log(note("Defaulting to Node.js engine for the SessionStart hook (100% portable)."));
    return "node";
  }

  if (yes) {
    return "bash";
  }

  const choices = [
    { label: "Bash (Recommended: ultra-fast ~5ms, uses local jq/awk)", value: "bash" },
    { label: "Node.js (Portable: universal, slightly slower ~40ms)", value: "node" }
  ];
  const engine = await prompter.select("Which engine to use for the SessionStart hook?", choices, "bash");
  return engine;
}

// v0.1 : agents a hook natif uniquement. OpenCode reporte en v0.2
// (mecanisme different, fiabilite comportementale partielle - ADR-0007,
// l'inclure ici donnerait un faux sentiment de "resolu"). gemini-cli
// retire du kit (ADR-0012 : arret officiel confirme + refus d'auth en
// usage reel) - conserve uniquement dans agents.json pour permettre a
// `uninstall` de nettoyer les installations anterieures.
const V01_AGENT_IDS = ["claude-code", "qwen-code"];

// v0.2 scope Projet : uniquement les agents dont la precedence
// project>Home est verifiee (ADR-0006). qwen-code exclu -
// agents.json documente sa precedence comme "unknown-not-tested".
const PROJECT_AGENT_IDS = ["claude-code"];

// Agents dont l'injection ne passe QUE par un stub - pas de hook natif,
// pas de config JSON a merger (ADR-0010 : OpenCode charge nativement
// AGENTS.md, cumule local+global, aucune precedence a arbitrer). agy
// (Antigravity CLI) ajoute ici pour la meme raison (ADR-0012) : lecture
// native de GEMINI.md confirmee, aucun mecanisme de hook confirme
// fonctionnel a ce jour. Scope Home uniquement pour agy (pas d'entree
// "project" dans agents.json) - cf. STUB_ONLY_PROJECT_AGENT_IDS.
const STUB_ONLY_AGENT_IDS = ["opencode", "agy", "cursor", "windsurf", "cline", "copilot"];

// Sous-ensemble de STUB_ONLY_AGENT_IDS avec precedence project/Home
// verifiee. agy est desormais inclus au scope Projet.
const STUB_ONLY_PROJECT_AGENT_IDS = ["opencode", "agy", "cursor", "windsurf", "cline", "copilot"];

function agentDisplayLabel(agentMeta) {
  return agentMeta.deprecatedSince
    ? `${agentMeta.label} (deprecated since ${agentMeta.deprecatedSince})`
    : agentMeta.label;
}

/**
 * Filtre activeAgents/activeStubOnly selon --agent (non-interactif) ou un
 * menu multi-choix interactif (menu saute si 0/1 candidat detecte, ou si
 * --yes est passe - jamais de nouvelle question en mode non-interactif).
 * meta/stubOnlyMeta : dictionnaires id -> agentMeta pour le libelle affiche.
 */
export async function selectAgentSubset({
  activeAgents,
  activeStubOnly,
  prompter,
  yes,
  agentFilter,
  meta,
  stubOnlyMeta,
}) {
  const allCandidates = [...activeAgents, ...activeStubOnly];

  if (agentFilter) {
    const detectedIds = new Set(allCandidates.map((d) => d.id));
    const unknown = agentFilter.filter((id) => !detectedIds.has(id));
    if (unknown.length > 0) {
      throw new Error(
        `Unknown or undetected agent id(s) for --agent: ${unknown.join(", ")}. ` +
          `Detected: ${[...detectedIds].join(", ") || "none"}.`,
      );
    }
    const chosen = new Set(agentFilter);
    return {
      activeAgents: activeAgents.filter((d) => chosen.has(d.id)),
      activeStubOnly: activeStubOnly.filter((d) => chosen.has(d.id)),
    };
  }

  if (allCandidates.length <= 1 || yes) {
    return { activeAgents, activeStubOnly };
  }

  const choices = allCandidates.map((d) => {
    const agentMeta = meta[d.id] ?? stubOnlyMeta[d.id];
    return { label: agentDisplayLabel(agentMeta), value: d.id };
  });
  const selected = await prompter.selectMultiple(
    "\nWhich agent(s) do you want to configure?",
    choices,
  );
  const chosen = new Set(selected);
  return {
    activeAgents: activeAgents.filter((d) => chosen.has(d.id)),
    activeStubOnly: activeStubOnly.filter((d) => chosen.has(d.id)),
  };
}

const KEBAB_CASE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Redemande tant que la reponse n'est pas du kebab-case valide (lettres
 * minuscules/chiffres separes par des tirets simples) - un nom mal
 * forme casserait le chemin de fichier genere
 * (.agents/skills/<nom>/SKILL.md). Reponse vide/entree fermee = abandon
 * (comportement de promptText inchange).
 */
async function promptSkillName(prompter) {
  while (true) {
    const answer = await prompter.promptText(
      "Skill name, lowercase-with-dashes (e.g. my-onboarding-guide):",
    );
    if (!answer) return null;
    if (KEBAB_CASE_RE.test(answer)) return answer;
    console.log(
      `"${answer}" isn't lowercase-with-dashes (letters/digits only, single dashes ` +
        "between words, no spaces or uppercase). Try again, or leave empty to cancel.",
    );
  }
}

async function dirExists(p) {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Agent stub-only (OpenCode) : uniquement le stub (Home ou Projet), jamais
 * de hook/config JSON - ADR-0010. Reutilise en scope Home et Projet.
 */
async function applyStubOnlyAgent({
  agentMeta,
  isProject,
  cwd,
  prompter,
  applied,
  dryRun,
  yes,
  verbose,
}) {
  console.log(sectionTitle(`${agentDisplayLabel(agentMeta)}${isProject ? " (project scope)" : ""}`));

  const stubPath = isProject
    ? path.join(cwd, agentMeta.project.contractStubProject)
    : expandHome(agentMeta.contractStubHome);
  const stubOwnership = await computeOwnership(stubPath);
  const proposedStub = isProject
    ? await renderProjectStub(agentMeta.id, stubOwnership.currentContent)
    : await renderStub(agentMeta.id, stubOwnership.currentContent);
  const stubFileOp = await planFileOp({
    targetPath: stubPath,
    proposedContent: proposedStub,
    kind: stubOwnership.ownership === "absent" ? "create" : "update-replace-section",
  });
  const stubResult = await confirmAndApply(prompter, stubFileOp, {
    dryRun,
    yes,
    verbose,
    scope: isProject ? "project" : "home",
    label: `stub ${agentMeta.label}`,
    cwd: isProject ? cwd : process.cwd(),
  });
  applied.push(stubResult);
}

async function confirmAndApply(prompter, fileOp, { dryRun, yes, verbose, scope, label, cwd = null }) {
  console.log(formatFileOpPreview(fileOp, { verbose, cwd }));
  if (fileOp.ownership === "kit-owned" && fileOp.diffPreview.includes("no textual difference")) {
    return { applied: false, dryRun, targetPath: fileOp.targetPath };
  }
  const proceed = yes || (await prompter.confirm(`Apply this change? (${label})`));
  if (!proceed) {
    console.log(skip("change not applied"));
    return { applied: false, skipped: true, dryRun, targetPath: fileOp.targetPath };
  }
  return applyFileOp(fileOp, { dryRun, scope });
}

/**
 * Cree targetPath si absent (via renderContent, sans argument), sinon log
 * "deja present" - pattern partage par les blocs create-if-absent simples
 * (kind toujours "create" cote absent).
 */
async function createIfAbsentOrLog({
  targetPath,
  renderContent,
  applied,
  prompter,
  dryRun,
  yes,
  verbose,
  scope,
  label,
  presentLabel,
  cwd = null,
}) {
  const ownership = await computeOwnership(targetPath);
  if (ownership.ownership === "absent") {
    const proposed = await renderContent();
    const fileOp = await planFileOp({ targetPath, proposedContent: proposed, kind: "create" });
    const result = await confirmAndApply(prompter, fileOp, {
      dryRun,
      yes,
      verbose,
      scope,
      label,
      cwd,
    });
    applied.push(result);
  } else {
    console.log(note(`${presentLabel} already present (${relPath(cwd, targetPath)}) — left untouched`));
  }
}

export async function runInit({
  scope = "home",
  dryRun = false,
  yes = false,
  verbose = false,
  agentFilter = null,
} = {}) {
  if (scope === "project") {
    return runInitProject({ dryRun, yes, verbose, agentFilter });
  }

  const prompter = createPrompter();
  const applied = [];
  const cwd = process.cwd();

  try {
    console.log(banner("agentic-agnostic · init", ["scope: home"]));
    beginWizard(4);

    console.log(step("Agents"));
    const v01Meta = Object.fromEntries(
      V01_AGENT_IDS.map((id) => [id, agentsMeta[id]]),
    );
    const detections = await detectAllAgents(v01Meta);

    const stubOnlyMeta = Object.fromEntries(
      STUB_ONLY_AGENT_IDS.map((id) => [id, agentsMeta[id]]),
    );
    const stubOnlyDetections = await detectAllAgents(stubOnlyMeta);

    for (const d of [...detections, ...stubOnlyDetections]) {
      const meta = v01Meta[d.id] ?? stubOnlyMeta[d.id];
      const label = agentDisplayLabel(meta);
      console.log(d.installed ? ok(label) : skip(`${label} — not detected`));
    }

    let activeAgents = detections.filter((d) => d.installed);
    let activeStubOnly = stubOnlyDetections.filter((d) => d.installed);
    if (activeAgents.length === 0 && activeStubOnly.length === 0) {
      console.log("\nNo supported agent detected on this machine. Nothing to do.");
      return;
    }

    ({ activeAgents, activeStubOnly } = await selectAgentSubset({
      activeAgents,
      activeStubOnly,
      prompter,
      yes,
      agentFilter,
      meta: v01Meta,
      stubOnlyMeta,
    }));
    if (activeAgents.length === 0 && activeStubOnly.length === 0) {
      console.log("\nNo agent selected. Nothing to do.");
      return;
    }

    // --- Contrat global -----------------------------------------------
    console.log(step("Contrat global"));
    const globalContractPath = expandHome("~/.agents/AGENTS.md");
    await createIfAbsentOrLog({
      targetPath: globalContractPath,
      renderContent: renderGlobalContract,
      applied,
      prompter,
      dryRun,
      yes,
      verbose,
      scope: "home",
      label: "global contract ~/.agents/AGENTS.md",
      presentLabel: "Global contract",
      cwd,
    });

    // --- Script hook partage (uniquement si un agent a hook natif actif) --
    console.log(step("Câblage par agent"));
    if (activeAgents.length > 0) {
      const engine = await selectHookEngine(prompter, yes);
      const ext = engine === "node" ? "js" : "sh";
      const hookScriptPath = expandHome(`~/.agents/hooks/session-start-contract.${ext}`);
      const hookProposed = await renderHookScript(engine);
      const hookFileOp = await planFileOp({
        targetPath: hookScriptPath,
        proposedContent: hookProposed,
        kind: "create", // corrige juste apres selon l'ownership reel detecte
      });
      hookFileOp.kind = hookFileOp.ownership === "absent" ? "create" : "update-replace-section";
      const hookResult = await confirmAndApply(prompter, hookFileOp, {
        dryRun,
        yes,
        verbose,
        scope: "home",
        label: "shared hook script",
        cwd,
      });
      applied.push(hookResult);
      if (hookResult.applied && !dryRun) {
        await chmod(hookScriptPath, 0o755);
      }

      // --- Par agent detecte -----------------------------------------------
      for (const detection of activeAgents) {
        const agentMeta = v01Meta[detection.id];
        console.log(sectionTitle(agentMeta.label));

        const stubPath = expandHome(agentMeta.contractStubHome);
        const stubOwnership = await computeOwnership(stubPath);
        const proposedStub = await renderStub(agentMeta.id, stubOwnership.currentContent);
        const stubFileOp = await planFileOp({
          targetPath: stubPath,
          proposedContent: proposedStub,
          kind: stubOwnership.ownership === "absent" ? "create" : "update-replace-section",
        });
        const stubResult = await confirmAndApply(prompter, stubFileOp, {
          dryRun,
          yes,
          verbose,
          scope: "home",
          label: `stub ${agentMeta.label}`,
          cwd,
        });
        applied.push(stubResult);

        const resolvedAgentMeta = {
          ...agentMeta,
          configFileHomeResolved: expandHome(agentMeta.configFileHome),
        };
        const hookMerge = await planNativeHookMerge(
          resolvedAgentMeta,
          hookScriptPath,
          resolvedAgentMeta.configFileHomeResolved,
        );

        if (hookMerge.alreadyConfigured) {
          console.log(ok(`SessionStart hook already configured for ${agentMeta.label}`));
          continue;
        }

        if (hookMerge.warning) {
          console.log(warn(`${agentMeta.label} — ${hookMerge.warning}`));
          const forceOk = yes || (await prompter.confirm("Replace it anyway?"));
          if (forceOk) {
            const forcedFileOp = await planForcedReplace(
              resolvedAgentMeta,
              hookMerge.pendingReplace,
              resolvedAgentMeta.configFileHomeResolved,
            );
            const forcedResult = await confirmAndApply(prompter, forcedFileOp, {
              dryRun,
              yes: true, // deja confirme ci-dessus
              verbose,
              scope: "home",
              label: `hooks.SessionStart ${agentMeta.label} (forced replace)`,
              cwd,
            });
            applied.push(forcedResult);
          } else {
            console.log(skip("existing hook left as-is"));
          }
          continue;
        }

        if (hookMerge.fileOp) {
          const result = await confirmAndApply(prompter, hookMerge.fileOp, {
            dryRun,
            yes,
            verbose,
            scope: "home",
            label: `hooks.SessionStart ${agentMeta.label}`,
            cwd,
          });
          applied.push(result);
        }
      }
    }

    // --- Agents stub-only (OpenCode) : pas de hook, juste le stub natif --
    console.log(step("Stubs natifs"));
    for (const detection of activeStubOnly) {
      await applyStubOnlyAgent({
        agentMeta: stubOnlyMeta[detection.id],
        isProject: false,
        cwd: null,
        prompter,
        applied,
        dryRun,
        yes,
        verbose,
      });
    }

    const nextSteps = [];
    if (!dryRun) nextSteps.push("restart your agent session so the contract loads");
    nextSteps.push(`kit state & backups: ${relPath(cwd, kitStateDir())}`);
    console.log(formatSummary(applied, { cwd, nextSteps }));
  } finally {
    prompter.close();
  }
}

async function hasExistingSkill(skillsDir) {
  if (!(await dirExists(skillsDir))) return false;
  const entries = await readdir(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await dirExists(path.join(skillsDir, entry.name, "SKILL.md"))) {
      return true;
    }
  }
  return false;
}

export async function runInitProject({
  dryRun = false,
  yes = false,
  verbose = false,
  agentFilter = null,
} = {}) {
  const prompter = createPrompter();
  const applied = [];
  const cwd = process.cwd();

  try {
    console.log(
      banner("agentic-agnostic · init", ["scope: project", `cwd: ${relPath(null, cwd)}`]),
    );
    console.log(note("processes ONE project (the current directory) per run — rerun elsewhere anytime"));
    beginWizard(6);

    // --- Garde-fou Home absent (decision 4) ---------------------------
    const globalContractPath = expandHome("~/.agents/AGENTS.md");
    let globalOwnership = await computeOwnership(globalContractPath);
    if (globalOwnership.ownership === "absent") {
      console.log(
        warn(
          `Global contract absent (${relPath(cwd, globalContractPath)}) — Project scope relays it, ` +
            "so it's required first.",
        ),
      );
      const chainHome = yes || (await prompter.confirm("Run the Home wizard now?"));
      if (!chainHome) {
        console.log(skip("Project scope aborted — the global contract is required first"));
        return;
      }
      await runInit({ scope: "home", dryRun, yes, verbose });
      globalOwnership = await computeOwnership(globalContractPath);
      if (globalOwnership.ownership === "absent") {
        console.log(skip("global contract still absent (dry-run or declined) — Project scope stopped"));
        return;
      }
      beginWizard(6);
    }

    console.log(step("Agents & outils"));
    // --- Detection agents (precedence project>Home verifiee uniquement) --
    const projectMeta = Object.fromEntries(
      PROJECT_AGENT_IDS.map((id) => [id, agentsMeta[id]]),
    );
    const detections = await detectAllAgents(projectMeta);

    const stubOnlyMeta = Object.fromEntries(
      STUB_ONLY_PROJECT_AGENT_IDS.map((id) => [id, agentsMeta[id]]),
    );
    const stubOnlyDetections = await detectAllAgents(stubOnlyMeta);

    for (const d of [...detections, ...stubOnlyDetections]) {
      const meta = projectMeta[d.id] ?? stubOnlyMeta[d.id];
      const label = agentDisplayLabel(meta);
      console.log(d.installed ? ok(label) : skip(`${label} — not detected`));
    }
    console.log(note("qwen-code is out of the v0.2 Project scope"));

    const hasGraphifyCli = await detectGraphifyCli();
    const hasGraph = await hasProjectGraph(cwd);
    console.log(
      hasGraphifyCli
        ? ok(`Graphify CLI (${hasGraph ? "local graph present" : "no local graph yet"})`)
        : skip("Graphify CLI — not detected"),
    );

    let activeAgents = detections.filter((d) => d.installed);
    let activeStubOnly = stubOnlyDetections.filter((d) => d.installed);
    if (activeAgents.length === 0 && activeStubOnly.length === 0) {
      console.log(skip("no supported Project-scope agent on this machine — nothing to do"));
      return;
    }

    ({ activeAgents, activeStubOnly } = await selectAgentSubset({
      activeAgents,
      activeStubOnly,
      prompter,
      yes,
      agentFilter,
      meta: projectMeta,
      stubOnlyMeta,
    }));
    if (activeAgents.length === 0 && activeStubOnly.length === 0) {
      console.log(skip("no agent selected — nothing to do"));
      return;
    }

    // --- Contrat projet local (decision 1 : cwd uniquement) -------------
    console.log(step("Contrat projet"));
    const projectContractPath = path.join(cwd, ".agents", "AGENTS.md");
    await createIfAbsentOrLog({
      targetPath: projectContractPath,
      renderContent: renderProjectContract,
      applied,
      prompter,
      dryRun,
      yes,
      verbose,
      scope: "project",
      label: "project contract .agents/AGENTS.md",
      presentLabel: "Project contract",
      cwd,
    });

    // --- Scaffolds de contenu (ARCHIVES_R, Backlog, ADRs) ---------------
    console.log(step("Scaffolds de contenu"));
    const archivesReadmePath = path.join(cwd, "ARCHIVES_R", "README.md");
    await createIfAbsentOrLog({
      targetPath: archivesReadmePath,
      renderContent: renderArchivesReadme,
      applied,
      prompter,
      dryRun,
      yes,
      verbose,
      scope: "project",
      label: "ARCHIVES_R/README.md directory",
      presentLabel: "ARCHIVES_R/README.md directory",
      cwd,
    });

    // --- Backlog projet ---------------------------------------------------
    const backlogPath = path.join(cwd, "Backlog.md");
    await createIfAbsentOrLog({
      targetPath: backlogPath,
      renderContent: renderBacklog,
      applied,
      prompter,
      dryRun,
      yes,
      verbose,
      scope: "project",
      label: "Backlog.md",
      presentLabel: "Backlog.md",
      cwd,
    });

    // --- Repertoire ADRs ------------------------------------------------
    // Emplacement flexible : racine <cwd>/ADRs/ (defaut, coherent avec
    // ARCHIVES_R/ et Backlog.md) ou <cwd>/.agents/ADRs/. On ne pose la
    // question que si aucun des deux emplacements n'a deja un README.md.
    const adrRootReadme = path.join(cwd, "ADRs", "README.md");
    const adrAgentsReadme = path.join(cwd, ".agents", "ADRs", "README.md");
    if ((await dirExists(adrRootReadme)) || (await dirExists(adrAgentsReadme))) {
      console.log(note("ADRs directory already present — left untouched"));
    } else {
      const adrDir = yes
        ? "ADRs"
        : await prompter.select("Where should the ADRs/ directory live?", [
            { label: "ADRs/ (project root)", value: "ADRs" },
            { label: ".agents/ADRs/", value: path.join(".agents", "ADRs") },
          ]);
      const adrReadmePath = path.join(cwd, adrDir, "README.md");
      await createIfAbsentOrLog({
        targetPath: adrReadmePath,
        renderContent: renderAdrsReadme,
        applied,
        prompter,
        dryRun,
        yes,
        verbose,
        scope: "project",
        label: "ADRs/README.md directory",
        presentLabel: "ADRs/README.md directory",
        cwd,
      });
    }

    // --- Skill produit optionnel (decision 3) ----------------------------
    console.log(step("Skill produit"));
    const skillsDir = path.join(cwd, ".agents", "skills");
    if (await hasExistingSkill(skillsDir)) {
      console.log(note(`product skill(s) already present under ${relPath(cwd, skillsDir)} — left untouched`));
    } else {
      const wantsSkill =
        !yes &&
        (await prompter.confirm(
          "No product skill detected under .agents/skills — create an empty scaffold?",
          { defaultValue: false },
        ));
      if (wantsSkill) {
        const skillName = await promptSkillName(prompter);
        if (skillName) {
          const proposed = await renderSkillScaffold(skillName);
          const skillPath = path.join(skillsDir, skillName, "SKILL.md");
          const fileOp = await planFileOp({
            targetPath: skillPath,
            proposedContent: proposed,
            kind: "create",
          });
          const result = await confirmAndApply(prompter, fileOp, {
            dryRun,
            yes,
            verbose,
            scope: "project",
            label: `skill scaffold ${skillName}`,
            cwd,
          });
          applied.push(result);
        } else {
          console.log(skip("no skill name provided — scaffold skipped"));
        }
      }
    }

    // --- Script hook projet (uniquement si claude-code actif) ---
    console.log(step("Câblage par agent"));
    if (activeAgents.length > 0) {
      const engine = await selectHookEngine(prompter, yes);
      const ext = engine === "node" ? "js" : "sh";
      const hookScriptPath = path.join(cwd, ".agents", "hooks", `session-start-contract.${ext}`);
      const hookProposed = await renderProjectHookScript(engine);
      const hookFileOp = await planFileOp({
        targetPath: hookScriptPath,
        proposedContent: hookProposed,
        kind: "create", // corrige juste apres selon l'ownership reel detecte
      });
      hookFileOp.kind = hookFileOp.ownership === "absent" ? "create" : "update-replace-section";
      const hookResult = await confirmAndApply(prompter, hookFileOp, {
        dryRun,
        yes,
        verbose,
        scope: "project",
        label: "project hook script",
        cwd,
      });
      applied.push(hookResult);
      if (hookResult.applied && !dryRun) {
        await chmod(hookScriptPath, 0o755);
      }

      // --- Par agent detecte : stub projet + merge hook ----------------------
      for (const detection of activeAgents) {
        const agentMeta = projectMeta[detection.id];
        console.log(sectionTitle(`${agentDisplayLabel(agentMeta)} (project scope)`));

        const stubPath = path.join(cwd, agentMeta.project.contractStubProject);
        const stubOwnership = await computeOwnership(stubPath);
        const proposedStub = await renderProjectStub(agentMeta.id, stubOwnership.currentContent);
        const stubFileOp = await planFileOp({
          targetPath: stubPath,
          proposedContent: proposedStub,
          kind: stubOwnership.ownership === "absent" ? "create" : "update-replace-section",
        });
        const stubResult = await confirmAndApply(prompter, stubFileOp, {
          dryRun,
          yes,
          verbose,
          scope: "project",
          label: `project stub ${agentMeta.label}`,
          cwd,
        });
        applied.push(stubResult);

        console.log(
          warn(
            `${agentMeta.label} — a project-scope SessionStart hook fully replaces (no merge) ` +
              "the Home hook for this project. The project hook already relays the global contract.",
          ),
        );

        const configFilePath = path.join(cwd, agentMeta.project.configFileProject);
        const hookMerge = await planNativeHookMerge(agentMeta, hookScriptPath, configFilePath);

        if (hookMerge.alreadyConfigured) {
          console.log(ok(`project SessionStart hook already configured for ${agentMeta.label}`));
          continue;
        }

        if (hookMerge.warning) {
          console.log(warn(`${agentMeta.label} — ${hookMerge.warning}`));
          const forceOk = yes || (await prompter.confirm("Replace it anyway?"));
          if (forceOk) {
            const forcedFileOp = await planForcedReplace(
              agentMeta,
              hookMerge.pendingReplace,
              configFilePath,
            );
            const forcedResult = await confirmAndApply(prompter, forcedFileOp, {
              dryRun,
              yes: true, // deja confirme ci-dessus
              verbose,
              scope: "project",
              label: `hooks.SessionStart project ${agentMeta.label} (forced replace)`,
              cwd,
            });
            applied.push(forcedResult);
          } else {
            console.log(skip("existing hook left as-is"));
          }
          continue;
        }

        if (hookMerge.fileOp) {
          const result = await confirmAndApply(prompter, hookMerge.fileOp, {
            dryRun,
            yes,
            verbose,
            scope: "project",
            label: `hooks.SessionStart project ${agentMeta.label}`,
            cwd,
          });
          applied.push(result);
        }
      }
    }

    // --- Agents stub-only (OpenCode) : pas de hook, juste le stub natif --
    for (const detection of activeStubOnly) {
      await applyStubOnlyAgent({
        agentMeta: stubOnlyMeta[detection.id],
        isProject: true,
        cwd,
        prompter,
        applied,
        dryRun,
        yes,
        verbose,
      });
    }

    // --- Graphify : cablage OpenCode + build initial + install CLI ------
    console.log(step("Graphify"));
    await manageProjectGraphify({
      cwd,
      prompter,
      dryRun,
      yes,
      hasGraph,
      wireOpencode: activeStubOnly.some((d) => d.id === "opencode"),
    });

    const nextSteps = [];
    if (hasGraphifyCli && !hasGraph && !dryRun) {
      nextSteps.push("graphify . — build the knowledge graph (if not done above)");
    }
    if (activeStubOnly.some((d) => d.id === "opencode")) {
      nextSteps.push("git add .opencode/ AGENTS.md — track the OpenCode wiring");
    }
    if (!dryRun) nextSteps.push("restart your agent session so the contract loads");
    nextSteps.push(`kit state & backups: ${relPath(cwd, kitStateDir())}`);
    console.log(formatSummary(applied, { cwd, nextSteps }));
  } finally {
    prompter.close();
  }
}
