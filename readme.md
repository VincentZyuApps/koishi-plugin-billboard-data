# koishi-plugin-billboard-data

[![npm](https://img.shields.io/npm/v/koishi-plugin-billboard-data?style=flat-square&logo=npm)](https://www.npmjs.com/package/koishi-plugin-billboard-data)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-billboard-data?style=flat-square&logo=npm)](https://npm-stat.com/charts.html?package=koishi-plugin-billboard-data)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-billboard-data)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/koishi-plugin-billboard-data)

<!-- [![Koishi Forum](https://img.shields.io/badge/Koishi%20Forum-xxxxx-5546A3?style=for-the-badge&logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC&logoColor=white)](https://forum.koishi.xyz/t/topic/xxxxx) -->

[![QQ群](https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white)](https://qm.qq.com/q/ZHj33L5cuC)

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p> 
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

用于查询 VOCALOID / 虚拟歌手周榜（术力口周榜）的 Koishi 插件。

> ### 💡 双源数据体系与致谢
> - **Bilibili 本土周榜**：来源于 B 站 [@Bili-Board_Atel（点击直达B站专栏）](https://space.bilibili.com/3493269493907727/article)（Bilibili Vocaloid Songs 周榜 TOP20 专栏，示例：`Bili_Board术力口周榜第122期2026年10月7日第40周`）。
> - **Niconico 日本周榜**：来源于 B 站 [@Elvansphere（点击直达B站专栏）](https://space.bilibili.com/5937105/article)（Niconico Vocaloid Songs 周榜 TOP20 专栏，示例：`【2026/10/07】ニコニコ VOCALOID SONGS TOP20`，由 Billboard JAPAN 与 ニコニコ 官方合作出品）。
> - 支持 [插件本地原生爬取](src/crawler) 或 [GitHub 官方归档仓库](https://github.com/VincentZyuApps/billboard-data) / [jsDelivr CDN](https://cdn.jsdelivr.net/gh/VincentZyuApps/billboard-data@main/data/niconico/index.json) 静态数据源，每周定时归档同步。

支持 **本地爬取 B 站专栏** + **GitHub/jsDelivr CDN 静态源** 双模混合容灾矩阵，具备智能缓存、出榜时刻智能失效及全量历史回溯能力！

---

## 🌟 功能特性

- **双源合一**：B站本土周榜与日本N站Billboard TOP20官方周榜无缝聚合。
- **本地专栏爬虫**：纯 TS + `ctx.http` 本地直连/代理爬取 B 站专栏动态，配合智能跨页算法，免除对第三方仓库更新的强依赖。
- **7 层容灾矩阵**：默认预设 `本地爬虫(代理) ➔ 本地爬虫(直连) ➔ jsDelivr(代理) ➔ jsDelivr(直连) ➔ GitHub(反代) ➔ GitHub(代理) ➔ GitHub(直连)` 自由拖拽排序。
- **智能两级缓存**：
  - 支持 **Koishi Database**（持久化）与 **纯内存 Map**（轻量级）后端一键切换。
  - 自定义缓存过期时间（默认 600 分钟 / 10 小时；`<=0` 穿透禁用）。
  - **周三 19:00 智能出榜失效**：识别最新一期，在每周三 19:00 术力口官方出榜时刻自动标记过期，兼顾性能与时效。
- **冷启动历史回溯 (Backfill)**：初次使用或空数据时，后台自动从静态归档拉取历史全量周榜（>120 期）数据。
- **本地 JSON 镜像备份**：查询成功后自动镜像写入 `data/billboard-data/`，便于离线分析与二次开发。
- **曲目反向检索**：支持搜索任意歌曲在近期周榜中的上榜记录与最高名次（支持 `-s` 切换源）。
- **多种渲染管线**：纯文本、Takumi WASM 高清出图、Puppeteer 网页海报、QQ 原生 Markdown 卡片/表格。
- **新榜自动广播**：支持多目标独立订阅 B站周榜 / N站周榜发布提醒，支持单目标专属 Cron 定时表达式。

---

## 📖 指令列表

| 指令 | 别名 | 描述 | 示例 |
| :--- | :--- | :--- | :--- |
| `周榜 [期数]` | `术力口周榜`, `bb` | 查看最新或指定期数周榜（默认使用 WebUI 配置的数据源） | `bb` / `bb 120` / `bb -n 20` |
| `周榜 -s <源> [期数]` | `bb -s <源>` | 显式指定数据源查看周榜（`bilibili`/`bili` 或 `niconico`/`nico`） | `bb -s nico` / `bb -s bili 120` |
| `周榜b [期数]` | `bbb` | 快捷直达 B站本土周榜 | `周榜b` / `bbb` / `bbb 120` |
| `周榜n [期数]` | `nbb` | 快捷直达 日本 N站 Billboard TOP20 周榜 | `周榜n` / `nbb` / `nbb 188` |
| `周榜.text [期数]` | `bb.text`, `周榜文本` | 仅以纯文本格式输出周榜 | `bb.text` |
| `周榜.takumi [期数]` | `bb.takumi`, `周榜takumi` | 仅以 Takumi WASM 看板渲染出图输出周榜 | `bb.takumi` |
| `周榜.pptr [期数]` | `bb.pptr`, `bb.puppeteer`, `周榜海报` | 仅以 Puppeteer 网页精美海报出图输出周榜 | `bb.pptr` |
| `周榜.md-style [期数]` | `bb.md-style`, `周榜卡片` | 仅以 QQ 原生 Markdown 流式卡片输出周榜 (仅限 QQ 官bot 平台) | `bb.md-style` |
| `周榜.md-table [期数]` | `bb.md-table`, `周榜表格` | 仅以 QQ 原生 Markdown 紧凑表格输出周榜 (仅限 QQ 官bot 平台) | `bb.md-table` |
| `周榜.历史` | `周榜历史`, `bb.history` | 查看近期收录的周榜期数总览（支持 `-s` 选项） | `bb.history` / `bb.history -s nico` |
| `周榜.查歌 <歌名>` | `周榜搜歌`, `bb.search` | 检索某首歌曲在近期周榜中的排位战绩（支持 `-s` 选项） | `bb.search 敌人` / `bb.search -s nico 楽園` |
| `周榜.刷新` | `bb.reload` | 管理员强制刷新远程索引缓存 | `周榜.刷新` |
| `周榜.帮助` | `周榜帮助`, `bb.help` | 查看周榜指令与选项帮助（等同于 `bb -h`） | `周榜.帮助` / `bb.help` |

### 指令选项
- `-s, --source <bilibili|niconico>`：指定周榜来源（支持简写 `bili` / `nico`）。未传时严格读取配置中的 `defaultSource`。
- `-f, --format <text|takumi|pptr|md-style|md-table>`：临时指定本次输出的单一格式（覆盖后台配置的多选设置；`pptr` 亦可写为 `puppeteer`）。
- `-n <数量>`：指定展示前几名（1 ~ 20，默认 10）。
- `-c, --cover <y/n>`：是否附带第一名封面海报大图（支持 `y`/`n`/`yes`/`no`/`t`/`f`/`true`/`false`）。

---

## 🖼️ 效果预览

本插件支持多种高颜值输出格式（可通过配置项 `outputFormats` 自由组合与多选）：

### 📝 纯文本排版（text）
> 极简高效纯文本消息，支持标准详细模式与极简排版模式。 ↓
<p align="center">
  <img src="docs/images/preview/preview.text.png" alt="纯文本排版消息预览" width="600" />
</p>

### ⚡ Takumi WASM 渲染出图（takumi）
> 轻量 Rust/WASM 引擎毫秒级极速渲染，原生粉蓝经典视觉看板。 ↓
<p align="center">
  <img src="docs/images/preview/preview.takumi.png" alt="Takumi WASM 渲染出图预览" width="800" />
</p>

### 🎨 Puppeteer 网页出图（puppeteer）
> 高质感色彩排版，全面展示各项数据指标与歌曲封面。 ↓
<p align="center">
  <img src="docs/images/preview/preview.pptr.png" alt="Puppeteer 网页出图预览" width="800" />
</p>

### 💫 QQ 原生 Markdown 流式卡片（md-style）
> QQ 官bot 平台原生卡片排版，支持蓝字外链一键直达原视频与交互式指令。 ↓
<p align="center">
  <img src="docs/images/preview/preview.qqmd-style.png" alt="QQ 原生 Markdown 流式卡片预览" width="600" />
</p>

### 📊 QQ 原生 Markdown 紧凑表格（md-table）
> QQ 官bot 平台原生表格排版，直观对齐排名、歌名与跳转播放链接。 ↓
<p align="center">
  <img src="docs/images/preview/preview.qqmd-table.png" alt="QQ 原生 Markdown 紧凑表格预览" width="600" />
</p>

---

## ⚙️ 配置项说明

在 Koishi 控制台中可直接进行图形化配置。

### 💬 消息交互设置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enableQuote` | `boolean` | `true` | 💬 是否启用引用回复 |
| `enableWaitingHint` | `boolean` | `true` | ⏳ 是否显示「正在获取并渲染周榜数据，请稍候...」等待提示（出图完成后自动撤回） |

### 🎯 默认榜单设置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `defaultSource` | `"bilibili" \| "niconico"` | `"bilibili"` | 🎯 默认周榜数据源（未传入 `-s` 参数时默认使用的榜单源） |

### 🌐 数据获取与容灾矩阵 (`dataSourceList`)

3 列表格，支持自由开关与拖拽重排优先级。插件将按表格自上而下顺序依次尝试，直至请求成功：

| 列字段 | 类型 | 说明 |
|---|---|---|
| `enabled` | `boolean` | ✅ 是否启用本条策略（默认全部开启） |
| `mode` | `enum` | 模式：`crawler`（本地 B站专栏爬虫）/ `jsdelivr`（jsDelivr CDN 静态源）/ `github`（GitHub Raw 静态源） |
| `network` | `enum` | 网络模式：`proxy`（走本地代理）/ `direct`（原生直连）/ `ghproxy`（走 GitHub 公网反代） |

> **默认 7 层预设矩阵**：
> 1. 本地爬取 + 走代理 (`crawler` + `proxy`)
> 2. 本地爬取 + 直连 (`crawler` + `direct`)
> 3. jsDelivr CDN + 走代理 (`jsdelivr` + `proxy`)
> 4. jsDelivr CDN + 直连 (`jsdelivr` + `direct`)
> 5. GitHub Raw + 走反代 (`github` + `ghproxy`)
> 6. GitHub Raw + 走代理 (`github` + `proxy`)
> 7. GitHub Raw + 直连 (`github` + `direct`)

> **注意**：
> - `ghproxy` 仅在模式为 `github` 时生效；若在 `crawler` 或 `jsdelivr` 行中误选 `ghproxy`，插件内部**自动平滑回退为原生直连**。
> - 表格下方提供只读锁定的 `customJsdelivrPrefix` 与 `customGithubRawPrefix`（已有 本地爬虫+公网gh代理+本地自定义代理 7层默认容灾兜底）。

### 🍪 B 站爬取设置 (实验性)

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enableBilibiliCookie` | `boolean` | `false` | 🧪 是否在爬取 B 站专栏时附带自定义 Cookie（防风控备用） |
| `bilibiliCookie` | `string` | `""` | 🔑 B站 SESSDATA / Cookie 字符串（仅当开关启用时生效） |

### 🛡️ 网络代理配置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enableGhProxy` | `boolean` | `true` | 🔗 是否启用 GitHub 公网反向代理加速（仅对 GitHub 域名生效） |
| `ghProxyPrefix` | `string` | `"https://gh-proxy.org/"` | 🔗 公网 GitHub 代理前缀 |
| `enableCustomProxy` | `boolean` | `false` | 🌐 是否启用自定义本地代理服务器 |
| `customProxyUrl` | `string` | `"http://127.0.0.1:7890"` | 🌐 自定义代理服务器地址（支持 HTTP/HTTPS/SOCKS5） |

### 🗄️ 缓存与同步设置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `cacheStorage` | `"database" \| "memory"` | `"database"` | 💾 缓存存储后端（推荐 `database`，无可用数据库服务时自动平滑降级为内存） |
| `cacheTtlMinutes` | `number` | `600` | ⏱️ 缓存有效期（分钟，默认 10 小时；小于等于 0 表示禁用缓存） |
| `smartWednesdayExpire` | `boolean` | `true` | 🕒 每周三 19:00 术力口出榜时刻智能让最新一期缓存失效 |
| `enableBackfill` | `boolean` | `true` | 📥 冷启动历史数据全量回溯（检测到历史数据缺失时后台自动拉取补全） |
| `enableLocalBackup` | `boolean` | `true` | 💽 本地 JSON 镜像备份（自动在 `data/billboard-data/` 目录保存离线副本） |

### 🍪 B站爬虫实验项 (可选)

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enableBilibiliCookie` | `boolean` | `false` | 🧪 是否在爬取 B 站专栏时附带自定义 Cookie（防风控备用） |
| `bilibiliCookie` | `string` | `""` | 🔑 B站 SESSDATA / Cookie 字符串（仅当开关启用时生效） |

### 📤 消息输出格式

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `outputFormats` | `string[]` | `['takumi', 'puppeteer', 'md-style', 'md-table']` | 📤 周榜返回格式（可多选：默认勾选两张出图与两种 QQ Markdown，不勾选纯文本；QQ Markdown 仅限 QQ 官bot 平台） |

### 📝 纯文本排版设置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `textDetailedMode` | `"standard" \| "simple"` | `"standard"` | 📋 纯文本信息详细度模式（`standard` 包含原视频标题与全量指标；`simple` 极简排版） |
| `textShowRenderInfo` | `boolean` | `true` | ⏱️ 是否在文本末尾展示 API 请求耗时、尝试源数量及总耗时 |

### ⚡ Takumi WASM 渲染设置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `takumiFontMode` | `"release" \| "custom" \| "none"` | `"release"` | 🔤 Takumi WASM 出图字体模式（支持 Release 下载校验、本地路径或系统内置） |
| `takumiCustomFontPath` | `string` | `""` | 📁 Takumi 本地自定义字体路径 |
| `takumiShowAllCovers` | `boolean` | `true` | 🖼️ 是否每首歌曲都展示封面图（开启时 TOP 2~N 列表项也附带微缩封面图） |
| `takumiDetailedMode` | `"standard" \| "simple"` | `"standard"` | 📋 Takumi 出图信息详细度模式（`standard` 包含原视频标题与全量指标；`simple` 极简看板） |
| `takumiShowRenderInfo` | `boolean` | `true` | ⏱️ 是否在图片消息后追加展示 API 请求、Takumi WASM 渲染及总耗时 |
| `takumiScale` | `number` | `1.5` | 🔍 Takumi WASM 渲染缩放倍率 / 设备像素比 (devicePixelRatio)，默认 1.5 倍高清输出 |

### 🎨 Puppeteer 网页出图设置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `puppeteerFontMode` | `"npm" \| "release" \| "custom" \| "none"` | `"npm"` | 🔤 Puppeteer 网页出图字体模式（支持 npm 字体包、Release 字体、本地路径或默认字体） |
| `puppeteerCustomFontPath` | `string` | `""` | 📁 Puppeteer 本地自定义字体路径 |
| `puppeteerShowAllCovers` | `boolean` | `true` | 🖼️ 是否每首歌曲都展示封面图（开启时 TOP 2~N 列表项也附带精美缩略图） |
| `puppeteerDetailedMode` | `"standard" \| "simple"` | `"standard"` | 📋 Puppeteer 出图详细度模式（`standard` 展示原视频标题与六维指标；`simple` 隐藏指标） |
| `puppeteerShowRenderInfo` | `boolean` | `true` | ⏱️ 是否在图片消息后追加展示 API 请求、Puppeteer 渲染及总耗时 |
| `puppeteerScale` | `number` | `1.0` | 🔍 Puppeteer 网页出图缩放倍率 / 设备像素比 (deviceScaleFactor)，默认保持 1.0 不变 |

### 📊 QQ 原生 Markdown 设置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `qqMarkdownDetailedMode` | `"standard" \| "simple"` | `"standard"` | 📋 QQ 原生 Markdown 信息详细度模式（同时作用于 `md-style` 与 `md-table`；`standard` 模式下表格展开为 4 列含歌曲与直达播放/原视频/创作者/时长与六维播放指标，卡片展示全量数据；`simple` 模式下表格为 3 列，卡片仅展示核心排名与链接） |
| `qqMarkdownShowRenderInfo` | `boolean` | `true` | ⏱️ 是否在 QQ Markdown 末尾追加展示 API 请求、尝试源数量及总耗时 |



### ⚙️ 通用偏好设置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `defaultTop` | `number` | `10` | 🔢 默认展示前多少名（可在 1 ~ 20 之间调节，亦可通过 `-n` 参数覆盖） |
| `showCover` | `boolean` | `true` | 🖼️ 查询周榜时是否附带第一名的榜单海报图片（仅纯文本模式生效） |

### 📢 订阅推送

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enableBroadcast` | `boolean` | `false` | 🔔 是否启用每周新榜自动广播提醒 |
| `broadcastSources` | `string[]` | `['bilibili', 'niconico']` | 📡 广播推送榜单源多选（全局生效于下方所有广播频道/群组） |
| `broadcastTargets` | `BroadcastTarget[]` | 默认包含 OneBot 群聊 | 🎯 广播推送目标表格（包含 platform、Bot selfId、群号、独立 Cron 与启用开关） |
| `checkInterval` | `number` | `15` | ⏱️ 新榜自动检测全局轮询周期（分钟，针对未指定 Cron 的目标生效） |

#### 🎯 广播目标表格 (`broadcastTargets`) 说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `note` | `string` | 📝 备注，仅用于在控制台标记识别目标 |
| `platform` | `string` | 🎯 平台标识，例如 `onebot`、`qq`、`discord` |
| `selfId` | `string` | 🤖 Bot 自身账号 ID。**留空时向该 platform 下所有满足条件的在线 Bot 发送**；填写时精确匹配 |
| `channelId` | `string` | 📡 目标群号或频道 ID，OneBot 填真实 QQ 群号 |
| `cron` | `string` | ⏰ 目标专属 Cron 定时表达式（留空则遵循全局轮询周期 `checkInterval`） |
| `enabled` | `boolean` | ✅ 独立启用开关，关闭后跳过该条目标 |

