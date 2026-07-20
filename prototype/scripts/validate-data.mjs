import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

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
  meaningsSchema,
  deckSchema,
  spreadsSchema,
] = await Promise.all([
  readJson("app/data/card-meanings.json"),
  readJson("app/data/deck-manifests/arcana-symbolic.json"),
  readJson("app/data/spreads.json"),
  readJson("app/data/schemas/card-meanings.schema.json"),
  readJson("app/data/schemas/deck-manifest.schema.json"),
  readJson("app/data/schemas/spreads.schema.json"),
]);

const ajv = new Ajv2020({allErrors: true, strict: true});

assertSchema(ajv, meaningsSchema, meanings, "card-meanings.json");
assertSchema(ajv, deckSchema, deck, "arcana-symbolic.json");
assertSchema(ajv, spreadsSchema, spreads, "spreads.json");

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

console.log(
  `Validated ${meanings.cards.length} cards, ${Object.keys(deck.assets).length} deck assets, and ${spreads.spreads.length} spreads.`,
);
