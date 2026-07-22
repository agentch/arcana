import { describe, expect, it } from 'vitest'

import {
  getCards,
  getLayeredMeaning,
  getMeaningTopic,
  getSpread,
} from '@arcana/tarot-core/domain/catalog'
import { drawForSpread } from '@arcana/tarot-core/domain/draw'
import { composeInterpretation } from '@arcana/tarot-core/domain/interpretation'

describe('正式应用单牌闭环', () => {
  it('从共享牌库抽牌并组合分层解读', () => {
    const cards = getCards()
    const spread = getSpread('single-card')
    const [drawn] = drawForSpread(cards, spread, () => 0.25)
    const interpretation = composeInterpretation({
      card: drawn.card,
      layeredMeaning: getLayeredMeaning(drawn.card.id),
      orientation: drawn.orientation,
      topicId: getMeaningTopic('love'),
      position: drawn.position,
    })

    expect(cards).toHaveLength(78)
    expect(drawn.position.id).toBe('focus')
    expect(interpretation.source).toBe('layered-v2')
    expect(interpretation.topicText).toBeTruthy()
    expect(interpretation.advice.length).toBeGreaterThan(0)
  })
})
