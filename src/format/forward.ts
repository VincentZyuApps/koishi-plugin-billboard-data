import type { Session, Context } from 'koishi'
import { h } from 'koishi'
import { type Config, type ForwardDetailedMode, getEnabledPlatforms } from '../config'
import { type WeeklyDetail, type RenderStats, formatPublishTime, formatCount, formatDuration } from '../types'
import { sendReply } from '../utils/reply'

function escapeAttr(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function addForwardNode(authorId: string | undefined, authorName: string, content: string): string {
  const authorAttr = authorId ? ` id="${escapeAttr(authorId)}"` : ''
  return `  <message>\n    <author${authorAttr} name="${escapeAttr(authorName)}"/>\n    ${content}\n  </message>`
}

export function buildWeeklyForward(
  detail: WeeklyDetail,
  limit: number,
  botSelf?: { userId?: string; username?: string; name?: string },
  detailedMode: ForwardDetailedMode = 'standard',
  showCover: boolean = true,
  stats?: RenderStats,
  showRenderInfo: boolean = true
): string {
  const items = detail.items.slice(0, Math.min(limit, detail.items.length))
  const isNico = detail.source === 'niconico' || detail.title.includes('ニコニコ')
  const chartTitle = isNico ? 'ニコニコ VOCALOID SONGS TOP20' : 'Bili Board 术力口周榜'
  const botId = botSelf?.userId
  const botName = botSelf?.username || botSelf?.name || '术力口周榜'

  const nodes: string[] = []

  // 1. 头节点：周榜概览
  const timeStr = formatPublishTime(detail)
  const timeDesc = timeStr ? `${timeStr}${detail.week ? ` (第 ${detail.week} 周)` : ''}` : ''
  const headLines: string[] = [
    `🎵【${chartTitle}】第 ${detail.issue} 期`,
  ]
  if (detail.title) {
    headLines.push(`📌 专栏原标题：${detail.title}`)
  }
  if (timeDesc) {
    headLines.push(`📅 发榜时间：${timeDesc}`)
  }
  if (detail.source_url) {
    headLines.push(`🌐 专栏链接：${detail.source_url}`)
  }
  headLines.push(isNico
    ? `💡 数据来源：Bilibili @Elvansphere（Niconico Vocaloid Songs 周榜 TOP20 专栏）`
    : `💡 数据来源：Bilibili @Bili-Board_Atel（Bilibili Vocaloid Songs 周榜 TOP20 专栏）`
  )
  nodes.push(addForwardNode(botId, botName, headLines.map(escapeText).join('\n')))

  // 2. 歌曲节点：每一首 TOP 歌曲独立为一个节点
  const isSimple = detailedMode === 'simple'
  for (const item of items) {
    let rankBadge = `【TOP ${item.rank}】`
    if (item.rank === 1) rankBadge = '🥇 TOP 1'
    else if (item.rank === 2) rankBadge = '🥈 TOP 2'
    else if (item.rank === 3) rankBadge = '🥉 TOP 3'

    const nodeTitle = `${rankBadge} ${item.title}`
    const lines: string[] = [`${nodeTitle}`]

    if (!isSimple && item.video_meta) {
      const meta = item.video_meta
      const uploaderName = meta.uploader?.name || '未知'
      const dur = formatDuration(meta.duration)
      const s = meta.stat || ({} as any)

      if (meta.title && meta.title !== item.title) {
        lines.push(`🎬 原视频: ${meta.title}`)
      }
      lines.push(`👤 UP主: ${uploaderName} ｜ ⏱️ 时长: ${dur}`)
      lines.push(`📊 播放: ${formatCount(s.view)} · 弹幕: ${formatCount(s.danmaku)} · 点赞: ${formatCount(s.like)} · 投币: ${formatCount(s.coin)} · 收藏: ${formatCount(s.favorite)}`)
    } else if (item.author) {
      lines.push(`👤 作者: ${item.author}`)
    }

    if (item.bvid) {
      lines.push(`🔗 播放: https://www.bilibili.com/video/${item.bvid}`)
    } else if (item.url) {
      lines.push(`🔗 链接: ${item.url}`)
    }

    let nodeContent = lines.map(escapeText).join('\n')

    if (showCover && item.pic_url) {
      let picUrl = item.pic_url.trim()
      if (picUrl.startsWith('//')) {
        picUrl = 'https:' + picUrl
      } else if (picUrl.startsWith('http://')) {
        picUrl = 'https://' + picUrl.slice(7)
      }
      nodeContent += `\n<img src="${escapeAttr(picUrl)}"/>`
    }

    nodes.push(addForwardNode(botId, nodeTitle, nodeContent))
  }

  // 3. 尾节点：指令检索战绩与统计
  const footLines: string[] = [
    `💡 发送「周榜 [期数]」查看历史，发送「周榜.查歌 <歌名>」检索战绩`,
  ]
  if (showRenderInfo && stats) {
    const totalMs = Date.now() - stats.commandStartTime
    footLines.push(`⏱️ API 请求: ${stats.apiDurationMs}ms (尝试源: ${stats.attemptSourcesCount}) | 📊 总耗时: ${totalMs}ms`)
  }
  nodes.push(addForwardNode(botId, botName, footLines.map(escapeText).join('\n')))

  return `<message forward>\n${nodes.join('\n')}\n</message>`
}

export function isForwardPlatformAllowed(
  config: Pick<Config, 'restrictForwardPlatforms' | 'forwardSupportedPlatforms'>,
  platform?: string
): boolean {
  if (!config.restrictForwardPlatforms) return true
  const list = getEnabledPlatforms(config.forwardSupportedPlatforms)
  return list.includes(String(platform || '').trim().toLowerCase())
}

export async function sendWeeklyForward(
  ctx: Context,
  session: Session,
  config: Config,
  detail: WeeklyDetail,
  limit: number,
  stats?: RenderStats
): Promise<boolean> {
  const logger = ctx.logger('billboard')
  const platform = session.platform || ''

  if (!isForwardPlatformAllowed(config, platform)) {
    if (config.verboseConsoleLog) {
      logger.info(`[DEBUG] sendWeeklyForward 跳过: 平台 ${platform} 不在 forward 允许列表中`)
    }
    return false
  }

  const detailedMode = config.forwardDetailedMode ?? 'standard'
  const showCover = config.forwardShowCover ?? true
  const showRenderInfo = config.textShowRenderInfo ?? true
  const xml = buildWeeklyForward(detail, limit, session.bot, detailedMode, showCover, stats, showRenderInfo)

  await session.send(h.unescape(xml))
  return true
}
