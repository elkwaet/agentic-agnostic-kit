import { test } from "node:test";
import assert from "node:assert/strict";
import { detectGraphifyCli, detectUv, hasProjectGraph } from "../../src/core/detect-graphify.js";
import { renderProjectHookScript } from "../../src/core/contract/render-hook-script-project.js";

test("detectGraphifyCli: s'execute sans throw et retourne un booleen", async () => {
  const result = await detectGraphifyCli();
  assert.equal(typeof result, "boolean");
});

test("detectUv: s'execute sans throw et retourne un booleen", async () => {
  const result = await detectUv();
  assert.equal(typeof result, "boolean");
});

test("hasProjectGraph: detecte l'absence de graphify-out sur un dossier inexistant", async () => {
  const result = await hasProjectGraph("/tmp/dossier-absent-graphify-test-12345");
  assert.equal(result, false);
});

test("renderProjectHookScript: contient la section de synchronisation automatique graphify", async () => {
  const result = await renderProjectHookScript();
  assert.ok(result.includes("command -v graphify"));
  assert.ok(result.includes(".graphify-sync.log"));
  assert.ok(result.includes("opencode antigravity"));
});
