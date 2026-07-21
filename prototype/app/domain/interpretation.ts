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

export type SpreadSummaryLine = {
  label: string;
  text: string;
};

export type SpreadSummarySection = {
  title: string;
  lines: SpreadSummaryLine[];
};

export type SpreadSummaryView = {
  title: string;
  illumination: SpreadSummarySection;
  guidance: SpreadSummarySection;
  closing: string;
};

type ComposeSpreadSummaryInput = {
  spreadId?: string;
  spreadName: string;
  spreadDescription: string;
  interpretations: InterpretationView[];
};

/** 取首句，避免消息流摘要被整段 overview 撑满。 */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^[\s\S]*?[。！？]/);
  return match?.[0]?.trim() || trimmed;
}

function pickIllumination(item: InterpretationView): string {
  const topic = item.topicText?.trim();
  if (topic) return topic;
  const overview = item.overview.trim();
  if (overview) return firstSentence(overview);
  return item.summary.trim();
}

function pickAdvice(item: InterpretationView): string {
  if (item.advice.length > 0) {
    return item.advice.join("；");
  }
  return item.reflection?.trim() ?? "";
}

function closingText(spreadDescription: string): string {
  return `${spreadDescription}。牌面提供的是观察角度，不是写定的预言。`;
}

/** 时间流：照耀过去/现在/未来 + 建议现在/未来。 */
function composeTimelineSummary(
  spreadName: string,
  spreadDescription: string,
  interpretations: InterpretationView[],
): SpreadSummaryView {
  const past = interpretations[0];
  const present = interpretations[1] ?? interpretations[0];
  const future =
    interpretations.length >= 3
      ? interpretations[interpretations.length - 1]
      : undefined;

  const illuminationLines: SpreadSummaryLine[] = [];
  if (past) {
    illuminationLines.push({
      label: "过去",
      text: pickIllumination(past),
    });
  }
  if (present && interpretations.length >= 2) {
    illuminationLines.push({
      label: "现在",
      text: pickIllumination(present),
    });
  }
  if (future) {
    illuminationLines.push({
      label: "未来",
      text: pickIllumination(future),
    });
  }

  const guidanceLines: SpreadSummaryLine[] = [];
  if (present && interpretations.length >= 2) {
    const presentAdvice = pickAdvice(present);
    if (presentAdvice) {
      guidanceLines.push({ label: "现在", text: presentAdvice });
    }
  }
  if (future) {
    const futureAdvice = pickAdvice(future);
    if (futureAdvice) {
      guidanceLines.push({ label: "未来", text: futureAdvice });
    }
  }

  return {
    title: `${spreadName} · 照耀与建议`,
    illumination: {title: "照耀", lines: illuminationLines},
    guidance: {title: "建议", lines: guidanceLines},
    closing: closingText(spreadDescription),
  };
}

/** 圣三角：照耀现状/挑战 + 建议方向与可行动作。 */
function composeTriangleSummary(
  spreadName: string,
  spreadDescription: string,
  interpretations: InterpretationView[],
): SpreadSummaryView {
  const situation = interpretations[0];
  const challenge = interpretations[1];
  const guidance = interpretations[2];

  const illuminationLines: SpreadSummaryLine[] = [];
  if (situation) {
    illuminationLines.push({
      label: "现状",
      text: pickIllumination(situation),
    });
  }
  if (challenge) {
    illuminationLines.push({
      label: "挑战",
      text: pickIllumination(challenge),
    });
  }

  const guidanceLines: SpreadSummaryLine[] = [];
  if (guidance) {
    const direction = pickIllumination(guidance);
    if (direction) {
      guidanceLines.push({label: "可行方向", text: direction});
    }
    const action = pickAdvice(guidance);
    if (action) {
      guidanceLines.push({label: "可以尝试", text: action});
    }
  }

  return {
    title: `${spreadName} · 照耀与建议`,
    illumination: {title: "照耀", lines: illuminationLines},
    guidance: {title: "建议", lines: guidanceLines},
    closing: closingText(spreadDescription),
  };
}

/** 多牌阵消息流摘要：按牌阵语义组织照耀与建议。 */
export function composeSpreadSummary({
  spreadId,
  spreadName,
  spreadDescription,
  interpretations,
}: ComposeSpreadSummaryInput): SpreadSummaryView {
  if (spreadId === "sacred-triangle") {
    return composeTriangleSummary(
      spreadName,
      spreadDescription,
      interpretations,
    );
  }

  if (interpretations.length === 1) {
    const sole = interpretations[0];
    const soleAdvice = pickAdvice(sole);
    return {
      title: `${spreadName} · 照耀与建议`,
      illumination: {
        title: "照耀",
        lines: sole
          ? [{label: "此刻", text: pickIllumination(sole)}]
          : [],
      },
      guidance: {
        title: "建议",
        lines: soleAdvice ? [{label: "此刻", text: soleAdvice}] : [],
      },
      closing: closingText(spreadDescription),
    };
  }

  return composeTimelineSummary(
    spreadName,
    spreadDescription,
    interpretations,
  );
}
