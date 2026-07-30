import { describe, expect, it } from 'vitest'

import readingConfig from '@/config/reading.json'
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
import {
  composeShareCardContent,
  planShareCardSlots,
} from '@arcana/tarot-core/domain/share-card'

describe('正式应用凯尔特十字', () => {
  it('从完整牌组无放回抽取十张并生成专属组合摘要', () => {
    const spread = getSpread('celtic-cross')
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

    expect(readingConfig.availableSpreadIds).toContain('celtic-cross')
    expect(drawnCards).toHaveLength(10)
    expect(new Set(drawnCards.map((drawn) => drawn.card.id)).size).toBe(10)
    expect(drawnCards.map((drawn) => drawn.position.id)).toEqual([
      'present',
      'crossing',
      'foundation',
      'past-influence',
      'conscious-focus',
      'near-focus',
      'self-position',
      'environment',
      'hopes-fears',
      'overall-direction',
    ])
    expect(summary.illumination.title).toBe('问题脉络')
    expect(summary.guidance.title).toBe('行动参考')
    expect(summary.illumination.lines.map((line) => line.label)).toEqual([
      '核心现状',
      '交叉挑战',
      '内在基础',
      '已有影响',
      '可见目标',
    ])
    expect(summary.guidance.lines.at(-1)?.label).toBe('可以尝试')
    expect(summary.closing).toContain('不代表事实结论或未来结果')
  })

  it('提供传统交叉结构并完整保留十张分享内容', () => {
    const spread = getSpread('celtic-cross')
    const drawnCards = drawForSpread(getCards(), spread, () => 0.24)
    const interpretations = drawnCards.map((drawn) =>
      composeInterpretation({
        card: drawn.card,
        layeredMeaning: getLayeredMeaning(drawn.card.id),
        orientation: drawn.orientation,
        position: drawn.position,
      }),
    )
    const content = composeShareCardContent({
      brand: '星简集',
      title: spread.name,
      defaultTitle: '卡牌反思',
      question: '我该如何梳理当前这个复杂问题？',
      interpretations,
      disclaimer: '牌面仅提供观察角度，不代表事实结论或未来结果',
    })

    expect(spread.visual?.cards).toHaveLength(10)
    expect(spread.visual?.cards[1].rotation).toBe(90)
    expect(content.cards).toHaveLength(10)
    expect(planShareCardSlots(content.cards.length)).toHaveLength(10)
  })
})
