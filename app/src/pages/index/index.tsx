import { Button, Text, View } from '@tarojs/components'

import { triggerHaptic } from '@/adapters/haptics'
import { useReadingStore } from '@/stores/reading'

import './index.scss'

const foundations = [
  'H5 与微信小程序双构建目标',
  '纯 TypeScript 抽牌领域层',
  '存储与触觉平台适配层',
  'Zustand 会话状态骨架',
]

export default function Index() {
  const spreadId = useReadingStore((state) => state.spreadId)
  const updateDraft = useReadingStore((state) => state.updateDraft)

  const cycleSpread = async () => {
    await triggerHaptic()
    updateDraft({ spreadId: spreadId === 'single' ? 'timeline' : 'single' })
  }

  return (
    <View className='foundation-page'>
      <View className='foundation-page__orb' />
      <Text className='foundation-page__eyebrow'>ARCANA · P2</Text>
      <Text className='foundation-page__title'>跨端工程基础已建立</Text>
      <Text className='foundation-page__summary'>
        正式应用从这里开始迁移。领域规则与平台能力已经分层，后续接入牌义、牌组和牌阵配置时无需把图片或牌位写死在页面中。
      </Text>

      <View className='foundation-card'>
        {foundations.map((item) => (
          <View className='foundation-card__item' key={item}>
            <Text className='foundation-card__marker'>✦</Text>
            <Text>{item}</Text>
          </View>
        ))}
      </View>

      <Button className='foundation-page__button' onClick={cycleSpread}>
        测试状态：{spreadId === 'single' ? '单牌' : '时间流'}
      </Button>
      <Text className='foundation-page__note'>
        下一阶段：迁移共享数据包并接入单牌主流程
      </Text>
    </View>
  )
}
