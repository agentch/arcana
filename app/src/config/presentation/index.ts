import { weappPresentation } from './weapp'
import { webPresentation } from './web'

export const platformPresentation =
  process.env.TARO_ENV === 'weapp' ? weappPresentation : webPresentation
