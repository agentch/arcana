import { describe, expect, it } from 'vitest'

import {
  clampDeckRotation,
  getDeckWheelCardLayouts,
  getDrawAnimationGeometry,
  getFocusedDeckCardPresentation,
  getFocusedDeckIndex,
  rotationFromDrag,
} from '@/features/draw/deck-wheel'

describe('半圆牌组布局', () => {
  it('与 Web 一致，将完整牌组均匀铺在300度圆弧上', () => {
    const layouts = getDeckWheelCardLayouts(78)
    expect(layouts).toHaveLength(78)
    expect(layouts[0]).toMatchObject({ itemIndex: 0, angle: -150 })
    expect(layouts[38].angle).toBeCloseTo(-1.948, 2)
    expect(layouts[39].angle).toBeCloseTo(1.948, 2)
    expect(layouts[77]).toMatchObject({ itemIndex: 77, angle: 150 })
  })

  it('仅旋转牌组容器并保持 Web 拖动比例', () => {
    expect(rotationFromDrag(12, 100, 150)).toBe(31)
  })

  it('旋转到两端时分别把第一张和最后一张置于中心', () => {
    expect(clampDeckRotation(999)).toBe(150)
    expect(clampDeckRotation(-999)).toBe(-150)
    expect(getFocusedDeckIndex(78, 150)).toBe(0)
    expect(getFocusedDeckIndex(78, 0)).toBe(39)
    expect(getFocusedDeckIndex(78, -150)).toBe(77)
  })

  it('聚焦牌上浮放大，并局部拉开相邻三层牌距', () => {
    expect(getFocusedDeckCardPresentation(10, 10, 0)).toEqual({
      angle: 0,
      radius: 476,
      scale: 1.04,
    })
    expect(getFocusedDeckCardPresentation(9, 10, -4)).toEqual({
      angle: -6.2,
      radius: 460,
      scale: 1,
    })
    expect(getFocusedDeckCardPresentation(12, 10, 8)).toEqual({
      angle: 9.2,
      radius: 460,
      scale: 1,
    })
    expect(getFocusedDeckCardPresentation(14, 10, 16)).toEqual({
      angle: 16,
      radius: 460,
      scale: 1,
    })
  })

  it('支持空牌组并拒绝无效牌数', () => {
    expect(getDeckWheelCardLayouts(0)).toEqual([])
    expect(() => getDeckWheelCardLayouts(-1)).toThrow()
  })

  it('计算卡牌从牌堆飞向牌位的视口坐标', () => {
    expect(
      getDrawAnimationGeometry(
        { left: 160, top: 600, width: 56, height: 92 },
        { left: 130, top: 180, width: 100, height: 166 },
        { width: 375, height: 812 },
        12,
      ),
    ).toEqual({
      sourceX: 0.5,
      sourceY: 240,
      sourceScale: 56 / 120,
      sourceRotation: 12,
      targetX: -7.5,
      targetY: -143,
      targetScale: 100 / 120,
    })
  })
})
