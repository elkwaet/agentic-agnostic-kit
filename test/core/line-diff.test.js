import { test } from "node:test";
import assert from "node:assert/strict";
import { lineDiff } from "../../src/core/fs-safety/file-op.js";

test("lineDiff: texte identique -> pas de difference", () => {
  const text = "a\nb\nc";
  assert.equal(lineDiff(text, text), "(no textual difference)");
});

test("lineDiff: respecte l'ordre reel du fichier (pas un diff par ensemble)", () => {
  const oldText = "one\ntwo\nthree";
  const newText = "one\nTWO\nthree";
  const result = lineDiff(oldText, newText);
  assert.equal(result, "- two\n+ TWO");
});

test("lineDiff: lignes communes non dupliquees entre les deux blocs", () => {
  const oldText = "keep\nold-line\nkeep-too";
  const newText = "keep\nnew-line\nkeep-too";
  const result = lineDiff(oldText, newText);
  assert.ok(!result.includes("keep\n"));
  assert.ok(result.includes("- old-line"));
  assert.ok(result.includes("+ new-line"));
});

test("lineDiff: ajout pur (nouvelles lignes en fin de fichier)", () => {
  const result = lineDiff("line0", "line0\nline1\nline2");
  assert.equal(result, "+ line1\n+ line2");
});
