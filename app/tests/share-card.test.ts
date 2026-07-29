import { describe, expect, it } from 'vitest'

import {
  getCards,
  getLayeredMeaning,
  getSpread,
} from '@arcana/tarot-core/domain/catalog'
import { drawForSpread } from '@arcana/tarot-core/domain/draw'
import { composeInterpretation } from '@arcana/tarot-core/domain/interpretation'
import {
  composeShareCardContent,
  composeShareText,
  planShareCardSlots,
} from '@arcana/tarot-core/domain/share-card'

describe('正式应用分享卡片', () => {
  it('由正式解读生成单牌分享内容和安全声明', () => {
    const spread = getSpread('single-card')
    const drawn = drawForSpread(getCards(), spread, () => 0.42)[0]
    const interpretation = composeInterpretation({
      card: drawn.card,
      layeredMeaning: getLayeredMeaning(drawn.card.id),
      orientation: drawn.orientation,
      position: drawn.position,
    })
    const content = composeShareCardContent({
      title: '今日一牌',
      question: '今天，我最需要看见什么？',
      interpretations: [interpretation],
    })

    expect(content.brand).toBe('阿卡纳星语')
    expect(content.cards).toHaveLength(1)
    expect(content.cards[0].cardName).toBe(interpretation.cardName)
    expect(content.disclaimer).toContain('不代表事实结论或未来结果')
    expect(composeShareText(content)).toContain(
      `${interpretation.cardName}（${interpretation.orientationName}）`,
    )
  })

  it('为五张牌保留互不重叠的海报位置', () => {
    const slots = planShareCardSlots(5)

    expect(slots).toHaveLength(5)
    expect(new Set(slots.map((slot) => `${slot.x}:${slot.y}`)).size).toBe(5)
    expect(
      Math.max(...slots.map((slot) => slot.y + slot.height)),
    ).toBeLessThanOrEqual(380)
  })
})
