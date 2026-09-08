import { test } from "node:test";
import assert from "node:assert/strict";
import { planSessionStartMerge, serializeJson } from "../../src/core/fs-safety/json-merge.js";

test("ajoute un hook SessionStart absent sans toucher aux autres cles", () => {
  const existing = { otherUserSetting: "doit-survivre" };
  const { config, changed, warning } = planSessionStartMerge(existing, {
    matcher: "startup|resume|clear",
    command: "/path/to/hook.sh",
    timeout: 15,
  });
  assert.equal(changed, true);
  assert.equal(warning, null);
  assert.equal(config.otherUserSetting, "doit-survivre");
  assert.equal(config.hooks.SessionStart[0].hooks[0].command, "/path/to/hook.sh");
});

test("idempotent : re-appliquer le meme hook ne change rien", () => {
  const existing = {
    hooks: {
      SessionStart: [
        { matcher: "startup|resume|clear", hooks: [{ type: "command", command: "/path/to/hook.sh" }] },
      ],
    },
  };
  const { changed, warning } = planSessionStartMerge(existing, {
    matcher: "startup|resume|clear",
    command: "/path/to/hook.sh",
  });
  assert.equal(changed, false);
  assert.equal(warning, null);
});

test("hook existant pointant ailleurs -> warning, ne modifie pas config par defaut", () => {
  const existing = {
    hooks: {
      SessionStart: [
        { matcher: "startup|resume|clear", hooks: [{ type: "command", command: "/autre-script.sh" }] },
      ],
    },
    otherUserSetting: "doit-survivre",
  };
  const result = planSessionStartMerge(existing, {
    matcher: "startup|resume|clear",
    command: "/path/to/hook.sh",
  });
  assert.equal(result.changed, false);
  assert.ok(result.warning);
  // Le config retourne par defaut est un clone de l'existant, non modifie.
  assert.equal(
    result.config.hooks.SessionStart[0].hooks[0].command,
    "/autre-script.sh",
  );
  assert.equal(result.config.otherUserSetting, "doit-survivre");

  // pendingReplace() ne doit s'appliquer qu'apres confirmation explicite.
  const forced = result.pendingReplace();
  assert.equal(forced.hooks.SessionStart[0].hooks[0].command, "/path/to/hook.sh");
  assert.equal(forced.otherUserSetting, "doit-survivre");
});

test("n'ajoute jamais de cle 'plugin' dupliquee (classe de bug ADR-0005)", () => {
  const serialized = serializeJson({ plugin: ["a", "b"] });
  const occurrences = serialized.match(/"plugin"/g) ?? [];
  assert.equal(occurrences.length, 1);
});
