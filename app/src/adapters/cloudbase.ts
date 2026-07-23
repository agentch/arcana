import Taro from '@tarojs/taro'

export const CLOUDBASE_ENV_ID = 'cloud1-d4gihrh6ob576fe1d'

let initialized = false

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

  const result = await Taro.cloud.getTempFileURL({ fileList: [fileId] })
  const file = result.fileList[0]
  if (!file?.tempFileURL) {
    throw new Error(
      `Unable to resolve CloudBase file ${fileId}: ${file?.errMsg ?? 'unknown error'}`,
    )
  }
  return file.tempFileURL
}
