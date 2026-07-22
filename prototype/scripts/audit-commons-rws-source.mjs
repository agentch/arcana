import {createHash} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const root = resolve(import.meta.dirname, "..");
const inputIndex = process.argv.indexOf("--input");
const inputPath =
  inputIndex === -1 ? null : resolve(process.cwd(), process.argv[inputIndex + 1]);
if (!inputPath) {
  throw new Error(
    "Provide a Wikimedia Commons API response with --input <path>. Network retrieval is intentionally separate from normalization.",
  );
}

const [apiResponse, cardIndex] = await Promise.all([
  readFile(inputPath, "utf8").then(JSON.parse),
  readFile(resolve(root, "../packages/tarot-core/src/data/card-index.json"), "utf8").then(JSON.parse),
]);

const rankByNumber = [
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

function cardIdForTitle(title) {
  const major = title.match(/^File:RWS Tarot (\d{2}) /);
  if (major) return `major-${major[1]}`;

  const minor = title.match(/^File:(Cups|Pents|Swords|Wands)(\d{2})\.jpg$/);
  if (!minor) throw new Error(`Unrecognized Commons file title: ${title}`);
  const suit = {
    Cups: "cups",
    Pents: "pentacles",
    Swords: "swords",
    Wands: "wands",
  }[minor[1]];
  const rank = rankByNumber[Number(minor[2]) - 1];
  if (!rank) throw new Error(`Invalid minor arcana rank: ${title}`);
  return `minor-${suit}-${rank}`;
}

function plainText(html) {
  return html?.replace(/<[^>]+>/g, "").trim();
}

const normalized = apiResponse.query.pages.map((page) => {
  const image = page.imageinfo[0];
  const metadata = image.extmetadata;
  const categories = metadata.Categories?.value ?? "";
  return {
    cardId: cardIdForTitle(page.title),
    title: page.title,
    filePageUrl: image.descriptionurl,
    originalUrl: image.url,
    sha1: image.sha1,
    width: image.width,
    height: image.height,
    bytes: image.size,
    mimeType: image.mime,
    revisionUser: image.user,
    revisionTimestamp: image.timestamp,
    licenseShortName: metadata.LicenseShortName?.value,
    usageTerms: metadata.UsageTerms?.value,
    publicDomainMark: categories.includes("CC-PD-Mark"),
    pdOld80Expired: categories.includes("PD-old-80-expired"),
    artist: plainText(metadata.Artist?.value),
    workDate: metadata.DateTimeOriginal?.value,
  };
});

const byCardId = new Map(normalized.map((file) => [file.cardId, file]));
const files = cardIndex.cards.map((card) => {
  const file = byCardId.get(card.id);
  if (!file) throw new Error(`Commons set is missing ${card.id}`);
  const {artist, workDate, ...auditedFile} = file;
  if (artist !== "Pamela Colman Smith" || workDate !== "1910") {
    throw new Error(`${card.id} has inconsistent artist or work date`);
  }
  return auditedFile;
});
if (files.length !== 78 || byCardId.size !== 78) {
  throw new Error(`Expected 78 unique files, received ${byCardId.size}`);
}

const batchDigest = createHash("sha256")
  .update(files.map((file) => `${file.cardId}:${file.sha1}`).join("\n"))
  .digest("hex");
const widths = files.map((file) => file.width);
const heights = files.map((file) => file.height);
const audit = {
  schemaVersion: "1.0",
  deckId: "rws-original",
  auditVersion: "1.0.0",
  auditedAt: "2026-07-20",
  status: "verified-candidate",
  category: {
    title: "Rider-Waite-Smith tarot deck (TaionWC)",
    url: "https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck_(TaionWC)",
    description:
      "Wikimedia Commons image set for scans of the Pam-A version, uploaded as a set by TaionWC.",
  },
  sourceBatchId: `commons-taionwc-${batchDigest}`,
  summary: {
    fileCount: files.length,
    mimeType: "image/jpeg",
    licenseShortName: "Public domain",
    usageTerms: "Public domain",
    artist: "Pamela Colman Smith",
    workDate: "1910",
    widthRange: [Math.min(...widths), Math.max(...widths)],
    heightRange: [Math.min(...heights), Math.max(...heights)],
  },
  files,
};

await writeFile(
  resolve(root, "../packages/tarot-core/src/data/decks/rws-original/source-audit.json"),
  `${JSON.stringify(audit, null, 2)}\n`,
  "utf8",
);
process.stdout.write(
  `Audited ${files.length} Commons files as batch ${audit.sourceBatchId}.\n`,
);
