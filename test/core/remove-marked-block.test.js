import { test } from "node:test";
import assert from "node:assert/strict";
import { wrapWithMarker, removeMarkedBlock } from "../../src/core/fs-safety/ownership-marker.js";

test("bloc + residu -> residu seul, bloc retire", () => {
  const block = wrapWithMarker("stub-pointer", "# Pointeur kit\ncharge le contrat.");
  const content = block + "\n\n## Qwen Added Memories\n\n- pref perso\n";
  const { found, residual } = removeMarkedBlock(content, "stub-pointer");
  assert.equal(found, true);
  assert.ok(residual.includes("Qwen Added Memories"));
  assert.ok(!residual.includes("agentic-agnostic-kit:begin:stub-pointer"));
});

test("bloc seul (rien autour) -> residu vide", () => {
  const block = wrapWithMarker("stub-pointer", "# Pointeur kit\ncharge le contrat.");
  const { found, residual } = removeMarkedBlock(block + "\n", "stub-pointer");
  assert.equal(found, true);
  assert.equal(residual, "");
});

test("pas de bloc -> found: false", () => {
  const { found } = removeMarkedBlock("## Contenu utilisateur pur\n\n- jamais gere par le kit\n", "stub-pointer");
  assert.equal(found, false);
});
