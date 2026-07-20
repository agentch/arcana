import type {
  LayeredCardMeaning,
  MeaningTopicId,
  Orientation,
  RenderableCard,
  SpreadPosition,
} from "./tarot";

export type InterpretationSymbol = {
  name: string;
  meaning: string;
};

export type InterpretationView = {
  cardId: string;
  cardName: string;
  orientation: Orientation;
  orientationName: "正位" | "逆位";
  positionName: string;
  keywords: string[];
  summary: string;
  overview: string;
  topicText?: string;
  positionText: string;
  light?: string;
  shadow?: string;
  symbols: InterpretationSymbol[];
  advice: string[];
  reflection?: string;
  source: "layered-v2" | "legacy-v1";
};

type ComposeInterpretationInput = {
  card: RenderableCard;
  layeredMeaning?: LayeredCardMeaning;
  orientation: Orientation;
  topicId?: MeaningTopicId;
  position: SpreadPosition;
};

function legacySummary(text: string): string {
  const characters = Array.from(text);
  return characters.length <= 50
    ? text
    : `${characters.slice(0, 49).join("")}…`;
}

export function composeInterpretation({
  card,
  layeredMeaning,
  orientation,
  topicId,
  position,
}: ComposeInterpretationInput): InterpretationView {
  const orientationName = orientation === "upright" ? "正位" : "逆位";
  const positionText = `在“${position.name}”位置，请把注意力放在：${position.prompt}。`;

  if (!layeredMeaning) {
    const overview = card.meaning[orientation];
    return {
      cardId: card.id,
      cardName: card.name,
      orientation,
      orientationName,
      positionName: position.name,
      keywords: card.keywords[orientation],
      summary: legacySummary(overview),
      overview,
      positionText,
      symbols: [],
      advice: [card.advice[orientation]],
      source: "legacy-v1",
    };
  }

  const orientedMeaning = layeredMeaning[orientation];
  return {
    cardId: card.id,
    cardName: layeredMeaning.name.zh,
    orientation,
    orientationName,
    positionName: position.name,
    keywords: orientedMeaning.keywords,
    summary: layeredMeaning.core.summary,
    overview: orientedMeaning.overview,
    topicText: topicId
      ? layeredMeaning.topics[topicId]?.[orientation]
      : undefined,
    positionText,
    light: orientedMeaning.light,
    shadow: orientedMeaning.shadow,
    symbols: layeredMeaning.core.symbols,
    advice: orientedMeaning.advice,
    reflection: orientedMeaning.reflection,
    source: "layered-v2",
  };
}
