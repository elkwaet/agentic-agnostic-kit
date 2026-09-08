import { test } from "node:test";
import assert from "node:assert/strict";
import { selectAgentSubset } from "../../src/commands/init.js";

const META = {
  "claude-code": { id: "claude-code", label: "Claude Code" },
  opencode: { id: "opencode", label: "OpenCode" },
};

function detections(ids) {
  return ids.map((id) => ({ id, installed: true }));
}

test("selectAgentSubset: --agent filtre sur un sous-ensemble valide", async () => {
  const result = await selectAgentSubset({
    activeAgents: detections(["claude-code"]),
    activeStubOnly: detections(["opencode"]),
    prompter: { selectMultiple: async () => assert.fail("ne doit pas etre appele") },
    yes: false,
    agentFilter: ["opencode"],
    meta: META,
    stubOnlyMeta: META,
  });
  assert.deepEqual(result.activeAgents, []);
  assert.deepEqual(result.activeStubOnly, detections(["opencode"]));
});

test("selectAgentSubset: --agent avec un id inconnu/non detecte leve une erreur explicite", async () => {
  await assert.rejects(
    () =>
      selectAgentSubset({
        activeAgents: detections(["claude-code"]),
        activeStubOnly: [],
        prompter: { selectMultiple: async () => assert.fail("ne doit pas etre appele") },
        yes: false,
        agentFilter: ["not-a-real-agent"],
        meta: META,
        stubOnlyMeta: META,
      }),
    /Unknown or undetected agent id\(s\) for --agent: not-a-real-agent/,
  );
});

test("selectAgentSubset: un seul candidat detecte -> pas de prompt, tout garde", async () => {
  const result = await selectAgentSubset({
    activeAgents: detections(["claude-code"]),
    activeStubOnly: [],
    prompter: { selectMultiple: async () => assert.fail("ne doit pas etre appele") },
    yes: false,
    agentFilter: null,
    meta: META,
    stubOnlyMeta: META,
  });
  assert.deepEqual(result.activeAgents, detections(["claude-code"]));
  assert.deepEqual(result.activeStubOnly, []);
});

test("selectAgentSubset: --yes avec plusieurs candidats -> pas de prompt, tout garde", async () => {
  const result = await selectAgentSubset({
    activeAgents: detections(["claude-code"]),
    activeStubOnly: detections(["opencode"]),
    prompter: { selectMultiple: async () => assert.fail("ne doit pas etre appele") },
    yes: true,
    agentFilter: null,
    meta: META,
    stubOnlyMeta: META,
  });
  assert.deepEqual(result.activeAgents, detections(["claude-code"]));
  assert.deepEqual(result.activeStubOnly, detections(["opencode"]));
});

test("selectAgentSubset: plusieurs candidats, mode interactif -> filtre selon le menu", async () => {
  const result = await selectAgentSubset({
    activeAgents: detections(["claude-code"]),
    activeStubOnly: detections(["opencode"]),
    prompter: { selectMultiple: async () => ["opencode"] },
    yes: false,
    agentFilter: null,
    meta: META,
    stubOnlyMeta: META,
  });
  assert.deepEqual(result.activeAgents, []);
  assert.deepEqual(result.activeStubOnly, detections(["opencode"]));
});
