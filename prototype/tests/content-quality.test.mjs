import assert from "node:assert/strict";
import {readdir, readFile} from "node:fs/promises";
import test from "node:test";
import {
  detectContentQualityIssues,
  topicSkeleton,
} from "../scripts/content-quality.mjs";

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(new URL(relativePath, import.meta.url), "utf8"),
  );
}

async function loadLayeredMeanings(pattern) {
  const filenames = (
    await readdir(new URL("../app/data/cards/", import.meta.url))
  )
    .filter((filename) => pattern.test(filename))
    .sort();
  return Promise.all(
    filenames.map((filename) => readJson(`../app/data/cards/${filename}`)),
  );
}

test("polished major arcana pass content quality gates", async () => {
  const cards = await loadLayeredMeanings(/^major-\d{2}\.json$/);
  const issues = detectContentQualityIssues(cards);
  assert.equal(
    issues.length,
    0,
    issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n"),
  );
});

test("approved wands minor arcana pass content quality gates", async () => {
  const cards = await loadLayeredMeanings(/^minor-wands-[a-z]+\.json$/);
  assert.equal(cards.length, 14);
  const issues = detectContentQualityIssues(cards);
  assert.equal(
    issues.length,
    0,
    issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n"),
  );
});

test("approved cups minor arcana pass content quality gates", async () => {
  const cards = await loadLayeredMeanings(/^minor-cups-[a-z]+\.json$/);
  assert.equal(cards.length, 14);
  const issues = detectContentQualityIssues(cards);
  assert.equal(
    issues.length,
    0,
    issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n"),
  );
});

test("approved swords minor arcana pass content quality gates", async () => {
  const cards = await loadLayeredMeanings(/^minor-swords-[a-z]+\.json$/);
  assert.equal(cards.length, 14);
  const issues = detectContentQualityIssues(cards);
  assert.equal(
    issues.length,
    0,
    issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n"),
  );
});

test("approved pentacles minor arcana pass content quality gates", async () => {
  const cards = await loadLayeredMeanings(/^minor-pentacles-[a-z]+\.json$/);
  assert.equal(cards.length, 14);
  const issues = detectContentQualityIssues(cards);
  assert.equal(
    issues.length,
    0,
    issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n"),
  );
});

test("the Fool sample remains free of shared topic skeletons", async () => {
  const fool = await readJson("../app/data/cards/major-00.json");
  const skeletons = Object.values(fool.topics).map((topic) =>
    topicSkeleton(topic.upright),
  );
  assert.equal(new Set(skeletons).size, skeletons.length);
});

test("detects boilerplate fingerprints across cards", () => {
  const boilerplate =
    "你可以在保持开放的同时，以具体行动观察反馈，让这股力量逐步进入现实。";
  const issues = detectContentQualityIssues([
    {
      id: "sample-a",
      core: {summary: "样本甲", symbols: []},
      upright: {
        keywords: ["开始"],
        overview: boilerplate,
        light: "甲牌正向力量。",
        shadow: "甲牌需要留意的部分。",
        advice: ["做一件甲牌专属行动。"],
        reflection: "甲牌邀请你看见什么？",
      },
      reversed: {
        keywords: ["停滞"],
        overview: "甲牌逆位概述。",
        light: "甲牌逆位可运用之处。",
        shadow: "甲牌逆位风险。",
        advice: ["先停一下再决定。"],
        reflection: "甲牌逆位在提醒什么？",
      },
      topics: {
        love: {upright: "甲感情正位。", reversed: "甲感情逆位。"},
        career: {upright: "甲职场正位。", reversed: "甲职场逆位。"},
        family: {upright: "甲家庭正位。", reversed: "甲家庭逆位。"},
        mood: {upright: "甲心情正位。", reversed: "甲心情逆位。"},
        finance: {
          upright: "甲财务正位，不把可能性当收益保证。",
          reversed: "甲财务逆位，可寻求合格专业意见。",
        },
        growth: {upright: "甲成长正位。", reversed: "甲成长逆位。"},
      },
    },
  ]);

  assert.ok(
    issues.some((issue) => issue.code === "template-boilerplate"),
    JSON.stringify(issues),
  );
});

