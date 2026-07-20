import cardMeaningsJson from "../data/card-meanings.json";
import foolMeaningV2Json from "../data/cards/major-00.json";
import prototypeDeckJson from "../data/deck-manifests/arcana-symbolic.json";
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
const deck = prototypeDeckJson as DeckManifest;
const spreads = spreadsJson.spreads as SpreadDefinition[];
const questionCategories =
  questionPromptsJson.categories as QuestionCategory[];
const layeredMeanings = new Map(
  [foolMeaningV2Json as LayeredCardMeaning].map((meaning) => [
    meaning.id,
    meaning,
  ]),
);
const categoryToTopic = meaningTopicMapJson.categoryToTopic as Record<
  QuestionCategory["id"],
  MeaningTopicId
>;

export const catalogVersions = {
  content: cardMeaningsJson.contentVersion,
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
