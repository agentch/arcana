import { beforeEach, describe, expect, it, vi } from 'vitest'

import { READING_HISTORY_KEY } from '@/features/history/reading-history'
import { clearLocalReadingData } from '@/features/privacy/local-data'
import { DAILY_STORAGE_KEY } from '@arcana/tarot-core/domain/daily-card'

const storageMocks = vi.hoisted(() => ({
  removeStorageSync: vi.fn(),
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    removeStorageSync: storageMocks.removeStorageSync,
  },
}))

describe('本地占卜数据清理', () => {
  beforeEach(() => {
    storageMocks.removeStorageSync.mockReset()
  })

  it('只删除历史记录和今日一牌两个应用自有键', () => {
    const result = clearLocalReadingData()

    expect(result).toEqual({
      success: true,
      historyCleared: true,
      dailyCardCleared: true,
    })
    expect(storageMocks.removeStorageSync.mock.calls).toEqual([
      [READING_HISTORY_KEY],
      [DAILY_STORAGE_KEY],
    ])
  })

  it('单个键删除失败时返回部分失败结果', () => {
    storageMocks.removeStorageSync.mockImplementation((key: string) => {
      if (key === DAILY_STORAGE_KEY) throw new Error('storage unavailable')
    })

    expect(clearLocalReadingData()).toEqual({
      success: false,
      historyCleared: true,
      dailyCardCleared: false,
    })
  })
})
