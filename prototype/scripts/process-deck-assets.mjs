import {createHash} from "node:crypto";
import {copyFile, mkdir, readFile, stat, writeFile} from "node:fs/promises";
import {dirname, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const deckRoot = resolve(root, "app/data/decks/rws-original");
const deckPath = resolve(deckRoot, "deck.json");
const manifestPath = resolve(deckRoot, "manifest.json");
const cardIndexPath = resolve(root, "app/data/card-index.json");
const activeDeckPath = resolve(
  root,
  "app/data/deck-manifests/rws-original.json",
);
const publicRoot = resolve(root, "public/tarot/rws-original");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function resolveDeckFile(relativePath, expectedDirectory) {
  if (
    typeof relativePath !== "string" ||
    !relativePath.startsWith(`${expectedDirectory}/`) ||
    relativePath.includes("..")
  ) {
    throw new Error(
      `Asset path must stay inside ${expectedDirectory}/: ${relativePath}`,
    );
  }

  const absolutePath = resolve(deckRoot, relativePath);
  if (!absolutePath.startsWith(`${resolve(deckRoot, expectedDirectory)}${sep}`)) {
    throw new Error(`Asset path escapes the deck directory: ${relativePath}`);
  }
  return absolutePath;
}

function mediaTypeFor(format) {
  const formats = {
    jpeg: "image/jpeg",
    png: "image/png",
    tiff: "image/tiff",
    webp: "image/webp",
  };
  const mediaType = formats[format];
  if (!mediaType) throw new Error(`Unsupported image format: ${format}`);
  return mediaType;
}

async function inspectFile(relativePath, expectedDirectory) {
  const absolutePath = resolveDeckFile(relativePath, expectedDirectory);
  const [fileStat, metadata, digest] = await Promise.all([
    stat(absolutePath),
    sharp(absolutePath).metadata(),
    sha256(absolutePath),
  ]);

  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error(`Cannot read image metadata: ${relativePath}`);
  }

  return {
    file: relativePath,
    mediaType: mediaTypeFor(metadata.format),
    width: metadata.width,
    height: metadata.height,
    bytes: fileStat.size,
    sha256: digest,
  };
}

function assertPendingFile(file, label) {
  for (const [key, value] of Object.entries(file)) {
    if (value !== null) {
      throw new Error(`${label}.${key} must stay null while pending source review`);
    }
  }
}

function assertRecordedFile(recorded, actual, label) {
  for (const key of ["file", "mediaType", "width", "height", "bytes", "sha256"]) {
    if (recorded[key] !== actual[key]) {
      throw new Error(
        `${label}.${key} mismatch: manifest=${recorded[key]} actual=${actual[key]}`,
      );
    }
  }
}

export async function verifyAssets() {
  const [deck, manifest] = await Promise.all([
    readJson(deckPath),
    readJson(manifestPath),
  ]);
  const assets = Object.values(manifest.assets);

  for (const asset of assets) {
    if (asset.status === "pending-source") {
      assertPendingFile(asset.source, `${asset.cardId}.source`);
      assertPendingFile(asset.web, `${asset.cardId}.web`);
      continue;
    }

    if (!asset.source.file) {
      throw new Error(`${asset.cardId} is ${asset.status} without a source file`);
    }
    const sourceActual = await inspectFile(asset.source.file, "source");
    assertRecordedFile(asset.source, sourceActual, `${asset.cardId}.source`);

    if (asset.status === "source-ready") {
      assertPendingFile(asset.web, `${asset.cardId}.web`);
      continue;
    }

    if (!asset.web.file) {
      throw new Error(`${asset.cardId} is ${asset.status} without a web file`);
    }
    const webActual = await inspectFile(asset.web.file, "web");
    assertRecordedFile(asset.web, webActual, `${asset.cardId}.web`);
    if (webActual.mediaType !== "image/webp") {
      throw new Error(`${asset.cardId}.web must be image/webp`);
    }
    if (
      asset.status === "approved" &&
      (deck.source.status !== "verified" || deck.license.status !== "approved")
    ) {
      throw new Error(
        `${asset.cardId} cannot be approved before source and license verification`,
      );
    }
  }

  return {
    total: assets.length,
    pending: assets.filter((asset) => asset.status === "pending-source").length,
    sourceReady: assets.filter((asset) => asset.status === "source-ready").length,
    webReady: assets.filter((asset) => asset.status === "web-ready").length,
    approved: assets.filter((asset) => asset.status === "approved").length,
  };
}

