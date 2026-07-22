# Arcana 可点击原型

Arcana 移动端 Web 原型，用于验证完整78张牌、五种牌阵、对话式引导、仪式化抽牌和结构化解读。

## Prerequisites

- Node.js `>=22.13.0`

## 本地运行

```bash
npm ci
npm run dev
npm run build
```

## 当前覆盖

- 首页
- 问题输入与示例问题
- 洗牌和跳过动效
- 单牌、时间流、圣三角、恋爱关系五牌阵和二选一牌阵
- 完整78张牌无重复抽取、逐张翻牌与牌阵组合解读
- 正位 / 逆位
- 翻牌与固定解读
- 今日一牌、本地保存、最近记录和分享卡片
- 移动端、键盘操作和减少动态效果

当前已包含通过结构与内容质量门槛的78张分层 v2 牌义、完整 RWS Pam-A 正面牌和独立审核的 Arcana 原创牌背。

## 数据边界

- `app/data/card-meanings.json`：稳定的牌 ID、名称、关键词、正逆位牌义和建议
- `app/data/cards/`：正式分层牌义，每张牌一份 v2 JSON
- `app/data/card-index.json`：标准78张牌的稳定 ID、顺序与名称
- `app/data/meaning-topic-map.json`：问题分类到牌义主题的显式映射
- `app/data/deck-manifests/`：牌组元数据与 `cardId → image` 素材映射
- `app/data/decks/rws-original/`：正式 RWS 元数据、78张原图与 Web 图、完整 Manifest 和独立牌背配置
- `app/data/spreads.json`：牌阵、牌位、顺序和解读提示
- `app/data/question-prompts.json`：感情、职场、家庭、心情四类问题，每类包含4个可选主题
- `app/domain/catalog.ts`：组合牌义与当前牌组资源，页面不直接读取图片路径
- `app/domain/interpretation.ts`：把牌义、方向、问题主题和牌阵位置组合为统一展示模型

切换牌组时只替换牌组清单，不复制牌义。增加牌阵时只增加配置，不在页面中写死牌位。

结果页优先使用完整 v2 牌义；尚未完成编辑的牌通过 v1 兼容层生成相同展示模型。单牌展示完整分层内容，多牌阵默认只展示摘要和建议。

## 验证

```bash
npm run data:validate
npm run typecheck
npm run data:migrate:v2
npm run assets:audit:commons -- --input <Commons API JSON>
npm run assets:verify
npm run assets:build:web
npm test
```

`typecheck` 执行应用与 Cloudflare Worker 全量 TypeScript 检查。`data:validate` 会执行 v1/v2 JSON Schema 校验，并检查 card ID 唯一性、牌组素材映射完整性、牌阵位置顺序、主题映射、问题推荐牌阵和版本化边界。

`data:migrate:v2` 默认将22张 v1 内容生成到标准输出；使用 `-- --output <目录>` 可以生成逐卡编辑草稿。自动迁移结果包含明确的待编辑内容，只能作为内容团队的脚手架，不能直接标记为正式牌义。

`assets:download:commons` 下载审计清单锁定的 Commons 文件并复核 SHA-1、尺寸和格式。`assets:verify` 校验正式牌组的文件路径、状态、图片元数据、SHA-256 和授权门槛。`assets:build:web` 只为 `source-ready` 原图生成 WebP，不修改原始扫描文件。当前78张 RWS 正面牌均已审核通过，Web 原型通过独立牌组映射读取这些图片。

原型通过评审后，正式产品将在 Taro + React 工程中实现。
