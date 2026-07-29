import { describe, expect, it } from 'vitest'

import {
  DECK_CARD_ANGLE_STEP,
  getDrawAnimationGeometry,
  getVisibleDeckCardLayouts,
  rotationFromDrag,
  VISIBLE_DECK_CARD_COUNT,
} from '@/features/draw/deck-wheel'

describe('半圆牌组布局', () => {
  it('只渲染当前附近13张牌并拉开角度', () => {
    const layouts = getVisibleDeckCardLayouts(78, 0)
    expect(layouts).toHaveLength(VISIBLE_DECK_CARD_COUNT)
    expect(layouts[0]).toMatchObject({ itemIndex: 72, angle: -66 })
    expect(layouts[6]).toMatchObject({ itemIndex: 0, angle: 0 })
    expect(layouts[12]).toMatchObject({ itemIndex: 6, angle: 66 })
  })

  it('拖动一个牌距后将相邻牌移动到中心', () => {
    const layouts = getVisibleDeckCardLayouts(78, DECK_CARD_ANGLE_STEP)
    expect(layouts[6]).toMatchObject({ itemIndex: 77, angle: 0 })
    expect(rotationFromDrag(12, 100, 150)).toBe(28)
  })

  it('牌数不足时不重复渲染并拒绝无效参数', () => {
    expect(
      getVisibleDeckCardLayouts(3, 0).map((item) => item.itemIndex),
    ).toEqual([2, 0, 1])
    expect(getVisibleDeckCardLayouts(0, 0)).toEqual([])
    expect(() => getVisibleDeckCardLayouts(-1, 0)).toThrow()
    expect(() => getVisibleDeckCardLayouts(78, 0, 0)).toThrow()
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
