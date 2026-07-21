/**
 * 大阿卡纳分层牌义的确定性内容质量检查。
 * 只拦截已知坏模式与合规风险，避免模糊相似度误报。
 */

export const BOILERPLATE_FINGERPRINTS = [
  "你可以在保持开放的同时，以具体行动观察反馈",
  "逆位并非正位的简单反面",
  "保持坦诚，让承诺随真实了解逐步形成",
  "财务上可借",
  "能帮助你整合经验，在不急于确定结果时看见更多可能",
  "能让停顿成为校准边界与动机的机会",
  "若过度依赖",
  "若长期困在",
  "围绕“",
  "拆成事实、感受与可调整部分",
  "如果不要求一次做对，你会怎样实践",
  "正在保护你免于面对什么不确定性",
  "工作上适合围绕",
  "关系中可把",
  "内在可能正在经历",
  "成长可围绕",
];

/** 允许跨牌复用的合规与边界表达 */
export const ALLOWED_CROSS_CARD_SENTENCES = [
  "不把可能性当收益保证",
  "寻求合格专业意见",
  "仅供娱乐与自我探索",
  "不替代专业建议",
];

const ABSOLUTE_PREDICTION =
  /(一定会|必然会|注定会|百分之百|绝对会|(?<!自我)肯定会|包赚|稳赚|保证收益)/;

const FINANCE_OVERREACH =
  /(建议买入|建议卖出|应该投资|值得投资|稳赚|包赚|保证收益|肯定赚|必涨|稳赚不赔)/;

/** 已知生成残留；不用通用叠词正则，避免误伤「一点一点」「能不能」 */
const REPEATED_ARTIFACTS = ["看见看见", "待编辑待编辑", "待补充待补充"];

/**
 * @param {object} card
 * @returns {string[]}
 */
export function collectMeaningStrings(card) {
  const strings = [];
  const push = (value) => {
    if (typeof value === "string" && value.trim()) strings.push(value.trim());
  };

  push(card.core?.summary);
  for (const symbol of card.core?.symbols ?? []) {
    push(symbol.name);
    push(symbol.meaning);
  }

  for (const orientation of ["upright", "reversed"]) {
    const block = card[orientation];
    if (!block) continue;
    push(block.overview);
    push(block.light);
    push(block.shadow);
    push(block.reflection);
    for (const item of block.advice ?? []) push(item);
    for (const keyword of block.keywords ?? []) push(keyword);
  }

  for (const topic of Object.values(card.topics ?? {})) {
    push(topic.upright);
    push(topic.reversed);
  }

  return strings;
}

function isAllowedSentence(text) {
  return ALLOWED_CROSS_CARD_SENTENCES.some((allowed) => text.includes(allowed));
}

/**
 * 去掉引号内关键词槽位后的主题骨架，用于检测同质化。
 * @param {string} text
 */
export function topicSkeleton(text) {
  return text
    .replace(/[“"][^”"]+[”"]/g, "【槽】")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * @param {object[]} cards
 * @returns {{code: string, message: string, cardId?: string}[]}
 */
export function detectContentQualityIssues(cards) {
  /** @type {{code: string, message: string, cardId?: string}[]} */
  const issues = [];

  for (const card of cards) {
    const texts = collectMeaningStrings(card);
    const joined = texts.join("\n");

    for (const fingerprint of BOILERPLATE_FINGERPRINTS) {
      if (joined.includes(fingerprint)) {
        issues.push({
          code: "template-boilerplate",
          cardId: card.id,
          message: `${card.id} contains boilerplate fingerprint: ${fingerprint}`,
        });
      }
    }

    if (ABSOLUTE_PREDICTION.test(joined)) {
      issues.push({
        code: "absolute-prediction",
        cardId: card.id,
        message: `${card.id} contains absolute prediction language`,
      });
    }

    const financeJoined = [
      card.topics?.finance?.upright,
      card.topics?.finance?.reversed,
    ]
      .filter(Boolean)
      .join("\n");
    if (FINANCE_OVERREACH.test(financeJoined)) {
      issues.push({
        code: "finance-overreach",
        cardId: card.id,
        message: `${card.id} finance topic contains investment-style advice`,
      });
    }

    for (const artifact of REPEATED_ARTIFACTS) {
      if (joined.includes(artifact)) {
        issues.push({
          code: "repeated-chars",
          cardId: card.id,
          message: `${card.id} contains generation artifact “${artifact}”`,
        });
      }
    }

    const topicUprights = Object.values(card.topics ?? {}).map(
      (topic) => topic.upright,
    );
    if (topicUprights.length >= 4) {
      const skeletons = topicUprights.map(topicSkeleton);
      const unique = new Set(skeletons);
      if (unique.size === 1) {
        issues.push({
          code: "topic-homogenized",
          cardId: card.id,
          message: `${card.id} six topic upright texts share one keyword-slot skeleton`,
        });
      }
    }
  }

  /** @type {Map<string, string[]>} */
  const sentenceOwners = new Map();
  for (const card of cards) {
    for (const text of collectMeaningStrings(card)) {
      if (text.length < 24 || isAllowedSentence(text)) continue;
      const owners = sentenceOwners.get(text) ?? [];
      owners.push(card.id);
      sentenceOwners.set(text, owners);
    }
  }

  for (const [sentence, owners] of sentenceOwners) {
    const uniqueOwners = [...new Set(owners)];
    if (uniqueOwners.length >= 2) {
      issues.push({
        code: "duplicate-sentence",
        message: `Exact sentence shared by ${uniqueOwners.join(", ")}: ${sentence.slice(0, 48)}…`,
      });
    }
  }

  return issues;
}
