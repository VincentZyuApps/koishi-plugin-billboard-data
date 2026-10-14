import type { Session, Context } from 'koishi'
import type { Config } from '../config'
import type { WeeklyDetail, RenderStats } from '../types'
import { sendReply } from '../utils/reply'
import { formatWeeklyText } from './text'
import { renderWeeklyTakumi } from './takumi'
import { renderWeeklyPuppeteer } from './puppeteer'
import { sendWeeklyQQMarkdown } from './markdown'

export * from './text'
export * from './markdown'
export * from './takumi'
export * from './puppeteer'

export async function dispatchWeeklyOutput(
  ctx: Context,
  session: Session,
  config: Config,
  detail: WeeklyDetail,
  limit: number,
  showCover: boolean,
  stats?: RenderStats,
  overrideFormats?: ('text' | 'takumi' | 'puppeteer' | 'md-style' | 'md-table')[]
) {
  const logger = ctx.logger('billboard')
  const isVerbose = config.verboseConsoleLog
  const isExplicit = overrideFormats && overrideFormats.length > 0
  const formats = isExplicit
    ? overrideFormats!
    : (config.outputFormats || ['takumi', 'puppeteer', 'md-style', 'md-table'])

  if (isVerbose) {
    logger.info(`[DEBUG] dispatchWeeklyOutput 触发: platform=${session.platform}, channelId=${session.channelId}, formats=${JSON.stringify(formats)}, isExplicit=${Boolean(isExplicit)}`)
  }

  // 1. 纯文本输出
  if (formats.includes('text')) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: text')
    const textMsg = formatWeeklyText(
      detail,
      limit,
      showCover,
      config.textDetailedMode ?? 'standard',
      stats,
      config.textShowRenderInfo ?? true
    )
    await sendReply(session, config, textMsg)
  }

  // 2. Takumi WASM 出图输出
  if (formats.includes('takumi')) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: takumi')
    try {
      const img = await renderWeeklyTakumi(ctx, config, detail, limit, showCover, stats)
      if (img) {
        await sendReply(session, config, img)
      }
    } catch (err: any) {
      logger.warn(`⚠️ Takumi 出图失败: ${err.message || err}`)
    }
  }

  // 3. Puppeteer 精美海报出图输出
  if (formats.includes('puppeteer')) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: puppeteer')
    try {
      const img = await renderWeeklyPuppeteer(ctx, config, detail, limit, showCover, stats)
      if (img) {
        await sendReply(session, config, img)
      }
    } catch (err: any) {
      logger.warn(`⚠️ Puppeteer 出图失败: ${err.message || err}`)
    }
  }

  // 4. QQ 原生 Markdown 卡片流式风格（md-style，仅在 QQ 官bot 平台生效）
  let hasSentMdStyle = false
  if (formats.includes('md-style') || formats.includes('qq_markdown' as any)) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: md-style')
    if (session.platform === 'qq') {
      try {
        hasSentMdStyle = await sendWeeklyQQMarkdown(ctx, session, config, detail, limit, 'md-style', stats)
      } catch (err: any) {
        logger.warn(`⚠️ 发送 QQ Markdown (md-style) 失败: ${err.message || err}`)
      }
    } else if (isExplicit && formats.length === 1) {
      await sendReply(session, config, '⚠️ QQ 原生 Markdown (md-style) 仅在 QQ 官bot 平台生效。')
    }
  }

  // 5. QQ 原生 Markdown 紧凑表格模式（md-table，仅在 QQ 官bot 平台生效）
  if (formats.includes('md-table')) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: md-table')
    if (session.platform === 'qq') {
      // 若刚发过 md-style，平滑等待 350ms 避开 QQ 网关瞬时并发频控
      if (hasSentMdStyle) {
        if (isVerbose) logger.info('[DEBUG] 等待 350ms 防抖缓冲...')
        await new Promise(resolve => setTimeout(resolve, 350))
      }
      try {
        await sendWeeklyQQMarkdown(ctx, session, config, detail, limit, 'md-table', stats)
      } catch (err: any) {
        logger.warn(`⚠️ 发送 QQ Markdown (md-table) 失败: ${err.message || err}`)
      }
    } else if (isExplicit && formats.length === 1) {
      await sendReply(session, config, '⚠️ QQ 原生 Markdown (md-table) 仅在 QQ 官bot 平台生效。')
    }
  }
}


