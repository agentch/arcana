import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {
  composeInterpretation,
  composeSpreadSummary,
} from "../app/domain/interpretation.ts";

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

test("composes a fused multi-card spread summary", async () => {
  const [catalog, foolV2, magicianV2, worldV2] = await Promise.all([
    readJson("../app/data/card-meanings.json"),
    readJson("../app/data/cards/major-00.json"),
    readJson("../app/data/cards/major-01.json"),
    readJson("../app/data/cards/major-21.json"),
  ]);
  const fool = {
    ...catalog.cards[0],
    asset: {image: null, fallbackSymbol: "✦", alt: "愚人占位牌面"},
  };
  const magician = {
    ...catalog.cards[1],
    asset: {image: null, fallbackSymbol: "✧", alt: "魔术师占位牌面"},
  };
  const world = {
    ...catalog.cards[21],
    asset: {image: null, fallbackSymbol: "◎", alt: "世界占位牌面"},
  };
  const interpretations = [
    composeInterpretation({
      card: fool,
      layeredMeaning: foolV2,
      orientation: "upright",
      topicId: "mood",
      position: {
        id: "past",
        name: "过去",
        prompt: "已形成影响的背景",
        order: 1,
      },
    }),
    composeInterpretation({
      card: magician,
      layeredMeaning: magicianV2,
      orientation: "reversed",
      topicId: "mood",
      position: {
        id: "present",
        name: "现在",
        prompt: "当前最重要的力量",
        order: 2,
      },
    }),
    composeInterpretation({
      card: world,
      layeredMeaning: worldV2,
      orientation: "upright",
      topicId: "mood",
      position: {
        id: "future",
        name: "未来趋势",
        prompt: "沿当前路径继续时可能出现的倾向",
        order: 3,
      },
    }),
  ];

  const summary = composeSpreadSummary({
    spreadId: "timeline",
    spreadName: "时间流",
    spreadDescription: "理解一件事如何从过去发展到未来",
    interpretations,
  });

  assert.match(summary.title, /照耀与建议/);
  assert.equal(summary.illumination.title, "照耀");
  assert.deepEqual(
    summary.illumination.lines.map((line) => line.label),
    ["过去", "现在", "未来"],
  );
  assert.equal(summary.guidance.title, "建议");
  assert.deepEqual(
    summary.guidance.lines.map((line) => line.label),
    ["现在", "未来"],
  );
  assert.ok(summary.illumination.lines[0].text.length > 0);
  assert.ok(summary.guidance.lines[0].text.includes(magicianV2.reversed.advice[0]));
  assert.ok(summary.guidance.lines[1].text.includes(worldV2.upright.advice[0]));
  assert.doesNotMatch(JSON.stringify(summary), /围绕你写下的问题/);
  assert.doesNotMatch(JSON.stringify(summary), /过去由/);
  assert.doesNotMatch(JSON.stringify(summary), /「愚人」/);
});

