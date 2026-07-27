import { getActiveCardBack } from '@arcana/tarot-core/domain/catalog'
import { describe, expect, it } from 'vitest'

import projectConfig from '../project.config.json'

describe('微信项目静态牌背配置', () => {
  it('保留由运行时配置引用的牌背文件', () => {
    expect(projectConfig.setting.ignoreDevUnusedFiles).toBe(false)
    expect(getActiveCardBack()?.image).toBe(
      '/assets/card-backs/arcana-starpath-mirror-card-back.webp',
    )
  })
})
