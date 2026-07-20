# 技术架构

## 1. 架构目标

先高效交付 Web，同时控制迁移微信小程序时的重写范围。目标是复用牌库、占卜规则、状态管理、内容模型和大部分页面组件；平台差异集中到明确的适配层。

## 2. 技术基线

| 层级 | 方案 | 说明 |
| --- | --- | --- |
| 跨端 | Taro | React 技术栈构建 H5 与微信小程序 |
| UI | React + TypeScript | 函数组件与 Hooks，保持模块边界清晰 |
| 构建 | Vite | Web 开发与构建 |
| 状态 | Zustand | 会话状态、偏好和历史记录 |
| 样式 | CSS 变量 + SCSS | 主题令牌统一管理 |
| 测试 | Vitest | 牌阵、随机、数据转换优先做单测 |
| 质量 | ESLint + Prettier | 统一代码规范 |

## 3. 建议目录

```text
src/
  pages/              # 跨端页面
  components/         # 通用组件
  features/           # 按业务能力拆分
    reading/
    spreads/
    history/
    sharing/
  domain/             # 纯 TypeScript 业务规则
  data/               # 版本化牌库与牌义
  stores/             # Zustand 状态
  adapters/           # 存储、分享、埋点等平台适配
  styles/             # 设计令牌与全局样式
  types/
```

## 4. 核心领域模型

```ts
type Orientation = 'upright' | 'reversed'
type TopicId = 'love' | 'career' | 'finance' | 'growth'

interface CardMeaning {
  id: string
  number: number
  arcana: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
  name: {
    zh: string
    en: string
  }
  core: {
    summary: string
    symbols: string[]
    element?: string
  }
  upright: OrientationMeaning
  reversed: OrientationMeaning
  topics: Record<TopicId, Record<Orientation, string>>
}

interface OrientationMeaning {
  keywords: string[]
  overview: string
  light: string
  shadow: string
  advice: string[]
  reflection: string
}

interface DeckCardAsset {
  image: string | null
  fallbackSymbol?: string
  alt: string
}

interface DeckManifest {
  id: string
  name: string
  author: string
  edition: string
  license: string
  version: string
  assets: Record<string, DeckCardAsset>
}

interface DrawnCard {
  cardId: string
  orientation: Orientation
  positionId: string
}

interface SpreadPosition {
  id: string
  name: string
  prompt: string
  order: number
}

interface SpreadDefinition {
  id: string
  name: string
  description: string
  supportedTopics: string[]
  positions: SpreadPosition[]
  version: string
}

interface Reading {
  id: string
  spreadId: string
  question?: string
  cards: DrawnCard[]
  createdAt: string
  contentVersion: string
  deckId: string
  deckVersion: string
  spreadVersion: string
}
```

牌义、牌组和牌阵分别带版本号，历史记录同时保存三个版本，避免内容更新后无法还原。`CardMeaning` 不允许出现 `image` 或 `deckId`；`DeckManifest.assets` 通过稳定的 `cardId` 映射素材。同一份“愚人”牌义可以组合经典版、东方版、赛博版等不同视觉牌组。

正式牌义采用分层内容模型，不使用单个超长 `meaning` 字段。运行时通过“基础牌义 + 正逆位 + 问题主题 + 牌阵位置”生成单牌解读，再由各牌摘要和牌位关系形成多牌组合解读。详细字段、展示字数和迁移策略见 [`card-content-model.md`](card-content-model.md)。

`TopicId` 当前记录的是正式内容候选枚举。Schema v2 实施前需要与问题引导中的感情、职场、家庭、心情分类完成显式映射或统一，页面不得自行推断。

牌阵同样使用版本化配置。页面不能通过 `if (spread === ...)` 写死牌位含义；抽牌数量、位置名称、排列顺序和解读提示均从 `SpreadDefinition` 读取。

### 数据文件边界

