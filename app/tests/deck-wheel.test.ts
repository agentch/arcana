import { describe, expect, it } from 'vitest'

import {
  getDeckWheelCardLayout,
  rotationFromDrag,
} from '@/features/draw/deck-wheel'

describe('半圆牌组布局', () => {
  it('将完整牌组均匀铺在300度圆弧上', () => {
    expect(getDeckWheelCardLayout(0, 78, 0).angle).toBe(-150)
    expect(getDeckWheelCardLayout(77, 78, 0).angle).toBe(150)
    expect(getDeckWheelCardLayout(38, 78, 0).angle).toBeCloseTo(-1.948, 2)
    expect(getDeckWheelCardLayout(39, 78, 0).angle).toBeCloseTo(1.948, 2)
  })

  it('叠加拖动旋转并计算正面层级', () => {
    const layout = getDeckWheelCardLayout(0, 3, 30)
    expect(layout.angle).toBe(-120)
    expect(layout.zIndex).toBe(75)
    expect(rotationFromDrag(12, 100, 150)).toBe(31)
  })

  it('拒绝无效牌组位置', () => {
    expect(() => getDeckWheelCardLayout(-1, 78, 0)).toThrow()
    expect(() => getDeckWheelCardLayout(78, 78, 0)).toThrow()
  })
})
