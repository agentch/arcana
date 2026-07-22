import { describe, expect, it } from 'vitest'

import {
  getCards,
  getLayeredMeaning,
  getMeaningTopic,
  getSpread,
} from '@arcana/tarot-core/domain/catalog'
import {
  DAILY_CATEGORY_ID,
  pickDailyCard,
} from '@arcana/tarot-core/domain/daily-card'
import { composeInterpretation } from '@arcana/tarot-core/domain/interpretation'

describe('正式应用今日一牌', () => {
  it('同一天生成稳定牌面并组合分层解读', () => {
    const cards = getCards()
    const dateKey = '2026-07-22'
    const first = pickDailyCard(cards, dateKey)
    const second = pickDailyCard(cards, dateKey)
    const position = getSpread('single-card').positions[0]
    const interpretation = composeInterpretation({
      card: first.card,
      layeredMeaning: getLayeredMeaning(first.card.id),
      orientation: first.orientation,
      topicId: getMeaningTopic(DAILY_CATEGORY_ID),
      position,
    })

    expect(first).toEqual(second)
    expect(interpretation.source).toBe('layered-v2')
    expect(interpretation.topicText).toBeTruthy()
  })
})
