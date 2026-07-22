import type { Orientation } from '@arcana/tarot-core/domain/tarot'

export const SINGLE_READING_HISTORY_LIMIT = 12

export type SavedSingleReading = {
  id: string
  question: string
  questionCategoryId: string
  cardId: string
  cardName: string
  orientation: Orientation
  createdAt: string
  contentVersion: string
  deckId: string
  deckVersion: string
  spreadId: 'single-card'
  spreadVersion: string
}

function isSavedSingleReading(value: unknown): value is SavedSingleReading {
  if (!value || typeof value !== 'object') return false
  const reading = value as Partial<SavedSingleReading>
  return (
    typeof reading.id === 'string' &&
    typeof reading.question === 'string' &&
    typeof reading.questionCategoryId === 'string' &&
    typeof reading.cardId === 'string' &&
    typeof reading.cardName === 'string' &&
    (reading.orientation === 'upright' || reading.orientation === 'reversed') &&
    typeof reading.createdAt === 'string' &&
    reading.spreadId === 'single-card'
  )
}

export function normalizeSingleReadingHistory(
  value: unknown,
): SavedSingleReading[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isSavedSingleReading)
    .slice(0, SINGLE_READING_HISTORY_LIMIT)
}

export function prependSingleReading(
  history: SavedSingleReading[],
  reading: SavedSingleReading,
): SavedSingleReading[] {
  return [reading, ...history.filter((item) => item.id !== reading.id)].slice(
    0,
    SINGLE_READING_HISTORY_LIMIT,
  )
}

export function removeSingleReading(
  history: SavedSingleReading[],
  readingId: string,
): SavedSingleReading[] {
  return history.filter((item) => item.id !== readingId)
}
