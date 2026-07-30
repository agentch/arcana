# Arcana 正式跨端应用

平台展示品牌：

- H5 / Web：`Arcana`，使用神秘占卜风格文案。
- 微信小程序：`星简集`，使用独立的审查友好文案。
- 两端继续共享牌义、牌阵、抽牌、解读和历史数据，仅展示配置分流。

该目录是与 `prototype/` 分离的正式 Taro 工程，目标平台为 H5 和微信小程序。

## 环境

- Node.js 20 或 22
- pnpm 11
- 项目级 npm/pnpm 镜像：`https://registry.npmmirror.com/`
- 项目级 Corepack 镜像：`app/.corepack.env`

## 安装

```bash
corepack prepare pnpm@11.7.0 --activate
pnpm install
```

## 开发与验证

```bash
pnpm dev:h5
pnpm dev:weapp
pnpm validate
```

微信小程序构建产物输出到 `dist/`，微信开发者工具应导入 `app/` 目录，由 `project.config.json` 的 `miniprogramRoot` 指向 `dist/`。

## 微信牌面模式

开发者工具的监听模式默认使用本地素材：

```bash
pnpm dev:weapp
```

对应的显式本地素材命令为：

```bash
pnpm dev:weapp:local
pnpm build:weapp:local
```

本地素材产物约18 MB，只用于微信开发者工具验证，不能作为正式上传包。

真机调试和正式上传必须使用 CloudBase 构建；默认生产构建即为云模式：

```bash
pnpm build:weapp
pnpm dev:weapp:cloud
pnpm build:weapp:cloud
```

当前 CloudBase 环境为 `cloud1-d4gihrh6ob576fe1d`。`pnpm build:weapp` 和 `pnpm build:weapp:cloud` 均生成用于真机的 CloudBase 构建；只有 `pnpm build:weapp:local` 会复制78张本地牌面，仅用于开发者工具模拟器，不能上传或用于真机。云模式在渲染前使用 `getTempFileURL` 将 `cloud://` File ID 转为临时 HTTPS 地址；公开读取权限未开通时会收到 `STORAGE_EXCEED_AUTHORITY`。`pnpm validate` 会先验证云模式，最后重新生成本地素材 `dist`，避免覆盖开发者工具正在使用的版本。

## 当前功能

- 完整78张牌义、RWS牌面与原创牌背。
- 单牌、今日一牌和时间流。
- 问题分类、问题确认、洗牌、横向选牌、翻牌和结构化解读。
- 通用多牌历史记录，支持保存、回放、删除和旧单牌兼容。
- H5、本地素材小程序和CloudBase小程序三条素材路径。

当前横向选牌区展示洗牌后的完整78张牌背，点击位置决定实际抽牌；多牌阵中已选择位置会被锁定，避免重复抽取。今日一牌继续按日期稳定生成，并改为直接翻开当天卡牌。下一步依次完成圣三角、恋爱关系五牌阵、二选一牌阵和分享卡片。

## 当前边界

- `packages/tarot-core/` 是牌义、牌阵、牌组素材和纯领域规则的唯一来源。
- `domain/` 不调用浏览器或微信 API。
- `adapters/` 统一封装存储、触觉和CloudBase能力。
- 当前页面状态使用React本地状态；Taro 4.2.1小程序产物曾将Zustand `create` 错绑到React，因此暂不在该单页使用Zustand。
- 页面只消费组合后的展示模型，不写死牌义或牌阵位置。
