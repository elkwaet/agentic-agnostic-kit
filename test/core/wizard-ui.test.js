import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import path from "node:path";
import { banner, beginWizard, step, relPath, successBox, WIDTH } from "../../src/core/wizard/ui.js";

test("banner: contient le titre et reste dans la largeur bornee", () => {
  const out = banner("agentic-agnostic · init", ["scope: project"]);
  assert.ok(out.includes("agentic-agnostic · init"));
  assert.ok(out.includes("scope: project"));
  for (const line of out.split("\n").filter(Boolean)) {
    // eslint-disable-next-line no-control-regex
    const visible = line.replace(/\[[0-9;]*m/g, "");
    assert.ok(visible.length <= WIDTH + 2, `ligne trop large: ${visible.length}`);
  }
});

test("step: numerotation incrementale sous beginWizard", () => {
  beginWizard(6);
  assert.ok(step("Un").includes("STEP 1/6 · Un"));
  assert.ok(step("Deux").includes("STEP 2/6 · Deux"));
  beginWizard(4);
  assert.ok(step("Reset").includes("STEP 1/4 · Reset"));
});

test("relPath: relatif au cwd, sinon ~/, sinon absolu", () => {
  const cwd = "/work/project";
  assert.equal(relPath(cwd, "/work/project/.agents/AGENTS.md"), "./.agents/AGENTS.md");
  assert.equal(relPath(cwd, path.join(homedir(), ".agents/x")), "~/.agents/x");
  assert.equal(relPath(cwd, "/etc/hosts"), "/etc/hosts");
  assert.equal(relPath(null, homedir()), "~");
});

test("successBox: comptes et prochaines etapes rendus", () => {
  const out = successBox({ appliedCount: 3, ignoredCount: 1, nextSteps: ["do a thing"] });
  assert.ok(out.includes("Terminé"));
  assert.ok(out.includes("3 changement(s) appliqués, 1 inchangé(s)"));
  assert.ok(out.includes("Prochaines étapes"));
  assert.ok(out.includes("do a thing"));
});

test("successBox: mode dry-run", () => {
  const out = successBox({ appliedCount: 2, ignoredCount: 0, dryRun: true });
  assert.ok(out.includes("Aperçu (dry-run)"));
  assert.ok(out.includes("2 changement(s) prévus"));
});
