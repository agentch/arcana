import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
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

test("the complete Fool sample satisfies the layered v2 schema", async () => {
  const [schema, fool] = await Promise.all([
    readJson("../app/data/schemas/card-meaning-v2.schema.json"),
    readJson("../app/data/cards/major-00.json"),
  ]);
  const validate = new Ajv2020({allErrors: true, strict: true}).compile(schema);

  assert.equal(
    validate(fool),
    true,
    JSON.stringify(validate.errors, null, 2),
  );
  assert.deepEqual(Object.keys(fool.topics), [
    "love",
    "career",
    "family",
    "mood",
    "finance",
    "growth",
  ]);
  assert.equal(fool.core.symbols.length, 4);
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
