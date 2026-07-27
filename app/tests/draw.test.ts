import { describe, expect, it } from 'vitest'

import {
  drawForSpread,
  drawPreparedCardAt,
  prepareDeckForSelection,
} from '@/domain/draw'

const cards = Array.from({ length: 8 }, (_, index) => ({
  id: `major-${String(index).padStart(2, '0')}`,
}))
const fullDeck = Array.from({ length: 78 }, (_, index) => ({
  id: `card-${String(index + 1).padStart(2, '0')}`,
}))

const timeline = {
  id: 'timeline',
  positions: [
    { id: 'past', name: '过去', order: 1 },
    { id: 'present', name: '现在', order: 2 },
    { id: 'future', name: '未来', order: 3 },
  ],
}

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

describe('drawForSpread', () => {
  it('draws configured positions without duplicate cards', () => {
    const result = drawForSpread(cards, timeline, seededRandom(42))

    expect(result).toHaveLength(3)
    expect(result.map(({ position }) => position.id)).toEqual([
      'past',
      'present',
      'future',
    ])
    expect(new Set(result.map(({ card }) => card.id)).size).toBe(3)
  })

  it('supports reproducible draws with an injected random source', () => {
    const first = drawForSpread(cards, timeline, seededRandom(7))
    const second = drawForSpread(cards, timeline, seededRandom(7))

    expect(first).toEqual(second)
  })

  it('rejects a spread larger than the available deck', () => {
    expect(() => drawForSpread(cards.slice(0, 2), timeline)).toThrow(
      'needs 3 cards',
    )
  })
})

describe('真实牌组位置选牌', () => {
  it('将完整洗牌顺序与可选择位置一一绑定', () => {
    const first = prepareDeckForSelection(fullDeck, seededRandom(21))
    const second = prepareDeckForSelection(fullDeck, seededRandom(21))

    expect(first).toHaveLength(78)
    expect(first).toEqual(second)
    expect(new Set(first.map(({ card }) => card.id)).size).toBe(78)
  })

  it('点击的牌组位置决定实际抽取的牌', () => {
    const preparedDeck = prepareDeckForSelection(cards, seededRandom(9))
    const result = drawPreparedCardAt(preparedDeck, 5, timeline.positions[0])

    expect(result.card.id).toBe(preparedDeck[5].card.id)
    expect(result.orientation).toBe(preparedDeck[5].orientation)
    expect(result.position.id).toBe('past')
  })

  it('拒绝重复位置和越界位置', () => {
    const preparedDeck = prepareDeckForSelection(cards, seededRandom(5))

    expect(() =>
      drawPreparedCardAt(preparedDeck, 2, timeline.positions[0], [2]),
    ).toThrow('already been selected')
    expect(() =>
      drawPreparedCardAt(preparedDeck, cards.length, timeline.positions[0]),
    ).toThrow('outside the prepared deck')
  })
})
