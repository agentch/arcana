export type DeckWheelCardLayout = {
  itemIndex: number
  angle: number
}

export type FocusedDeckCardPresentation = {
  angle: number
  radius: number
  scale: number
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
  targetRotation: number
}

export const DECK_ARC_START_DEGREES = -150
export const DECK_ARC_SWEEP_DEGREES = 300

export function clampDeckRotation(rotation: number): number {
  return Math.min(
    -DECK_ARC_START_DEGREES,
    Math.max(-(DECK_ARC_START_DEGREES + DECK_ARC_SWEEP_DEGREES), rotation),
  )
}

export function getDeckWheelCardLayouts(total: number): DeckWheelCardLayout[] {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error(`Invalid deck wheel total ${total}`)
  }
  if (total === 0) return []

  return Array.from({ length: total }, (_, itemIndex) => ({
    itemIndex,
    angle:
      total === 1
        ? 0
        : DECK_ARC_START_DEGREES +
          (itemIndex * DECK_ARC_SWEEP_DEGREES) / (total - 1),
  }))
}

export function getFocusedDeckIndex(total: number, rotation: number): number {
  if (!Number.isInteger(total) || total < 1) return 0
  if (total === 1) return 0
  const clampedRotation = clampDeckRotation(rotation)
  const focusedPosition =
    ((-clampedRotation - DECK_ARC_START_DEGREES) / DECK_ARC_SWEEP_DEGREES) *
    (total - 1)
  return Math.min(total - 1, Math.max(0, Math.round(focusedPosition)))
}

export function getFocusedDeckCardPresentation(
  itemIndex: number,
  focusedIndex: number,
  baseAngle: number,
): FocusedDeckCardPresentation {
  const distance = Math.abs(itemIndex - focusedIndex)
  const direction = Math.sign(itemIndex - focusedIndex)
  const extraSpacing = [0, 2.2, 1.2, 0.6][distance] ?? 0
  return {
    angle: baseAngle + direction * extraSpacing,
    radius: distance === 0 ? 476 : 460,
    scale: distance === 0 ? 1.04 : 1,
  }
}

export function rotationFromDrag(
  startRotation: number,
  startX: number,
  currentX: number,
): number {
  return startRotation + (currentX - startX) * 0.38
}

export function getDrawAnimationGeometry(
  source: DrawAnimationRect,
  target: DrawAnimationRect,
  viewport: { width: number; height: number },
  sourceRotation: number,
  targetRotation = 0,
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
    targetRotation,
  }
}
