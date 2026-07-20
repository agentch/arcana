# Rider–Waite–Smith 原始牌面素材规范

版本：v1.2
制定日期：2026-07-20  
状态：TaionWC Pam-A 来源已接受；78张正面牌已完成接入和验收

## 1. 牌组选择

Arcana 首套正式牌面使用原始 Rider–Waite–Smith（莱德·伟特·史密斯）体系。

执行范围：

- 采用1909/1910年代原始版本的完整78张牌。
- 不使用现代出版社重新上色版本。
- 不使用高清重绘、AI 修复或商业修复版本。
- 不混合不同扫描来源、不同出版批次或不同上色版本。
- 78张正面牌必须来自同一来源、同一批次的完整扫描。
- 牌背作为牌组素材单独管理，不进入基础牌义数据。

## 2. 授权原则

画面创作年代久远不等于互联网上的任意扫描文件都可以商用。

正式纳入项目前必须核验：

1. 原始作品的版权状态。
2. 具体出版版本的版权状态。
3. 扫描文件、数字修复、重新上色或摄影成果是否产生独立权利。
4. 来源页面声明的许可范围是否允许复制、修改、商业使用和再分发。
5. 是否要求署名、保留许可文本或使用相同方式共享。
6. 微信小程序、Web、分享卡片和商业化场景是否均在允许范围内。

任何一项无法确认时，该来源只能用于内部评估，不能进入正式发布包。

## 3. 目录结构

正式数据结构：

```text
data/
├── cards/                         # 唯一的基础牌义
│   ├── major-00.json
│   ├── major-01.json
│   └── ...
├── spreads/                       # 牌阵配置
└── decks/
    └── rws-original/
        ├── deck.json              # 作者、版本、来源与授权
        ├── manifest.json          # cardId → 图片
        ├── source/                # 未改动的原始扫描
        ├── web/                   # Web 优化图片
        └── LICENSES/              # 授权文本和来源证据
```

当前工程实现位于 `prototype/app/data/decks/rws-original/`。在正式 Taro 工程初始化后按相同相对结构迁移，不改变 `cardId` 或 Manifest 语义。

牌义与图片严格分离：

- `data/cards/major-00.json` 保存愚人的名称、关键词、正逆位牌义和建议。
- `data/decks/rws-original/manifest.json` 只保存愚人的 RWS 图片映射。
- 未来的东方版、赛博版只提供各自的 `deck.json` 和 `manifest.json`，不得复制基础牌义。

## 4. 牌组元数据

`deck.json` 至少包含：

```json
{
  "id": "rws-original",
  "name": "Rider–Waite–Smith Original",
  "authors": [
    "Arthur Edward Waite",
    "Pamela Colman Smith"
  ],
  "edition": "待核验",
  "publicationPeriod": "1909/1910",
  "source": {
    "title": "待核验",
    "url": "待核验",
    "publisher": "待核验",
    "retrievedAt": "待核验"
  },
  "license": {
    "status": "pending-review",
    "name": "待核验",
    "url": "待核验",
    "commercialUse": "unknown",
    "attributionRequired": "unknown",
    "notes": "具体扫描文件尚未完成授权核验"
  },
  "sourceBatchId": "待核验",
  "version": "1.0.0"
}
```

禁止使用模糊字段，例如只写“Public Domain”但没有依据、来源链接和核验日期。

## 5. 素材清单

`manifest.json` 的每个条目至少包含：

```json
{
  "deckId": "rws-original",
  "cardId": "major-00",
  "source": {
    "file": "source/major-00.png",
    "mediaType": "image/png",
    "width": 0,
    "height": 0,
    "bytes": 0,
    "sha256": "待生成"
  },
  "web": {
    "file": "web/major-00.webp",
    "mediaType": "image/webp",
    "width": 0,
    "height": 0,
    "bytes": 0,
    "sha256": "待生成"
  }
}
```

清单要求：

- 78张正面牌全部有唯一且稳定的 `cardId`。
- 每张牌同时记录原始文件和 Web 文件。
- 原始文件与 Web 文件分别记录 SHA-256。
- 记录像素尺寸、文件大小和媒体类型。
- 路径相对于当前牌组目录，不写入业务逻辑。
- 牌面与牌义通过 `cardId` 关联。

## 6. 牌背管理

牌背不属于任何一张牌的牌义。

