import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Arcana prototype shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /Arcana/);
  assert.match(html, /在牌面中/);
  assert.match(html, /开始一次占卜/);
  assert.match(html, /仅供娱乐与自我探索/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
});

test("keeps meanings, deck assets, and spreads referentially valid", async () => {
  const [meanings, deck, spreads] = await Promise.all([
    readFile(new URL("../app/data/card-meanings.json", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../app/data/deck-manifests/rws-original.json",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../app/data/spreads.json", import.meta.url), "utf8"),
  ]).then((files) => files.map((content) => JSON.parse(content)));

  const cardIds = meanings.cards.map((card) => card.id);
  assert.equal(new Set(cardIds).size, cardIds.length, "card IDs must be unique");
  assert.deepEqual(
    Object.keys(deck.assets).sort(),
    [...cardIds].sort(),
    "the active deck must map every card meaning exactly once",
  );

  assert.equal(
    meanings.cards.some((card) => "image" in card),
    false,
    "card meanings must not contain image fields",
  );

  for (const spread of spreads.spreads) {
    assert.ok(spread.positions.length > 0, `${spread.id} needs positions`);
    assert.equal(
      new Set(spread.positions.map((position) => position.id)).size,
      spread.positions.length,
      `${spread.id} position IDs must be unique`,
    );
    assert.deepEqual(
      spread.positions.map((position) => position.order),
      spread.positions.map((_, index) => index + 1),
      `${spread.id} positions must use continuous order values`,
    );
  }

  assert.deepEqual(
    spreads.spreads.filter((spread) => spread.enabled).map((spread) => spread.id),
    ["single-card", "timeline", "sacred-triangle", "relationship-five"],
  );
});
