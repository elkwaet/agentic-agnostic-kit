import { test } from "node:test";
import assert from "node:assert/strict";
import { isAbort, parseMultiChoice } from "../../src/core/wizard/prompts.js";

test("isAbort: reconnait une AbortError par code ABORT_ERR", () => {
  assert.equal(isAbort({ code: "ABORT_ERR" }), true);
});

test("isAbort: reconnait une AbortError par name", () => {
  assert.equal(isAbort({ name: "AbortError" }), true);
});

test("isAbort: false pour une erreur non liee a un abort", () => {
  assert.equal(isAbort({ code: "ERR_USE_AFTER_CLOSE" }), false);
  assert.equal(isAbort(new Error("boom")), false);
});

test("isAbort: gere une entree nulle/undefined sans throw", () => {
  assert.equal(isAbort(null), false);
  assert.equal(isAbort(undefined), false);
});

test("parseMultiChoice: entree vide selectionne tout", () => {
  assert.deepEqual(parseMultiChoice("", 3), [0, 1, 2]);
});

test('parseMultiChoice: "all" (insensible a la casse) selectionne tout', () => {
  assert.deepEqual(parseMultiChoice("all", 3), [0, 1, 2]);
  assert.deepEqual(parseMultiChoice("ALL", 3), [0, 1, 2]);
});

test("parseMultiChoice: liste separee par virgules", () => {
  assert.deepEqual(parseMultiChoice("1,3", 3), [0, 2]);
});

test("parseMultiChoice: liste separee par espaces", () => {
  assert.deepEqual(parseMultiChoice("1 3", 3), [0, 2]);
});

test("parseMultiChoice: melange virgules/espaces, dedupliquee", () => {
  assert.deepEqual(parseMultiChoice("1, 1,  2", 3), [0, 1]);
});

test("parseMultiChoice: un seul index valide", () => {
  assert.deepEqual(parseMultiChoice("2", 3), [1]);
});

test("parseMultiChoice: index hors limites -> null", () => {
  assert.equal(parseMultiChoice("4", 3), null);
  assert.equal(parseMultiChoice("0", 3), null);
});

test("parseMultiChoice: jeton non numerique -> null", () => {
  assert.equal(parseMultiChoice("abc", 3), null);
  assert.equal(parseMultiChoice("1,abc", 3), null);
});

test("parseMultiChoice: separateurs seuls (aucun token) -> null", () => {
  assert.equal(parseMultiChoice(",,", 3), null);
});
