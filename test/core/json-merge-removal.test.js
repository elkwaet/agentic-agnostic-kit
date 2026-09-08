import { test } from "node:test";
import assert from "node:assert/strict";
import { planSessionStartRemoval } from "../../src/core/fs-safety/json-merge.js";

test("retire l'entree ciblee sans toucher aux autres cles/matchers", () => {
  const existing = {
    otherUserSetting: "doit-survivre",
    hooks: {
      SessionStart: [
        { matcher: "startup|resume|clear", hooks: [{ type: "command", command: "/kit/hook.sh" }] },
        { matcher: "autre-matcher", hooks: [{ type: "command", command: "/autre/hook.sh" }] },
      ],
    },
  };
  const { config, changed } = planSessionStartRemoval(existing, "/kit/hook.sh");
  assert.equal(changed, true);
  assert.equal(config.otherUserSetting, "doit-survivre");
  assert.equal(config.hooks.SessionStart.length, 1);
  assert.equal(config.hooks.SessionStart[0].matcher, "autre-matcher");
});

test("idempotent : rien a retirer si le command du kit n'est pas present", () => {
  const existing = {
    hooks: {
      SessionStart: [
        { matcher: "startup|resume|clear", hooks: [{ type: "command", command: "/autre-script.sh" }] },
      ],
    },
  };
  const { config, changed } = planSessionStartRemoval(existing, "/kit/hook.sh");
  assert.equal(changed, false);
  assert.equal(config.hooks.SessionStart[0].hooks[0].command, "/autre-script.sh");
});

test("nettoie les structures vides en cascade (hooks.SessionStart puis hooks)", () => {
  const existing = {
    otherUserSetting: "doit-survivre",
    hooks: {
      SessionStart: [
        { matcher: "startup|resume|clear", hooks: [{ type: "command", command: "/kit/hook.sh" }] },
      ],
    },
  };
  const { config, changed } = planSessionStartRemoval(existing, "/kit/hook.sh");
  assert.equal(changed, true);
  assert.equal(config.hooks, undefined);
  assert.equal(config.otherUserSetting, "doit-survivre");
});

test("plusieurs commands sur le meme matcher : retire uniquement celui du kit, garde les autres", () => {
  const existing = {
    hooks: {
      SessionStart: [
        {
          matcher: "startup|resume|clear",
          hooks: [
            { type: "command", command: "/kit/hook.sh" },
            { type: "command", command: "/autre-outil/hook.sh" },
          ],
        },
      ],
    },
  };
  const { config, changed } = planSessionStartRemoval(existing, "/kit/hook.sh");
  assert.equal(changed, true);
  assert.equal(config.hooks.SessionStart[0].hooks.length, 1);
  assert.equal(config.hooks.SessionStart[0].hooks[0].command, "/autre-outil/hook.sh");
});
