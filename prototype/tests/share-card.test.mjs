import assert from "node:assert/strict";
import test from "node:test";
import {
  composeShareCardContent,
  composeShareText,
  planShareCardSlots,
} from "../app/domain/share-card.ts";

const interpretations = [
  {
    cardId: "major-00",
    cardName: "愚人",
    orientation: "upright",
    orientationName: "正位",
    positionName: "此刻的提示",
    keywords: ["开始", "信任", "轻盈"],
    summary: "把注意力放回第一步。",
    overview: "一段更长的概述。",
    positionText: "",
    symbols: [],
    advice: ["先迈出最小一步"],
    source: "layered-v2",
  },
];

test("composes share card content from a single-card reading", () => {
  const content = composeShareCardContent({
    title: "今日一牌",
    question: "今天，我最需要看见什么？",
    interpretations,
  });

  assert.equal(content.brand, "Arcana");
  assert.equal(content.title, "今日一牌");
  assert.equal(content.cards[0].cardName, "愚人");
  assert.equal(content.highlight, "把注意力放回第一步。");
  assert.match(content.disclaimer, /不是写定的预言/);
});

test("prefers summary illumination for multi-card share highlight", () => {
  const content = composeShareCardContent({
    title: "时间流",
    question: "这件事如何发展到现在？",
    interpretations: [
      interpretations[0],
      {
        ...interpretations[0],
        cardId: "major-01",
        cardName: "魔术师",
        positionName: "现在",
      },
    ],
    summary: {
      title: "时间流 · 照耀与建议",
      illumination: {
        title: "照耀",
        lines: [{label: "过去", text: "旧模式仍在影响此刻。"}],
      },
      guidance: {title: "建议", lines: []},
      closing: "趋势观察。",
    },
  });

  assert.equal(content.highlight, "旧模式仍在影响此刻。");
  assert.equal(content.cards.length, 2);
});

test("composeShareText includes cards and disclaimer without winner claims", () => {
  const content = composeShareCardContent({
    title: "二选一牌阵",
    question: "留下还是转行？",
    interpretations,
  });
  const text = composeShareText(content);

  assert.match(text, /Arcana · 二选一牌阵/);
  assert.match(text, /愚人（正位）/);
  assert.match(text, /不是写定的预言/);
  assert.doesNotMatch(text, /必须选|胜者/);
});

test("five-card share layout keeps every card in the canvas content area", () => {
  const slots = planShareCardSlots(5);
  assert.equal(slots.length, 5);
  assert.equal(new Set(slots.map((slot) => `${slot.x}:${slot.y}`)).size, 5);
  assert.ok(Math.max(...slots.map((slot) => slot.y + slot.height)) <= 380);
});