async function syncPublicAssets(deck, manifest, cardIndex) {
  await mkdir(publicRoot, {recursive: true});
  for (const asset of Object.values(manifest.assets)) {
    if (asset.status !== "web-ready" && asset.status !== "approved") {
      throw new Error(`${asset.cardId} is not ready for public asset sync`);
    }
    const webPath = resolveDeckFile(asset.web.file, "web");
    await copyFile(webPath, resolve(publicRoot, `${asset.cardId}.webp`));
  }

  const activeDeck = {
    schemaVersion: "1.0",
    id: deck.id,
    name: deck.name,
    edition: deck.edition,
    version: deck.version,
    author: "Pamela Colman Smith",
    license: deck.license.name,
    assets: Object.fromEntries(
      cardIndex.cards.map((card) => [
        card.id,
        {
          image: `/tarot/rws-original/${card.id}.webp`,
          alt: `${card.name.zh}（${card.name.en}）Rider-Waite-Smith 牌面`,
        },
      ]),
    ),
  };
  await writeFile(
    activeDeckPath,
    `${JSON.stringify(activeDeck, null, 2)}\n`,
    "utf8",
  );
}

async function buildWebAssets({rebuild = false} = {}) {
  const [deck, manifest, cardIndex] = await Promise.all([
    readJson(deckPath),
    readJson(manifestPath),
    readJson(cardIndexPath),
  ]);
  let built = 0;
  await mkdir(resolve(deckRoot, "web"), {recursive: true});
  await mkdir(publicRoot, {recursive: true});

  for (const asset of Object.values(manifest.assets)) {
    if (
      asset.status !== "source-ready" &&
      !(rebuild && (asset.status === "web-ready" || asset.status === "approved"))
    ) {
      continue;
    }
    if (!asset.source.file) {
      throw new Error(`${asset.cardId} has no configured source file`);
    }

    const sourcePath = resolveDeckFile(asset.source.file, "source");
    const webFile = `web/${asset.cardId}.webp`;
    const webPath = resolveDeckFile(webFile, "web");

    await sharp(sourcePath)
      .rotate()
      .resize({
        width: deck.assetBuild.maxWidth,
        fit: deck.assetBuild.fit,
        withoutEnlargement: deck.assetBuild.withoutEnlargement,
      })
      .webp({quality: deck.assetBuild.quality})
      .toFile(webPath);
    asset.web = {
      ...(await inspectFile(webFile, "web")),
      originalFileName: null,
    };
    asset.status = "web-ready";
    built += 1;
  }

  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await syncPublicAssets(deck, manifest, cardIndex);
  return built;
}

async function approveAssets() {
  const [deck, manifest] = await Promise.all([
    readJson(deckPath),
    readJson(manifestPath),
  ]);
  if (deck.source.status !== "verified" || deck.license.status !== "approved") {
    throw new Error("Source and license must be approved before asset approval");
  }
  const invalid = Object.values(manifest.assets).filter(
    (asset) => asset.status !== "web-ready" && asset.status !== "approved",
  );
  if (invalid.length > 0) {
    throw new Error(`${invalid.length} assets are not ready for approval`);
  }
  for (const asset of Object.values(manifest.assets)) {
    asset.status = "approved";
  }
  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  const result = await verifyAssets();
  return result.approved;
}

const command = process.argv[2] ?? "verify";
if (command === "verify") {
  const result = await verifyAssets();
  process.stdout.write(
    `Verified ${result.total} asset slots: ${result.pending} pending, ${result.sourceReady} source-ready, ${result.webReady} web-ready, ${result.approved} approved.\n`,
  );
} else if (command === "build-web") {
  const built = await buildWebAssets();
  const result = await verifyAssets();
  process.stdout.write(
    `Built ${built} WebP files. Verified ${result.total} asset slots.\n`,
  );
} else if (command === "rebuild-web") {
  const built = await buildWebAssets({rebuild: true});
  const result = await verifyAssets();
  process.stdout.write(
    `Rebuilt ${built} WebP files. Verified ${result.total} asset slots.\n`,
  );
} else if (command === "approve") {
  const approved = await approveAssets();
  process.stdout.write(`Approved ${approved} verified RWS assets.\n`);
} else if (command === "sync-public") {
  const [deck, manifest, cardIndex] = await Promise.all([
    readJson(deckPath),
    readJson(manifestPath),
    readJson(cardIndexPath),
  ]);
  await syncPublicAssets(deck, manifest, cardIndex);
  process.stdout.write(`Synced ${manifest.cardCount} public RWS assets.\n`);
} else {
  throw new Error(`Unknown command: ${command}`);
}
