import type {
  CardReference,
  DrawnCard,
  Orientation,
  SpreadDefinition,
  SpreadPosition,
} from './types'

export type RandomSource = () => number

export function shuffleDeck<T>(
  cards: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  const shuffled = [...cards]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }

  return shuffled
}

export function createDrawnCard<TCard extends CardReference>(
  card: TCard,
  position: SpreadPosition,
  random: RandomSource = Math.random,
  orientation?: Orientation,
): DrawnCard<TCard> {
  return {
    card,
    position,
    orientation: orientation ?? (random() >= 0.5 ? 'upright' : 'reversed'),
  }
}

export function drawForSpread<TCard extends CardReference>(
  cards: readonly TCard[],
  spread: SpreadDefinition,
  random: RandomSource = Math.random,
): DrawnCard<TCard>[] {
  if (cards.length < spread.positions.length) {
    throw new Error(
      `Spread ${spread.id} needs ${spread.positions.length} cards, but the deck only has ${cards.length}`,
    )
  }

  const shuffled = shuffleDeck(cards, random)

  return [...spread.positions]
    .sort((left, right) => left.order - right.order)
    .map((position, index) =>
      createDrawnCard(shuffled[index], position, random),
    )
}
