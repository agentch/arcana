import { describe, expect, it } from 'vitest'

import {
  normalizeReadingHistory,
  prependReading,
  READING_HISTORY_LIMIT,
  removeReading,
  type SavedReading,
} from '@/features/history/reading-history-model'

function createReading(index: number): SavedReading {
  return {
    id: `reading-${index}`,
    question: `问题 ${index}`,
    questionCategoryId: 'mood',
    cards: [
      {
        cardId: 'major-00',
        cardName: '愚人',
        orientation: 'upright',
        positionId: 'focus',
      },
    ],
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
      ...Array.from({ length: READING_HISTORY_LIMIT + 2 }, (_, index) =>
        createReading(index),
      ),
      { id: 'broken' },
    ]

    expect(normalizeReadingHistory(values)).toHaveLength(READING_HISTORY_LIMIT)
  })

  it('保存到顶部并可按 id 删除', () => {
    const first = createReading(1)
    const second = createReading(2)
    const history = prependReading([first], second)

    expect(history.map((item) => item.id)).toEqual([second.id, first.id])
    expect(removeReading(history, second.id)).toEqual([first])
  })

  it('迁移旧版单牌记录为卡牌数组', () => {
    const legacy = {
      ...createReading(1),
      cards: undefined,
      cardId: 'major-00',
      cardName: '愚人',
      orientation: 'reversed',
    }

    expect(normalizeReadingHistory([legacy])[0].cards).toEqual([
      {
        cardId: 'major-00',
        cardName: '愚人',
        orientation: 'reversed',
        positionId: 'focus',
      },
    ])
  })

  it('保留时间流的多牌位记录', () => {
    const timeline = {
      ...createReading(1),
      spreadId: 'timeline',
      cards: [
        {
          cardId: 'major-00',
          cardName: '愚人',
          orientation: 'upright' as const,
          positionId: 'past',
        },
        {
          cardId: 'major-01',
          cardName: '魔术师',
          orientation: 'reversed' as const,
          positionId: 'present',
        },
        {
          cardId: 'major-02',
          cardName: '女祭司',
          orientation: 'upright' as const,
          positionId: 'future',
        },
      ],
    }

    expect(normalizeReadingHistory([timeline])[0].cards).toHaveLength(3)
  })
})
