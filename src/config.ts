export type BillboardSource = 'bilibili' | 'niconico'

export interface BroadcastTarget {
  note?: string
  platform: string
  selfId?: string
  channelId: string
  enableNewCheck: boolean
  enableCronPush: boolean
  cron?: string
}

export type OutputFormat = 'text' | 'forward' | 'takumi' | 'puppeteer' | 'md-style' | 'md-table'
export type TakumiFontMode = 'release' | 'custom' | 'none'
export type PuppeteerFontMode = 'npm' | 'release' | 'custom' | 'none'
export type TextDetailedMode = 'standard' | 'simple'
export type ForwardDetailedMode = 'standard' | 'simple'
export type TakumiDetailedMode = 'standard' | 'simple'
export type PuppeteerDetailedMode = 'standard' | 'simple'
export type QQMarkdownDetailedMode = 'standard' | 'simple'

export type DataSourceMode = 'crawler' | 'jsdelivr' | 'github'
export type NetworkMode = 'direct' | 'proxy' | 'ghproxy'
export type CacheBackend = 'database' | 'memory'

export interface DataSourceConfig {
  enabled: boolean
  mode: DataSourceMode
  network: NetworkMode
}

export interface SupportedPlatformEntry {
  platform: string
  enabled: boolean
}

export function getEnabledPlatforms(entries?: SupportedPlatformEntry[]): string[] {
  if (!entries || !Array.isArray(entries)) return []
  return entries
    .filter(e => e?.enabled)
    .map(e => String(e.platform || '').trim().toLowerCase())
    .filter(Boolean)
}

export interface Config {
  // 消息交互设置
  enableQuote: boolean
  enableWaitingHint: boolean

  // 默认榜单设置 (独立分组)
  defaultSource: BillboardSource

  // 数据源容灾矩阵
  dataSourceList: DataSourceConfig[]
  customJsdelivrPrefix: string
  customGithubRawPrefix: string
  autoPurgeJsdelivr: boolean

  // 实验性 B 站凭证设置 (移至网络代理上方)
  enableBilibiliCookie: boolean
  bilibiliCookie: string
  
  // 网络代理设置
  enableGhProxy: boolean
  ghProxyPrefix: string
  enableCustomProxy: boolean
  customProxyUrl: string

  // 本地爬虫与缓存策略
  cacheBackend: CacheBackend
  cacheDuration: number
  enableWeeklyInvalidation: boolean
  weeklyInvalidationCron: string
  
  // 运维备份与冷启动回溯
  saveLocalJsonBackup: boolean
  enableColdBootBackfill: boolean

  // 输出格式
  outputFormats: OutputFormat[]

  // 纯文本设置
  textDetailedMode: TextDetailedMode
  textShowCover: boolean
  textShowRenderInfo: boolean

  // Forward 合并转发设置
  forwardDetailedMode: ForwardDetailedMode
  forwardShowCover: boolean
  forwardCoverAsBase64: boolean
  restrictForwardPlatforms: boolean
  forwardSupportedPlatforms: SupportedPlatformEntry[]

  // Takumi WASM 渲染设置
  takumiFontMode: TakumiFontMode
  takumiCustomFontPath: string
  takumiShowAllCovers: boolean
  takumiDetailedMode: TakumiDetailedMode
  takumiShowRenderInfo: boolean
  takumiScale: number

  // Puppeteer 网页出图设置
  puppeteerFontMode: PuppeteerFontMode
  puppeteerCustomFontPath: string
  puppeteerShowAllCovers: boolean
  puppeteerDetailedMode: PuppeteerDetailedMode
  puppeteerShowRenderInfo: boolean
  puppeteerScale: number

  // QQ 原生 Markdown 设置
  qqMarkdownDetailedMode: QQMarkdownDetailedMode
  qqMarkdownShowCover: boolean
  qqMarkdownCoverWidth: number
  qqMarkdownCoverHeight: number
  qqMarkdownShowRenderInfo: boolean
  qqMarkdownSupportedPlatforms: SupportedPlatformEntry[]

  // 常规偏好与广播
  defaultTop: number
  showCover?: boolean
  enableBroadcast: boolean
  broadcastSources: BillboardSource[]
  broadcastTargets: BroadcastTarget[]
  broadcastIntervalText: string
  broadcastCronText: string
  checkInterval: number

