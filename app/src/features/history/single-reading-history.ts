import { storageAdapter } from '@/adapters/storage'
import {
  normalizeSingleReadingHistory,
  type SavedSingleReading,
} from './single-reading-history-model'

export const SINGLE_READING_HISTORY_KEY = 'arcana-single-reading-history'
export type { SavedSingleReading } from './single-reading-history-model'
export {
  prependSingleReading,
  removeSingleReading,
} from './single-reading-history-model'

export function readSingleReadingHistory(): SavedSingleReading[] {
  return normalizeSingleReadingHistory(
    storageAdapter.read<unknown>(SINGLE_READING_HISTORY_KEY),
  )
}

export function writeSingleReadingHistory(
  history: SavedSingleReading[],
): boolean {
  return storageAdapter.write(SINGLE_READING_HISTORY_KEY, history)
}
