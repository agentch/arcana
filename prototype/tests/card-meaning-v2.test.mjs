import assert from "node:assert/strict";
import {readdir, readFile} from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import {
  migrateCardV1ToV2,
  migrateCatalogV1ToV2,
} from "../scripts/migrate-card-meanings-v1-to-v2.mjs";

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(new URL(relativePath, import.meta.url), "utf8"),
  );
}

test("all major arcana meanings satisfy the layered v2 schema", async () => {
  const [schema, catalog, filenames] = await Promise.all([
    readJson("../app/data/schemas/card-meaning-v2.schema.json"),
    readJson("../app/data/card-meanings.json"),
    readdir(new URL("../app/data/cards/", import.meta.url)),
  ]);
  const validate = new Ajv2020({allErrors: true, strict: true}).compile(schema);
  const majorFilenames = filenames
    .filter((filename) => /^major-\d{2}\.json$/.test(filename))
    .sort();
  const meanings = await Promise.all(
    majorFilenames.map((filename) =>
      readJson(`../app/data/cards/${filename}`),
    ),
  );

  assert.equal(meanings.length, 22);
  assert.deepEqual(
    meanings.map((meaning) => meaning.id),
    catalog.cards.map((card) => card.id),
  );
  for (const meaning of meanings) {
    assert.equal(
      validate(meaning),
      true,
      `${meaning.id}: ${JSON.stringify(validate.errors, null, 2)}`,
    );
    assert.deepEqual(Object.keys(meaning.topics), [
      "love",
      "career",
      "family",
      "mood",
      "finance",
      "growth",
    ]);
    assert.equal(meaning.core.symbols.length, 4);
    assert.doesNotMatch(JSON.stringify(meaning), /待编辑|待补充/);
    assert.equal(meaning.editorial.status, "approved");
    assert.equal(meaning.editorial.lastReviewedAt, "2026-07-21");
    assert.equal(meaning.contentVersion, "1.1.0");
  }
});

test("wands minor arcana meanings satisfy the layered v2 schema", async () => {
  const [schema, cardIndex, filenames] = await Promise.all([
    readJson("../app/data/schemas/card-meaning-v2.schema.json"),
    readJson("../app/data/card-index.json"),
    readdir(new URL("../app/data/cards/", import.meta.url)),
  ]);
  const validate = new Ajv2020({allErrors: true, strict: true}).compile(schema);
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
  const wandsFilenames = filenames.filter((filename) =>
    /^minor-wands-[a-z]+\.json$/.test(filename),
  );
  const meanings = (
    await Promise.all(
      wandsFilenames.map((filename) =>
        readJson(`../app/data/cards/${filename}`),
      ),
    )
  ).sort(
    (left, right) =>
      rankOrder.indexOf(left.rank) - rankOrder.indexOf(right.rank),
  );
  const indexWands = cardIndex.cards.filter((card) => card.suit === "wands");

  assert.equal(meanings.length, 14);
  assert.deepEqual(
    meanings.map((meaning) => meaning.id),
    indexWands.map((card) => card.id),
  );
  for (const meaning of meanings) {
    assert.equal(
      validate(meaning),
      true,
      `${meaning.id}: ${JSON.stringify(validate.errors, null, 2)}`,
    );
    assert.equal(meaning.arcana, "minor");
    assert.equal(meaning.suit, "wands");
    assert.equal(meaning.core.element, "火");
    assert.deepEqual(Object.keys(meaning.topics), [
      "love",
      "career",
      "family",
      "mood",
      "finance",
      "growth",
    ]);
    assert.equal(meaning.editorial.status, "approved");
    assert.equal(meaning.contentVersion, "1.0.0");
    assert.equal(meaning.romanNumeral, undefined);
  }
});

test("v1 migration preserves identity and reviewed source copy", async () => {
  const catalog = await readJson("../app/data/card-meanings.json");
  const source = catalog.cards[0];
  const migrated = migrateCardV1ToV2(source);

  assert.equal(migrated.id, source.id);
  assert.equal(migrated.name.zh, source.name);
  assert.equal(migrated.name.en, source.englishName);
  assert.equal(migrated.upright.overview, source.meaning.upright);
  assert.equal(migrated.reversed.overview, source.meaning.reversed);
  assert.deepEqual(migrated.upright.advice, [source.advice.upright]);
  assert.equal(migrated.editorial.status, "draft");
});

test("the migration can scaffold every current card", async () => {
  const [catalog, schema] = await Promise.all([
    readJson("../app/data/card-meanings.json"),
    readJson("../app/data/schemas/card-meaning-v2.schema.json"),
  ]);
  const migrated = migrateCatalogV1ToV2(catalog);
  const validate = new Ajv2020({allErrors: true, strict: true}).compile(schema);

  assert.equal(migrated.length, catalog.cards.length);
  for (const card of migrated) {
    assert.equal(
      validate(card),
      true,
      `${card.id}: ${JSON.stringify(validate.errors, null, 2)}`,
    );
  }
});
