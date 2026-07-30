import type {SpreadDefinition} from "./tarot";

export type ConfiguredSpreadSlot = {
  positionId: string;
  label: string;
  left: string;
  top: string;
  rotation: number;
  zIndex: number;
};

/** 将共享牌阵的72×48视觉坐标转换为Web抽牌区百分比定位。 */
export function getConfiguredSpreadSlots(
  spread: SpreadDefinition,
): ConfiguredSpreadSlot[] | null {
  const orderedPositions = [...spread.positions].sort(
    (left, right) => left.order - right.order,
  );
  const visualCards = spread.visual?.cards;

  if (
    orderedPositions.length <= 5 ||
    !visualCards ||
    visualCards.length !== orderedPositions.length
  ) {
    return null;
  }

  return orderedPositions.map((position, index) => {
    const visual = visualCards[index];
    return {
      positionId: position.id,
      label: `${index + 1}`,
      left: `${(visual.x / 72) * 100}%`,
      top: `${(visual.y / 48) * 100}%`,
      rotation: visual.rotation ?? 0,
      zIndex: index + 1,
    };
  });
}
