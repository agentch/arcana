import type { UserConfigExport } from '@tarojs/cli'

export default {
  mini: {},
  h5: {
    devServer: {
      // 允许 Windows 宿主机访问 WSL2 内的本地评审服务。
      host: '0.0.0.0',
    },
  },
} satisfies UserConfigExport<'vite'>
