import assert from "node:assert/strict";
import test from "node:test";
import {
  createSeededRandom,
  getLocalDateKey,
  pickDailyCard,
} from "../app/domain/daily-card.ts";

const deck = Array.from({length: 22}, (_, index) => ({
  id: `major-${String(index).padStart(2, "0")}`,
}));

test("local date key uses calendar day format", () => {
  assert.equal(getLocalDateKey(new Date(2026, 6, 21)), "2026-07-21");
  assert.equal(getLocalDateKey(new Date(2026, 0, 5)), "2026-01-05");
});

test("seeded random is deterministic for the same seed", () => {
  const first = createSeededRandom("arcana-daily:2026-07-21");
  const second = createSeededRandom("arcana-daily:2026-07-21");
  const valuesA = [first(), first(), first()];
  const valuesB = [second(), second(), second()];
  assert.deepEqual(valuesA, valuesB);

  const other = createSeededRandom("arcana-daily:2026-07-22");
  assert.notDeepEqual(valuesA, [other(), other(), other()]);
});

test("daily card pick is stable for a date and changes across days", () => {
  const dayA = pickDailyCard(deck, "2026-07-21");
  const dayAAgain = pickDailyCard(deck, "2026-07-21");
  const dayB = pickDailyCard(deck, "2026-07-22");

  assert.equal(dayA.card.id, dayAAgain.card.id);
  assert.equal(dayA.orientation, dayAAgain.orientation);
  assert.ok(
    dayA.card.id !== dayB.card.id || dayA.orientation !== dayB.orientation,
  );
  assert.ok(["upright", "reversed"].includes(dayA.orientation));
});
