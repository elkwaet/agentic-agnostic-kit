import { test } from "node:test";
import assert from "node:assert/strict";
import { renderStub, renderProjectStub } from "../../src/core/contract/render-stub.js";

test("renderStub opencode: pointe vers le contrat global, pas le projet", async () => {
  const result = await renderStub("opencode", null);
  assert.ok(result.includes("~/.agents/AGENTS.md"));
  assert.ok(!result.includes("load the Contract `.agents/AGENTS.md`"));
});

test("renderProjectStub opencode: pointe vers le contrat projet local, pas le global", async () => {
  const result = await renderProjectStub("opencode", null);
  assert.ok(result.includes(".agents/AGENTS.md"));
  assert.ok(!result.includes("~/.agents/AGENTS.md"));
});

test("renderStub opencode: preserve le contenu residuel existant", async () => {
  const existing = "## Notes perso OpenCode\n\n- config locale a garder\n";
  const result = await renderStub("opencode", existing);
  assert.ok(result.includes("agentic-agnostic-kit:begin:stub-pointer"));
  assert.ok(result.includes("Notes perso OpenCode"));
});
