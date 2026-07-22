import assert from "node:assert/strict";
import test from "node:test";
import {readLocalJson, writeLocalJson} from "../app/platform/storage.ts";

test("local storage adapter round-trips JSON", () => {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };

  assert.equal(writeLocalJson("reading", {id: 1}), true);
  assert.deepEqual(readLocalJson("reading"), {id: 1});
  delete globalThis.window;
});

test("local storage adapter absorbs platform failures", () => {
  globalThis.window = {
    localStorage: {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    },
  };

  assert.equal(readLocalJson("reading"), null);
  assert.equal(writeLocalJson("reading", {id: 1}), false);
  delete globalThis.window;
});
