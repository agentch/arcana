const navigationBarTitleText =
  process.env.TARO_ENV === 'weapp' ? '星简集' : 'Arcana'

export default defineAppConfig({
  pages: ['pages/index/index'],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#11142c',
    navigationBarTitleText,
    navigationBarTextStyle: 'white',
  },
})