test("composes a sacred-triangle spread summary", async () => {
  const [catalog, foolV2, magicianV2, worldV2] = await Promise.all([
    readJson("../app/data/card-meanings.json"),
    readJson("../app/data/cards/major-00.json"),
    readJson("../app/data/cards/major-01.json"),
    readJson("../app/data/cards/major-21.json"),
  ]);
  const interpretations = [
    composeInterpretation({
      card: {
        ...catalog.cards[0],
        asset: {image: null, fallbackSymbol: "✦", alt: "愚人"},
      },
      layeredMeaning: foolV2,
      orientation: "upright",
      topicId: "career",
      position: {
        id: "situation",
        name: "现状",
        prompt: "当前可见与未充分看见的状态",
        order: 1,
      },
    }),
    composeInterpretation({
      card: {
        ...catalog.cards[1],
        asset: {image: null, fallbackSymbol: "✧", alt: "魔术师"},
      },
      layeredMeaning: magicianV2,
      orientation: "reversed",
      topicId: "career",
      position: {
        id: "challenge",
        name: "挑战",
        prompt: "阻力、矛盾、盲点或需要整合的部分",
        order: 2,
      },
    }),
    composeInterpretation({
      card: {
        ...catalog.cards[21],
        asset: {image: null, fallbackSymbol: "◎", alt: "世界"},
      },
      layeredMeaning: worldV2,
      orientation: "upright",
      topicId: "career",
      position: {
        id: "guidance",
        name: "建议",
        prompt: "可以尝试的态度、行动或观察角度",
        order: 3,
      },
    }),
  ];

  const summary = composeSpreadSummary({
    spreadId: "sacred-triangle",
    spreadName: "圣三角",
    spreadDescription: "分析现状、核心挑战与可行建议",
    interpretations,
  });

  assert.deepEqual(
    summary.illumination.lines.map((line) => line.label),
    ["现状", "挑战"],
  );
  assert.deepEqual(
    summary.guidance.lines.map((line) => line.label),
    ["可行方向", "可以尝试"],
  );
  assert.ok(summary.guidance.lines[1].text.includes(worldV2.upright.advice[0]));
  assert.doesNotMatch(JSON.stringify(summary), /过去|未来/);
});

test("composes a relationship-five spread summary", async () => {
  const [catalog, foolV2, magicianV2, deathV2, towerV2, worldV2] =
    await Promise.all([
      readJson("../app/data/card-meanings.json"),
      readJson("../app/data/cards/major-00.json"),
      readJson("../app/data/cards/major-01.json"),
      readJson("../app/data/cards/major-13.json"),
      readJson("../app/data/cards/major-16.json"),
      readJson("../app/data/cards/major-21.json"),
    ]);

  const makeCard = (index, symbol, alt) => ({
    ...catalog.cards[index],
    asset: {image: null, fallbackSymbol: symbol, alt},
  });

  const interpretations = [
    composeInterpretation({
      card: makeCard(0, "✦", "愚人"),
      layeredMeaning: foolV2,
      orientation: "upright",
      topicId: "love",
      position: {
        id: "self",
        name: "我的状态",
        prompt: "我的需要、感受与关系模式",
        order: 1,
      },
    }),
    composeInterpretation({
      card: makeCard(1, "✧", "魔术师"),
      layeredMeaning: magicianV2,
      orientation: "reversed",
      topicId: "love",
      position: {
        id: "other",
        name: "对方状态",
        prompt: "我所感受到的对方立场",
        order: 2,
      },
    }),
    composeInterpretation({
      card: makeCard(13, "†", "死神"),
      layeredMeaning: deathV2,
      orientation: "upright",
      topicId: "love",
      position: {
        id: "connection",
        name: "关系现状",
        prompt: "双方当前形成的互动动力",
        order: 3,
      },
    }),
    composeInterpretation({
      card: makeCard(16, "⚡", "高塔"),
      layeredMeaning: towerV2,
      orientation: "reversed",
      topicId: "love",
      position: {
        id: "challenge",
        name: "关系挑战",
        prompt: "冲突、误解、边界或外部压力",
        order: 4,
      },
    }),
    composeInterpretation({
      card: makeCard(21, "◎", "世界"),
      layeredMeaning: worldV2,
      orientation: "upright",
      topicId: "love",
      position: {
        id: "direction",
        name: "发展趋势",
        prompt: "维持当前互动方式时的可能方向",
        order: 5,
      },
    }),
  ];

  const summary = composeSpreadSummary({
    spreadId: "relationship-five",
    spreadName: "恋爱关系五牌阵",
    spreadDescription: "观察双方状态、关系动力与发展趋势",
    interpretations,
  });

  assert.deepEqual(
    summary.illumination.lines.map((line) => line.label),
    ["我", "对方", "关系", "挑战"],
  );
  assert.deepEqual(
    summary.guidance.lines.map((line) => line.label),
    ["趋势", "可以尝试"],
  );
  assert.match(summary.closing, /不是对他人内心的事实判定/);
  assert.ok(summary.guidance.lines[1].text.includes(worldV2.upright.advice[0]));
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
