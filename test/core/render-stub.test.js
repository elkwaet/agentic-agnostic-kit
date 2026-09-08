import { test } from "node:test";
import assert from "node:assert/strict";
import { renderStub } from "../../src/core/contract/render-stub.js";

test("premier passage : prepend le stub, preserve tout le contenu existant en dessous", async () => {
  const existing = "## Qwen Added Memories\n\n- Toujours en francais.\n";
  const result = await renderStub("qwen-code", existing);
  assert.ok(result.includes("agentic-agnostic-kit:begin:stub-pointer"));
  assert.ok(result.includes("Qwen Added Memories"));
  assert.ok(result.includes("Toujours en francais."));
});

test("re-run : remplace uniquement le bloc marque, garde le residu intact", async () => {
  const first = await renderStub("qwen-code", "## Qwen Added Memories\n\n- pref perso\n");
  const second = await renderStub("qwen-code", first);
  assert.ok(second.includes("pref perso"));
  // Un seul bloc marque, pas de duplication au re-run.
  const beginCount = (second.match(/agentic-agnostic-kit:begin:stub-pointer/g) ?? []).length;
  assert.equal(beginCount, 1);
});

test("fichier absent : cree juste le bloc marque", async () => {
  const result = await renderStub("claude-code", null);
  assert.ok(result.includes("agentic-agnostic-kit:begin:stub-pointer"));
  assert.ok(result.includes("Claude Code"));
});

test("renderStub agy : pointe vers le contrat global, mentionne Antigravity CLI", async () => {
  const result = await renderStub("agy", null);
  assert.ok(result.includes("agentic-agnostic-kit:begin:stub-pointer"));
  assert.ok(result.includes("Antigravity CLI"));
});

test("renderStub gemini-cli : plus de template (ADR-0011, retire du kit)", async () => {
  await assert.rejects(() => renderStub("gemini-cli", null), /No stub template/);
});
