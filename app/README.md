# Arcana 正式跨端应用

该目录是与 `prototype/` 分离的正式 Taro 工程，目标平台为 H5 和微信小程序。

## 环境

- Node.js 20 或 22
- pnpm 11

## 开发与验证

```bash
pnpm install
pnpm dev:h5
pnpm build:weapp
pnpm validate
```

微信小程序构建产物输出到 `dist/`，可使用微信开发者工具打开本目录，并在取得正式 AppID 后替换 `project.config.json` 中的游客 AppID。

## 当前边界

- `domain/` 只存放纯 TypeScript 规则，不调用浏览器或微信 API。
- `adapters/` 统一封装存储、触觉、分享等平台能力。
- `data/` 将在下一步从原型中提取为共享、版本化的数据包。
- 页面只消费组合后的展示模型，不写死牌义、图片路径或牌阵位置。
