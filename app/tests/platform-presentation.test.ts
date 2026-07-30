import { describe, expect, it } from 'vitest'

import { weappPresentation } from '@/config/presentation/weapp'
import { webPresentation } from '@/config/presentation/web'

describe('平台品牌与展示文案', () => {
  it('微信小程序统一使用星简集和审查友好文案', () => {
    expect(weappPresentation.brand).toBe('星简集')
    expect(weappPresentation.shareDisclaimer).toContain('不代表事实结论')
    expect(JSON.stringify(weappPresentation).includes('阿卡纳星语')).toBe(false)
  })

  it('Web 保持 Arcana 并使用神秘风格文案', () => {
    expect(webPresentation.brand).toBe('Arcana')
    expect(webPresentation.startAction).toContain('占卜')
    expect(webPresentation.shareDefaultTitle).toContain('启示')
  })
})
