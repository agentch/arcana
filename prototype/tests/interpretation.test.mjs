import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {composeInterpretation} from "../app/domain/interpretation.ts";

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(new URL(relativePath, import.meta.url), "utf8"),
  );
}

const position = {
  id: "focus",
  name: "此刻的提示",
  prompt: "当前最值得看见的力量、状态或选择",
  order: 1,
};

test("composes layered meaning from orientation, topic, and spread position", async () => {
  const [catalog, foolV2] = await Promise.all([
    readJson("../app/data/card-meanings.json"),
    readJson("../app/data/cards/major-00.json"),
  ]);
  const foolV1 = {
    ...catalog.cards[0],
    asset: {image: null, fallbackSymbol: "✦", alt: "愚人占位牌面"},
  };

  const result = composeInterpretation({
    card: foolV1,
    layeredMeaning: foolV2,
    orientation: "upright",
    topicId: "love",
    position,
  });

  assert.equal(result.source, "layered-v2");
  assert.equal(result.orientationName, "正位");
  assert.equal(result.summary, foolV2.core.summary);
  assert.equal(result.overview, foolV2.upright.overview);
  assert.equal(result.topicText, foolV2.topics.love.upright);
  assert.match(result.positionText, /此刻的提示/);
  assert.match(result.positionText, /当前最值得看见/);
  assert.deepEqual(result.advice, foolV2.upright.advice);
  assert.equal(result.reflection, foolV2.upright.reflection);
});

test("composes a non-Fool reversed topic independently", async () => {
  const [catalog, magicianV2] = await Promise.all([
    readJson("../app/data/card-meanings.json"),
    readJson("../app/data/cards/major-01.json"),
  ]);
  const magicianV1 = {
    ...catalog.cards[1],
    asset: {image: null, fallbackSymbol: "✧", alt: "魔术师占位牌面"},
  };

  const result = composeInterpretation({
    card: magicianV1,
    layeredMeaning: magicianV2,
    orientation: "reversed",
    topicId: "career",
    position,
  });

  assert.equal(result.orientationName, "逆位");
  assert.equal(result.overview, magicianV2.reversed.overview);
  assert.equal(result.topicText, magicianV2.topics.career.reversed);
  assert.equal(result.light, magicianV2.reversed.light);
  assert.equal(result.shadow, magicianV2.reversed.shadow);
});

test("adapts legacy cards to the same display model without placeholders", async () => {
  const catalog = await readJson("../app/data/card-meanings.json");
  const magician = {
    ...catalog.cards[1],
    asset: {image: null, fallbackSymbol: "✧", alt: "魔术师占位牌面"},
  };

  const result = composeInterpretation({
    card: magician,
    orientation: "upright",
    topicId: "career",
    position,
  });

  assert.equal(result.source, "legacy-v1");
  assert.equal(result.overview, magician.meaning.upright);
  assert.deepEqual(result.advice, [magician.advice.upright]);
  assert.deepEqual(result.symbols, []);
  assert.equal(result.topicText, undefined);
  assert.doesNotMatch(JSON.stringify(result), /待编辑/);
});
