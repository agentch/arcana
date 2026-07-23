import type { RenderableCard } from '@arcana/tarot-core/domain/tarot'

export type AssetPlatform = 'h5' | 'weapp'

export const RWS_CLOUDBASE_ROOT =
  'cloud://arcana-d1gztji7gce0b73d0.6172-arcana-d1gztji7gce0b73d0-1258587719/cards'

export function resolveCardImage(
  cardId: string,
  webImage: string | null,
  platform: AssetPlatform,
): string | null {
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
