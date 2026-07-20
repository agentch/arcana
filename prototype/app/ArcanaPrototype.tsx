"use client";

import { useEffect, useMemo, useState } from "react";
import {
  activeDeck,
  catalogVersions,
  getCards,
  getSpread,
} from "./domain/catalog";
import type { Orientation, Reading, RenderableCard } from "./domain/tarot";

type Screen = "home" | "question" | "draw" | "reveal" | "result" | "history";

const cards = getCards();
const activeSpread = getSpread("single-card");

const prompts = [
  "我现在最需要看见什么？",
  "这段关系给我的提醒是什么？",
  "我该如何面对眼前的变化？",
];

function readHistory(): Reading[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(
      window.localStorage.getItem("arcana-history") ?? "[]",
    ) as Array<Reading & {
      cardId?: string;
      orientation?: Orientation;
    }>;

    return stored.flatMap((item) => {
      if (Array.isArray(item.cards)) return [item];
      if (!item.cardId || !item.orientation) return [];

      return [{
        ...item,
        cards: [{
          cardId: item.cardId,
          orientation: item.orientation,
          positionId: activeSpread.positions[0].id,
        }],
        contentVersion: "prototype-legacy",
        deckId: activeDeck.id,
        deckVersion: "prototype-legacy",
        spreadId: activeSpread.id,
        spreadVersion: "prototype-legacy",
      }];
    });
  } catch {
    return [];
  }
}

