import { clearDailyCardRecord } from '@/features/daily/daily-card-record'
import { clearReadingHistory } from '@/features/history/reading-history'

export type ClearLocalReadingDataResult = {
  success: boolean
  historyCleared: boolean
  dailyCardCleared: boolean
}

/** 只清理本应用拥有的卡牌记录键，不调用全局 clearStorage。 */
export function clearLocalReadingData(): ClearLocalReadingDataResult {
  const historyCleared = clearReadingHistory()
  const dailyCardCleared = clearDailyCardRecord()

  return {
    success: historyCleared && dailyCardCleared,
    historyCleared,
    dailyCardCleared,
  }
}
