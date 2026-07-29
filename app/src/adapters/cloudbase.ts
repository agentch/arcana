import Taro from '@tarojs/taro'

export const CLOUDBASE_ENV_ID = 'cloud1-d4gihrh6ob576fe1d'

let initialized = false
const resolvedFileUrls = new Map<string, string>()
const resolvingFileUrls = new Map<string, Promise<string>>()

export function initializeCloudBase(taroEnv = process.env.TARO_ENV): void {
  if (taroEnv !== 'weapp' || initialized) return
  Taro.cloud.init({
    env: CLOUDBASE_ENV_ID,
    traceUser: true,
  })
  initialized = true
}

export async function resolveCloudFileUrl(
  fileId: string,
  taroEnv = process.env.TARO_ENV,
): Promise<string> {
  if (taroEnv !== 'weapp' || !fileId.startsWith('cloud://')) return fileId

  const resolved = resolvedFileUrls.get(fileId)
  if (resolved) return resolved
  const pending = resolvingFileUrls.get(fileId)
  if (pending) return pending

  const task = Taro.cloud
    .getTempFileURL({ fileList: [fileId] })
    .then((result) => {
      const file = result.fileList[0]
      if (!file?.tempFileURL) {
        throw new Error(
          `Unable to resolve CloudBase file ${fileId}: ${file?.errMsg ?? 'unknown error'}`,
        )
      }
      resolvedFileUrls.set(fileId, file.tempFileURL)
      return file.tempFileURL
    })
    .finally(() => {
      resolvingFileUrls.delete(fileId)
    })
  resolvingFileUrls.set(fileId, task)
  return task
}

export async function warmCloudFileUrls(
  fileIds: string[],
  taroEnv = process.env.TARO_ENV,
): Promise<void> {
  if (taroEnv !== 'weapp') return
  const pendingIds = [
    ...new Set(
      fileIds.filter(
        (fileId) =>
          fileId.startsWith('cloud://') &&
          !resolvedFileUrls.has(fileId) &&
          !resolvingFileUrls.has(fileId),
      ),
    ),
  ]
  const chunks = Array.from(
    { length: Math.ceil(pendingIds.length / 50) },
    (_, index) => pendingIds.slice(index * 50, index * 50 + 50),
  )
  await Promise.all(
    chunks.map(async (fileList) => {
      if (fileList.length === 0) return
      try {
        const result = await Taro.cloud.getTempFileURL({ fileList })
        result.fileList.forEach((file, index) => {
          if (file?.tempFileURL) {
            resolvedFileUrls.set(
              file.fileID ?? fileList[index],
              file.tempFileURL,
            )
          }
        })
      } catch {
        // 单张抽取时仍会通过 resolveCloudFileUrl 重试，不阻塞洗牌。
      }
    }),
  )
}
