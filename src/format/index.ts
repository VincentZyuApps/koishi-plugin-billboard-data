import type { Session, Context } from 'koishi'
import { type Config, type OutputFormat, getEnabledPlatforms } from '../config'
import type { WeeklyDetail, RenderStats } from '../types'
import { sendReply } from '../utils/reply'
import { formatWeeklyText } from './text'
import { sendWeeklyForward } from './forward'
import { renderWeeklyTakumi } from './takumi'
import { renderWeeklyPuppeteer } from './puppeteer'
import { sendWeeklyQQMarkdown } from './markdown'
import { summarizeForLog } from '../utils/log'

export * from './text'
export * from './forward'
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
  overrideFormats?: OutputFormat[],
  broadcastNotice?: string
) {
  const logger = ctx.logger('billboard')
  const isVerbose = config.verboseConsoleLog
  const isExplicit = overrideFormats && overrideFormats.length > 0
  const formats = isExplicit
    ? overrideFormats!
    : (config.outputFormats || ['text', 'takumi', 'puppeteer', 'md-style', 'md-table'])

  if (isVerbose) {
    logger.info(`[DEBUG] dispatchWeeklyOutput 触发: platform=${session.platform}, channelId=${session.channelId}, formats=${JSON.stringify(formats)}, isExplicit=${Boolean(isExplicit)}, broadcastNotice=${Boolean(broadcastNotice)}`)
    logger.info(`[DEBUG] 周榜数据概要 (第 ${detail.issue} 期):\n${JSON.stringify(summarizeForLog(detail), null, 2)}`)
  }

  // 1. 纯文本输出
  if (formats.includes('text')) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: text')
    const textMsg = formatWeeklyText(
      detail,
      limit,
      Boolean((config.textShowCover ?? config.showCover ?? true) && showCover),
      config.textDetailedMode ?? 'standard',
      stats,
      config.textShowRenderInfo ?? true,
      broadcastNotice
    )
    await sendReply(session, config, textMsg)
  }

  // 2. Forward 合并转发输出
  if (formats.includes('forward')) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: forward')
    try {
      await sendWeeklyForward(ctx, session, config, detail, limit, stats, broadcastNotice)
    } catch (err: any) {
      logger.warn(`⚠️ 发送 Forward 合并转发失败: ${err.message || err}`)
    }
  }

  // 3. Takumi WASM 出图输出
  if (formats.includes('takumi')) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: takumi')
    try {
      const img = await renderWeeklyTakumi(ctx, config, detail, limit, showCover, stats, broadcastNotice)
      if (img) {
        await sendReply(session, config, img)
      }
    } catch (err: any) {
      logger.warn(`⚠️ Takumi 出图失败: ${err.message || err}`)
    }
  }

  // 4. Puppeteer 精美海报出图输出
  if (formats.includes('puppeteer')) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: puppeteer')
    try {
      const img = await renderWeeklyPuppeteer(ctx, config, detail, limit, showCover, stats, broadcastNotice)
      if (img) {
        await sendReply(session, config, img)
      }
    } catch (err: any) {
      logger.warn(`⚠️ Puppeteer 出图失败: ${err.message || err}`)
    }
  }

  // 5. QQ 原生 Markdown 卡片流式风格（md-style，仅在配置允许的平台生效）
  const currentPlatform = String(session.platform || '').trim().toLowerCase()
  const qqPlatforms = getEnabledPlatforms(config.qqMarkdownSupportedPlatforms)
  const allowedQQList = qqPlatforms.length > 0 ? qqPlatforms : ['qq']
  const isQQPlatform = allowedQQList.includes(currentPlatform)
  const qqPlatformName = allowedQQList.join(' / ')

  let hasSentMdStyle = false
  if (formats.includes('md-style')) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: md-style')
    if (isQQPlatform) {
      try {
        hasSentMdStyle = await sendWeeklyQQMarkdown(ctx, session, config, detail, limit, 'md-style', stats, broadcastNotice)
      } catch (err: any) {
        logger.warn(`⚠️ 发送 QQ Markdown (md-style) 失败: ${err.message || err}`)
      }
    } else if (isExplicit && formats.length === 1) {
      await sendReply(session, config, `⚠️ QQ 原生 Markdown (md-style) 仅在 ${qqPlatformName} 官bot 平台生效。`)
    }
  }

  // 6. QQ 原生 Markdown 紧凑表格模式（md-table，仅在配置允许的平台生效）
  if (formats.includes('md-table')) {
    if (isVerbose) logger.info('[DEBUG] 开始下发格式: md-table')
    if (isQQPlatform) {
      // 若刚发过 md-style，平滑等待 350ms 避开 QQ 网关瞬时并发频控
      if (hasSentMdStyle) {
        if (isVerbose) logger.info('[DEBUG] 等待 350ms 防抖缓冲...')
        await new Promise(resolve => setTimeout(resolve, 350))
      }
      try {
        await sendWeeklyQQMarkdown(ctx, session, config, detail, limit, 'md-table', stats, broadcastNotice)
      } catch (err: any) {
        logger.warn(`⚠️ 发送 QQ Markdown (md-table) 失败: ${err.message || err}`)
      }
    } else if (isExplicit && formats.length === 1) {
      await sendReply(session, config, `⚠️ QQ 原生 Markdown (md-table) 仅在 ${qqPlatformName} 官bot 平台生效。`)
    }
  }
}


