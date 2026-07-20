import type {
  Orientation,
  RenderableCard,
  SpreadDefinition,
  SpreadPosition,
} from "./tarot";

export type DrawnRenderableCard = {
  card: RenderableCard;
  orientation: Orientation;
  position: SpreadPosition;
};

export function drawForSpread(
  cards: RenderableCard[],
  spread: SpreadDefinition,
  random: () => number = Math.random,
): DrawnRenderableCard[] {
  if (cards.length < spread.positions.length) {
    throw new Error(
      `Spread ${spread.id} needs ${spread.positions.length} cards, but the deck only has ${cards.length}`,
    );
  }

  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return [...spread.positions]
    .sort((left, right) => left.order - right.order)
    .map((position, index) => ({
      card: shuffled[index],
      orientation: random() >= 0.5 ? "upright" : "reversed",
      position,
    }));
}
