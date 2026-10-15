import { h } from 'koishi'
import { type WeeklyDetail, type RenderStats, formatPublishTime, formatCount, formatDuration } from '../types'
import type { Config } from '../config'

export function formatWeeklyText(
  detail: WeeklyDetail,
  limit: number,
  showCover: boolean,
  detailedMode: 'standard' | 'simple' = 'standard',
  stats?: RenderStats,
  showRenderInfo: boolean = true,
  broadcastNotice?: string
) {
  const isDetailed = detailedMode === 'standard'
  const items = detail.items.slice(0, Math.min(limit, detail.items.length))
  const lines: string[] = []

  const isNico = detail.source === 'niconico' || detail.title.includes('ニコニコ')
  const chartTitle = isNico ? 'ニコニコ VOCALOID SONGS TOP20' : 'Bili Board 术力口周榜'

  lines.push(`🎵【${chartTitle}】第 ${detail.issue} 期`)
  if (broadcastNotice) {
    lines.push(`📢 [广播推送] ${broadcastNotice}`)
  }
  if (detail.title) {
    lines.push(`📌 专栏原标题: ${detail.title}`)
  }
  const timeStr = formatPublishTime(detail)
  if (timeStr || detail.week) {
    lines.push(`📅 时间: ${timeStr} (第 ${detail.week || ''} 周)`)
  }
  lines.push(`🔗 专栏: ${detail.source_url}`)
  lines.push('━━━━━━━━━━━━━━━')

  for (const item of items) {
    let medal = `【TOP ${item.rank}】`
    if (item.rank === 1) medal = '🥇【TOP 1】'
    else if (item.rank === 2) medal = '🥈【TOP 2】'
    else if (item.rank === 3) medal = '🥉【TOP 3】'

    const titleLine = item.author ? `${item.title} / ${item.author}` : item.title
    lines.push(`${medal} ${titleLine}`)
    if (item.prev_rank || item.weeks) {
      lines.push(`   📊 上周: ${item.prev_rank || '-'} | 在榜周数: ${item.weeks || 1}周`)
    }
    if (item.bvid) {
      lines.push(`   ▶ https://bilibili.com/video/${item.bvid}`)
    }

    if (isDetailed && item.video_meta) {
      const meta = item.video_meta
      if (meta.title) {
        lines.push(`   🎬 原视频标题: ${meta.title}`)
      }
      const uploaderName = meta.uploader?.name || '未知'
      const dur = formatDuration(meta.duration)
      lines.push(`   👤 视频上传者: ${uploaderName} (${dur})`)

      if (meta.stat) {
        const s = meta.stat
        lines.push(
          `   📊 播放:${formatCount(s.view)} 弹幕:${formatCount(s.danmaku)} 点赞:${formatCount(s.like)} 投币:${formatCount(s.coin)} 收藏:${formatCount(s.favorite)}`
        )
      }
    }

    lines.push('----------')
  }

  lines.push('━━━━━━━━━━━━━━━')
  const sourceCredit = isNico
    ? '💡 数据来源于 Bilibili @Elvansphere（Niconico Vocaloid Songs 周榜 TOP20 专栏）'
    : '💡 数据来源于 Bilibili @Bili-Board_Atel（Bilibili Vocaloid Songs 周榜 TOP20 专栏）'
  lines.push(sourceCredit)
  lines.push(`💡 发送「周榜 [期数]」查看历史，发送「周榜.查歌 <歌名>」检索战绩`)

  if (showRenderInfo && stats) {
    const totalMs = Date.now() - stats.commandStartTime
    lines.push('====================')
    lines.push(`⏱️ API 请求: ${stats.apiDurationMs}ms (尝试源: ${stats.attemptSourcesCount}) | 📊 总耗时: ${totalMs}ms`)
  }

  const textPart = lines.join('\n')

  if (showCover && items.length > 0 && items[0].pic_url) {
    return [h.image(items[0].pic_url), h.text(textPart)]
  }

  return textPart
}
