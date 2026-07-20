# RWS 原始扫描来源审计

审计日期：2026-07-20  
结论：TaionWC Pam-A 扫描集通过技术审计并获项目方接受，78张正面牌已完成接入

## 1. 候选来源

- 来源：Wikimedia Commons
- 分类：`Rider-Waite-Smith tarot deck (TaionWC)`
- 分类页面：<https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck_(TaionWC)>
- 版本：Pam-A
- 原作日期：1910
- 原作者：Pamela Colman Smith
- 审计批次：`commons-taionwc-185b38b7d45d4865ac4fd5f0d3420fa8dfbfa93556633841d11681694cc6acdc`

Commons 将该分类定义为同一风格的 image set，并说明其内容是 TaionWC 作为一套上传的 Pam-A 扫描。分类恰好包含78个文件。

## 2. API 审计结果

通过 Commons API 一次性读取分类内全部文件的当前版本和扩展元数据，结果如下：

| 检查项 | 结果 |
| --- | --- |
| 文件数 | 78 |
| 格式 | 78个 `image/jpeg` |
| 尺寸范围 | 宽1090–1144，高1919–1920 |
| 作者字段 | 78个均为 Pamela Colman Smith |
| 原作日期 | 78个均为1910 |
| 使用条款 | 78个均为 Public domain |
| Public Domain Mark | 78个均包含 |
| `PD-old-80-expired` | 78个均包含 |
| 文件 SHA-1 | 78个均存在且互不重复 |

22张大阿卡纳的当前版本由 Commons 管理员在2026-04-18恢复到2024年 TaionWC 高质量扫描版本；56张小阿卡纳当前版本由 TaionWC 在2024-04上传。分类说明和文件历史共同表明它们属于同一 Pam-A 扫描集，而不是现代重新上色版本。

逐文件页面、原图下载地址、当前版本用户与时间、SHA-1、宽高、文件大小和许可字段保存在：

```text
prototype/app/data/decks/rws-original/source-audit.json
```

## 3. 许可证据

抽样文件页：

- 愚人：<https://commons.wikimedia.org/wiki/File:RWS_Tarot_00_Fool.jpg>
- 圣杯王牌：<https://commons.wikimedia.org/wiki/File:Cups01.jpg>

文件页将原作标记为公有领域，并给出：

- 权利人 Arthur Edward Waite 于1942年去世；
- 作品在美国因1931年以前出版而属于公有领域；
- Creative Commons Public Domain Mark 1.0；
- 文件被识别为不受已知版权及相关权利限制。

Commons 分类页同时提醒：原始 RWS 已进入公有领域，但现代重新上色版本可能仍受版权保护。本项目选择的是明确标注 Pam-A、1910 的 TaionWC 扫描集。

Commons 复用说明：

<https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia>

该说明指出公有领域内容通常可以复用，署名可能不是严格法律要求但建议保留来源；同时明确提醒 Wikimedia 不保证每项权利信息准确，复用者仍应自行核验。

## 4. 最终决定

- 来源集合的完整性、一致性和逐文件许可元数据已经通过技术审计。
- `deck.source.status` 更新为 `verified`。
- 项目方于2026-07-20明确接受 Commons 权利判断及 Wikimedia 免责声明。
- `deck.license.status` 更新为 `approved`。
- 商业使用、修改和再分发在 Commons 公有领域标记下记录为允许。
- 78张原图和 WebP 均通过自动校验与人工总览检查，素材状态更新为 `approved`。
- 即使不强制署名，产品仍建议展示 Pamela Colman Smith、Pam-A、Wikimedia Commons 和具体文件页来源。

## 5. 入库复核

- [x] 分类包含完整78张
- [x] 78张属于同一 Pam-A image set
- [x] 文件格式和尺寸高度一致
- [x] 78张逐文件许可元数据一致
- [x] 固化每个当前文件版本和 SHA-1
- [x] 项目方接受 Commons 权利判断及其免责声明
- [x] 下载后计算本项目 SHA-256，并与审计的 Commons SHA-1交叉核对
- [x] 人工拼图检查混版、裁切、色差、水印和现代修复
- [ ] 牌背来源另行确认
