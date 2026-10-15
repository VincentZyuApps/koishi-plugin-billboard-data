import type { Session, Context } from 'koishi'
import type { Config, QQMarkdownDetailedMode } from '../config'
import { type WeeklyDetail, type RenderStats, formatPublishTime, formatCount, formatDuration } from '../types'

function formatCoverUrl(url: string, w: number, h: number): string {
  let picUrl = url.trim()
  if (picUrl.startsWith('//')) {
    picUrl = 'https:' + picUrl
  } else if (picUrl.startsWith('http://')) {
    picUrl = 'https://' + picUrl.slice(7)
  }
  if (picUrl.includes('hdslb.com') && !picUrl.includes('@')) {
    picUrl += `@${w}w_${h}h_1c.jpg`
  }
  return picUrl
}

export function buildWeeklyQQMarkdown(
  detail: WeeklyDetail,
  limit: number,
  format: 'md-style' | 'md-table' = 'md-style',
  detailedMode: QQMarkdownDetailedMode = 'standard',
  stats?: RenderStats,
  showRenderInfo: boolean = false,
  showCover: boolean = true,
  coverWidth: number = 160,
  coverHeight: number = 90,
  broadcastNotice?: string
): string {
  const items = detail.items.slice(0, Math.min(limit, detail.items.length))
  const isNico = detail.source === 'niconico' || detail.title.includes('ニコニコ')
  const chartTitle = isNico ? 'ニコニコ VOCALOID SONGS TOP20' : 'Bili Board 术力口周榜'
  let md = `# 🎵【${chartTitle}】第 ${detail.issue} 期\n\n`
  if (broadcastNotice) {
    md += `> 📢 **广播提醒**：${broadcastNotice}\n>\n`
  }
  if (detail.title) {
    md += `> 📌 专栏原标题：[${detail.title}](${detail.source_url})\n>\n`
  }
  const timeStr = formatPublishTime(detail)
  const timeDesc = timeStr || detail.week ? `📅 ${timeStr} (第 ${detail.week || ''} 周) | ` : ''
  md += `> ${timeDesc}[🌐 查看原专栏](${detail.source_url})\n\n`

  const isSimple = detailedMode === 'simple'
  const w = coverWidth || 160
  const h = coverHeight || Math.round(w * 9 / 16) || 90

  if (format === 'md-style') {
    // 💫 流式卡片排版
    for (const item of items) {
      let rankBadge = `【TOP ${item.rank}】`
      if (item.rank === 1) rankBadge = '🥇 TOP 1'
      else if (item.rank === 2) rankBadge = '🥈 TOP 2'
      else if (item.rank === 3) rankBadge = '🥉 TOP 3'

      const playLink = item.bvid ? `[▶ 观看](${item.url || `https://www.bilibili.com/video/${item.bvid}`})` : ''
      md += `### ${rankBadge} ${item.title} ${playLink}\n`

      if (showCover && item.pic_url) {
        const picUrl = formatCoverUrl(item.pic_url, w, h)
        md += `\n![封面 #${w}px #${h}px](${picUrl})\n\n`
      } else {
        md += `\n`
      }

      if (!isSimple && item.video_meta) {
        // standard 详细排版
        const meta = item.video_meta
        const uploaderName = meta.uploader?.name || '未知'
        const dur = formatDuration(meta.duration)
        const s = meta.stat || ({} as any)
        if (meta.title) {
          md += `> 🎬 原视频标题: ${meta.title}\n`
        }
        md += `> 👤 视频上传者: **${uploaderName}** ｜ ⏱️ 时长: ${dur}\n`
        md += `> 📊 播放: ${formatCount(s.view)} · 弹幕: ${formatCount(s.danmaku)} · 点赞: ${formatCount(s.like)} · 投币: ${formatCount(s.coin)} · 收藏: ${formatCount(s.favorite)}\n\n`
      } else {
        // simple 极简排版或无元数据
        if (item.author) {
          md += `> 👤 作者: **${item.author}**\n`
        }
        if (item.bvid) {
          md += `> 🔗 BV: ${item.bvid}\n\n`
        } else {
          md += `\n`
        }
      }
    }
  } else {
    // 📊 表格排版
    if (isSimple) {
      // 极简三列表格（排名、歌曲名、跳转播放）
      md += `| 排名 | 歌曲名称 | 播放链接 |\n`
      md += `| :---: | :--- | :---: |\n`

      for (const item of items) {
        let rankBadge = `【TOP ${item.rank}】`
        if (item.rank === 1) rankBadge = '🥇 TOP 1'
        else if (item.rank === 2) rankBadge = '🥈 TOP 2'
        else if (item.rank === 3) rankBadge = '🥉 TOP 3'

        const playLink = item.bvid ? `[▶ 播放](https://www.bilibili.com/video/${item.bvid})` : (item.url ? `[▶ 播放](${item.url})` : '-')
        const safeTitle = item.title.replace(/\|/g, '&#124;')
        let songCol = safeTitle
        if (showCover && item.pic_url) {
          const picUrl = formatCoverUrl(item.pic_url, w, h)
          songCol = `![封面 #${w}px #${h}px](${picUrl})<br/>${safeTitle}`
        }
        md += `| ${rankBadge} | ${songCol} | ${playLink} |\n`
      }
    } else {
      // 详细四列表格（排名、歌曲与播放/原视频、创作者/UP主、时长与六维指标）
      md += `| 排名 | 歌曲与播放 | 创作者 / UP主 | 时长与数据指标 |\n`
      md += `| :---: | :--- | :--- | :--- |\n`

      for (const item of items) {
        let rankBadge = `【TOP ${item.rank}】`
        if (item.rank === 1) rankBadge = '🥇 TOP 1'
        else if (item.rank === 2) rankBadge = '🥈 TOP 2'
        else if (item.rank === 3) rankBadge = '🥉 TOP 3'

        const safeTitle = item.title.replace(/\|/g, '&#124;')
        const playLink = item.bvid ? `[▶ 播放](https://www.bilibili.com/video/${item.bvid})` : (item.url ? `[▶ 播放](${item.url})` : '')
        let songCol = playLink ? `**${safeTitle}** · ${playLink}` : `**${safeTitle}**`
        if (showCover && item.pic_url) {
          const picUrl = formatCoverUrl(item.pic_url, w, h)
          songCol = `![封面 #${w}px #${h}px](${picUrl})<br/>${songCol}`
        }
        if (item.video_meta?.title && item.video_meta.title !== item.title) {
          const safeMetaTitle = item.video_meta.title.replace(/\|/g, '&#124;')
          songCol += `<br/>🎬 原视频: ${safeMetaTitle}`
        }

        const authorName = item.video_meta?.uploader?.name || item.author || '-'
        const safeAuthor = authorName.replace(/\|/g, '&#124;')

        let metricCol = '-'
        if (item.video_meta) {
          const dur = formatDuration(item.video_meta.duration)
          const s = item.video_meta.stat || ({} as any)
          const statsList: string[] = []
          if (s.view) statsList.push(`👁️ ${formatCount(s.view)}`)
          if (s.danmaku) statsList.push(`💬 ${formatCount(s.danmaku)}`)
          if (s.like) statsList.push(`👍 ${formatCount(s.like)}`)
          if (s.coin) statsList.push(`🪙 ${formatCount(s.coin)}`)
          if (s.favorite) statsList.push(`⭐ ${formatCount(s.favorite)}`)

          const durStr = dur && dur !== '-' ? `⏱️ ${dur}` : ''
          const statStr = statsList.join(' · ')
          metricCol = durStr ? (statStr ? `${durStr}<br/>${statStr}` : durStr) : (statStr || '-')
        } else if (item.author) {
          metricCol = item.bvid ? `🔗 BV: ${item.bvid}` : '-'
        }

        md += `| ${rankBadge} | ${songCol} | ${safeAuthor} | ${metricCol} |\n`
      }
    }
  }


  const sourceCredit = isNico
    ? '> 💡 数据来源于 Bilibili @Elvansphere（Niconico Vocaloid Songs 周榜 TOP20 专栏）\n'
    : '> 💡 数据来源于 Bilibili @Bili-Board_Atel（Bilibili Vocaloid Songs 周榜 TOP20 专栏）\n'
  md += `\n${sourceCredit}> 💡 发送「周榜 [期数]」查看历史，发送「周榜.查歌 <歌名>」检索战绩\n`
  if (showRenderInfo && stats) {
    const totalMs = Date.now() - stats.commandStartTime
    md += `\n---\n> ⏱️ API 请求: ${stats.apiDurationMs}ms (尝试源: ${stats.attemptSourcesCount}) | 📊 总耗时: ${totalMs}ms\n`
  }
  return md
}

