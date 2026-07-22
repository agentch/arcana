import {mkdir, readFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const cardIndex = JSON.parse(
  await readFile(resolve(root, "../packages/tarot-core/src/data/card-index.json"), "utf8"),
);
const output = resolve(
  process.cwd(),
  process.argv[2] ?? "outputs/rws-original-review-sheet.jpg",
);
const columns = 13;
const rows = 6;
const cellWidth = 92;
const cellHeight = 164;
const imageWidth = 82;
const imageHeight = 145;

const composites = await Promise.all(
  cardIndex.cards.map(async (card, index) => ({
    input: await sharp(
      resolve(root, `public/tarot/rws-original/${card.id}.webp`),
    )
      .resize(imageWidth, imageHeight, {
        fit: "contain",
        background: "#171127",
      })
      .jpeg({quality: 88})
      .toBuffer(),
    left: (index % columns) * cellWidth + 5,
    top: Math.floor(index / columns) * cellHeight + 5,
  })),
);

await mkdir(dirname(output), {recursive: true});
await sharp({
  create: {
    width: columns * cellWidth,
    height: rows * cellHeight,
    channels: 3,
    background: "#171127",
  },
})
  .composite(composites)
  .jpeg({quality: 90})
  .toFile(output);

process.stdout.write(`${output}\n`);
