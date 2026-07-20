import {createHash} from "node:crypto";
import {mkdir, readFile, rename, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const deckRoot = resolve(root, "app/data/decks/rws-original");
const auditPath = resolve(deckRoot, "source-audit.json");
const deckPath = resolve(deckRoot, "deck.json");
const manifestPath = resolve(deckRoot, "manifest.json");
const sourceRoot = resolve(deckRoot, "source");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest("hex");
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function fetchWithRetry(file) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(file.originalUrl, {
      headers: {
        "User-Agent":
          "ArcanaTarotAssetAudit/1.0 (source verification; Wikimedia Commons)",
      },
    });
    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500) {
      throw new Error(
        `${file.cardId} download failed: ${response.status} ${response.statusText}`,
      );
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : Math.min(30_000, 2_000 * 2 ** attempt);
    await wait(delay);
  }
  throw new Error(`${file.cardId} download failed after six attempts`);
}

async function readExisting(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function download(file) {
  const target = resolve(sourceRoot, `${file.cardId}.jpg`);
  let bytes = await readExisting(target);

  if (!bytes || digest("sha1", bytes) !== file.sha1) {
    const response = await fetchWithRetry(file);
    bytes = Buffer.from(await response.arrayBuffer());
    const temporary = `${target}.part`;
    await writeFile(temporary, bytes);
    await rename(temporary, target);
    await wait(750);
  }

  const sha1 = digest("sha1", bytes);
  if (sha1 !== file.sha1) {
    throw new Error(
      `${file.cardId} Commons SHA-1 mismatch: expected ${file.sha1}, received ${sha1}`,
    );
  }
  if (bytes.byteLength !== file.bytes) {
    throw new Error(
      `${file.cardId} byte count mismatch: expected ${file.bytes}, received ${bytes.byteLength}`,
    );
  }

  const metadata = await sharp(bytes).metadata();
  if (
    metadata.format !== "jpeg" ||
    metadata.width !== file.width ||
    metadata.height !== file.height
  ) {
    throw new Error(`${file.cardId} image metadata differs from the source audit`);
  }

  return {
    cardId: file.cardId,
    source: {
      file: `source/${file.cardId}.jpg`,
      originalFileName: file.title.replace(/^File:/, ""),
      mediaType: file.mimeType,
      width: metadata.width,
      height: metadata.height,
      bytes: bytes.byteLength,
      sha256: digest("sha256", bytes),
    },
  };
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({length: Math.min(concurrency, items.length)}, () => run()),
  );
  return results;
}

const [audit, deck, manifest] = await Promise.all([
  readJson(auditPath),
  readJson(deckPath),
  readJson(manifestPath),
]);

if (deck.license.status !== "approved") {
  throw new Error("RWS source license must be approved before downloading");
}
if (deck.sourceBatchId !== audit.sourceBatchId) {
  throw new Error("Deck metadata does not match the audited Commons batch");
}

await mkdir(sourceRoot, {recursive: true});
const downloaded = await mapWithConcurrency(audit.files, 1, download);

for (const result of downloaded) {
  const asset = manifest.assets[result.cardId];
  if (!asset) throw new Error(`Manifest is missing ${result.cardId}`);
  asset.source = result.source;
  asset.web = {
    file: null,
    originalFileName: null,
    mediaType: null,
    width: null,
    height: null,
    bytes: null,
    sha256: null,
  };
  asset.status = "source-ready";
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(
  `Downloaded and verified ${downloaded.length} RWS source files from ${audit.sourceBatchId}.\n`,
);