export async function sendWeeklyQQMarkdown(
  ctx: Context,
  session: Session,
  config: Config,
  detail: WeeklyDetail,
  limit: number,
  format: 'md-style' | 'md-table' = 'md-style',
  stats?: RenderStats,
  broadcastNotice?: string
): Promise<boolean> {
  const logger = ctx.logger('billboard')
  const isVerbose = config.verboseConsoleLog

  if (session.platform !== 'qq') {
    if (isVerbose) {
      logger.info(`[DEBUG] sendWeeklyQQMarkdown 忽略: 当前会话平台为 ${session.platform}，非 qq`)
    }
    return false
  }

  const detailedMode = config.qqMarkdownDetailedMode ?? 'standard'
  const showRenderInfo = config.qqMarkdownShowRenderInfo ?? true
  const showCover = config.qqMarkdownShowCover ?? true
  const coverWidth = config.qqMarkdownCoverWidth ?? 160
  const coverHeight = config.qqMarkdownCoverHeight ?? 90
  const content = buildWeeklyQQMarkdown(detail, limit, format, detailedMode, stats, showRenderInfo, showCover, coverWidth, coverHeight, broadcastNotice)

  // 挂载在 session 上的递增序号，结合秒级时间戳取模 100,000 作为安全正整数初始基准
  const msgSeq = ((session as any)._qqMsgSeq = (((session as any)._qqMsgSeq ?? (Math.floor(Date.now() / 1000) % 100000)) + 1))

  const payload: any = {
    msg_type: 2,
    markdown: { content },
  }

  if (session.messageId) {
    const now = Date.now()
    const msgTime = session.timestamp ?? now
    // 5 分钟内被动回复有效
    if (now - msgTime < 300000) {
      payload.msg_id = session.messageId
      payload.msg_seq = msgSeq
    } else if (isVerbose) {
      logger.info(`[DEBUG] 被动回复超时 (>5min): now=${now}, msgTime=${msgTime}`)
    }
  }

  if (isVerbose) {
    logger.info(`[DEBUG] 开始发送 QQ 原生 Markdown (${format}): channelId=${session.channelId}, msg_id=${payload.msg_id}, msg_seq=${payload.msg_seq}, content_length=${content.length}`)
    logger.info(`[DEBUG] QQ Markdown (${format}) Payload:\n${JSON.stringify({ ...payload, markdown: { content: content.slice(0, 300) + '... (truncated)' } }, null, 2)}`)
  }

  try {
    const bot = session.bot as any
    const qq = (session as any).qq
    let resp: any

    if (qq?.sendPrivateMessage && session.isDirect) {
      if (isVerbose) logger.info(`[DEBUG] 使用通道: session.qq.sendPrivateMessage`)
      resp = await qq.sendPrivateMessage(session.channelId, payload)
    } else if (qq?.sendMessage) {
      if (isVerbose) logger.info(`[DEBUG] 使用通道: session.qq.sendMessage`)
      resp = await qq.sendMessage(session.channelId, payload)
    } else if (bot?.internal?.sendMessage) {
      if (isVerbose) logger.info(`[DEBUG] 使用通道: bot.internal.sendMessage`)
      resp = await bot.internal.sendMessage(session.channelId, payload)
    } else {
      if (isVerbose) logger.info(`[DEBUG] 使用兜底通道: session.send({ type: 'markdown' })`)
      resp = await session.send({
        type: 'markdown',
        attrs: { content },
      } as any)
    }

    if (isVerbose) {
      logger.info(`[DEBUG] ✅ QQ 原生 Markdown (${format}) 发送成功: %o`, resp)
    }
    return true
  } catch (err: any) {
    const errData = err?.response?.data
    const errMsg = errData ? (typeof errData === 'object' ? JSON.stringify(errData) : errData) : (err.message || err)
    logger.warn(`⚠️ QQ 原生 Markdown (${format}) 发送失败 (msg_seq=${payload.msg_seq}): ${errMsg}`)
    if (isVerbose && err.stack) {
      logger.warn(`[DEBUG] 异常堆栈: ${err.stack}`)
    }
    return false
  }
}


