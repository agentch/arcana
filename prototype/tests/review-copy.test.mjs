import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const blockedTerms = [
  "占卜",
  "算命",
  "预言",
  "预测",
  "启示",
  "神谕",
  "疗愈",
  "缘分",
  "未来趋势",
  "发展趋势",
  "塔罗",
];

const runtimeRoots = [
  new URL("../../app/src/", import.meta.url),
  new URL("../app/", import.meta.url),
  new URL("../../packages/tarot-core/src/domain/", import.meta.url),
  new URL("../../packages/tarot-core/src/data/cards/", import.meta.url),
];

const runtimeFiles = [
  new URL(
    "../../packages/tarot-core/src/data/card-meanings.json",
    import.meta.url,
  ),
  new URL(
    "../../packages/tarot-core/src/data/question-prompts.json",
    import.meta.url,
  ),
  new URL("../../packages/tarot-core/src/data/spreads.json", import.meta.url),
];

async function collectRuntimeFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = new URL(entry.name, directory);
    if (entry.isDirectory()) {
      files.push(
        ...(await collectRuntimeFiles(new URL(`${entry.name}/`, directory))),
      );
      continue;
    }
    if (/\.(?:json|ts|tsx)$/.test(entry.name)) files.push(target);
  }
  return files;
}

test("runtime copy stays aligned with the non-predictive product position", async () => {
  const files = [
    ...runtimeFiles,
    ...(await Promise.all(runtimeRoots.map(collectRuntimeFiles))).flat(),
  ];
  const issues = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const term of blockedTerms) {
      if (content.includes(term)) {
        issues.push(`${file.pathname}: ${term}`);
      }
    }
  }

  assert.deepEqual(issues, []);
});
