import { storageAdapter } from '@/adapters/storage'
import {
  DAILY_STORAGE_KEY,
  type DailyCardRecord,
} from '@arcana/tarot-core/domain/daily-card'

export function readDailyCardRecord(): DailyCardRecord | null {
  const record = storageAdapter.read<DailyCardRecord>(DAILY_STORAGE_KEY)
  if (
    !record?.dateKey ||
    !record.cardId ||
    (record.orientation !== 'upright' && record.orientation !== 'reversed')
  ) {
    return null
  }
  return record
}

export function writeDailyCardRecord(record: DailyCardRecord): boolean {
  return storageAdapter.write(DAILY_STORAGE_KEY, record)
}
