# RWS Original 素材目录

当前目录包含通过审核的78张 Pam-A 正面牌原图、Web 优化图和完整映射。

`source-audit.json` 固化 Wikimedia Commons TaionWC Pam-A 集合的78个文件版本。项目方于2026-07-20接受 Commons 权利判断和免责声明，全部文件通过哈希、尺寸、格式和视觉总览检查，状态为 `approved`。

- 未修改的扫描原文件放入 `source/`；
- 许可文本、来源页面存档和核验记录放入 `LICENSES/`；
- 运行 `npm run assets:build:web` 生成的文件放入 `web/`；
- `manifest.json` 记录每个文件的路径、格式、尺寸、大小和 SHA-256；
- 牌背只在 `card-backs.json` 中管理。

不要手工替换文件或把来源不明的图片标记为 `approved`。
