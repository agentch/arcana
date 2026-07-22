import { resolve } from 'node:path'

import { defineConfig, type UserConfigExport } from '@tarojs/cli'

import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig<'vite'>(async (merge) => {
  const baseConfig: UserConfigExport<'vite'> = {
    projectName: 'arcana',
    date: '2026-07-22',
    designWidth: 750,
    deviceRatio: {
      375: 2,
      640: 1.17,
      750: 1,
      828: 0.905,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    alias: {
      '@': resolve(__dirname, '..', 'src'),
      '@arcana/tarot-core': resolve(
        __dirname,
        '..',
        '..',
        'packages',
        'tarot-core',
        'src',
      ),
    },
    framework: 'react',
    compiler: 'vite',
    defineConstants: {},
    copy: {
      patterns: [
        {
          from: resolve(
            __dirname,
            '..',
            '..',
            'packages',
            'tarot-core',
            'src',
            'data',
            'decks',
            'rws-original',
            'web',
          ),
          to: 'tarot/rws-original',
        },
        {
          from: resolve(
            __dirname,
            '..',
            '..',
            'packages',
            'tarot-core',
            'src',
            'data',
            'decks',
            'rws-original',
            'web',
            'card-backs',
          ),
          to: 'assets/card-backs',
        },
      ],
      options: {},
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      postcss: {
        autoprefixer: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
    },
  }

  return process.env.NODE_ENV === 'development'
    ? merge({}, baseConfig, devConfig)
    : merge({}, baseConfig, prodConfig)
})
