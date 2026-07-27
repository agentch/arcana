import type { ActiveCardBack } from '@arcana/tarot-core/domain/catalog'

import rwsOriginalCardBack from '../../../packages/tarot-core/src/data/decks/rws-original/web/card-backs/arcana-starpath-mirror-card-back.jpg'

const bundledCardBacks: Record<string, string> = {
  'rws-original:arcana-starpath-mirror': rwsOriginalCardBack,
}

export function resolveBundledCardBack(
  deckId: string,
  cardBack: ActiveCardBack | null,
): ActiveCardBack | null {
  if (!cardBack) return null
  const image = bundledCardBacks[`${deckId}:${cardBack.id}`]
  return image ? { ...cardBack, image } : null
}
