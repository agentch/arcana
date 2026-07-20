import cardMeaningsJson from "../data/card-meanings.json";
import prototypeDeckJson from "../data/deck-manifests/arcana-symbolic.json";
import spreadsJson from "../data/spreads.json";
import type {
  CardMeaning,
  DeckManifest,
  RenderableCard,
  SpreadDefinition,
} from "./tarot";

const cardMeanings = cardMeaningsJson.cards as CardMeaning[];
const deck = prototypeDeckJson as DeckManifest;
const spreads = spreadsJson.spreads as SpreadDefinition[];

export const catalogVersions = {
  content: cardMeaningsJson.contentVersion,
  deck: deck.version,
  spreads: spreadsJson.spreadsVersion,
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
