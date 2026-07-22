import { storageAdapter } from '@/adapters/storage'
import {
  normalizeReadingHistory,
  type SavedReading,
} from './reading-history-model'

export const READING_HISTORY_KEY = 'arcana-single-reading-history'
export type { SavedReading } from './reading-history-model'
export { prependReading, removeReading } from './reading-history-model'

export function readReadingHistory(): SavedReading[] {
  return normalizeReadingHistory(
    storageAdapter.read<unknown>(READING_HISTORY_KEY),
  )
}

export function writeReadingHistory(history: SavedReading[]): boolean {
  return storageAdapter.write(READING_HISTORY_KEY, history)
}
