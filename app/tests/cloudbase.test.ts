import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveCloudFileUrl, warmCloudFileUrls } from '@/adapters/cloudbase'

const cloudMocks = vi.hoisted(() => ({
  getTempFileURL: vi.fn(async ({ fileList }: { fileList: string[] }) => ({
    fileList: fileList.map((fileID) => ({
      fileID,
      tempFileURL: `https://cloud.example/${encodeURIComponent(fileID)}`,
    })),
  })),
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    cloud: {
      getTempFileURL: cloudMocks.getTempFileURL,
    },
  },
}))

describe('CloudBase 牌面地址预热', () => {
  beforeEach(() => {
    cloudMocks.getTempFileURL.mockClear()
  })

  it('洗牌时按50张分批预热并复用缓存', async () => {
    const fileIds = Array.from(
      { length: 51 },
      (_, index) => `cloud://warm-${index}.webp`,
    )
    await warmCloudFileUrls(fileIds, 'weapp')
    expect(cloudMocks.getTempFileURL).toHaveBeenCalledTimes(2)

    await expect(resolveCloudFileUrl(fileIds[0], 'weapp')).resolves.toContain(
      'warm-0.webp',
    )
    expect(cloudMocks.getTempFileURL).toHaveBeenCalledTimes(2)
  })

  it('合并同一牌面的并发地址解析', async () => {
    const fileId = 'cloud://concurrent-card.webp'
    const [first, second] = await Promise.all([
      resolveCloudFileUrl(fileId, 'weapp'),
      resolveCloudFileUrl(fileId, 'weapp'),
    ])
    expect(first).toBe(second)
    expect(cloudMocks.getTempFileURL).toHaveBeenCalledTimes(1)
  })
})
