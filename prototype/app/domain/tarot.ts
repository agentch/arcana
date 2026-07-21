export type Orientation = "upright" | "reversed";
export type MeaningTopicId =
  | "love"
  | "career"
  | "family"
  | "mood"
  | "finance"
  | "growth";

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
  fallbackSymbol?: string;
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

export type LayeredOrientationMeaning = {
  keywords: string[];
  overview: string;
  light: string;
  shadow: string;
  advice: string[];
  reflection: string;
};

export type LayeredCardMeaning = {
  schemaVersion: "2.0";
  contentVersion: string;
  id: string;
  arcana: "major" | "minor";
  number: number;
  romanNumeral?: string;
  suit?: "wands" | "cups" | "swords" | "pentacles";
  rank?: string;
  name: {
    zh: string;
    en: string;
  };
  core: {
    summary: string;
    symbols: Array<{
      name: string;
      meaning: string;
    }>;
    element: string;
  };
  upright: LayeredOrientationMeaning;
  reversed: LayeredOrientationMeaning;
  topics: Partial<
    Record<MeaningTopicId, Record<Orientation, string>>
  >;
  editorial: {
    status: "draft" | "in-review" | "approved";
    lastReviewedAt: string | null;
    sourceNotes?: string;
  };
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
  visual?: {
    cards: Array<{
      x: number;
      y: number;
      rotation?: number;
    }>;
  };
};

export type QuestionCategory = {
  id: "love" | "career" | "family" | "mood";
  name: string;
  description: string;
  options: Array<{
    id: string;
    name: string;
    prompt: string;
    recommendedSpreadId: string;
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
  cardNames: string[];
  createdAt: string;
  contentVersion: string;
  deckId: string;
  deckVersion: string;
  spreadId: string;
  spreadVersion: string;
};