建议在 `deck.json` 中单独配置：

```json
{
  "backs": [
    {
      "id": "default",
      "source": "source/back.png",
      "web": "web/back.webp",
      "sha256": {
        "source": "待生成",
        "web": "待生成"
      }
    }
  ],
  "defaultBackId": "default"
}
```

若选定扫描批次没有可确认授权的原始牌背，应使用 Arcana 自有牌背，不得从其他商业牌组拼接。

## 7. 原始文件规则

- 下载后保留原始文件的完整字节，不覆盖、不重新保存。
- 原始文件名可在入库时规范化，但必须记录来源文件名。
- 不对 `source/` 中的文件裁剪、去噪、锐化、调色或重新编码。
- 原始文件的 SHA-256 在下载后立即生成。
- 任何重复下载必须通过校验值确认是否为同一文件。
- `source/` 是可追溯档案，不直接用于线上页面。

## 8. Web 优化规则

Web 文件从 `source/` 通过可重复执行的脚本生成。

处理要求：

- 统一方向、画布比例和尺寸。
- 保留完整牌面，不裁掉编号、标题、边框或画面内容。
- 不进行重新上色、内容修补或生成式扩图。
- 输出 WebP，并根据浏览器兼容需求决定是否补充 AVIF。
- 记录转换工具、版本、参数和生成时间。
- 转换脚本不得修改原始文件。
- 每次生成后重新计算文件尺寸、大小和 SHA-256。

具体像素尺寸、质量参数和响应式图片策略在取得真实扫描后通过视觉与性能测试确定。

## 9. 同批次一致性检查

正式接受一个来源前，至少检查：

- 78张牌是否完整。
- 编号、牌名和花色是否一致。
- 扫描尺寸与画布比例是否一致。
- 边框、纸张底色和颜色分布是否存在明显批次差异。
- 是否存在少数牌被现代修复版替换。
- 是否包含水印、裁切、污损或压缩伪影。
- 来源是否提供整套文件的统一授权说明。

发现混用迹象时停止入库，不通过人工调色把不同来源伪装成同一批次。

## 10. 入库验收清单

- [x] 78张牌完整且来自同一来源、同一批次
- [ ] 牌背来源已确认或使用 Arcana 自有牌背
- [x] 来源页面和许可记录已归档
- [x] 商业使用、修改与再分发权限已核验并由项目方接受
- [x] 原始文件已保存且 SHA-256 已生成
- [x] Web 文件通过固定脚本生成
- [x] 原始文件与 Web 文件尺寸、大小、格式已记录
- [x] `deck.json` 与 `manifest.json` 通过 JSON Schema
- [x] manifest 中所有 `cardId` 与标准卡牌索引一一对应
- [x] 页面不直接引用 `source/`
- [x] 项目负责人完成正面牌授权与视觉验收

只有全部完成后，`rws-original` 才能从 `pending-review` 改为 `approved`。

## 11. 已实现命令

```bash
npm run data:scaffold:rws
npm run assets:download:commons
npm run assets:verify
npm run assets:build:web
npm run assets:rebuild:web
npm run assets:review:sheet
npm run assets:approve
npm run assets:sync:public
```

- `data:scaffold:rws` 只用于首次生成78张索引和空 Manifest；已有数据时默认拒绝覆盖，防止清除来源或授权审核记录。
- `assets:download:commons` 只下载审计清单锁定的文件，并核对 Commons SHA-1、字节数、尺寸和格式。
- `assets:verify` 按素材状态检查路径边界、文件存在性、格式、尺寸、大小、SHA-256 和授权门槛。
- `assets:build:web` 只处理 `source-ready` 条目，按照 `deck.json` 固定参数生成 WebP，写回元数据后再次执行完整校验。
- `assets:rebuild:web` 在转换参数调整后重建已有 WebP，并将素材退回 `web-ready` 等待重新验收。
- `assets:review:sheet` 生成78张总览，供人工检查混版、缺牌、重复和异常裁切。
- `assets:approve` 只允许来源和许可已批准、Web 文件完整的素材进入 `approved`。
- `assets:sync:public` 根据牌组映射生成站点静态副本，不让业务逻辑引用归档原图。

截至2026-07-20，78张正面牌均为 `approved`；牌背仍保持独立待定。

候选来源的详细核验记录见 [`rws-source-audit.md`](rws-source-audit.md)。
