import cardMeaningsJson from "../data/card-meanings.json";
import {layeredCardMeanings} from "../data/cards/registry";
import activeDeckJson from "../data/deck-manifests/rws-original.json";
import meaningTopicMapJson from "../data/meaning-topic-map.json";
import questionPromptsJson from "../data/question-prompts.json";
import spreadsJson from "../data/spreads.json";
import type {
  CardMeaning,
  DeckManifest,
  LayeredCardMeaning,
  MeaningTopicId,
  QuestionCategory,
  RenderableCard,
  SpreadDefinition,
} from "./tarot";

const cardMeanings = cardMeaningsJson.cards as CardMeaning[];
const deck = activeDeckJson as DeckManifest;
const spreads = spreadsJson.spreads as SpreadDefinition[];
const questionCategories =
  questionPromptsJson.categories as QuestionCategory[];
const layeredMeanings = new Map(
  layeredCardMeanings.map((meaning) => [
    meaning.id,
    meaning,
  ]),
);
for (const card of cardMeanings) {
  if (!layeredMeanings.has(card.id)) {
    throw new Error(`Missing layered card meaning for ${card.id}`);
  }
}
const majorContentVersions = new Set(
  layeredCardMeanings
    .filter((meaning) => meaning.arcana === "major")
    .map((meaning) => meaning.contentVersion),
);
const minorContentVersions = new Set(
  layeredCardMeanings
    .filter((meaning) => meaning.arcana === "minor")
    .map((meaning) => meaning.contentVersion),
);
if (majorContentVersions.size !== 1) {
  throw new Error("Major layered meanings must use one content version");
}
if (minorContentVersions.size > 1) {
  throw new Error("Minor layered meanings must use one content version");
}
const layeredContentVersion =
  cardMeaningsJson.contentVersion ??
  [...majorContentVersions][0] ??
  [...minorContentVersions][0];
const categoryToTopic = meaningTopicMapJson.categoryToTopic as Record<
  QuestionCategory["id"],
  MeaningTopicId
>;

export const catalogVersions = {
  content: layeredContentVersion,
  deck: deck.version,
  spreads: spreadsJson.spreadsVersion,
  prompts: questionPromptsJson.promptsVersion,
} as const;

export const activeDeck = {
  id: deck.id,
  name: deck.name,
  version: deck.version,
} as const;

export function getCards(): RenderableCard[] {
  return cardMeanings.map((meaning) => {
    const asset = deck.assets[meaning.id];
    if (!asset) {
      throw new Error(`Deck ${deck.id} is missing asset mapping for ${meaning.id}`);
    }
    return { ...meaning, asset };
  });
}

export function getSpread(spreadId: string): SpreadDefinition {
  const spread = spreads.find((item) => item.id === spreadId);
  if (!spread) throw new Error(`Unknown spread: ${spreadId}`);
  return spread;
}

export function getEnabledSpreads(): SpreadDefinition[] {
  return spreads.filter((spread) => spread.enabled);
}

export function getQuestionCategories(): QuestionCategory[] {
  return questionCategories;
}

export function getLayeredMeaning(
  cardId: string,
): LayeredCardMeaning | undefined {
  return layeredMeanings.get(cardId);
}

export function getMeaningTopic(
  questionCategoryId: string,
): MeaningTopicId | undefined {
  return categoryToTopic[questionCategoryId as QuestionCategory["id"]];
}
