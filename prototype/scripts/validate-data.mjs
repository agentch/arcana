import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import {migrateCatalogV1ToV2} from "./migrate-card-meanings-v1-to-v2.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

function assertSchema(ajv, schema, data, label) {
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    const details = ajv.errorsText(validate.errors, {separator: "\n"});
    throw new Error(`${label} does not match its JSON Schema:\n${details}`);
  }
}

const [
  meanings,
  deck,
  spreads,
  questionPrompts,
  meaningTopicMap,
  foolV2,
  meaningsSchema,
  meaningV2Schema,
  deckSchema,
  spreadsSchema,
  questionPromptsSchema,
  meaningTopicMapSchema,
] = await Promise.all([
  readJson("app/data/card-meanings.json"),
  readJson("app/data/deck-manifests/arcana-symbolic.json"),
  readJson("app/data/spreads.json"),
  readJson("app/data/question-prompts.json"),
  readJson("app/data/meaning-topic-map.json"),
  readJson("app/data/cards/major-00.json"),
  readJson("app/data/schemas/card-meanings.schema.json"),
  readJson("app/data/schemas/card-meaning-v2.schema.json"),
  readJson("app/data/schemas/deck-manifest.schema.json"),
  readJson("app/data/schemas/spreads.schema.json"),
  readJson("app/data/schemas/question-prompts.schema.json"),
  readJson("app/data/schemas/meaning-topic-map.schema.json"),
]);

const ajv = new Ajv2020({allErrors: true, strict: true});

assertSchema(ajv, meaningsSchema, meanings, "card-meanings.json");
assertSchema(ajv, meaningV2Schema, foolV2, "cards/major-00.json");
assertSchema(ajv, deckSchema, deck, "arcana-symbolic.json");
assertSchema(ajv, spreadsSchema, spreads, "spreads.json");
assertSchema(
  ajv,
  questionPromptsSchema,
  questionPrompts,
  "question-prompts.json",
);
assertSchema(
  ajv,
  meaningTopicMapSchema,
  meaningTopicMap,
  "meaning-topic-map.json",
);

const migratedDrafts = migrateCatalogV1ToV2(meanings);
for (const card of migratedDrafts) {
  assertSchema(
    ajv,
    meaningV2Schema,
    card,
    `migrated draft ${card.id}`,
  );
}

const cardIds = meanings.cards.map((card) => card.id);
assert.equal(new Set(cardIds).size, cardIds.length, "card IDs must be unique");
assert.deepEqual(
  cardIds,
  [...cardIds].sort(),
  "cards must be sorted by stable ID",
);
assert.deepEqual(
  Object.keys(deck.assets).sort(),
  [...cardIds].sort(),
  "the active deck must map every card meaning exactly once",
);
assert.equal(
  meanings.cards.some((card) => "image" in card || "deckId" in card),
  false,
  "card meanings must not contain deck or image fields",
);

const majorArcana = meanings.cards.filter((card) => card.arcana === "major");
if (majorArcana.length > 0) {
  assert.deepEqual(
    majorArcana.map((card) => card.number),
    Array.from({length: majorArcana.length}, (_, index) => index),
    "major arcana numbers must be continuous from 0",
  );
}

const spreadIds = spreads.spreads.map((spread) => spread.id);
const enabledSpreadIds = spreads.spreads
  .filter((spread) => spread.enabled)
  .map((spread) => spread.id);
assert.equal(
  new Set(spreadIds).size,
  spreadIds.length,
  "spread IDs must be unique",
);

for (const spread of spreads.spreads) {
  const positionIds = spread.positions.map((position) => position.id);
  assert.equal(
    new Set(positionIds).size,
    positionIds.length,
    `${spread.id} position IDs must be unique`,
  );
  assert.deepEqual(
    spread.positions.map((position) => position.order),
    spread.positions.map((_, index) => index + 1),
    `${spread.id} positions must use continuous order values`,
  );
}

const questionCategoryIds = questionPrompts.categories.map(
  (category) => category.id,
);
assert.deepEqual(
  questionCategoryIds,
  ["love", "career", "family", "mood"],
  "question categories must keep the agreed product order",
);
assert.equal(
  new Set(questionCategoryIds).size,
  questionCategoryIds.length,
  "question category IDs must be unique",
);
assert.deepEqual(
  Object.keys(meaningTopicMap.categoryToTopic),
  questionCategoryIds,
  "every active question category must have an explicit meaning topic mapping",
);
assert.equal(
  Object.values(meaningTopicMap.categoryToTopic).every((topicId) =>
    meaningTopicMap.availableTopics.includes(topicId),
  ),
  true,
  "question categories must only map to available meaning topics",
);
for (const category of questionPrompts.categories) {
  assert.equal(
    category.options.length,
    4,
    `${category.id} must provide four question options`,
  );
  assert.equal(
    new Set(category.options.map((option) => option.id)).size,
    category.options.length,
    `${category.id} option IDs must be unique`,
  );
  for (const option of category.options) {
    assert.ok(
      spreadIds.includes(option.recommendedSpreadId),
      `${category.id}/${option.id} references an unknown spread`,
    );
    assert.ok(
      enabledSpreadIds.includes(option.recommendedSpreadId),
      `${category.id}/${option.id} must recommend an enabled spread`,
    );
  }
}

assert.deepEqual(
  enabledSpreadIds,
  ["single-card", "timeline"],
  "only the completed single-card and timeline spreads may be enabled",
);

console.log(
  `Validated ${meanings.cards.length} v1 cards, ${migratedDrafts.length} v2 migration drafts, 1 complete v2 sample, ${Object.keys(deck.assets).length} deck assets, ${spreads.spreads.length} spreads, and ${questionPrompts.categories.length} question categories.`,
);
