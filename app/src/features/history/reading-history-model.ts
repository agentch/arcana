import type { Orientation } from '@arcana/tarot-core/domain/tarot'

export const READING_HISTORY_LIMIT = 12

export type SavedReadingCard = {
  cardId: string
  cardName: string
  orientation: Orientation
  positionId: string
}

export type SavedReading = {
  id: string
  question: string
  questionCategoryId: string
  cards: SavedReadingCard[]
  createdAt: string
  contentVersion: string
  deckId: string
  deckVersion: string
  spreadId: string
  spreadVersion: string
}

type LegacySingleReading = Omit<SavedReading, 'cards'> & {
  cardId: string
  cardName: string
  orientation: Orientation
}

function isOrientation(value: unknown): value is Orientation {
  return value === 'upright' || value === 'reversed'
}

function isSavedReadingCard(value: unknown): value is SavedReadingCard {
  if (!value || typeof value !== 'object') return false
  const card = value as Partial<SavedReadingCard>
  return (
    typeof card.cardId === 'string' &&
    typeof card.cardName === 'string' &&
    isOrientation(card.orientation) &&
    typeof card.positionId === 'string'
  )
}

function hasReadingMetadata(
  value: unknown,
): value is Omit<SavedReading, 'cards'> {
  if (!value || typeof value !== 'object') return false
  const reading = value as Partial<SavedReading>
  return (
    typeof reading.id === 'string' &&
    typeof reading.question === 'string' &&
    typeof reading.questionCategoryId === 'string' &&
    typeof reading.createdAt === 'string' &&
    typeof reading.contentVersion === 'string' &&
    typeof reading.deckId === 'string' &&
    typeof reading.deckVersion === 'string' &&
    typeof reading.spreadId === 'string' &&
    typeof reading.spreadVersion === 'string'
  )
}

function normalizeReading(value: unknown): SavedReading | null {
  if (!hasReadingMetadata(value)) return null
  const reading = value as SavedReading & Partial<LegacySingleReading>
  if (Array.isArray(reading.cards) && reading.cards.every(isSavedReadingCard)) {
    return { ...reading, cards: reading.cards }
  }
  if (
    typeof reading.cardId === 'string' &&
    typeof reading.cardName === 'string' &&
    isOrientation(reading.orientation) &&
    reading.spreadId === 'single-card'
  ) {
    return {
      ...reading,
      cards: [
        {
          cardId: reading.cardId,
          cardName: reading.cardName,
          orientation: reading.orientation,
          positionId: 'focus',
        },
      ],
    }
  }
  return null
}

export function normalizeReadingHistory(value: unknown): SavedReading[] {
  if (!Array.isArray(value)) return []
  return value
    .map(normalizeReading)
    .filter((reading): reading is SavedReading => reading !== null)
    .slice(0, READING_HISTORY_LIMIT)
}

export function prependReading(
  history: SavedReading[],
  reading: SavedReading,
): SavedReading[] {
  return [reading, ...history.filter((item) => item.id !== reading.id)].slice(
    0,
    READING_HISTORY_LIMIT,
  )
}

export function removeReading(
  history: SavedReading[],
  readingId: string,
): SavedReading[] {
  return history.filter((item) => item.id !== readingId)
}
