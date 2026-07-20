export type Orientation = "upright" | "reversed";

export type CardMeaning = {
  id: string;
  arcana: "major" | "minor";
  number: number;
  romanNumeral: string;
  name: string;
  englishName: string;
  keywords: Record<Orientation, string[]>;
  meaning: Record<Orientation, string>;
  advice: Record<Orientation, string>;
};

export type CardAsset = {
  image: string | null;
  fallbackSymbol: string;
  alt: string;
};

export type DeckManifest = {
  schemaVersion: string;
  id: string;
  name: string;
  edition: string;
  version: string;
  author: string;
  license: string;
  assets: Record<string, CardAsset>;
};

export type RenderableCard = CardMeaning & {
  asset: CardAsset;
};

export type SpreadPosition = {
  id: string;
  name: string;
  prompt: string;
  order: number;
};

export type SpreadDefinition = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  supportedTopics: string[];
  positions: SpreadPosition[];
};

export type QuestionCategory = {
  id: string;
  name: string;
  description: string;
  options: Array<{
    id: string;
    name: string;
    prompt: string;
  }>;
};

export type DrawnCard = {
  cardId: string;
  orientation: Orientation;
  positionId: string;
};

export type Reading = {
  id: string;
  question: string;
  questionCategoryId: string;
  questionOptionId: string;
  cards: DrawnCard[];
  cardName: string;
  createdAt: string;
  contentVersion: string;
  deckId: string;
  deckVersion: string;
  spreadId: string;
  spreadVersion: string;
};
