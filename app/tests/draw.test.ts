import { describe, expect, it } from 'vitest'

import { drawForSpread } from '@/domain/draw'

const cards = Array.from({ length: 8 }, (_, index) => ({
  id: `major-${String(index).padStart(2, '0')}`,
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
