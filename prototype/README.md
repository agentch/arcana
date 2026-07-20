# Arcana 可点击原型

Arcana 移动端 Web 原型，用于验证单牌占卜的页面结构、交互节奏和视觉方向。

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
- 随机抽取一张样例牌
- 正位 / 逆位
- 翻牌与固定解读
- 本地保存和最近记录
- 移动端、键盘操作和减少动态效果

当前已包含完整22张大阿卡纳结构化牌义与抽象占位牌面，不包含正式塔罗图片素材。

## 数据边界

- `app/data/card-meanings.json`：稳定的牌 ID、名称、关键词、正逆位牌义和建议
- `app/data/deck-manifests/`：牌组元数据与 `cardId → image` 素材映射
- `app/data/spreads.json`：牌阵、牌位、顺序和解读提示
- `app/domain/catalog.ts`：组合牌义与当前牌组资源，页面不直接读取图片路径

切换牌组时只替换牌组清单，不复制牌义。增加牌阵时只增加配置，不在页面中写死牌位。

## 验证

```bash
npm run data:validate
npm test
```

`data:validate` 会执行 JSON Schema 校验，并检查 card ID 唯一性、牌组素材映射完整性、牌阵位置顺序和版本化边界。

原型通过评审后，正式产品将在 Taro + React 工程中实现。
