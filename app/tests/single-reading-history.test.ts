import { describe, expect, it } from 'vitest'

import {
  normalizeSingleReadingHistory,
  prependSingleReading,
  removeSingleReading,
  type SavedSingleReading,
  SINGLE_READING_HISTORY_LIMIT,
} from '@/features/history/single-reading-history-model'

function createReading(index: number): SavedSingleReading {
  return {
    id: `reading-${index}`,
    question: `问题 ${index}`,
    questionCategoryId: 'mood',
    cardId: 'major-00',
    cardName: '愚人',
    orientation: 'upright',
    createdAt: new Date(2026, 6, index + 1).toISOString(),
    contentVersion: '1.0.0',
    deckId: 'rws-original',
    deckVersion: '1.0.0',
    spreadId: 'single-card',
    spreadVersion: '1.0.0',
  }
}

describe('单牌历史记录', () => {
  it('过滤损坏数据并限制记录数量', () => {
    const values = [
      ...Array.from({ length: SINGLE_READING_HISTORY_LIMIT + 2 }, (_, index) =>
        createReading(index),
      ),
      { id: 'broken' },
    ]

    expect(normalizeSingleReadingHistory(values)).toHaveLength(
      SINGLE_READING_HISTORY_LIMIT,
    )
  })

  it('保存到顶部并可按 id 删除', () => {
    const first = createReading(1)
    const second = createReading(2)
    const history = prependSingleReading([first], second)

    expect(history.map((item) => item.id)).toEqual([second.id, first.id])
    expect(removeSingleReading(history, second.id)).toEqual([first])
  })
})