```text
data/
  cards/                   # 78 张牌的稳定分层语义，每张一份 JSON
    major-00.json
  spreads.json             # 牌阵与牌位配置
  question-prompts.json    # 问题分类、选项与开放式问题提示
  deck-manifests/
    rider-waite.json       # 只存经典版素材映射
    eastern.json           # 只存东方版素材映射
    cyber.json             # 只存赛博版素材映射
```

运行时由领域目录将 `CardMeaning + DeckCardAsset` 组合成可展示对象。页面只接收组合结果，不读取素材路径，也不负责解释牌阵配置。

问题引导同样配置化。页面只保存 `questionCategoryId`、`questionOptionId` 和用户最终编辑后的问题文本，便于后续分析不同主题的使用情况，同时不限制用户自由输入。

## 5. 跨端边界

以下能力只能通过 `adapters/` 调用：

- 本地持久化
- 分享与剪贴板
- 文件和图片导出
- 登录与用户授权
- 埋点与错误上报
- 安全区域、导航栏、系统主题

领域层不得使用 `window`、`document` 或微信全局 API。动效优先使用跨端 CSS 能力；复杂 Canvas 效果作为渐进增强，不作为完成占卜的前置条件。

## 6. 数据策略

MVP 将牌库作为只读 JSON 随应用发布，记录默认保存在设备本地。若后续增加账号、云同步、AI 解读或运营配置，再引入 API。

建议接口边界提前定义，但不提前建设服务：

```ts
interface ReadingRepository {
  list(): Promise<Reading[]>
  save(reading: Reading): Promise<void>
  remove(id: string): Promise<void>
}
```

## 7. 随机与可测试性

- 洗牌使用 Fisher–Yates。
- 随机数生成器以依赖注入方式提供，测试环境可固定种子。
- 正逆位概率作为配置，不散落在 UI 中。
- 单次占卜内不得重复抽到同一张牌。
- 所有牌阵复用同一套抽牌逻辑，只由牌位配置决定抽取数量。
- 二选一牌阵的 A、B 顺序必须在抽牌前固定，不能根据结果交换。

## 8. 发布策略

1. H5 预览环境：每次合并自动构建。
2. Web 正式环境：静态资源 CDN + HTTPS。
3. 微信小程序：同一仓库增加平台配置，完成授权、分享和隐私能力适配。
4. Web 与小程序共享内容版本，发布时分别做回归验收。

## 9. 架构决策记录

### ADR-001：选择 Taro

状态：采用。

原因：项目已明确 Web 首发和微信小程序迁移，并已有 React 技术背景；Taro 能在 React 技术栈下覆盖 H5 与微信小程序。

代价：需要遵守跨端组件和样式约束；依赖 DOM 或复杂 Canvas 的 Web 动效可能需要平台分支。

### ADR-002：MVP 不设置后端

状态：拟采用。

原因：核心假设是抽牌与解读体验，本地牌库和本地记录足以验证。后端会在账号、云同步、AI 或运营配置成为明确需求时引入。

### ADR-003：牌组与牌义分层

状态：采用。

原因：MVP 可使用经过授权核验的经典 Rider–Waite–Smith 素材，但后续可能推出原创东方牌组。领域层用稳定的牌 ID 表达语义，牌面、作者、版本和授权信息归属具体牌组。

### ADR-004：AI 解读通过服务接口接入

状态：采用。

原因：AI 是差异化方向，但不能让密钥、模型厂商或不可控生成过程进入客户端核心逻辑。前端只依赖 `InterpretationService` 接口；未启用服务时使用审核过的固定牌义和组合模板。

### ADR-005：牌义、牌组素材、牌阵配置三层分离

状态：采用。

原因：牌义是跨牌组的稳定领域知识，图片属于具体牌组，牌阵是独立的解读结构。三者分别版本化并通过稳定 ID 关联，换牌组不复制牌义，增加牌阵不修改页面业务逻辑。
