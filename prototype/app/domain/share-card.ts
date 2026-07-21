import type {InterpretationView, SpreadSummaryView} from "./interpretation";

export type ShareCardLine = {
  positionName: string;
  cardName: string;
  orientationName: string;
  keywords: string[];
};

export type ShareCardContent = {
  brand: string;
  title: string;
  question: string;
  cards: ShareCardLine[];
  highlight: string;
  disclaimer: string;
};

type ComposeShareCardInput = {
  title: string;
  question: string;
  interpretations: InterpretationView[];
  summary?: SpreadSummaryView | null;
};

/** 组装分享卡片所需的纯展示内容，不触碰平台 API。 */
export function composeShareCardContent({
  title,
  question,
  interpretations,
  summary,
}: ComposeShareCardInput): ShareCardContent {
  const cards = interpretations.map((item) => ({
    positionName: item.positionName,
    cardName: item.cardName,
    orientationName: item.orientationName,
    keywords: item.keywords.slice(0, 3),
  }));

  let highlight = "";
  if (summary?.illumination.lines[0]?.text) {
    highlight = summary.illumination.lines[0].text;
  } else if (interpretations[0]?.summary) {
    highlight = interpretations[0].summary;
  } else if (interpretations[0]?.overview) {
    highlight = interpretations[0].overview;
  }

  return {
    brand: "Arcana",
    title: title.trim() || "塔罗启示",
    question: question.trim(),
    cards,
    highlight: truncateText(highlight, 72),
    disclaimer: "牌面是观察的镜子，不是写定的预言",
  };
}

/** 生成可复制的纯文本分享稿。 */
export function composeShareText(content: ShareCardContent): string {
  const lines = [
    `${content.brand} · ${content.title}`,
    content.question ? `问题：${content.question}` : "",
    "",
    ...content.cards.map(
      (card) =>
        `· ${card.positionName}：${card.cardName}（${card.orientationName}）`,
    ),
    content.highlight ? `\n${content.highlight}` : "",
    "",
    content.disclaimer,
  ];

  return lines.filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n").trim();
}

function truncateText(text: string, maxChars: number): string {
  const characters = Array.from(text.trim());
  if (characters.length <= maxChars) return characters.join("");
  return `${characters.slice(0, maxChars - 1).join("")}…`;
}
