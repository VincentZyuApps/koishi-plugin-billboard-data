import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { Context } from 'koishi'
import { h } from 'koishi'
import type { Config } from '../config'
import { type WeeklyDetail, type RenderStats, formatPublishTime, formatCount, formatDuration } from '../types'
import { ensureLxgwFont, getLxgwFontPath } from '../utils/font'

declare module 'koishi' {
  interface Context {
    puppeteer?: any
  }
}

async function resolveFontCss(ctx: Context, config: Config): Promise<string> {
  const mode = config.puppeteerFontMode || 'npm'

  if (mode === 'none') {
    return `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; }`
  }

  if (mode === 'custom' && config.puppeteerCustomFontPath?.trim()) {
    const customPath = config.puppeteerCustomFontPath.trim()
    if (existsSync(customPath)) {
      const fileUrl = pathToFileURL(customPath).href
      return `
        @font-face {
          font-family: 'BillboardCustomFont';
          src: url('${fileUrl}');
        }
        body { font-family: 'BillboardCustomFont', sans-serif; }
      `
    }
  }

  if (mode === 'release') {
    try {
      const fontPath = await ensureLxgwFont(ctx)
      if (existsSync(fontPath)) {
        const fileUrl = pathToFileURL(fontPath).href
        return `
          @font-face {
            font-family: 'LXGWWenKaiMono';
            src: url('${fileUrl}');
          }
          body { font-family: 'LXGWWenKaiMono', sans-serif; }
        `
      }
    } catch {
      // 降级使用 npm 或系统字体
    }
  }

  // 默认 npm 模式：尝试解析 lxgw-wenkai-webfont 本地样式
  try {
    const cssPath = require.resolve('lxgw-wenkai-webfont/style.css')
    if (existsSync(cssPath)) {
      const fileUrl = pathToFileURL(cssPath).href
      return `
        @import url('${fileUrl}');
        body { font-family: "LXGW WenKai Mono", sans-serif; }
      `
    }
  } catch {
    // 若未能解析到 npm 路径，尝试从 release 下载
    try {
      const fontPath = await ensureLxgwFont(ctx)
      if (existsSync(fontPath)) {
        const fileUrl = pathToFileURL(fontPath).href
        return `
          @font-face {
            font-family: 'LXGWWenKaiMono';
            src: url('${fileUrl}');
          }
          body { font-family: 'LXGWWenKaiMono', sans-serif; }
        `
      }
    } catch {}
  }

  return `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; }`
}

function renderUploaderAvatarHtml(face?: string, name?: string, size: number = 24): string {
  const initial = (name || '?').trim().charAt(0) || '?'
  if (face) {
    return `
      <div class="avatar-box" style="width: ${size}px; height: ${size}px;">
        <img src="${face}" alt="${initial}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <div class="avatar-fallback" style="display: none; width: ${size}px; height: ${size}px; font-size: ${Math.round(size * 0.55)}px;">${initial}</div>
      </div>
    `
  }
  return `
    <div class="avatar-box" style="width: ${size}px; height: ${size}px;">
      <div class="avatar-fallback" style="display: flex; width: ${size}px; height: ${size}px; font-size: ${Math.round(size * 0.55)}px;">${initial}</div>
    </div>
  `
}

