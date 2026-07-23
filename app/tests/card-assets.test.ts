import { getCards } from '@arcana/tarot-core/domain/catalog'
import { describe, expect, it } from 'vitest'

import {
  RWS_CLOUDBASE_ROOT,
  resolveCardAssets,
  resolveCardImage,
} from '@/adapters/card-assets'

describe('card asset platform resolution', () => {
  it.each([
    ['major-00', 'major-00.webp'],
    ['major-06', 'major-06.webp'],
    ['major-17', 'major-17.webp'],
  ])('maps sample card %s to CloudBase', (cardId, fileName) => {
    expect(
      resolveCardImage(cardId, `/tarot/rws-original/${fileName}`, 'weapp'),
    ).toBe(`${RWS_CLOUDBASE_ROOT}/${fileName}`)
  })

  it('keeps the local static path for H5', () => {
    expect(
      resolveCardImage('major-00', '/tarot/rws-original/major-00.webp', 'h5'),
    ).toBe('/tarot/rws-original/major-00.webp')
  })

  it('maps all 78 cards to stable CloudBase file IDs', () => {
    const cards = resolveCardAssets(getCards(), 'weapp')

    expect(cards).toHaveLength(78)
    expect(new Set(cards.map((card) => card.id)).size).toBe(78)
    for (const card of cards) {
      expect(card.asset.image).toBe(`${RWS_CLOUDBASE_ROOT}/${card.id}.webp`)
    }
  })
})
