import type { RenderableCard } from '@arcana/tarot-core/domain/tarot'

export type AssetPlatform = 'h5' | 'weapp'

export const RWS_CLOUDBASE_ROOT =
  'cloud://cloud1-d4gihrh6ob576fe1d.636c-cloud1-d4gihrh6ob576fe1d-1457632608'

export function resolveCardImage(
  cardId: string,
  webImage: string | null,
  platform: AssetPlatform,
): string | null {
  if (
    typeof __TARO_LOCAL_CARD_ASSETS__ !== 'undefined' &&
    __TARO_LOCAL_CARD_ASSETS__
  ) {
    return webImage
  }
  if (platform === 'weapp') {
    return `${RWS_CLOUDBASE_ROOT}/${cardId}.webp`
  }
  return webImage
}

export function resolveCardAssets(
  cards: RenderableCard[],
  platform: AssetPlatform,
): RenderableCard[] {
  return cards.map((card) => ({
    ...card,
    asset: {
      ...card.asset,
      image: resolveCardImage(card.id, card.asset.image, platform),
    },
  }))
}

export function getAssetPlatform(
  taroEnv = process.env.TARO_ENV,
): AssetPlatform {
  return taroEnv === 'weapp' ? 'weapp' : 'h5'
}
