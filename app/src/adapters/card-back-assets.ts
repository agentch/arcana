import type { ActiveCardBack } from '@arcana/tarot-core/domain/catalog'

import type { AssetPlatform } from '@/adapters/card-assets'

import rwsOriginalCardBack from '../../../packages/tarot-core/src/data/decks/rws-original/web/card-backs/arcana-starpath-mirror-card-back.jpg'

const bundledCardBacks: Record<string, string> = {
  'rws-original:arcana-starpath-mirror': rwsOriginalCardBack,
}

export function resolveBundledCardBack(
  deckId: string,
  cardBack: ActiveCardBack | null,
  platform: AssetPlatform,
): ActiveCardBack | null {
  if (!cardBack) return null
  const image = bundledCardBacks[`${deckId}:${cardBack.id}`]
  if (!image) return null
  return {
    ...cardBack,
    image:
      platform === 'weapp'
        ? `../../${cardBack.image.replace(/^\/+/, '')}`
        : image,
  }
}
