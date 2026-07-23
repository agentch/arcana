/// <reference types="@tarojs/taro" />

declare module '*.png'
declare module '*.gif'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.webp'
declare module '*.scss'

declare const __TARO_LOCAL_CARD_ASSETS__: boolean

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production'
    TARO_ENV: 'h5' | 'weapp'
    TARO_APP_ID?: string
  }
}
