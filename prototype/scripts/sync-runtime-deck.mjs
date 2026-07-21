/**
 * 将已批准的分层牌义同步到运行时抽牌池：
 * 1. 生成 cards/registry.ts（全部 major + minor）
 * 2. 以 card-index 顺序扩展 card-meanings.json（大阿卡纳保留现有 v1 文案，小阿卡纳由 v2 派生）
 */
import assert from "node:assert/strict";
import {readdir, readFile, writeFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cardsDir = resolve(root, "app/data/cards");
const rankOrder = [
  "ace",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "page",
  "knight",
  "queen",
  "king",
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

function toImportName(id) {
  return id.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase()).replace(/-/g, "");
}

function layeredToV1Card(layered) {
  return {
    id: layered.id,
    arcana: layered.arcana,
    number: layered.number,
    ...(layered.romanNumeral ? {romanNumeral: layered.romanNumeral} : {}),
    ...(layered.suit ? {suit: layered.suit} : {}),
    ...(layered.rank ? {rank: layered.rank} : {}),
    name: layered.name.zh,
    englishName: layered.name.en,
    keywords: {
      upright: layered.upright.keywords.slice(0, 4),
      reversed: layered.reversed.keywords.slice(0, 4),
    },
    meaning: {
      upright: layered.upright.overview,
      reversed: layered.reversed.overview,
    },
    advice: {
      upright: layered.upright.advice[0],
      reversed: layered.reversed.advice[0],
    },
  };
}

const [cardIndex, existingMeanings, filenames] = await Promise.all([
  readJson("app/data/card-index.json"),
  readJson("app/data/card-meanings.json"),
  readdir(cardsDir),
]);

const layeredFiles = filenames
  .filter((filename) => /^(major-\d{2}|minor-[a-z]+-[a-z]+)\.json$/.test(filename))
  .sort();
const layeredById = new Map();
for (const filename of layeredFiles) {
  const layered = await readJson(`app/data/cards/${filename}`);
  layeredById.set(layered.id, layered);
}

assert.equal(layeredById.size, 78, "expected 78 approved layered meanings");
assert.equal(cardIndex.cards.length, 78, "card-index must contain 78 cards");

const existingById = new Map(
  existingMeanings.cards.map((card) => [card.id, card]),
);

const nextCards = cardIndex.cards.map((indexCard) => {
  const layered = layeredById.get(indexCard.id);
  assert.ok(layered, `missing layered meaning for ${indexCard.id}`);
  assert.equal(layered.editorial.status, "approved", `${indexCard.id} must be approved`);

  if (indexCard.arcana === "major") {
    const existing = existingById.get(indexCard.id);
    assert.ok(existing, `missing legacy major meaning for ${indexCard.id}`);
    return existing;
  }

  assert.equal(layered.suit, indexCard.suit);
  assert.equal(layered.rank, indexCard.rank);
  assert.equal(layered.number, rankOrder.indexOf(layered.rank) + 1);
  return layeredToV1Card(layered);
});

const nextMeanings = {
  schemaVersion: "1.0",
  contentVersion: "2026.07.4",
  locale: existingMeanings.locale ?? "zh-CN",
  cards: nextCards,
};

await writeFile(
  resolve(root, "app/data/card-meanings.json"),
  `${JSON.stringify(nextMeanings, null, 2)}\n`,
  "utf8",
);

const importLines = [];
const exportIds = [];
for (const card of cardIndex.cards) {
  const importName = toImportName(card.id);
  importLines.push(`import ${importName} from "./${card.id}.json";`);
  exportIds.push(importName);
}

const registrySource = `import type {LayeredCardMeaning} from "../../domain/tarot";
${importLines.join("\n")}

export const layeredCardMeanings = [
  ${exportIds.join(",\n  ")},
] as LayeredCardMeaning[];
`;

await writeFile(resolve(cardsDir, "registry.ts"), registrySource, "utf8");

process.stdout.write(
  `Synced runtime deck: ${nextCards.length} card-meanings, ${exportIds.length} registry entries.\n`,
);
