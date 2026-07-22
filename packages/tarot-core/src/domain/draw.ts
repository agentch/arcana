import type {
  Orientation,
  RenderableCard,
  SpreadPosition,
} from "./tarot";

export type CardReference = {
  id: string;
};

export type SpreadPositionReference = {
  id: string;
  name: string;
  order: number;
};

export type SpreadReference<TPosition extends SpreadPositionReference> = {
  id: string;
  positions: TPosition[];
};

export type DrawnCard<
  TCard extends CardReference = CardReference,
  TPosition extends SpreadPositionReference = SpreadPositionReference,
> = {
  card: TCard;
  orientation: Orientation;
  position: TPosition;
};

export type DrawnRenderableCard = DrawnCard<RenderableCard, SpreadPosition>;

export function shuffleDeck<T>(
  cards: readonly T[],
  random: () => number = Math.random,
): T[] {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function createDrawnCard<
  TCard extends CardReference,
  TPosition extends SpreadPositionReference,
>(
  card: TCard,
  position: TPosition,
  random: () => number = Math.random,
  orientation?: Orientation,
): DrawnCard<TCard, TPosition> {
  return {
    card,
    orientation: orientation ?? (random() >= 0.5 ? "upright" : "reversed"),
    position,
  };
}

export function drawForSpread<
  TCard extends CardReference,
  TPosition extends SpreadPositionReference,
>(
  cards: readonly TCard[],
  spread: SpreadReference<TPosition>,
  random: () => number = Math.random,
): DrawnCard<TCard, TPosition>[] {
  if (cards.length < spread.positions.length) {
    throw new Error(
      `Spread ${spread.id} needs ${spread.positions.length} cards, but the deck only has ${cards.length}`,
    );
  }

  const shuffled = shuffleDeck(cards, random);

  return [...spread.positions]
    .sort((left, right) => left.order - right.order)
    .map((position, index) =>
      createDrawnCard(shuffled[index], position, random),
    );
}
