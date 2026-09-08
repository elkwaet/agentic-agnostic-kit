import { test } from "node:test";
import assert from "node:assert/strict";
import { planGraphifyActions, runGraphifyAction } from "../../src/core/graphify-actions.js";

test("planGraphifyActions: CLI absent + uv absent -> aucune action", () => {
  const actions = planGraphifyActions({
    hasCli: false,
    hasGraph: false,
    hasUv: false,
    wireOpencode: true,
  });
  assert.deepEqual(actions, []);
});

test("planGraphifyActions: CLI absent + uv present -> install-cli seul", () => {
  const actions = planGraphifyActions({
    hasCli: false,
    hasGraph: false,
    hasUv: true,
    wireOpencode: true,
  });
  assert.deepEqual(
    actions.map((a) => a.id),
    ["install-cli"],
  );
  assert.equal(actions[0].skipUnderYes, true);
  assert.deepEqual(actions[0].cmd, ["uv", "tool", "install", "graphifyy"]);
});

test("planGraphifyActions: CLI present + pas de graphe + opencode actif -> wire puis build", () => {
  const actions = planGraphifyActions({
    hasCli: true,
    hasGraph: false,
    hasUv: false,
    wireOpencode: true,
  });
  assert.deepEqual(
    actions.map((a) => a.id),
    ["wire-opencode", "build"],
  );
  assert.equal(actions.find((a) => a.id === "wire-opencode").skipUnderYes, false);
  assert.equal(actions.find((a) => a.id === "build").skipUnderYes, true);
});

test("planGraphifyActions: CLI present + graphe present + pas d'opencode -> aucune action", () => {
  const actions = planGraphifyActions({
    hasCli: true,
    hasGraph: true,
    hasUv: false,
    wireOpencode: false,
  });
  assert.deepEqual(actions, []);
});

test("planGraphifyActions: CLI present + pas de graphe + pas d'opencode -> build seul", () => {
  const actions = planGraphifyActions({
    hasCli: true,
    hasGraph: false,
    hasUv: false,
    wireOpencode: false,
  });
  assert.deepEqual(
    actions.map((a) => a.id),
    ["build"],
  );
});

test("runGraphifyAction: dry-run utilise le logger injecte, n'execute rien", async () => {
  const seen = [];
  const res = await runGraphifyAction(
    { id: "build", label: "build", cmd: ["graphify", "."] },
    { cwd: "/tmp", dryRun: true, logger: { run: (t) => seen.push(["run", t]), skip: (t) => seen.push(["skip", t]) } },
  );
  assert.deepEqual(res, { skipped: true });
  assert.equal(seen[0][0], "skip");
  assert.ok(seen[0][1].includes("would run: graphify ."));
});