  // 🐛 调试设置
  verboseConsoleLog: boolean
}


import { Schema } from 'koishi'

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    enableQuote: Schema.boolean()
      .default(true)
      .description('💬 是否引用触发指令的消息'),
    enableWaitingHint: Schema.boolean()
      .default(true)
      .description('⏳ 是否显示「正在获取并渲染周榜数据，请稍候...」等待提示（出图完成后将自动撤回）'),
  }).description('💬 消息交互设置'),

  Schema.object({
    defaultSource: Schema.union([
      Schema.const('bilibili' as BillboardSource).description('【 📺 bilibili 】 Bili Board 术力口周榜 (B站本土周榜)'),
      Schema.const('niconico' as BillboardSource).description('【 🎵 niconico 】 ニコニコ VOCALOID SONGS TOP20 (日本N站周榜)'),
    ])
      .role('radio')
      .default('bilibili')
      .description('🎯 默认周榜数据源（当指令未显式使用 -s 指定时生效）'),
  }).description('🎯 默认榜单设置'),

  Schema.object({
    dataSourceList: Schema.array(Schema.object({
      enabled: Schema.boolean().default(true).description('是否启用'),
      mode: Schema.union([
        Schema.const('crawler' as DataSourceMode).description('【 🕷️ crawler 】 本地直接爬取 (Bilibili 专栏)'),
        Schema.const('jsdelivr' as DataSourceMode).description('【 ⚡ jsdelivr 】 jsDelivr CDN 静态归档'),
        Schema.const('github' as DataSourceMode).description('【 🐙 github 】 GitHub Raw 静态源'),
      ]).role('radio').default('crawler').description('模式'),
      network: Schema.union([
        Schema.const('proxy' as NetworkMode).description('【 🚪 proxy 】 走本地代理 (需开启全局代理，否则直连)'),
        Schema.const('direct' as NetworkMode).description('【 🌐 direct 】 强制直连'),
        Schema.const('ghproxy' as NetworkMode).description('【 🔗 ghproxy 】 走 GitHub 公网反代 (仅 GitHub 生效)'),
      ]).role('radio').default('direct').description('网络通道'),
    }))
      .role('table')
      .default([
        { enabled: true, mode: 'crawler', network: 'proxy' },
        { enabled: true, mode: 'crawler', network: 'direct' },
        { enabled: true, mode: 'jsdelivr', network: 'proxy' },
        { enabled: true, mode: 'jsdelivr', network: 'direct' },
        { enabled: true, mode: 'github', network: 'ghproxy' },
        { enabled: true, mode: 'github', network: 'proxy' },
        { enabled: true, mode: 'github', network: 'direct' },
      ])
      .description('📡 7 级多源与网络通道容灾流水线表格（自上而下依次尝试。注意：ghproxy 仅在 GitHub 生效，若 crawler 或 jsdelivr 误选 ghproxy 将自动回退为直连；若代理开关关闭亦自动回退直连）'),
    customJsdelivrPrefix: Schema.string()
      .default('https://cdn.jsdelivr.net')
      .disabled()
      .description('⚡ jsDelivr CDN 基础前缀（当前默认锁定。已有 本地爬虫+公网gh代理+本地自定义代理 7层默认容灾兜底，如确有特殊镜像需求可联系作者反馈）'),
    customGithubRawPrefix: Schema.string()
      .default('https://raw.githubusercontent.com')
      .disabled()
      .description('📡 GitHub Raw 基础前缀（当前默认锁定。已有 本地爬虫+公网gh代理+本地自定义代理 7层默认容灾兜底，如确有特殊需求可联系作者反馈）'),
    autoPurgeJsdelivr: Schema.boolean()
      .default(true)
      .experimental()
      .description('⚡ 请求 jsDelivr CDN 前主动调用 Purge 刷新 API（防止读取到旧版边缘缓存）'),
  }).description('🌐 数据获取与容灾矩阵'),

  Schema.object({
    enableBilibiliCookie: Schema.boolean()
      .default(false)
      .experimental()
      .description('🍪 是否在爬取 B 站专栏时携带自定义 Cookie（唯一生效来源为本开关）'),
    bilibiliCookie: Schema.string()
      .default('')
      .role('secret')
      .experimental()
      .description('🍪 自定义 Bilibili Cookie（如 SESSDATA 等，可降低高频访客风控风险）'),
  }).description('🍪 B 站爬取设置 (实验性)'),

  Schema.object({
    enableGhProxy: Schema.boolean()
      .default(true)
      .description('🔗 是否启用 GitHub 公网反代加速（若关闭，所有 ghproxy 请求将回退到直连）'),
    ghProxyPrefix: Schema.string()
      .default('https://gh-proxy.org/')
      .description('🔗 公网 GitHub 代理前缀（开启反代且请求 GitHub Raw 时生效）'),
    enableCustomProxy: Schema.boolean()
      .default(false)
      .description('🌐 是否启用本地自定义代理（若关闭，所有代理请求将回退到直连；默认关闭）'),
    customProxyUrl: Schema.string()
      .default('http://127.0.0.1:7890')
      .description('🌐 本地自定义代理服务器地址（支持 HTTP/HTTPS/SOCKS5）'),
  }).description('🛡️ 网络代理配置【唯一生效判定依据为布尔开关】'),

  Schema.object({
    cacheBackend: Schema.union([
      Schema.const('database' as CacheBackend).description('【 🗄️ database 】 Database 数据库持久化（推荐，无服务时自动降级内存）'),
      Schema.const('memory' as CacheBackend).description('【 🧠 memory 】 纯内存 Map（进程重启即清空，绝不读写数据库）'),
    ])
      .role('radio')
      .default('database')
      .description('💾 缓存存储后端选择'),
    cacheDuration: Schema.number()
      .default(600)
      .min(-1)
      .description('⏱️ 缓存有效期（单位：分钟；默认 600 分钟即 10 小时；输入 <= 0 表示禁用缓存每次实时抓取）'),
    enableWeeklyInvalidation: Schema.boolean()
      .default(true)
      .description('🕒 是否在每周固定出榜时刻智能让最新一期缓存失效（确保周三第一时间拿到当周新榜）'),
    weeklyInvalidationCron: Schema.string()
      .default('0 19 * * 3')
      .description('⏰ 缓存智能失效 Cron 表达式（默认每周三 19:00：0 19 * * 3）'),
  }).description('💾 本地爬取与智能缓存'),

  Schema.object({
    saveLocalJsonBackup: Schema.boolean()
      .default(true)
      .description('📁 是否在 Koishi 相对路径 data/billboard-data 镜像保存一份 JSON 结构（运维/本地查阅 bonus）'),
    enableColdBootBackfill: Schema.boolean()
      .default(true)
      .description('❄️ 首次冷启动是否自动从 GitHub 全量拉取历史期数并存入数据库与本地 JSON 镜像（按固定加速链路同步）'),
  }).description('📦 运维归档与冷启动回溯'),

  Schema.object({
    outputFormats: Schema.array(
      Schema.union([
        Schema.const('text' as OutputFormat).description('【 📝 text 】 纯文本消息'),
        Schema.const('forward' as OutputFormat).description('【 📦 forward 】 合并转发节点（支持 OneBot / Red / Discord，分曲折叠防刷屏）'),
        Schema.const('takumi' as OutputFormat).description('【 ⚡ takumi 】 Takumi WASM 渲染出图（B站粉蓝极速轻量看板）'),
        Schema.const('puppeteer' as OutputFormat).description('【 🎨 puppeteer 】 Puppeteer 网页出图（高保真精美海报）'),
        Schema.const('md-style' as OutputFormat).description('【 💫 md-style 】 QQ 原生 Markdown 卡片流式风格（含蓝字外链跳转，仅在 QQ 官bot 平台生效）'),
        Schema.const('md-table' as OutputFormat).description('【 📊 md-table 】 QQ 原生 Markdown 紧凑表格模式（含直达播放链接，仅在 QQ 官bot 平台生效）'),
      ])
    )
      .role('checkbox')
      .default(['text', 'takumi', 'puppeteer', 'md-style', 'md-table'])
      .description('📤 周榜消息返回格式（支持多选组合，默认勾选除 forward 外的全部格式；未指定 -f 则默认按勾选批量输出）'),
  }).description('📤 消息输出格式'),


  Schema.object({
    textDetailedMode: Schema.union([
      Schema.const('standard' as TextDetailedMode).description('【 📋 standard 】 详细排版（展示原视频标题、上传者、时长、播放/弹幕/点赞数据等）'),
      Schema.const('simple' as TextDetailedMode).description('【 ⚡ simple 】 极简排版（仅展示排名、歌曲名与 BV 号）'),
    ])
      .role('radio')
      .default('standard')
      .description('📋 纯文本信息详细度模式'),
    textShowCover: Schema.boolean()
      .default(true)
      .description('🖼️ 是否在纯文本消息中附带 TOP 1 单曲封面图片（默认开启）'),
    textShowRenderInfo: Schema.boolean()
      .default(true)
      .description('⏱️ 是否在文本末尾展示 API 请求耗时、尝试源数量与总耗时'),
  }).description('📝 Text 纯文本排版设置'),

  Schema.object({
    forwardDetailedMode: Schema.union([
      Schema.const('standard' as ForwardDetailedMode).description('【 📋 standard 】 详细排版（每个节点包含完整视频指标与封面）'),
      Schema.const('simple' as ForwardDetailedMode).description('【 ⚡ simple 】 极简排版（每个节点仅保留歌曲名、UP主与直达链接）'),
    ])
      .role('radio')
      .default('standard')
      .description('📋 合并转发消息的内容详细度模式'),
    forwardShowCover: Schema.boolean()
      .default(true)
      .description('🖼️ 是否在合并转发的单曲独立节点中展示封面大图'),
    forwardCoverAsBase64: Schema.boolean()
      .default(false)
      .experimental()
      .description('🖼️ 是否将合并转发内的封面图下载为 Base64 Buffer 发送<br><i>默认关闭（直接发送公网 URL）。如果合并转发打不开或在 QQ 客户端呈现黑屏/空白，可以尝试打开此开关，改由本地插件先下载图片再转码发送，以规避远端 Bot 容器网络或图床防盗链问题。</i>'),
    restrictForwardPlatforms: Schema.boolean()
      .default(true)
      .description('📦 是否按下方平台列表限制 forward 合并转发。开启时只有白名单内平台会发送；关闭时所有平台尝试发送。'),
    forwardSupportedPlatforms: Schema.array(Schema.object({
      platform: Schema.string().default('onebot').description('🎯 平台 (如 onebot, red, discord)'),
      enabled: Schema.boolean().default(true).description('✅ 是否启用'),
    }))
      .role('table')
      .default([
        { platform: 'onebot', enabled: true },
        { platform: 'red', enabled: true },
        { platform: 'discord', enabled: true },
      ])
      .description('📦 forward 合并转发支持的平台列表（配置允许的平台及是否启用）'),
  }).description('📦 Forward 合并转发设置'),

  Schema.object({
    takumiFontMode: Schema.union([
      Schema.const('release' as TakumiFontMode).description('【 📥 release 】 Gitee / GitHub Release 下载（推荐，保存至 data/fonts）'),
      Schema.const('custom' as TakumiFontMode).description('【 📁 custom 】 本地自定义字体路径'),
      Schema.const('none' as TakumiFontMode).description('【 🚫 none 】 不指定字体（使用系统环境内置字体）'),
    ])
      .role('radio')
      .default('release')
      .description('🔤 Takumi WASM 出图字体模式'),
    takumiCustomFontPath: Schema.string()
      .default('')
      .description('📁 Takumi 自定义字体文件路径（选为「本地自定义字体路径」时生效）'),
    takumiShowAllCovers: Schema.boolean()
      .default(true)
      .description('🖼️ 是否每首歌曲都展示封面图（开启时 TOP 2~N 列表项也附带微缩封面图）'),
    takumiDetailedMode: Schema.union([
      Schema.const('standard' as TakumiDetailedMode).description('【 📋 standard 】 完整看板（展示原视频标题、UP 主昵称/头像、时长及播放全量指标）'),
      Schema.const('simple' as TakumiDetailedMode).description('【 ⚡ simple 】 极简看板（仅保留排位、封面与曲目名称）'),
    ])
      .role('radio')
      .default('standard')
      .description('📋 Takumi 出图信息详细度模式'),
    takumiShowRenderInfo: Schema.boolean()
      .default(true)
      .description('⏱️ 是否在出图水印处展示 API 请求耗时、尝试源数量与 WASM 渲染耗时'),
    takumiScale: Schema.number()
      .role('slider')
      .min(1)
      .max(3)
      .step(0.1)
      .default(1.5)
      .description('🔍 Takumi WASM 渲染缩放倍率 / 设备像素比 (devicePixelRatio)。默认 1.5 倍高清输出。'),
  }).description('⚡ Takumi WASM 渲染设置'),

  Schema.object({
    puppeteerFontMode: Schema.union([
      Schema.const('npm' as PuppeteerFontMode).description('【 📦 npm 】 npm 字体包（推荐，即装即用 lxgw-wenkai-webfont）'),
      Schema.const('release' as PuppeteerFontMode).description('【 📥 release 】 Gitee / GitHub Release 下载字体（复用 data/fonts）'),
      Schema.const('custom' as PuppeteerFontMode).description('【 📁 custom 】 本地自定义字体路径'),
      Schema.const('none' as PuppeteerFontMode).description('【 🚫 none 】 不指定字体（使用浏览器默认字体）'),
    ])
      .role('radio')
      .default('npm')
      .description('🔤 Puppeteer 网页出图字体模式'),
    puppeteerCustomFontPath: Schema.string()
      .default('')
      .description('📁 Puppeteer 自定义字体文件路径（选为「本地自定义字体路径」时生效）'),
    puppeteerShowAllCovers: Schema.boolean()
      .default(true)
      .description('🖼️ 是否每首歌曲都展示封面图（开启时 TOP 2~N 列表项也附带高保真缩略图）'),
    puppeteerDetailedMode: Schema.union([
      Schema.const('standard' as PuppeteerDetailedMode).description('【 📋 standard 】 精美海报卡片（展示原视频标题、UP 主、播放六维指标条）'),
      Schema.const('simple' as PuppeteerDetailedMode).description('【 ⚡ simple 】 精简海报（隐藏下方统计指标条）'),
    ])
      .role('radio')
      .default('standard')
      .description('📋 Puppeteer 出图信息详细度模式'),
    puppeteerShowRenderInfo: Schema.boolean()
      .default(true)
      .description('⏱️ 是否在网页底栏展示 API 请求耗时、尝试源数量与浏览器渲染耗时'),
    puppeteerScale: Schema.number()
      .role('slider')
      .min(1)
      .max(3)
      .step(0.1)
      .default(1.0)
      .description('🔍 Puppeteer 网页出图缩放倍率 / 设备像素比 (deviceScaleFactor)。默认保持 1.0。'),
  }).description('🎨 Puppeteer 网页出图设置'),

  Schema.object({
    qqMarkdownDetailedMode: Schema.union([
      Schema.const('standard' as QQMarkdownDetailedMode).description('【 📋 standard 】 详细模式（表格输出 4 列：排名/歌曲与直达播放/创作者/时长与六维播放指标；卡片展示全量数据）'),
      Schema.const('simple' as QQMarkdownDetailedMode).description('【 ⚡ simple 】 极简模式（表格输出 3 列：排名/歌曲名/直达播放；卡片仅保留核心排名与链接）'),
    ])
      .role('radio')
      .default('standard')
      .description('📋 QQ 原生 Markdown 信息详细度模式（同时作用于 md-style 与 md-table）'),
    qqMarkdownShowCover: Schema.boolean()
      .default(true)
      .description('🖼️ 是否在 Markdown 输出中展示视频封面（同时作用于 md-style 卡片头图与 md-table 歌曲缩略图）'),
    qqMarkdownCoverWidth: Schema.number()
      .default(160)
      .min(80)
      .max(1000)
      .description('📐 封面图展示宽度 (px)（默认 160，建议 140~360）'),
    qqMarkdownCoverHeight: Schema.number()
      .default(90)
      .min(45)
      .max(800)
      .description('📐 封面图展示高度 (px)（默认 90，与宽度默认保持 16:9 黄金比例）'),
    qqMarkdownShowRenderInfo: Schema.boolean()
      .default(true)
      .description('⏱️ 是否在 Markdown 末尾展示 API 请求耗时、尝试源数量与总耗时'),
    qqMarkdownSupportedPlatforms: Schema.array(Schema.object({
      platform: Schema.string().default('qq').description('🎯 平台 (固定仅限 qq 官方机器人平台)'),
      enabled: Schema.boolean().default(true).description('✅ 是否启用'),
    }))
      .role('table')
      .default([
        { platform: 'qq', enabled: true },
      ])
      .disabled()
      .description('🔒 QQ 原生 Markdown 专属平台白名单（系统保留且只读，固定仅限 qq 官方机器人平台）'),
  }).description('📊 QQ 原生 Markdown 设置'),



  Schema.object({
    defaultTop: Schema.number()
      .default(10)
      .min(1)
      .max(20)
      .description('🔢 默认展示前多少名（可通过 -n 参数临时覆盖，最大 20）'),
  }).description('⚙️ 通用偏好设置'),

  Schema.object({
    enableBroadcast: Schema.boolean()
      .default(false)
      .description('🔔 是否启用每周新榜自动广播提醒'),
    broadcastSources: Schema.array(
      Schema.union([
        Schema.const('bilibili' as BillboardSource).description('【 📺 bilibili 】 Bili Board 术力口周榜 (B站本土周榜)'),
        Schema.const('niconico' as BillboardSource).description('【 🎵 niconico 】 ニコニコ VOCALOID SONGS TOP20 (日本N站周榜)'),
      ])
    )
      .role('checkbox')
      .default(['bilibili', 'niconico'])
      .description('📡 广播推送榜单源多选（全局生效于下方所有广播频道/群组）'),
    broadcastTargets: Schema.array(Schema.object({
      note: Schema.string().default('').description('📝 备注'),
      platform: Schema.string().default('onebot').description('🎯 平台'),
      selfId: Schema.string().default('').description('🤖 Bot ID'),
      channelId: Schema.string().default('').description('📡 群号/频道 ID'),
      enableNewCheck: Schema.boolean().default(true).description('🔔 新榜抢鲜'),
      enableCronPush: Schema.boolean().default(true).description('⏰ 定时回顾'),
      cron: Schema.string().default('0 18 * * 5').description('⏰ 定时 Cron'),
    }))
      .role('table')
      .default([{
        note: 'awa测试群',
        platform: 'onebot',
        selfId: '',
        channelId: '958366323',
        enableNewCheck: true,
        enableCronPush: true,
        cron: '0 18 * * 5',
      }])
      .description('🎯 广播推送目标表格<br><i>• 🔔 新榜抢鲜：后台轮询检测到新榜发布第一时间推送（附带新榜专属文案）<br>• ⏰ 定时回顾：按 Cron 表达式定期推送当周周榜（默认每周五 18:00：0 18 * * 5，作为周末谈资）<br>• 🤖 Bot ID：可选，留空则匹配该平台任意在线 Bot；两项推送开关默认开启</i>'),
    broadcastIntervalText: Schema.string()
      .role('textarea')
      .default('🎉 检测到本周最新术力口周榜出炉，第一时间为你抢鲜送达！')
      .description('🔔 新榜突发推送专属附带文案（当 checkInterval 统一检测到新周报推送时展示）'),
    broadcastCronText: Schema.string()
      .role('textarea')
      .default('📅 周末将至，一起来回顾本周三出炉的最新术力口周榜吧！')
      .description('⏰ 定时回顾推送专属附带文案（当 Cron 定时任务触发推送时展示）'),
    checkInterval: Schema.number()
      .default(15)
      .min(1)
      .max(120)
      .description('⏱️ 新榜自动检测周期（分钟，后台按此间隔定期轮询检测新周榜是否发布，专用于触发“新榜抢鲜”突发广播；默认 15 分钟）'),
  }).description('📢 订阅推送'),

  // ===== 🐛 调试设置 =====
  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .default(false)
      .description('🐛 在控制台输出详细参数和消息下发调试信息<br><i>包含渲染派发详情、各格式下发结果、QQ Markdown 完整 payload 及接口响应日志</i>'),
  }).description('🐛 调试设置 🔧'),
])

