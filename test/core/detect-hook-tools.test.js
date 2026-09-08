import { test } from "node:test";
import assert from "node:assert/strict";
import { detectHookTools, missingHookTools, REQUIRED_HOOK_TOOLS } from "../../src/core/detect-hook-tools.js";

test("detectHookTools: retourne un booleen pour chaque outil requis, sans throw", async () => {
  const detected = await detectHookTools();
  for (const name of REQUIRED_HOOK_TOOLS) {
    assert.equal(typeof detected[name], "boolean");
  }
});

test("missingHookTools: ne retourne que les outils absents", () => {
  const detected = { bash: true, awk: false, jq: true };
  assert.deepEqual(missingHookTools(detected), ["awk"]);
});

test("missingHookTools: tableau vide si tout est present", () => {
  const detected = { bash: true, awk: true, jq: true };
  assert.deepEqual(missingHookTools(detected), []);
});
