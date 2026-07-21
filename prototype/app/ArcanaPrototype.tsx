"use client";

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AssistantCard,
  ChatThread,
} from "./components/chat/ChatThread";
import {
  CardVisual,
  SpreadIcon,
} from "./components/cards/ReadingVisuals";
import {
  chatFlowReducer,
  initialChatFlowState,
} from "./domain/chat-flow";
import {
  activeDeck,
  catalogVersions,
  getCards,
  getEnabledSpreads,
  getLayeredMeaning,
  getMeaningTopic,
  getQuestionCategories,
  getSpread,
} from "./domain/catalog";
import {
  createDrawnCard,
  shuffleDeck,
  type DrawnRenderableCard,
} from "./domain/draw";
import { composeInterpretation } from "./domain/interpretation";
import type {
  Orientation,
  Reading,
  RenderableCard,
} from "./domain/tarot";
import { triggerHaptic } from "./platform/haptics";

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

export function ArcanaPrototype() {
  const [flow, dispatchFlow] = useReducer(
    chatFlowReducer,
    initialChatFlowState,
  );
  const [question, setQuestion] = useState("");
  const [questionCategoryId, setQuestionCategoryId] = useState<string>("");
  const [questionOptionId, setQuestionOptionId] = useState("");
  const [spreadId, setSpreadId] = useState(singleCardSpread.id);
  const [drawnCards, setDrawnCards] = useState<DrawnRenderableCard[]>([]);
  const [shuffledDeck, setShuffledDeck] = useState<RenderableCard[]>(cards);
  const [shuffling, setShuffling] = useState(false);
  const [deckRotation, setDeckRotation] = useState(0);
  const [activeDrawPositionId, setActiveDrawPositionId] = useState("");
  const [animatingDraw, setAnimatingDraw] =
    useState<DrawnRenderableCard | null>(null);
  const [drawAnimationGeometry, setDrawAnimationGeometry] = useState({
    sourceX: 0,
    sourceY: 110,
    sourceScale: 0.58,
    sourceRotation: 0,
    targetX: 0,
    targetY: -180,
    targetScale: 0.38,
  });
  const [history, setHistory] = useState<Reading[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastScrollHapticIndex = useRef(-1);
  const returnToChatTimeout = useRef<number | null>(null);
  const shuffleTimeout = useRef<number | null>(null);
  const drawPositionFrames = useRef(
    new Map<string, HTMLSpanElement>(),
  );
  const deckDrag = useRef<{
    pointerId: number;
    startX: number;
    startRotation: number;
    moved: boolean;
  } | null>(null);
  const suppressCardClick = useRef(false);
  const activeQuestionCategory = questionCategories.find(
    (category) => category.id === questionCategoryId,
  );
  const activeQuestionOption = activeQuestionCategory?.options.find(
    (option) => option.id === questionOptionId,
  );
  const activeSpread = getSpread(spreadId);
  const orderedActivePositions = [...activeSpread.positions].sort(
    (left, right) => left.order - right.order,
  );
  const activeDrawPosition = orderedActivePositions.find(
    (position) => position.id === activeDrawPositionId,
  );
  const availableDeckCards = shuffledDeck.filter(
    (card) =>
      !drawnCards.some((drawn) => drawn.card.id === card.id) &&
      animatingDraw?.card.id !== card.id,
  );
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHistory(readHistory());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  function cancelDrawAnimation() {
    if (shuffleTimeout.current !== null) {
      window.clearTimeout(shuffleTimeout.current);
      shuffleTimeout.current = null;
    }
    if (returnToChatTimeout.current !== null) {
      window.clearTimeout(returnToChatTimeout.current);
      returnToChatTimeout.current = null;
    }
    setShuffling(false);
    setAnimatingDraw(null);
  }

  function resetReading() {
    cancelDrawAnimation();
    setQuestion("");
    setQuestionCategoryId("");
    setQuestionOptionId("");
    setSpreadId(singleCardSpread.id);
    setDrawnCards([]);
    setActiveDrawPositionId("");
    setHistoryOpen(false);
    dispatchFlow({ type: "reset" });
  }

  function beginDraw() {
    cancelDrawAnimation();
    const shuffleDuration = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? 150
      : 3000;
    setShuffledDeck(shuffleDeck(cards));
    setShuffling(true);
    setDeckRotation(0);
    setDrawnCards([]);
    setActiveDrawPositionId(orderedActivePositions[0].id);
    setAnimatingDraw(null);
    lastScrollHapticIndex.current = -1;
    dispatchFlow({ type: "select-spread", label: activeSpread.name });
    shuffleTimeout.current = window.setTimeout(() => {
      setShuffling(false);
      triggerHaptic("selection");
      shuffleTimeout.current = null;
    }, shuffleDuration);
  }

  function selectCard(
    card: RenderableCard,
    sourceElement: HTMLButtonElement,
  ) {
    if (
      animatingDraw ||
      !activeDrawPositionId ||
      drawnCards.length >= activeSpread.positions.length ||
      drawnCards.some((drawn) => drawn.card.id === card.id)
    ) {
      return;
    }

    const position = orderedActivePositions.find(
      (item) => item.id === activeDrawPositionId,
    );
    if (!position) return;

    const drawn = createDrawnCard(card, position);
    const targetFrame = drawPositionFrames.current.get(position.id);
    const sourceRect = sourceElement.getBoundingClientRect();
    const sourceTransform = getComputedStyle(sourceElement).transform;
    const sourceMatrix =
      sourceTransform === "none" ? null : new DOMMatrix(sourceTransform);
    const sourceRotation = sourceMatrix
      ? (Math.atan2(sourceMatrix.b, sourceMatrix.a) * 180) / Math.PI
      : 0;
    if (targetFrame) {
      const targetRect = targetFrame.getBoundingClientRect();
      const animationContainer =
        targetFrame.closest<HTMLElement>(".selection-stage");
      const containerRect =
        animationContainer &&
        getComputedStyle(animationContainer).transform !== "none"
          ? animationContainer.getBoundingClientRect()
          : null;
      const sourceCenterX = containerRect
        ? containerRect.left + containerRect.width / 2
        : window.innerWidth / 2;
      const sourceCenterY = containerRect
        ? containerRect.top + containerRect.height / 2
        : window.innerHeight / 2;
      setDrawAnimationGeometry({
        sourceX: sourceRect.left + sourceRect.width / 2 - sourceCenterX,
        sourceY: sourceRect.top + sourceRect.height / 2 - sourceCenterY,
        sourceScale: sourceElement.offsetWidth / 154,
        sourceRotation,
        targetX: targetRect.left + targetRect.width / 2 - sourceCenterX,
        targetY: targetRect.top + targetRect.height / 2 - sourceCenterY,
        targetScale: targetRect.width / 154,
      });
    } else {
      setDrawAnimationGeometry({
        sourceX: 0,
        sourceY: 110,
        sourceScale: 0.58,
        sourceRotation: 0,
        targetX: 0,
        targetY: -180,
        targetScale: 0.38,
      });
    }
    triggerHaptic("impact");
    setAnimatingDraw(drawn);
  }

  function finishDrawAnimation() {
    if (!animatingDraw) return;

    const updatedDrawnCards = [...drawnCards, animatingDraw];
    const nextPosition = orderedActivePositions.find(
      (position) =>
        !updatedDrawnCards.some(
          (selected) => selected.position.id === position.id,
        ),
    );
    const completesSpread =
      updatedDrawnCards.length === activeSpread.positions.length;

    setDrawnCards(updatedDrawnCards);
    setActiveDrawPositionId(nextPosition?.id ?? "");
    setAnimatingDraw(null);
    triggerHaptic(completesSpread ? "success" : "selection");
    if (completesSpread) {
      returnToChatTimeout.current = window.setTimeout(() => {
        dispatchFlow({ type: "complete-draw" });
        returnToChatTimeout.current = null;
      }, 700);
    }
  }

  function startDeckDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    deckDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startRotation: deckRotation,
      moved: false,
    };
  }

  function moveDeckDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = deckDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 5 && !drag.moved) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add("dragging");
    }
    if (!drag.moved) return;

    event.preventDefault();
    const nextRotation = drag.startRotation + distance * 0.38;
    setDeckRotation(nextRotation);
    const hapticIndex = Math.round(nextRotation / 8);
    if (hapticIndex !== lastScrollHapticIndex.current) {
      lastScrollHapticIndex.current = hapticIndex;
      triggerHaptic("selection");
    }
  }

  function finishDeckDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    suppressClick: boolean,
  ) {
    const drag = deckDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (suppressClick && drag.moved) {
      suppressCardClick.current = true;
      window.setTimeout(() => {
        suppressCardClick.current = false;
      }, 0);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.currentTarget.classList.remove("dragging");
    deckDrag.current = null;
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
    dispatchFlow({ type: "save" });
  }

  function goHome() {
    resetReading();
  }

  return (
    <main className="app-shell">
      <div
        className={`phone-stage ${
          flow.phase === "draw" ? "draw-page" : ""
        }`}
      >
        <header className="topbar">
          <button className="text-button" onClick={goHome} aria-label="返回首页">
            ☾
          </button>
          <p className="wordmark">Arcana</p>
          <button
            className="icon-button"
            onClick={() => setHistoryOpen(true)}
            aria-label="查看占卜记录"
          >
            ◷
          </button>
        </header>

        {!historyOpen && (
          <ChatThread
            messages={flow.messages}
            activeKey={`${flow.phase}-${drawnCards.length}`}
          >
            {flow.phase === "welcome" && (
              <AssistantCard>
                <p className="message-card-label">准备好了吗？</p>
                <button
                  className="primary-button"
                  onClick={() => dispatchFlow({ type: "start" })}
                >
                  开始一次占卜
                </button>
              </AssistantCard>
            )}

        {(flow.phase === "category" ||
          flow.phase === "question" ||
          flow.phase === "spread") && (
          <AssistantCard>
            <section className="chat-step">
            {flow.phase === "category" && (
              <div className="question-categories" aria-label="问题分类">
                {questionCategories.map((category) => (
                  <button
                    className="category-tab"
                    key={category.id}
                    onClick={() => {
                      setQuestion("");
                      setQuestionCategoryId(category.id);
                      setQuestionOptionId("");
                      setSpreadId(singleCardSpread.id);
                      dispatchFlow({
                        type: "select-category",
                        label: category.name,
                      });
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
            {flow.phase === "question" && activeQuestionCategory && (
              <div className="question-step">
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
                            (spread) =>
                              spread.id === option.recommendedSpreadId,
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
                  onChange={(event) => {
                    setQuestion(event.target.value);
                    if (event.target.value !== activeQuestionOption?.prompt) {
                      setQuestionOptionId("");
                    }
                  }}
                  placeholder="也可以直接写下你自己的问题"
                  aria-label="输入你想探索的问题"
                />
                <button
                  className="primary-button"
                  disabled={!question.trim()}
                  onClick={() =>
                    dispatchFlow({
                      type: "submit-question",
                      question,
                    })
                  }
                >
                  确认这个问题
                </button>
              </div>
            )}
            {flow.phase === "spread" && activeQuestionCategory && (
              <div className="question-step">
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
                      <SpreadIcon spread={spread} />
                      <span className="spread-option-copy">
                        <span className="spread-option-title">
                          {spread.name}
                          {activeQuestionOption?.recommendedSpreadId ===
                            spread.id && <small>推荐</small>}
                        </span>
                        <em>
                          {spread.positions.length}张 · {spread.description}
                        </em>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="home-actions">
                  <button className="primary-button" onClick={beginDraw}>
                    使用{activeSpread.name}洗牌
                  </button>
                </div>
              </div>
            )}
            </section>
          </AssistantCard>
        )}

        {flow.phase === "draw" && (
          <AssistantCard>
          <section className="chat-step draw-stage selection-stage">
            <h2 className="message-card-title">凭直觉选择你的牌</h2>
            <p className="draw-progress" aria-live="polite">
              已选择 {drawnCards.length} / {activeSpread.positions.length}
            </p>
            <div
              className="draw-position-slots"
              aria-label={`${activeSpread.name}牌位`}
            >
              {orderedActivePositions.map((position) => {
                const drawn = drawnCards.find(
                  (item) => item.position.id === position.id,
                );
                return (
                  <button
                    className={`draw-position-slot ${
                      activeDrawPositionId === position.id ? "active" : ""
                    } ${drawn ? "filled" : ""}`}
                    key={position.id}
                    onClick={() => {
                      setActiveDrawPositionId(position.id);
                      triggerHaptic("selection");
                    }}
                    disabled={
                      shuffling || Boolean(drawn) || Boolean(animatingDraw)
                    }
                    aria-pressed={activeDrawPositionId === position.id}
                  >
                    <span className="draw-position-name">{position.name}</span>
                    <span
                      className="draw-position-frame"
                      ref={(element) => {
                        if (element) {
                          drawPositionFrames.current.set(position.id, element);
                        } else {
                          drawPositionFrames.current.delete(position.id);
                        }
                      }}
                    >
                      {drawn && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className={
                            drawn.orientation === "reversed" ? "reversed" : ""
                          }
                          src={drawn.card.asset.image ?? ""}
                          alt={`${drawn.card.name}，${
                            drawn.orientation === "upright" ? "正位" : "逆位"
                          }`}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="draw-hint">
              {drawnCards.length === activeSpread.positions.length
                ? "牌阵已经完整展开"
                : animatingDraw
                  ? `正在翻开“${animatingDraw.position.name}”的牌…`
                  : `左右拖动转动牌圈，为“${activeDrawPosition?.name}”选择一张牌`}
            </p>
            <div
              className="draw-deck-wheel"
              onPointerDown={startDeckDrag}
              onPointerMove={moveDeckDrag}
              onPointerUp={(event) => finishDeckDrag(event, true)}
              onPointerCancel={(event) => finishDeckDrag(event, false)}
              aria-label="可拖动旋转的圆形塔罗牌组"
            >
              {availableDeckCards.map((card, index) => {
                  const baseAngle =
                    availableDeckCards.length === 1
                      ? 0
                      : -150 +
                        (index * 300) /
                          (availableDeckCards.length - 1);
                  const angle = baseAngle + deckRotation;
                  const depth =
                    100 +
                    Math.round(
                      Math.cos((angle * Math.PI) / 180) * 50,
                    );
                  return (
                    <button
                      className="draw-deck-card"
                      key={card.id}
                      style={
                        {
                          "--wheel-angle": `${angle}deg`,
                          "--wheel-z": depth,
                        } as CSSProperties
                      }
                      onClick={(event) => {
                        if (suppressCardClick.current) {
                          event.preventDefault();
                          suppressCardClick.current = false;
                          return;
                        }
                        selectCard(card, event.currentTarget);
                      }}
                      disabled={
                        shuffling ||
                        Boolean(animatingDraw) ||
                        drawnCards.length >= activeSpread.positions.length
                      }
                      aria-label={`第 ${index + 1} 张牌，点击抽取`}
                    >
                      <span className="draw-deck-card-pattern">✦</span>
                    </button>
                  );
                })}
            </div>
            {drawnCards.length === activeSpread.positions.length && (
              <button
                className="primary-button draw-complete-button"
                onClick={() => dispatchFlow({ type: "complete-draw" })}
              >
                返回对话查看解读
              </button>
            )}
            {shuffling && (
              <div className="shuffle-intro" aria-live="polite">
                <div className="shuffle-deck" aria-hidden="true">
                  <span className="shuffle-card" />
                  <span className="shuffle-card" />
                  <span className="shuffle-card" />
                </div>
                <p>让牌序重新流动…</p>
                <button
                  className="text-button"
                  onClick={() => {
                    if (shuffleTimeout.current !== null) {
                      window.clearTimeout(shuffleTimeout.current);
                      shuffleTimeout.current = null;
                    }
                    setShuffling(false);
                  }}
                >
                  跳过洗牌
                </button>
              </div>
            )}
            {animatingDraw && (
              <div className="draw-card-animation" aria-live="assertive">
                <div
                  className={`draw-card-flip ${
                    animatingDraw.orientation === "reversed" ? "reversed" : ""
                  }`}
                  style={
                    {
                      "--draw-source-x": `${drawAnimationGeometry.sourceX}px`,
                      "--draw-source-y": `${drawAnimationGeometry.sourceY}px`,
                      "--draw-source-scale":
                        drawAnimationGeometry.sourceScale,
                      "--draw-source-rotation": `${drawAnimationGeometry.sourceRotation}deg`,
                      "--draw-target-x": `${drawAnimationGeometry.targetX}px`,
                      "--draw-target-y": `${drawAnimationGeometry.targetY}px`,
                      "--draw-target-scale":
                        drawAnimationGeometry.targetScale,
                    } as CSSProperties
                  }
                  onAnimationEnd={(event) => {
                    if (
                      event.currentTarget === event.target &&
                      event.animationName === "selected-card-pop"
                    ) {
                      finishDrawAnimation();
                    }
                  }}
                >
                  <span className="draw-card-flip-inner">
                    <span className="draw-card-flip-back">✦</span>
                    <span className="draw-card-flip-face">
                      {animatingDraw.card.asset.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={animatingDraw.card.asset.image}
                          alt={animatingDraw.card.asset.alt}
                        />
                      )}
                      <strong>{animatingDraw.card.name}</strong>
                    </span>
                  </span>
                </div>
              </div>
            )}
          </section>
          </AssistantCard>
        )}

        {flow.phase === "result" && drawnCards.length > 0 && (
          <AssistantCard>
          <section className="chat-step result-step">
            <p className="message-card-label">Your reflection · {activeSpread.name}</p>
            <h2 className="message-card-title">牌面为你展开</h2>
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
                      compact={drawnCards.length > 1}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="reading-list">
              {drawnCards.map((drawn) => {
                const interpretation = composeInterpretation({
                  card: drawn.card,
                  layeredMeaning: getLayeredMeaning(drawn.card.id),
                  orientation: drawn.orientation,
                  topicId: getMeaningTopic(questionCategoryId),
                  position: drawn.position,
                });
                const showFullReading = drawnCards.length === 1;
                return (
                  <article
                    className="reading-panel"
                    key={drawn.position.id}
                  >
                    <p className="reading-position">
                      {interpretation.positionName}
                    </p>
                    <h2>
                      {interpretation.cardName} ·{" "}
                      {interpretation.orientationName}
                    </h2>
                    <div className="keywords">
                      {interpretation.keywords.map((keyword) => (
                        <span className="keyword" key={keyword}>
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <p className="reading-summary">
                      {interpretation.summary}
                    </p>
                    {showFullReading ? (
                      <>
                        <div className="reading-section">
                          <h3>详细解读</h3>
                          <p className="reading-text">
                            {interpretation.overview}
                          </p>
                          {interpretation.topicText && (
                            <p className="reading-text topic-text">
                              {interpretation.topicText}
                            </p>
                          )}
                          <p className="position-context">
                            {interpretation.positionText}
                          </p>
                        </div>
                        {interpretation.symbols.length > 0 && (
                          <div className="reading-section">
                            <h3>牌面象征</h3>
                            <dl className="symbol-list">
                              {interpretation.symbols.map((symbol) => (
                                <div key={symbol.name}>
                                  <dt>{symbol.name}</dt>
                                  <dd>{symbol.meaning}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}
                        {interpretation.light && interpretation.shadow && (
                          <div className="meaning-polarity">
                            <div>
                              <h3>可以运用</h3>
                              <p>{interpretation.light}</p>
                            </div>
                            <div>
                              <h3>需要留意</h3>
                              <p>{interpretation.shadow}</p>
                            </div>
                          </div>
                        )}
                        <div className="advice">
                          <strong>可以尝试：</strong>
                          <ul>
                            {interpretation.advice.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        {interpretation.reflection && (
                          <blockquote className="reflection-question">
                            {interpretation.reflection}
                          </blockquote>
                        )}
                      </>
                    ) : (
                      <div className="advice compact">
                        <strong>{drawn.position.name}可以观察：</strong>
                        <p>{interpretation.advice[0]}</p>
                      </div>
                    )}
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
              <button className="secondary-button" onClick={resetReading}>
                重新提问
              </button>
            </div>
            <p className="disclaimer">
              牌面提供的是观察角度，而不是确定的未来
            </p>
          </section>
          </AssistantCard>
        )}

        {flow.phase === "complete" && (
          <AssistantCard>
            <button
              className="primary-button"
              onClick={() => {
                resetReading();
                window.setTimeout(
                  () => dispatchFlow({ type: "start" }),
                  0,
                );
              }}
            >
              开始新的对话
            </button>
          </AssistantCard>
        )}
          </ChatThread>
        )}

        {historyOpen && (
          <section className="history-panel">
            <button
              className="text-button history-close"
              onClick={() => setHistoryOpen(false)}
            >
              ← 返回对话
            </button>
            <p className="eyebrow">Your journey</p>
            <h1 className="screen-title">最近的启示</h1>
            {history.length === 0 ? (
              <div className="empty-state">
                <div>
                  <p>还没有保存过占卜记录</p>
                  <button
                    className="primary-button"
                    onClick={() => {
                      resetReading();
                      window.setTimeout(
                        () => dispatchFlow({ type: "start" }),
                        0,
                      );
                    }}
                  >
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
                <button
                  className="secondary-button"
                  onClick={() => {
                    resetReading();
                    window.setTimeout(
                      () => dispatchFlow({ type: "start" }),
                      0,
                    );
                  }}
                >
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
