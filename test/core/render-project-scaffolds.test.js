import { test } from "node:test";
import assert from "node:assert/strict";
import { renderProjectContract } from "../../src/core/contract/render-project-contract.js";
import { renderSkillScaffold } from "../../src/core/contract/render-skill-scaffold.js";
import { renderProjectStub } from "../../src/core/contract/render-stub.js";
import { renderProjectHookScript } from "../../src/core/contract/render-hook-script-project.js";
import { renderArchivesReadme } from "../../src/core/contract/render-archives-readme.js";
import { renderAdrsReadme } from "../../src/core/contract/render-adrs-readme.js";
import { renderBacklog } from "../../src/core/contract/render-backlog.js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("renderProjectContract: contenu generique, sans regle presupposee type tutoiement", async () => {
  const result = await renderProjectContract();
  assert.ok(result.includes("[PRIORITY]"));
  assert.ok(result.includes("[STACK]"));
  assert.ok(result.includes("[ARCHIVES]"));
  assert.ok(result.includes("[ADR]"));
  assert.ok(result.includes("[BACKLOG]"));
  assert.ok(!result.toLowerCase().includes("tutoiement"));
});

test("renderAdrsReadme: contient la nomenclature et le format ADR", async () => {
  const result = await renderAdrsReadme();
  assert.ok(result.includes("ADRs"));
  assert.ok(result.includes("NNNN-short-kebab-title.md"));
  assert.ok(result.includes("## Status"));
  assert.ok(result.includes("## Consequences"));
});

test("templates stubs/hooks : aucun lien mort vers un ADR interne du repo de dev", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const roots = [
    path.join(here, "..", "..", "src", "templates", "stubs"),
    path.join(here, "..", "..", "src", "templates", "stubs-project"),
    path.join(here, "..", "..", "src", "templates", "hooks"),
    path.join(here, "..", "..", "src", "templates", "project"),
  ];
  const deadRef = /ADRs?[/-]\d/;
  for (const root of roots) {
    for (const entry of await readdir(root)) {
      const body = await readFile(path.join(root, entry), "utf8");
      assert.ok(
        !deadRef.test(body),
        `${entry} référence un ADR interne (lien mort une fois distribué)`,
      );
    }
  }
});

test("renderBacklog: contient la convention de numerotation et de marqueurs de statut", async () => {
  const result = await renderBacklog();
  assert.ok(result.includes("# 1."));
  assert.ok(result.includes("DONE"));
  assert.ok(result.includes("IN PROGRESS"));
});

test("renderArchivesReadme: contient la structure et la nomenclature ARCHIVES_R", async () => {
  const result = await renderArchivesReadme();
  assert.ok(result.includes("ARCHIVES_R"));
  assert.ok(result.includes("{model}-analyses"));
  assert.ok(result.includes("YYYY-MM-DDTHH-MM"));
});

test("renderSkillScaffold: interpole uniquement le nom fourni", async () => {
  const result = await renderSkillScaffold("mon-skill-produit");
  assert.ok(result.includes("name: mon-skill-produit"));
  assert.ok(result.includes("# mon-skill-produit"));
  assert.ok(!result.includes("__SKILL_NAME__"));
});

test("renderProjectStub: pointe vers le contrat projet local, pas vers le contrat global", async () => {
  const result = await renderProjectStub("claude-code", null);
  assert.ok(result.includes(".agents/AGENTS.md"));
  assert.ok(!result.includes("~/.agents/AGENTS.md"));
});

test("renderProjectStub: qwen-code n'a pas de template projet (hors scope v0.2)", async () => {
  await assert.rejects(() => renderProjectStub("qwen-code", null));
});

test("renderProjectStub: agy n'a pas de template projet (scope Home uniquement, ADR-0011)", async () => {
  await assert.rejects(() => renderProjectStub("agy", null));
});

test("renderProjectHookScript: relaie le contrat global et decouvre les skills dynamiquement", async () => {
  const result = await renderProjectHookScript();
  assert.ok(result.includes("GLOBAL_CONTRACT"));
  assert.ok(result.includes(".agents/skills"));
  assert.ok(result.includes("MAX_BYTES"));
});
