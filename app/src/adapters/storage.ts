import Taro from '@tarojs/taro'

export interface StorageAdapter {
  read<T>(key: string): T | null
  write<T>(key: string, value: T): boolean
  remove(key: string): boolean
}

export const storageAdapter: StorageAdapter = {
  read<T>(key: string): T | null {
    try {
      const value = Taro.getStorageSync<T>(key)
      return value ?? null
    } catch {
      return null
    }
  },
  write<T>(key: string, value: T): boolean {
    try {
      Taro.setStorageSync(key, value)
      return true
    } catch {
      return false
    }
  },
  remove(key: string): boolean {
    try {
      Taro.removeStorageSync(key)
      return true
    } catch {
      return false
    }
  },
}
