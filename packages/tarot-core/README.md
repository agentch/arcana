# @arcana/tarot-core

Arcana 原型与正式 Taro 应用共用的塔罗数据和纯 TypeScript 领域规则。

## 边界

- `src/data/`：牌义、牌阵、问题引导、牌组 Manifest、Schema 与已审核素材。
- `src/domain/`：抽牌、牌库读取、解读组合、今日一牌与分享内容组合。
- 浏览器、微信小程序、存储、触觉和系统分享 API 不得进入本包。

`prototype/` 保留原有领域导入路径作为兼容层；`app/` 通过
`@arcana/tarot-core/*` 别名直接引用共享实现。

## 验证

- 在 `prototype/` 执行 `npm test`，校验完整数据、素材与原型兼容性。
- 在 `app/` 执行 `pnpm validate`，校验 H5 和微信小程序构建。
