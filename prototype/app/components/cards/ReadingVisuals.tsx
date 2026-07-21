import {getActiveCardBack} from "../../domain/catalog";
import type { DrawnRenderableCard } from "../../domain/draw";
import type { SpreadDefinition } from "../../domain/tarot";

const activeCardBack = getActiveCardBack();

function createDefaultSpreadLayout(cardCount: number) {
  const columns = Math.min(cardCount, 5);
  const rows = Math.ceil(cardCount / columns);

  return Array.from({ length: cardCount }, (_, index) => {
    const row = Math.floor(index / columns);
    const cardsInRow = Math.min(columns, cardCount - row * columns);
    const column = index % columns;

    return {
      x: 36 + (column - (cardsInRow - 1) / 2) * 13,
      y: 24 + (row - (rows - 1) / 2) * 23,
      rotation: 0,
    };
  });
}

export function SpreadIcon({ spread }: { spread: SpreadDefinition }) {
  const layout =
    spread.visual?.cards ??
    createDefaultSpreadLayout(spread.positions.length);

  return (
    <svg
      className="spread-icon"
      viewBox="0 0 72 48"
      role="img"
      aria-label={`${spread.name}牌阵示意图`}
    >
      {layout.map((card, index) => (
        <g
          className="spread-icon-card"
          key={`${card.x}-${card.y}-${index}`}
          transform={`translate(${card.x} ${card.y}) rotate(${
            card.rotation ?? 0
          })`}
        >
          <rect x="-6" y="-10" width="12" height="20" rx="2" />
          <path d="M0 -3L1 0L0 3L-1 0Z" />
        </g>
      ))}
    </svg>
  );
}

export function CardVisual({
  drawn,
  compact,
}: {
  drawn: DrawnRenderableCard;
  compact: boolean;
}) {
  const className = `tarot-card revealed ${
    drawn.orientation === "reversed" ? "reversed" : ""
  } ${compact ? "compact" : ""}`;

  return (
    <div className={className}>
      <span className={`card-back${activeCardBack ? " has-image" : ""}`}>
        {activeCardBack ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="card-back-image"
            src={activeCardBack.image}
            alt=""
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span className="card-face">
        {drawn.card.asset.image ? (
          // 牌组流水线已经输出不可变的优化 WebP 文件
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="card-image"
            src={drawn.card.asset.image}
            alt={drawn.card.asset.alt}
          />
        ) : (
          <>
            <span className="card-number">
              {drawn.card.romanNumeral ?? drawn.card.rank ?? drawn.card.number}
            </span>
            <span className="card-art">
              {drawn.card.asset.fallbackSymbol ?? "✦"}
            </span>
            <span className="card-name">{drawn.card.name}</span>
            <span className="card-en">{drawn.card.englishName}</span>
          </>
        )}
      </span>
    </div>
  );
}