export async function renderWeeklyPuppeteer(
  ctx: Context,
  config: Config,
  detail: WeeklyDetail,
  limit: number,
  showCover: boolean,
  stats?: RenderStats,
  broadcastNotice?: string
) {
  const logger = ctx.logger('billboard')
  if (!ctx.puppeteer) {
    logger.warn('⚠️ 未检测到已加载的 puppeteer 服务，跳过 Puppeteer 网页出图')
    return null
  }

  const items = detail.items.slice(0, Math.min(limit, detail.items.length))
  const fontCss = await resolveFontCss(ctx, config)
  const showDetailed = (config.puppeteerDetailedMode ?? 'standard') === 'standard'

  const top1 = items[0]
  const otherItems = items.slice(1)

  const isNico = detail.source === 'niconico' || detail.title.includes('ニコニコ')
  const chartTitle = isNico ? '🎵 ニコニコ VOCALOID SONGS TOP20' : '🎵 Bili Board 术力口周榜'

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    ${fontCss}

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 840px;
      padding: 16px;
      background-color: #F4F5F7;
      color: #18191C;
      display: flex;
      flex-direction: column;
      gap: 8px;
      -webkit-font-smoothing: antialiased;
    }

    /* 顶部 Banner Header */
    .header-card {
      background: #FFFFFF;
      border: 1px solid #E3E5E7;
      border-radius: 14px;
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }

    .title-group h1 {
      font-size: 24px;
      font-weight: 700;
      color: #00AEEC;
      margin-bottom: 3px;
      letter-spacing: 0.5px;
    }

    .title-group p {
      font-size: 12.5px;
      color: #61666D;
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .issue-badge {
      background: linear-gradient(135deg, #FB7299 0%, #FF85A7 100%);
      color: white;
      font-size: 15px;
      font-weight: 700;
      padding: 4px 14px;
      border-radius: 20px;
      box-shadow: 0 4px 14px rgba(251, 114, 153, 0.35);
      letter-spacing: 0.5px;
    }

    .broadcast-banner {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 10px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #1D4ED8;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(29, 78, 216, 0.05);
    }

    /* TOP 1 冠军展示卡片 */
    .top1-hero {
      position: relative;
      background: linear-gradient(180deg, #FFFDF8 0%, #FFFFFF 100%);
      border-radius: 14px;
      overflow: hidden;
      border: 2px solid #FCD34D;
      box-shadow: 0 10px 28px rgba(245, 158, 11, 0.16);
      display: flex;
      flex-direction: column;
    }

    .top1-header {
      padding: 10px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(90deg, #FEF3C7 0%, #FFFBEB 60%, #FFFFFF 100%);
      border-bottom: 1px solid #FDE68A;
    }

    .top1-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: #FFFFFF;
      font-size: 13.5px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      box-shadow: 0 3px 10px rgba(217, 119, 6, 0.35);
      letter-spacing: 0.5px;
    }

    .top1-bv {
      font-size: 13px;
      font-weight: 600;
      color: #00AEEC;
      background: #E8F7FD;
      padding: 3px 10px;
      border-radius: 6px;
    }

    .top1-content {
      padding: 12px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .top1-title {
      font-size: 22px;
      font-weight: 700;
      color: #18191C;
      line-height: 1.3;
    }

    .top1-orig-title {
      font-size: 13px;
      color: #61666D;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
      margin-top: -3px;
    }

    .top1-cover-box {
      width: 100%;
      height: 350px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      position: relative;
    }

    .top1-cover-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* 头像通用 */
    .avatar-box {
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #E3E5E7;
    }

    .avatar-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-fallback {
      width: 100%;
      height: 100%;
      background: #E3E5E7;
      color: #61666D;
      font-weight: 600;
      align-items: center;
      justify-content: center;
      user-select: none;
    }

    /* TOP 1 视频上传者与指标 */
    .top1-meta-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .uploader-label {
      font-size: 13.5px;
      font-weight: 600;
      color: #18191C;
    }

    .duration-label {
      font-size: 12.5px;
      color: #9499A0;
    }

    .top1-stats-box {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #F9FAFB;
      border: 1px solid #E3E5E7;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12.5px;
      color: #61666D;
    }

    /* TOP 2~N 列表 */
    .ranking-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .rank-card {
      background: #FFFFFF;
      border: 1px solid #E3E5E7;
      border-radius: 8px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
      transition: all 0.2s;
    }

    .rank-card.top2 {
      border: 1.5px solid #CBD5E1;
      border-left: 6px solid #64748B;
      background: linear-gradient(90deg, #F8FAFC 0%, #FFFFFF 50%);
      box-shadow: 0 3px 12px rgba(100, 116, 139, 0.08);
    }

    .rank-card.top3 {
      border: 1.5px solid #FDBA74;
      border-left: 6px solid #EA580C;
      background: linear-gradient(90deg, #FFF7ED 0%, #FFFFFF 50%);
      box-shadow: 0 3px 12px rgba(234, 88, 12, 0.08);
    }

    .card-thumb {
      width: 128px;
      height: 80px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      margin-right: 10px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    .card-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .card-main {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 2px;
      overflow: hidden;
    }

    .card-row-1 {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
    }

    .rank-tag {
      font-size: 13.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .tag-silver {
      background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
      color: #334155;
      border: 1px solid #CBD5E1;
      box-shadow: 0 1px 3px rgba(100, 116, 139, 0.15);
    }
    .tag-bronze {
      background: linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%);
      color: #9A3412;
      border: 1px solid #FDBA74;
      box-shadow: 0 1px 3px rgba(234, 88, 12, 0.15);
    }
    .tag-normal {
      background: #E8F7FD;
      color: #00AEEC;
    }

    .song-title {
      font-size: 17px;
      font-weight: 600;
      color: #18191C;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-orig-title {
      font-size: 12.5px;
      color: #61666D;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .bvid-tag {
      font-size: 13px;
      font-weight: 500;
      color: #00AEEC;
      white-space: nowrap;
      margin-left: 10px;
    }

    .card-row-2 {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .uploader-text {
      font-size: 13px;
      font-weight: 500;
      color: #4E5358;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .duration-text {
      font-size: 12px;
      color: #9499A0;
      white-space: nowrap;
    }

    .card-row-3 {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      font-weight: 500;
      color: #4E5358;
      border-top: 1px dashed #EBECEE;
      padding-top: 2px;
    }

    /* 传统单行样式 */
    .single-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .single-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      overflow: hidden;
    }

    .single-thumb {
      width: 64px;
      height: 38px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      margin-right: 10px;
    }

    .single-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* 底部水印 */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 4px 2px 4px;
      font-size: 12px;
      color: #9499A0;
    }

    .footer-left {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .footer-title {
      font-size: 11px;
      color: #71767D;
      font-weight: 500;
    }

    .footer-credits {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .footer-primary {
      font-size: 11px;
      font-weight: 500;
      color: #9499A0;
    }

    .footer-secondary {
      font-size: 10px;
      font-weight: 400;
      color: #B0B4B8;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header-card">
    <div class="title-group">
      <h1>${chartTitle}</h1>
      <p>
        <span>📅 ${formatPublishTime(detail)}</span>
        <span>·</span>
        <span>第 ${detail.week || ''} 周</span>
        <span>·</span>
        <span>TOP ${items.length} 特别精选</span>
      </p>
    </div>
    <div class="issue-badge">第 ${detail.issue} 期</div>
  </div>

  ${broadcastNotice ? `
  <div class="broadcast-banner">
    <span>📢</span>
    <span>[订阅广播] ${broadcastNotice}</span>
  </div>
  ` : ''}

  <!-- TOP 1 Hero -->
  ${top1 ? `
  <div class="top1-hero">
    <div class="top1-header">
      <div class="top1-badge">🥇 TOP 1 冠军曲目</div>
      ${top1.bvid ? `<div class="top1-bv">BV: ${top1.bvid}</div>` : ''}
    </div>
    <div class="top1-content">
      <div class="top1-title">${top1.title}</div>
      ${showDetailed && top1.video_meta?.title ? `<div class="top1-orig-title">原视频标题: ${top1.video_meta.title}</div>` : ''}
      ${showCover && top1.pic_url ? `
      <div class="top1-cover-box">
        <img src="${top1.pic_url}" alt="Cover" />
      </div>
      ` : ''}

      ${showDetailed && top1.video_meta ? `
      <div class="top1-meta-row">
        ${renderUploaderAvatarHtml(top1.video_meta.uploader?.face, top1.video_meta.uploader?.name, 28)}
        <span class="uploader-label">视频上传者: ${top1.video_meta.uploader?.name || '未知'}</span>
        <span class="duration-label">时长: ${formatDuration(top1.video_meta.duration)}</span>
      </div>
      <div class="top1-stats-box">
        <span>播放 ${formatCount(top1.video_meta.stat?.view)}</span>
        <span>弹幕 ${formatCount(top1.video_meta.stat?.danmaku)}</span>
        <span>点赞 ${formatCount(top1.video_meta.stat?.like)}</span>
        <span>投币 ${formatCount(top1.video_meta.stat?.coin)}</span>
        <span>收藏 ${formatCount(top1.video_meta.stat?.favorite)}</span>
        <span>分享 ${formatCount(top1.video_meta.stat?.share)}</span>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  <!-- TOP 2~N 列表 -->
  ${otherItems.length > 0 ? `
  <div class="ranking-grid">
    ${otherItems.map(item => {
      let tagClass = 'tag-normal'
      let rowClass = ''
      let tagText = `TOP ${item.rank}`

      if (item.rank === 2) {
        tagClass = 'tag-silver'
        rowClass = 'top2'
        tagText = 'TOP 2 亚军'
      } else if (item.rank === 3) {
        tagClass = 'tag-bronze'
        rowClass = 'top3'
        tagText = 'TOP 3 季军'
      }

      const showThumb = config.puppeteerShowAllCovers && showCover && item.pic_url

      if (showDetailed && item.video_meta) {
        const meta = item.video_meta
        const s = meta.stat || {} as any
        const uploaderName = meta.uploader?.name || '未知'
        const dur = formatDuration(meta.duration)
        const thumbHtml = showThumb ? `<div class="card-thumb"><img src="${item.pic_url}" alt="thumb" /></div>` : ''

        return `
        <div class="rank-card ${rowClass}">
          ${thumbHtml}
          <div class="card-main">
            <div class="card-row-1">
              <div class="card-title-group">
                <span class="rank-tag ${tagClass}">${tagText}</span>
                <span class="song-title">${item.title}</span>
              </div>
              ${item.bvid ? `<span class="bvid-tag">${item.bvid}</span>` : ''}
            </div>
            ${meta.title ? `<div class="card-orig-title">原视频标题: ${meta.title}</div>` : ''}
            <div class="card-row-2">
              ${renderUploaderAvatarHtml(meta.uploader?.face, uploaderName, 22)}
              <span class="uploader-text">视频上传者: ${uploaderName}</span>
              <span class="duration-text">· 时长: ${dur}</span>
            </div>
            <div class="card-row-3">
              <span>播放 ${formatCount(s.view)}</span>
              <span>弹幕 ${formatCount(s.danmaku)}</span>
              <span>点赞 ${formatCount(s.like)}</span>
              <span>投币 ${formatCount(s.coin)}</span>
              <span>收藏 ${formatCount(s.favorite)}</span>
              <span>分享 ${formatCount(s.share)}</span>
            </div>
          </div>
        </div>
        `
      } else {
        const thumbHtml = showThumb ? `<div class="single-thumb"><img src="${item.pic_url}" alt="thumb" /></div>` : ''
        return `
        <div class="rank-card ${rowClass}">
          <div class="single-row">
            <div class="single-left">
              <span class="rank-tag ${tagClass}">${tagText}</span>
              ${thumbHtml}
              <span class="song-title">${item.title}</span>
            </div>
            ${item.bvid ? `<span class="bvid-tag">${item.bvid}</span>` : ''}
          </div>
        </div>
        `
      }
    }).join('')}
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      <span>💡 数据来源于 ${isNico ? 'Bilibili @Elvansphere（Niconico Vocaloid Songs 周榜 TOP20 专栏）' : 'Bilibili @Bili-Board_Atel（Bilibili Vocaloid Songs 周榜 TOP20 专栏）'}</span>
      ${detail.title ? `<span class="footer-title">📌 专栏原标题: ${detail.title}</span>` : ''}
    </div>
    <div class="footer-credits">
      <span class="footer-primary">Generated by koishi-plugin-billboard-data</span>
      <span class="footer-secondary">Render Engine: Browser + Puppeteer</span>
    </div>
  </div>

</body>
</html>`

  try {
    const page = await ctx.puppeteer.page()
    const dsf = config.puppeteerScale || 1.0
    if (dsf !== 1.0) {
      await page.setViewport({ width: 840, height: 1000, deviceScaleFactor: dsf })
    }
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20000 })
    const bodyHandle = await page.$('body')
    const renderStartTime = Date.now()
    const buffer = await bodyHandle.screenshot({
      type: 'png',
      omitBackground: false,
    })
    const renderMs = Date.now() - renderStartTime
    await page.close()

    const imageElement = h.image(buffer, 'image/png')
    if (config.puppeteerShowRenderInfo && stats) {
      const totalMs = Date.now() - stats.commandStartTime
      const infoText = `\n====================\n⏱️ API 请求: ${stats.apiDurationMs}ms (尝试源: ${stats.attemptSourcesCount}) | 🎨 Puppeteer 渲染: ${renderMs}ms | 📊 总耗时: ${totalMs}ms`
      return [imageElement, h.text(infoText)]
    }

    return imageElement
  } catch (err: any) {
    logger.error(`❌ Puppeteer 截图失败: ${err.message || err}`)
    return null
  }
}
