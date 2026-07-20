"use client";

import { useEffect, useState } from "react";
import {
  activeDeck,
  catalogVersions,
  getCards,
  getEnabledSpreads,
  getQuestionCategories,
  getSpread,
} from "./domain/catalog";
import {
  drawForSpread,
  type DrawnRenderableCard,
} from "./domain/draw";
import type {
  Orientation,
  Reading,
  SpreadDefinition,
} from "./domain/tarot";

type Screen = "home" | "question" | "draw" | "reveal" | "result" | "history";

const cards = getCards();
const enabledSpreads = getEnabledSpreads();
const singleCardSpread = getSpread("single-card");
const questionCategories = getQuestionCategories();
const cardNameById = new Map(cards.map((card) => [card.id, card.name]));

function normalizeHistoryItem(
  item: Reading & {
    cardId?: string;
    cardName?: string;
    orientation?: Orientation;
  },
): Reading | null {
  if (Array.isArray(item.cards)) {
    return {
      ...item,
      cardNames:
        item.cardNames ??
        (item.cardName
          ? [item.cardName]
          : item.cards.map(
              (drawnCard) =>
                cardNameById.get(drawnCard.cardId) ?? drawnCard.cardId,
            )),
      questionCategoryId: item.questionCategoryId ?? "uncategorized",
      questionOptionId: item.questionOptionId ?? "custom",
    };
  }

  if (!item.cardId || !item.orientation) return null;

  return {
    ...item,
    cardNames: [item.cardName ?? cardNameById.get(item.cardId) ?? item.cardId],
    cards: [
      {
        cardId: item.cardId,
        orientation: item.orientation,
        positionId: singleCardSpread.positions[0].id,
      },
    ],
    contentVersion: "prototype-legacy",
    deckId: activeDeck.id,
    deckVersion: "prototype-legacy",
    spreadId: singleCardSpread.id,
    spreadVersion: "prototype-legacy",
    questionCategoryId: "uncategorized",
    questionOptionId: "custom",
  };
}

function readHistory(): Reading[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(
      window.localStorage.getItem("arcana-history") ?? "[]",
    ) as Array<
      Reading & {
        cardId?: string;
        cardName?: string;
        orientation?: Orientation;
      }
    >;

    return stored.flatMap((item) => {
      const normalized = normalizeHistoryItem(item);
      return normalized ? [normalized] : [];
    });
  } catch {
    return [];
  }
}

function getSpreadName(spreadId: string): string {
  try {
    return getSpread(spreadId).name;
  } catch {
    return "历史牌阵";
  }
}

function CardVisual({
  drawn,
  revealed,
  compact,
  onReveal,
}: {
  drawn: DrawnRenderableCard;
  revealed: boolean;
  compact: boolean;
  onReveal?: () => void;
}) {
  const className = `tarot-card ${revealed ? "revealed" : ""} ${
    drawn.orientation === "reversed" ? "reversed" : ""
  } ${compact ? "compact" : ""}`;
  const contents = (
    <>
      <span className="card-back" />
      <span className="card-face">
        <span className="card-number">{drawn.card.romanNumeral}</span>
        <span className="card-art">{drawn.card.asset.fallbackSymbol}</span>
        <span className="card-name">{drawn.card.name}</span>
        <span className="card-en">{drawn.card.englishName}</span>
      </span>
    </>
  );

  if (onReveal) {
    return (
      <button
        className={className}
        onClick={onReveal}
        aria-label={`翻开${drawn.position.name}位置的塔罗牌`}
      >
        {contents}
      </button>
    );
  }

  return <div className={className}>{contents}</div>;
}