test("detects absolute prediction and finance overreach", () => {
  const issues = detectContentQualityIssues([
    {
      id: "risky-card",
      core: {summary: "风险样本", symbols: []},
      upright: {
        keywords: ["结果"],
        overview: "这件事一定会带来你想要的结果。",
        light: "看起来很确定。",
        shadow: "确定性也可能变成执念。",
        advice: ["先核对事实。"],
        reflection: "你把什么当成了必然？",
      },
      reversed: {
        keywords: ["不确定"],
        overview: "结果还不确定。",
        light: "仍可调整。",
        shadow: "焦虑可能放大。",
        advice: ["缩小承诺。"],
        reflection: "你在害怕什么？",
      },
      topics: {
        love: {upright: "感情样本。", reversed: "感情逆位样本。"},
        career: {upright: "职场样本。", reversed: "职场逆位样本。"},
        family: {upright: "家庭样本。", reversed: "家庭逆位样本。"},
        mood: {upright: "心情样本。", reversed: "心情逆位样本。"},
        finance: {
          upright: "这只股票值得投资，稳赚不赔。",
          reversed: "先核对预算。",
        },
        growth: {upright: "成长样本。", reversed: "成长逆位样本。"},
      },
    },
  ]);

  assert.ok(issues.some((issue) => issue.code === "absolute-prediction"));
  assert.ok(issues.some((issue) => issue.code === "finance-overreach"));
});

test("allows shared compliance disclaimer sentences", () => {
  const disclaimer = "财务决定应回到预算与事实，不把可能性当收益保证。";
  const issues = detectContentQualityIssues([
    {
      id: "card-a",
      core: {summary: "样本甲", symbols: []},
      upright: {
        keywords: ["预算"],
        overview: "甲牌财务概述需要核对事实。",
        light: "甲牌可运用之处。",
        shadow: "甲牌需要留意之处。",
        advice: ["先写下本月固定支出。"],
        reflection: "你把什么当成了收益？",
      },
      reversed: {
        keywords: ["冲动"],
        overview: "甲牌逆位概述。",
        light: "甲牌逆位可运用。",
        shadow: "甲牌逆位风险。",
        advice: ["暂缓一笔非必要支出。"],
        reflection: "冲动在满足什么？",
      },
      topics: {
        love: {upright: "甲感情。", reversed: "甲感情逆。"},
        career: {upright: "甲职场。", reversed: "甲职场逆。"},
        family: {upright: "甲家庭。", reversed: "甲家庭逆。"},
        mood: {upright: "甲心情。", reversed: "甲心情逆。"},
        finance: {upright: disclaimer, reversed: "甲财务逆位。"},
        growth: {upright: "甲成长。", reversed: "甲成长逆。"},
      },
    },
    {
      id: "card-b",
      core: {summary: "样本乙", symbols: []},
      upright: {
        keywords: ["核实"],
        overview: "乙牌财务概述需要核对事实。",
        light: "乙牌可运用之处。",
        shadow: "乙牌需要留意之处。",
        advice: ["先核对账单日期。"],
        reflection: "你忽略了哪笔成本？",
      },
      reversed: {
        keywords: ["拖延"],
        overview: "乙牌逆位概述。",
        light: "乙牌逆位可运用。",
        shadow: "乙牌逆位风险。",
        advice: ["设定还款提醒。"],
        reflection: "拖延在保护什么？",
      },
      topics: {
        love: {upright: "乙感情。", reversed: "乙感情逆。"},
        career: {upright: "乙职场。", reversed: "乙职场逆。"},
        family: {upright: "乙家庭。", reversed: "乙家庭逆。"},
        mood: {upright: "乙心情。", reversed: "乙心情逆。"},
        finance: {upright: disclaimer, reversed: "乙财务逆位。"},
        growth: {upright: "乙成长。", reversed: "乙成长逆。"},
      },
    },
  ]);

  assert.equal(
    issues.filter((issue) => issue.code === "duplicate-sentence").length,
    0,
    JSON.stringify(issues),
  );
});