export function ArcanaPrototype() {
  const [screen, setScreen] = useState<Screen>("home");
  const [question, setQuestion] = useState("");
  const [selectedCard, setSelectedCard] = useState<RenderableCard | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("upright");
  const [shuffling, setShuffling] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [history, setHistory] = useState<Reading[]>([]);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const orientationName = orientation === "upright" ? "正位" : "逆位";
  const resultTitle = useMemo(
    () => (selectedCard ? `${selectedCard.name} · ${orientationName}` : ""),
    [selectedCard, orientationName],
  );

  function startReading() {
    setQuestion("");
    setSelectedCard(null);
    setRevealed(false);
    setScreen("question");
  }

  function beginDraw() {
    setShuffling(true);
    setScreen("draw");
    window.setTimeout(() => setShuffling(false), 1500);
  }

  function drawCard() {
    const nextCard = cards[Math.floor(Math.random() * cards.length)];
    setSelectedCard(nextCard);
    setOrientation(Math.random() >= 0.5 ? "upright" : "reversed");
    setRevealed(false);
    setScreen("reveal");
  }

  function revealCard() {
    setRevealed(true);
    window.setTimeout(() => setScreen("result"), 900);
  }

  function saveReading() {
    if (!selectedCard) return;
    const next: Reading = {
      id: crypto.randomUUID(),
      cardName: selectedCard.name,
      question: question.trim() || "此刻，我最需要看见什么？",
      createdAt: new Date().toISOString(),
      cards: [
        {
          cardId: selectedCard.id,
          orientation,
          positionId: activeSpread.positions[0].id,
        },
      ],
      contentVersion: catalogVersions.content,
      deckId: activeDeck.id,
      deckVersion: catalogVersions.deck,
      spreadId: activeSpread.id,
      spreadVersion: catalogVersions.spreads,
    };
    const updated = [next, ...history].slice(0, 12);
    setHistory(updated);
    window.localStorage.setItem("arcana-history", JSON.stringify(updated));
    setScreen("history");
  }

  function goHome() {
    setScreen("home");
    setShuffling(false);
    setRevealed(false);
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
            <h1 className="hero-title">在牌面中，<br />看见此刻的自己</h1>
            <p className="hero-copy">
              带着一个问题而来。这里不替你预测命运，只借一张牌，照见被忽略的感受与可能。
            </p>
            <div className="moon-orbit" aria-hidden="true"><div className="moon" /></div>
            <div className="home-actions">
              <button className="primary-button" onClick={startReading}>开始一次占卜</button>
              <button className="secondary-button" onClick={() => setScreen("history")}>
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
            <p className="screen-copy">开放式的问题，往往比“会不会”更能带来启发。</p>
            <textarea
              className="question-box"
              value={question}
              maxLength={120}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="例如：我该如何面对眼前的变化？"
              aria-label="输入你想探索的问题"
            />
            <div className="prompt-chips">
              {prompts.map((prompt) => (
                <button className="chip" key={prompt} onClick={() => setQuestion(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
            <div className="home-actions">
              <button className="primary-button" onClick={beginDraw}>带着问题洗牌</button>
              <button className="text-button" onClick={beginDraw}>暂时没有具体问题</button>
            </div>
          </section>
        )}

        {screen === "draw" && (
          <section className="screen draw-stage">
            <p className="eyebrow">02 · Draw a card</p>
            <h1 className="screen-title">{shuffling ? "让思绪慢下来" : "选择回应你的那张牌"}</h1>
            <div className={`deck ${shuffling ? "shuffling" : ""}`} aria-hidden="true">
              <div className="deck-card" />
              <div className="deck-card" />
              <div className="deck-card" />
            </div>
            <p className="draw-hint">
              {shuffling ? "正在洗牌…" : "准备好后，凭直觉抽取"}
            </p>
            <button className="primary-button" onClick={drawCard} disabled={shuffling}>
              {shuffling ? "请稍候" : "抽取一张牌"}
            </button>
            {shuffling && <button className="text-button" onClick={() => setShuffling(false)}>跳过动效</button>}
          </section>
        )}

        {screen === "reveal" && selectedCard && (
          <section className="screen draw-stage">
            <p className="eyebrow">03 · Reveal</p>
            <h1 className="screen-title">答案已经来到</h1>
            <div className="card-scene">
              <button
                className={`tarot-card ${revealed ? "revealed" : ""} ${orientation === "reversed" ? "reversed" : ""}`}
                onClick={revealCard}
                aria-label="翻开塔罗牌"
              >
                <span className="card-back" />
                <span className="card-face">
                  <span className="card-number">{selectedCard.romanNumeral}</span>
                  <span className="card-art">{selectedCard.asset.fallbackSymbol}</span>
                  <span className="card-name">{selectedCard.name}</span>
                  <span className="card-en">{selectedCard.englishName}</span>
                </span>
              </button>
            </div>
            <p className="reveal-label">轻触牌面翻开</p>
            <button className="text-button" onClick={revealCard}>直接查看结果</button>
          </section>
        )}

        {screen === "result" && selectedCard && (
          <section className="screen">
            <p className="eyebrow">Your reflection</p>
            <div className="card-scene">
              <div className={`tarot-card revealed ${orientation === "reversed" ? "reversed" : ""}`}>
                <span className="card-back" />
                <span className="card-face">
                  <span className="card-number">{selectedCard.romanNumeral}</span>
                  <span className="card-art">{selectedCard.asset.fallbackSymbol}</span>
                  <span className="card-name">{selectedCard.name}</span>
                  <span className="card-en">{selectedCard.englishName}</span>
                </span>
              </div>
            </div>
            <p className="reveal-label">{resultTitle}</p>
            <article className="reading-panel">
              <h2>牌面提示</h2>
              <div className="keywords">
                {selectedCard.keywords[orientation].map((keyword) => (
                  <span className="keyword" key={keyword}>{keyword}</span>
                ))}
              </div>
              <p className="reading-text">{selectedCard.meaning[orientation]}</p>
              <p className="advice"><strong>此刻可以尝试：</strong><br />{selectedCard.advice[orientation]}</p>
            </article>
            <div className="result-actions">
              <button className="primary-button" onClick={saveReading}>保存这次启示</button>
              <button className="secondary-button" onClick={startReading}>重新提问</button>
            </div>
            <p className="disclaimer">牌面提供的是观察角度，而不是确定的未来</p>
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
                  <button className="primary-button" onClick={startReading}>开始第一次探索</button>
                </div>
              </div>
            ) : (
              <>
                <div className="history-list">
                  {history.map((item) => (
                    <article className="history-item" key={item.id}>
                      <div className="history-meta">
                        <span>{item.cardName} · {item.cards[0]?.orientation === "upright" ? "正位" : "逆位"}</span>
                        <time>{new Date(item.createdAt).toLocaleDateString("zh-CN")}</time>
                      </div>
                      <p>{item.question}</p>
                    </article>
                  ))}
                </div>
                <button className="secondary-button" onClick={startReading}>开始新的占卜</button>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
