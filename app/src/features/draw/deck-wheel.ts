export type DeckWheelCardLayout = {
  angle: number
  zIndex: number
}

const ARC_START_DEGREES = -150
const ARC_SWEEP_DEGREES = 300

export function getDeckWheelCardLayout(
  index: number,
  total: number,
  rotation: number,
): DeckWheelCardLayout {
  if (!Number.isInteger(index) || index < 0 || index >= total) {
    throw new Error(`Invalid deck wheel index ${index} for ${total} cards`)
  }
  const baseAngle =
    total === 1
      ? 0
      : ARC_START_DEGREES + (index * ARC_SWEEP_DEGREES) / (total - 1)
  const angle = baseAngle + rotation
  const zIndex = 100 + Math.round(Math.cos((angle * Math.PI) / 180) * 50)
  return { angle, zIndex }
}

export function rotationFromDrag(
  startRotation: number,
  startX: number,
  currentX: number,
): number {
  return startRotation + (currentX - startX) * 0.38
}
