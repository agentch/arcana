import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {getConfiguredSpreadSlots} from "../app/domain/spread-layout.ts";

const spreads = JSON.parse(
  await readFile(
    new URL("../../packages/tarot-core/src/data/spreads.json", import.meta.url),
    "utf8",
  ),
).spreads;

function getSpread(spreadId) {
  return spreads.find((spread) => spread.id === spreadId);
}

test("maps the Celtic Cross visual config into a contained Web layout", () => {
  const slots = getConfiguredSpreadSlots(getSpread("celtic-cross"));

  assert.equal(slots?.length, 10);
  assert.deepEqual(slots?.map((slot) => slot.label), [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
  ]);
  assert.equal(slots?.[1].rotation, 90);
  assert.equal(slots?.[1].left, slots?.[0].left);
  assert.equal(slots?.[1].top, slots?.[0].top);
  assert.ok(
    slots?.every(
      (slot) =>
        Number.parseFloat(slot.left) >= 0 &&
        Number.parseFloat(slot.left) <= 100 &&
        Number.parseFloat(slot.top) >= 0 &&
        Number.parseFloat(slot.top) <= 100,
    ),
  );
});

test("keeps small spreads on their existing Web layouts", () => {
  assert.equal(getConfiguredSpreadSlots(getSpread("timeline")), null);
});
