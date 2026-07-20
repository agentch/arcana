import {access, mkdir, writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const root = resolve(import.meta.dirname, "..");
const dataRoot = resolve(root, "app/data");
const deckRoot = resolve(dataRoot, "decks/rws-original");

const majorNames = [
  ["愚人", "The Fool"],
  ["魔术师", "The Magician"],
  ["女祭司", "The High Priestess"],
  ["皇后", "The Empress"],
  ["皇帝", "The Emperor"],
  ["教皇", "The Hierophant"],
  ["恋人", "The Lovers"],
  ["战车", "The Chariot"],
  ["力量", "Strength"],
  ["隐士", "The Hermit"],
  ["命运之轮", "Wheel of Fortune"],
  ["正义", "Justice"],
  ["倒吊人", "The Hanged Man"],
  ["死神", "Death"],
  ["节制", "Temperance"],
  ["恶魔", "The Devil"],
  ["高塔", "The Tower"],
  ["星星", "The Star"],
  ["月亮", "The Moon"],
  ["太阳", "The Sun"],
  ["审判", "Judgement"],
  ["世界", "The World"],
];

const suits = [
  ["wands", "权杖", "Wands"],
  ["cups", "圣杯", "Cups"],
  ["swords", "宝剑", "Swords"],
  ["pentacles", "钱币", "Pentacles"],
];

const ranks = [
  ["ace", "王牌", "Ace"],
  ["two", "二", "Two"],
  ["three", "三", "Three"],
  ["four", "四", "Four"],
  ["five", "五", "Five"],
  ["six", "六", "Six"],
  ["seven", "七", "Seven"],
  ["eight", "八", "Eight"],
  ["nine", "九", "Nine"],
  ["ten", "十", "Ten"],
  ["page", "侍从", "Page"],
  ["knight", "骑士", "Knight"],
  ["queen", "王后", "Queen"],
  ["king", "国王", "King"],
];

const cards = majorNames.map(([zh, en], number) => ({
  id: `major-${String(number).padStart(2, "0")}`,
  arcana: "major",
  number,
  sortOrder: number,
  name: {zh, en},
}));

for (const [suit, suitZh, suitEn] of suits) {
  for (const [rank, rankZh, rankEn] of ranks) {
    cards.push({
      id: `minor-${suit}-${rank}`,
      arcana: "minor",
      suit,
      rank,
      sortOrder: cards.length,
      name: {
        zh: `${suitZh}${rankZh}`,
        en: `${rankEn} of ${suitEn}`,
      },
    });
  }
}

const emptyFile = () => ({
  file: null,
  originalFileName: null,
  mediaType: null,
  width: null,
  height: null,
  bytes: null,
  sha256: null,
});

const cardIndex = {
  schemaVersion: "1.0",
  version: "1.0.0",
  cards,
};

const deck = {
  schemaVersion: "1.0",
  id: "rws-original",
  name: "Rider–Waite–Smith Original",
  authors: ["Arthur Edward Waite", "Pamela Colman Smith"],
  edition: null,
  publicationPeriod: "1909/1910",
  source: {
    status: "pending-review",
    title: null,
    url: null,
    publisher: null,
    retrievedAt: null,
  },
  license: {
    status: "pending-review",
    name: null,
    url: null,
    commercialUse: "unknown",
    modification: "unknown",
    redistribution: "unknown",
    attributionRequired: "unknown",
    notes: "具体扫描文件尚未完成来源与授权核验，不得进入正式发布包。",
  },
  sourceBatchId: null,
  version: "1.0.0",
  assetBuild: {
    format: "webp",
    maxWidth: 1200,
    quality: 84,
    fit: "inside",
    withoutEnlargement: true,
  },
};

const manifest = {
  schemaVersion: "2.0",
  deckId: deck.id,
  manifestVersion: "1.0.0",
  cardCount: cards.length,
  assets: Object.fromEntries(
    cards.map((card) => [
      card.id,
      {
        cardId: card.id,
        status: "pending-source",
        source: emptyFile(),
        web: emptyFile(),
      },
    ]),
  ),
};

const cardBacks = {
  schemaVersion: "1.0",
  deckId: deck.id,
  defaultBackId: null,
  backs: [],
  fallbackPolicy:
    "扫描批次没有授权明确的牌背时，使用独立审核的 Arcana 原创牌背，不从其他商业牌组拼接。",
};

async function writeJson(path, data) {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const outputPaths = [
  resolve(dataRoot, "card-index.json"),
  resolve(deckRoot, "deck.json"),
  resolve(deckRoot, "manifest.json"),
  resolve(deckRoot, "card-backs.json"),
];
if (!process.argv.includes("--force")) {
  const existing = [];
  for (const path of outputPaths) {
    try {
      await access(path);
      existing.push(path);
    } catch {}
  }
  if (existing.length > 0) {
    throw new Error(
      "RWS scaffold already exists. Refusing to overwrite source, license, or asset review data. Use --force only when intentionally resetting the scaffold.",
    );
  }
}

await mkdir(deckRoot, {recursive: true});
await Promise.all([
  writeJson(outputPaths[0], cardIndex),
  writeJson(outputPaths[1], deck),
  writeJson(outputPaths[2], manifest),
  writeJson(outputPaths[3], cardBacks),
]);

process.stdout.write(
  `Generated ${cards.length} stable card IDs and the ${deck.id} asset scaffold.\n`,
);
