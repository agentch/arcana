import assert from "node:assert/strict";
import test from "node:test";
import { drawForSpread } from "../app/domain/draw.ts";

const cards = Array.from({length: 8}, (_, index) => ({
  id: `major-${String(index).padStart(2, "0")}`,
}));

const timeline = {
  id: "timeline",
  positions: [
    {id: "past", name: "过去", prompt: "", order: 1},
    {id: "present", name: "现在", prompt: "", order: 2},
    {id: "future", name: "未来趋势", prompt: "", order: 3},
  ],
};

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

test("draws the configured positions without duplicate cards", () => {
  const result = drawForSpread(cards, timeline, seededRandom(42));

  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((drawn) => drawn.position.id),
    ["past", "present", "future"],
  );
  assert.equal(
    new Set(result.map((drawn) => drawn.card.id)).size,
    result.length,
  );
  assert.ok(
    result.every((drawn) =>
      ["upright", "reversed"].includes(drawn.orientation),
    ),
  );
});

test("supports reproducible draws with an injected random source", () => {
  const first = drawForSpread(cards, timeline, seededRandom(7));
  const second = drawForSpread(cards, timeline, seededRandom(7));

  assert.deepEqual(
    first.map(({card, orientation, position}) => ({
      cardId: card.id,
      orientation,
      positionId: position.id,
    })),
    second.map(({card, orientation, position}) => ({
      cardId: card.id,
      orientation,
      positionId: position.id,
    })),
  );
});
