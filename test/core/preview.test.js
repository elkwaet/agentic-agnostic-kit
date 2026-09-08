import { test } from "node:test";
import assert from "node:assert/strict";
import { formatFileOpPreview, formatSummary } from "../../src/core/wizard/preview.js";

test("formatFileOpPreview: fichier absent -> statut clair, pas de diff meme en verbose", () => {
  const fileOp = {
    targetPath: "/tmp/new.md",
    kind: "create",
    ownership: "absent",
    diffPreview: "full content here",
  };
  const result = formatFileOpPreview(fileOp, { verbose: false });
  assert.ok(result.includes("New file"));
  assert.ok(!result.includes("full content here"));
});

test("formatFileOpPreview: kit-owned sans difference -> deja a jour, pas de prompt implicite", () => {
  const fileOp = {
    targetPath: "/tmp/existing.md",
    kind: "update-replace-section",
    ownership: "kit-owned",
    diffPreview: "(no textual difference)",
  };
  const result = formatFileOpPreview(fileOp, { verbose: false });
  assert.ok(result.includes("Already up to date"));
});

test("formatFileOpPreview: user-owned -> avertit, diff masque par defaut", () => {
  const fileOp = {
    targetPath: "/tmp/custom.md",
    kind: "update-replace-section",
    ownership: "user-owned",
    diffPreview: "- old line\n+ new line",
  };
  const result = formatFileOpPreview(fileOp, { verbose: false });
  assert.ok(result.includes("customized"));
  assert.ok(!result.includes("old line"));
  assert.ok(result.includes("--verbose"));
});

test("formatFileOpPreview: verbose affiche le diff complet", () => {
  const fileOp = {
    targetPath: "/tmp/custom.md",
    kind: "update-replace-section",
    ownership: "user-owned",
    diffPreview: "- old line\n+ new line",
  };
  const result = formatFileOpPreview(fileOp, { verbose: true });
  assert.ok(result.includes("old line"));
  assert.ok(result.includes("new line"));
});

test("formatFileOpPreview: chemin relatif quand cwd fourni", () => {
  const fileOp = {
    targetPath: "/work/proj/.agents/AGENTS.md",
    kind: "create",
    ownership: "absent",
    diffPreview: "x",
  };
  assert.ok(formatFileOpPreview(fileOp, { cwd: "/work/proj" }).includes("./.agents/AGENTS.md"));
  assert.ok(formatFileOpPreview(fileOp).includes("/work/proj/.agents/AGENTS.md"));
});

test("formatSummary: liste vide -> message explicite", () => {
  assert.equal(formatSummary([]), "No change applied.");
});

test("formatSummary: nextSteps rendus dans la boite de cloture", () => {
  const result = formatSummary([{ dryRun: false, applied: true, targetPath: "/tmp/a" }], {
    nextSteps: ["restart your agent"],
  });
  assert.ok(result.includes("Prochaines étapes"));
  assert.ok(result.includes("restart your agent"));
});

test("formatSummary: tags par etat", () => {
  const result = formatSummary([
    { dryRun: true, applied: false, targetPath: "/tmp/a" },
    { dryRun: false, applied: true, targetPath: "/tmp/b", backupPath: "/tmp/backup/b" },
    { dryRun: false, applied: false, skipped: true, targetPath: "/tmp/c" },
  ]);
  assert.ok(result.includes("[dry-run]"));
  assert.ok(result.includes("[applied]"));
  assert.ok(result.includes("[ignored]"));
  assert.ok(result.includes("/tmp/backup/b"));
});
