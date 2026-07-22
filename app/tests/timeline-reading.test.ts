import { describe, expect, it } from 'vitest'

import {
  getCards,
  getLayeredMeaning,
  getMeaningTopic,
  getSpread,
} from '@arcana/tarot-core/domain/catalog'
import { drawForSpread } from '@arcana/tarot-core/domain/draw'
import {
  composeInterpretation,
  composeSpreadSummary,
} from '@arcana/tarot-core/domain/interpretation'

describe('正式应用时间流', () => {
  it('抽取三张不重复牌并生成组合摘要', () => {
    const spread = getSpread('timeline')
    const drawnCards = drawForSpread(getCards(), spread, () => 0.42)
    const interpretations = drawnCards.map((drawn) =>
      composeInterpretation({
        card: drawn.card,
        layeredMeaning: getLayeredMeaning(drawn.card.id),
        orientation: drawn.orientation,
        topicId: getMeaningTopic('career'),
        position: drawn.position,
      }),
    )
    const summary = composeSpreadSummary({
      spreadId: spread.id,
      spreadName: spread.name,
      spreadDescription: spread.description,
      interpretations,
    })

    expect(drawnCards).toHaveLength(3)
    expect(new Set(drawnCards.map((drawn) => drawn.card.id)).size).toBe(3)
    expect(drawnCards.map((drawn) => drawn.position.id)).toEqual([
      'past',
      'present',
      'future',
    ])
    expect(summary.illumination.lines.length).toBeGreaterThan(0)
    expect(summary.guidance.lines.length).toBeGreaterThan(0)
  })
})
