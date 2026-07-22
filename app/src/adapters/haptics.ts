import Taro from '@tarojs/taro'

export type HapticIntensity = 'light' | 'medium' | 'heavy'

export async function triggerHaptic(
  intensity: HapticIntensity = 'light',
): Promise<boolean> {
  try {
    await Taro.vibrateShort({ type: intensity })
    return true
  } catch {
    return false
  }
}
