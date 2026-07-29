export type VisibleDeckCardLayout = {
  itemIndex: number
  angle: number
  zIndex: number
}

export type DrawAnimationRect = {
  left: number
  top: number
  width: number
  height: number
}

export type DrawAnimationGeometry = {
  sourceX: number
  sourceY: number
  sourceScale: number
  sourceRotation: number
  targetX: number
  targetY: number
  targetScale: number
}

export const VISIBLE_DECK_CARD_COUNT = 13
export const DECK_CARD_ANGLE_STEP = 11

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

export function getVisibleDeckCardLayouts(
  total: number,
  rotation: number,
  visibleLimit = VISIBLE_DECK_CARD_COUNT,
): VisibleDeckCardLayout[] {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error(`Invalid deck wheel total ${total}`)
  }
  if (!Number.isInteger(visibleLimit) || visibleLimit < 1) {
    throw new Error(`Invalid visible deck card limit ${visibleLimit}`)
  }
  if (total === 0) return []

  const visibleCount = Math.min(total, visibleLimit)
  const focusedIndex = -Math.round(rotation / DECK_CARD_ANGLE_STEP)
  const residualAngle = rotation + focusedIndex * DECK_CARD_ANGLE_STEP
  const firstOffset = -Math.floor(visibleCount / 2)

  return Array.from({ length: visibleCount }, (_, visibleIndex) => {
    const offset = firstOffset + visibleIndex
    const angle = offset * DECK_CARD_ANGLE_STEP + residualAngle
    return {
      itemIndex: modulo(focusedIndex + offset, total),
      angle,
      zIndex: 100 + Math.round(Math.cos((angle * Math.PI) / 180) * 50),
    }
  })
}

export function rotationFromDrag(
  startRotation: number,
  startX: number,
  currentX: number,
): number {
  return startRotation + (currentX - startX) * 0.32
}

export function getDrawAnimationGeometry(
  source: DrawAnimationRect,
  target: DrawAnimationRect,
  viewport: { width: number; height: number },
  sourceRotation: number,
): DrawAnimationGeometry {
  const animationCardWidth = Math.min(154, viewport.width * 0.32)
  const centerX = viewport.width / 2
  const centerY = viewport.height / 2
  return {
    sourceX: source.left + source.width / 2 - centerX,
    sourceY: source.top + source.height / 2 - centerY,
    sourceScale: source.width / animationCardWidth,
    sourceRotation,
    targetX: target.left + target.width / 2 - centerX,
    targetY: target.top + target.height / 2 - centerY,
    targetScale: target.width / animationCardWidth,
  }
}
