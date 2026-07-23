import Taro from '@tarojs/taro'

export const CLOUDBASE_ENV_ID = 'arcana-d1gztji7gce0b73d0'

let initialized = false

export function initializeCloudBase(taroEnv = process.env.TARO_ENV): void {
  if (taroEnv !== 'weapp' || initialized) return
  Taro.cloud.init({
    env: CLOUDBASE_ENV_ID,
    traceUser: true,
  })
  initialized = true
}
