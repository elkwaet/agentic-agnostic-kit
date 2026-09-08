import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { planNativeHookMerge } from "../../src/core/contract/plan-native-hook-merge.js";

// Verifie que planNativeHookMerge fonctionne avec un configFilePath
// arbitraire (non-Home) - condition necessaire pour le reutiliser tel quel
// en scope Projet (v0.2), sans dupliquer la fonction.
test("planNativeHookMerge: configFilePath arbitraire, fichier absent -> propose une creation", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aak-project-hook-"));
  try {
    const configFilePath = path.join(dir, ".claude", "settings.json");
    const hookScriptPath = path.join(dir, ".agents", "hooks", "session-start-contract.sh");
    const agentMeta = {
      injection: { matcher: "startup|resume|clear|compact", defaultTimeout: 15 },
    };

    const result = await planNativeHookMerge(agentMeta, hookScriptPath, configFilePath);

    assert.equal(result.alreadyConfigured, false);
    assert.ok(result.fileOp);
    assert.equal(result.fileOp.targetPath, configFilePath);
    assert.ok(result.fileOp.proposedContent.includes(hookScriptPath));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("planNativeHookMerge: idempotent sur un configFilePath projet deja configure", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aak-project-hook-"));
  try {
    const configDir = path.join(dir, ".claude");
    const configFilePath = path.join(configDir, "settings.json");
    const hookScriptPath = path.join(dir, ".agents", "hooks", "session-start-contract.sh");
    const agentMeta = {
      injection: { matcher: "startup|resume|clear|compact", defaultTimeout: 15 },
    };

    await mkdir(configDir, { recursive: true });
    const first = await planNativeHookMerge(agentMeta, hookScriptPath, configFilePath);
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(configFilePath, first.fileOp.proposedContent, "utf8"),
    );

    const second = await planNativeHookMerge(agentMeta, hookScriptPath, configFilePath);
    assert.equal(second.alreadyConfigured, true);

    const onDisk = await readFile(configFilePath, "utf8");
    assert.ok(onDisk.includes(hookScriptPath));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
