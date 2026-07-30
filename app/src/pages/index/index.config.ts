const navigationBarTitleText =
  process.env.TARO_ENV === 'weapp' ? '星简集' : 'Arcana'

export default definePageConfig({
  navigationBarTitleText,
  enableShareAppMessage: true,
  enableShareTimeline: true,
})
