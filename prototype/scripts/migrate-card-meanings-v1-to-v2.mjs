import {mkdir, readFile, writeFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "..");
const activeTopicIds = ["love", "career", "family", "mood"];

const topicLabels = {
  love: "感情",
  career: "职场",
  family: "家庭",
  mood: "心情",
};

function ensureMinimumLength(text, minimum, suffix) {
  return Array.from(text).length >= minimum ? text : `${text}${suffix}`;
}

function topicDraft(cardName, topicId, orientation) {
  const direction = orientation === "upright" ? "正位" : "逆位";
  return `待编辑：请结合${cardName}${direction}的基础牌义，补充${topicLabels[topicId]}主题下的具体观察角度与边界。`;
}

function orientationDraft(card, orientation) {
  const opposite = orientation === "upright" ? "reversed" : "upright";
  const direction = orientation === "upright" ? "正位" : "逆位";

  return {
    keywords: card.keywords[orientation],
    overview: ensureMinimumLength(
      card.meaning[orientation],
      40,
      ` 这是${card.name}${direction}的原型短文案，仍需扩写为完整基础解读。`,
    ),
    light:
      orientation === "upright"
        ? ensureMinimumLength(
            card.meaning[orientation],
            20,
            ` 仍需补充${card.name}${direction}可以利用的积极力量。`,
          )
        : `待编辑：辨认${card.name}${direction}中仍然可以利用的保护、暂停或调整力量。`,
    shadow:
      orientation === "reversed"
        ? card.meaning[orientation]
        : `待编辑：辨认${card.name}${direction}被过度使用时可能出现的盲点、失衡或风险。`,
    advice: [
      ensureMinimumLength(
        card.advice[orientation],
        10,
        " 请结合实际处境调整行动。",
      ),
    ],
    reflection: `待编辑：${card.name}${direction}邀请你进一步思考的核心问题是什么？`,
    migrationReference: card.meaning[opposite],
  };
}

export function migrateCardV1ToV2(card) {
  const upright = orientationDraft(card, "upright");
  const reversed = orientationDraft(card, "reversed");
  delete upright.migrationReference;
  delete reversed.migrationReference;

  return {
    schemaVersion: "2.0",
    contentVersion: "0.1.0",
    id: card.id,
    arcana: card.arcana,
    number: card.number,
    ...(card.romanNumeral ? {romanNumeral: card.romanNumeral} : {}),
    ...(card.suit ? {suit: card.suit} : {}),
    ...(card.rank ? {rank: card.rank} : {}),
    name: {
      zh: card.name,
      en: card.englishName,
    },
    core: {
      summary: card.meaning.upright.slice(0, 80),
      symbols: [
        {
          name: "待补充象征一",
          meaning: `待编辑：补充${card.name}牌面中第一个核心视觉象征及其含义。`,
        },
        {
          name: "待补充象征二",
          meaning: `待编辑：补充${card.name}牌面中第二个核心视觉象征及其含义。`,
        },
        {
          name: "待补充象征三",
          meaning: `待编辑：补充${card.name}牌面中第三个核心视觉象征及其含义。`,
        },
      ],
      element: "待考证",
    },
    upright,
    reversed,
    topics: Object.fromEntries(
      activeTopicIds.map((topicId) => [
        topicId,
        {
          upright: topicDraft(card.name, topicId, "upright"),
          reversed: topicDraft(card.name, topicId, "reversed"),
        },
      ]),
    ),
    editorial: {
      status: "draft",
      lastReviewedAt: null,
      sourceNotes:
        "由 v1 原型短文案自动迁移，仅作为编辑脚手架；待补充象征、明暗面、主题内容并进行人工审核。",
    },
  };
}

export function migrateCatalogV1ToV2(catalog) {
  return catalog.cards.map(migrateCardV1ToV2);
}

async function runCli() {
  const source = JSON.parse(
    await readFile(resolve(root, "app/data/card-meanings.json"), "utf8"),
  );
  const migrated = migrateCatalogV1ToV2(source);
  const outputFlagIndex = process.argv.indexOf("--output");

  if (outputFlagIndex === -1) {
    process.stdout.write(`${JSON.stringify(migrated, null, 2)}\n`);
    return;
  }

  const outputDir = process.argv[outputFlagIndex + 1];
  if (!outputDir) {
    throw new Error("--output requires a directory path");
  }

  const absoluteOutputDir = resolve(process.cwd(), outputDir);
  await mkdir(absoluteOutputDir, {recursive: true});
  await Promise.all(
    migrated.map((card) =>
      writeFile(
        resolve(absoluteOutputDir, `${card.id}.json`),
        `${JSON.stringify(card, null, 2)}\n`,
        "utf8",
      ),
    ),
  );
  process.stdout.write(
    `Generated ${migrated.length} editorial draft files in ${absoluteOutputDir}\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  await runCli();
}