export function ArcanaPrototype() {
  const [screen, setScreen] = useState<Screen>("home");
  const [question, setQuestion] = useState("");
  const [questionCategoryId, setQuestionCategoryId] = useState(
    questionCategories[0].id,
  );
  const [questionOptionId, setQuestionOptionId] = useState("");
  const [spreadId, setSpreadId] = useState(singleCardSpread.id);
  const [drawnCards, setDrawnCards] = useState<DrawnRenderableCard[]>([]);
  const [revealedPositionIds, setRevealedPositionIds] = useState<string[]>([]);
  const [shuffling, setShuffling] = useState(false);
  const [history, setHistory] = useState<Reading[]>([]);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const activeQuestionCategory =
    questionCategories.find(
      (category) => category.id === questionCategoryId,
    ) ?? questionCategories[0];
  const activeQuestionOption = activeQuestionCategory.options.find(
    (option) => option.id === questionOptionId,
  );
  const activeSpread = getSpread(spreadId);
  const allCardsRevealed =
    drawnCards.length > 0 &&
    drawnCards.every((drawn) =>
      revealedPositionIds.includes(drawn.position.id),
    );

  function startReading() {
    setQuestion("");
    setQuestionOptionId("");
    setSpreadId(singleCardSpread.id);
    setDrawnCards([]);
    setRevealedPositionIds([]);
    setScreen("question");
  }

  function beginDraw() {
    setShuffling(true);
    setDrawnCards([]);
    setRevealedPositionIds([]);
    setScreen("draw");
    window.setTimeout(() => setShuffling(false), 1500);
  }

  function drawCards() {
    setDrawnCards(drawForSpread(cards, activeSpread));
    setRevealedPositionIds([]);
    setScreen("reveal");
  }

  function revealCard(positionId: string) {
    setRevealedPositionIds((current) =>
      current.includes(positionId) ? current : [...current, positionId],
    );
  }

  function revealAllCards() {
    setRevealedPositionIds(
      drawnCards.map((drawn) => drawn.position.id),
    );
  }

  function saveReading() {
    if (drawnCards.length === 0) return;
    const next: Reading = {
      id: crypto.randomUUID(),
      cardNames: drawnCards.map((drawn) => drawn.card.name),
      question: question.trim() || "此刻，我最需要看见什么？",
      createdAt: new Date().toISOString(),
      cards: drawnCards.map((drawn) => ({
        cardId: drawn.card.id,
        orientation: drawn.orientation,
        positionId: drawn.position.id,
      })),
      contentVersion: catalogVersions.content,
      deckId: activeDeck.id,
      deckVersion: catalogVersions.deck,
      spreadId: activeSpread.id,
      spreadVersion: catalogVersions.spreads,
      questionCategoryId,
      questionOptionId: questionOptionId || "custom",
    };
    const updated = [next, ...history].slice(0, 12);
    setHistory(updated);
    window.localStorage.setItem("arcana-history", JSON.stringify(updated));
    setScreen("history");
  }

  function goHome() {
    setScreen("home");
    setShuffling(false);
    setRevealedPositionIds([]);
  }

  return (
    <main className="app-shell">
      <div className="phone-stage">
        <header className="topbar">
          <button className="text-button" onClick={goHome} aria-label="返回首页">
            {screen === "home" ? "☾" : "←"}
          </button>
          <p className="wordmark">Arcana</p>
          <button
            className="icon-button"
            onClick={() => setScreen("history")}
            aria-label="查看占卜记录"
          >
            ◷
          </button>
        </header>

        {screen === "home" && (
          <section className="screen">
            <p className="eyebrow">A quiet space for reflection</p>
            <h1 className="hero-title">
              在牌面中，
              <br />
              看见此刻的自己
            </h1>
            <p className="hero-copy">
              带着一个问题而来。这里不替你预测命运，只借牌面，照见被忽略的感受与可能。
            </p>
            <div className="moon-orbit" aria-hidden="true">
              <div className="moon" />
            </div>
            <div className="home-actions">
              <button className="primary-button" onClick={startReading}>
                开始一次占卜
              </button>
              <button
                className="secondary-button"
                onClick={() => setScreen("history")}
              >
                查看最近记录
              </button>
            </div>
            <p className="disclaimer">仅供娱乐与自我探索，不替代专业建议</p>
          </section>
        )}

        {screen === "question" && (
          <section className="screen">
            <p className="eyebrow">01 · Set an intention</p>
            <h1 className="screen-title">此刻，你想照见什么？</h1>
            <p className="screen-copy">
              开放式的问题，往往比“会不会”更能带来启发。
            </p>
            <div className="question-categories" aria-label="问题分类">
              {questionCategories.map((category) => (
                <button
                  className={`category-tab ${
                    questionCategoryId === category.id ? "active" : ""
                  }`}
                  key={category.id}
                  onClick={() => {
                    setQuestionCategoryId(category.id);
                    setQuestionOptionId("");
                  }}
                  aria-pressed={questionCategoryId === category.id}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <p className="category-description">
              {activeQuestionCategory.description}
            </p>
            <div
              className="question-options"
              aria-label={`${activeQuestionCategory.name}选项`}
            >
              {activeQuestionCategory.options.map((option) => (
                <button
                  className={`option-chip ${
                    questionOptionId === option.id ? "active" : ""
                  }`}
                  key={option.id}
                  onClick={() => {
                    setQuestionOptionId(option.id);
                    setQuestion(option.prompt);
                    if (
                      enabledSpreads.some(
                        (spread) => spread.id === option.recommendedSpreadId,
                      )
                    ) {
                      setSpreadId(option.recommendedSpreadId);
                    }
                  }}
                  aria-pressed={questionOptionId === option.id}
                  aria-label={`${option.name}：${option.prompt}`}
                >
                  {option.name}
                </button>
              ))}
            </div>
            <textarea
              className="question-box"
              value={question}
              maxLength={120}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="也可以直接写下你自己的问题"
              aria-label="输入你想探索的问题"
            />
            <p className="section-label">选择牌阵</p>
            <div className="spread-options" aria-label="选择牌阵">
              {enabledSpreads.map((spread) => (
                <button
                  className={`spread-option ${
                    spreadId === spread.id ? "active" : ""
                  }`}
                  key={spread.id}
                  onClick={() => setSpreadId(spread.id)}
                  aria-pressed={spreadId === spread.id}
                >
                  <span>
                    {spread.name}
                    {activeQuestionOption?.recommendedSpreadId === spread.id && (
                      <small>推荐</small>
                    )}
                  </span>
                  <em>{spread.positions.length}张 · {spread.description}</em>
                </button>
              ))}
            </div>
            <div className="home-actions">
              <button className="primary-button" onClick={beginDraw}>
                使用{activeSpread.name}洗牌
              </button>
              <button className="text-button" onClick={beginDraw}>
                暂时没有具体问题
              </button>
            </div>
          </section>
        )}

        {screen === "draw" && (
          <section className="screen draw-stage">
            <p className="eyebrow">02 · Draw the cards</p>
            <h1 className="screen-title">
              {shuffling ? "让思绪慢下来" : `为${activeSpread.name}抽牌`}
            </h1>
            <div
              className={`deck ${shuffling ? "shuffling" : ""}`}
              aria-hidden="true"
            >
              <div className="deck-card" />
              <div className="deck-card" />
              <div className="deck-card" />
            </div>
            <p className="draw-hint">
              {shuffling
                ? "正在洗牌…"
                : `准备好后，抽取${activeSpread.positions.length}张牌`}
            </p>
            <button
              className="primary-button"
              onClick={drawCards}
              disabled={shuffling}
            >
              {shuffling
                ? "请稍候"
                : `抽取${activeSpread.positions.length}张牌`}
            </button>
            {shuffling && (
              <button
                className="text-button"
                onClick={() => setShuffling(false)}
              >
                跳过动效
              </button>
            )}
          </section>
        )}

        {screen === "reveal" && drawnCards.length > 0 && (
          <section className="screen draw-stage">
            <p className="eyebrow">03 · Reveal</p>
            <h1 className="screen-title">逐张翻开你的牌</h1>
            <div
              className={`spread-card-grid count-${drawnCards.length}`}
            >
              {drawnCards.map((drawn) => (
                <div className="spread-card-item" key={drawn.position.id}>
                  <p className="position-label">{drawn.position.name}</p>
                  <div
                    className={`spread-card-scene ${
                      drawnCards.length === 1 ? "single" : ""
                    }`}
                  >
                    <CardVisual
                      drawn={drawn}
                      revealed={revealedPositionIds.includes(
                        drawn.position.id,
                      )}
                      compact={drawnCards.length > 1}
                      onReveal={() => revealCard(drawn.position.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="reveal-label">
              已翻开 {revealedPositionIds.length} / {drawnCards.length}
            </p>
            <div className="result-actions">
              <button
                className="primary-button"
                onClick={() => setScreen("result")}
                disabled={!allCardsRevealed}
              >
                查看完整解读
              </button>
              {!allCardsRevealed && (
                <button className="text-button" onClick={revealAllCards}>
                  直接翻开全部
                </button>
              )}
            </div>
          </section>
        )}

        {screen === "result" && drawnCards.length > 0 && (
          <section className="screen">
            <p className="eyebrow">Your reflection · {activeSpread.name}</p>
            <h1 className="screen-title">牌面为你展开</h1>
            <div className={`spread-card-grid result count-${drawnCards.length}`}>
              {drawnCards.map((drawn) => (
                <div className="spread-card-item" key={drawn.position.id}>
                  <p className="position-label">{drawn.position.name}</p>
                  <div
                    className={`spread-card-scene ${
                      drawnCards.length === 1 ? "single" : ""
                    }`}
                  >
                    <CardVisual
                      drawn={drawn}
                      revealed
                      compact={drawnCards.length > 1}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="reading-list">
              {drawnCards.map((drawn) => {
                const orientationName =
                  drawn.orientation === "upright" ? "正位" : "逆位";
                return (
                  <article
                    className="reading-panel"
                    key={drawn.position.id}
                  >
                    <p className="reading-position">{drawn.position.name}</p>
                    <h2>
                      {drawn.card.name} · {orientationName}
                    </h2>
                    <div className="keywords">
                      {drawn.card.keywords[drawn.orientation].map((keyword) => (
                        <span className="keyword" key={keyword}>
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <p className="reading-text">
                      {drawn.card.meaning[drawn.orientation]}
                    </p>
                    <p className="advice">
                      <strong>{drawn.position.name}可以观察：</strong>
                      <br />
                      {drawn.card.advice[drawn.orientation]}
                    </p>
                  </article>
                );
              })}
            </div>
            {drawnCards.length > 1 && (
              <article className="reading-panel overview">
                <p className="reading-position">整体观察</p>
                <h2>{activeSpread.name}</h2>
                <p className="reading-text">
                  {activeSpread.description}。请把三张牌看作一段连续的变化，而不是三个彼此孤立的结论；未来位置表达的是沿当前路径发展的可能倾向。
                </p>
              </article>
            )}
            <div className="result-actions">
              <button className="primary-button" onClick={saveReading}>
                保存这次启示
              </button>
              <button className="secondary-button" onClick={startReading}>
                重新提问
              </button>
            </div>
            <p className="disclaimer">
              牌面提供的是观察角度，而不是确定的未来
            </p>
          </section>
        )}

        {screen === "history" && (
          <section className="screen">
            <p className="eyebrow">Your journey</p>
            <h1 className="screen-title">最近的启示</h1>
            {history.length === 0 ? (
              <div className="empty-state">
                <div>
                  <p>还没有保存过占卜记录</p>
                  <button className="primary-button" onClick={startReading}>
                    开始第一次探索
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="history-list">
                  {history.map((item) => (
                    <article className="history-item" key={item.id}>
                      <div className="history-meta">
                        <span>{getSpreadName(item.spreadId)}</span>
                        <time>
                          {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                        </time>
                      </div>
                      <strong className="history-cards">
                        {item.cardNames.join(" · ")}
                      </strong>
                      <p>{item.question}</p>
                    </article>
                  ))}
                </div>
                <button className="secondary-button" onClick={startReading}>
                  开始新的占卜
                </button>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
