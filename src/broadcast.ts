import { Context } from 'koishi'
import type { Config, BillboardSource, BroadcastTarget } from './config'
import type { BillboardService } from './service'
import { formatWeeklyText } from './format/text'
import { dispatchWeeklyOutput } from './format'

export function applyBroadcast(ctx: Context, config: Config, service: BillboardService) {
  if (!config.enableBroadcast || !config.broadcastTargets || config.broadcastTargets.length === 0) {
    return
  }

  const logger = ctx.logger('billboard')
  const lastKnownIssues: Record<BillboardSource, number> = {
    bilibili: 0,
    niconico: 0,
  }

  const sources: BillboardSource[] = config.broadcastSources && config.broadcastSources.length > 0
    ? config.broadcastSources
    : ['bilibili', 'niconico']

  const sendToTarget = async (
    target: BroadcastTarget,
    detail: any,
    src: BillboardSource,
    notice: string,
    modeTag: string
  ) => {
    if (!target.channelId) return
    const matchedBots = ctx.bots.filter(b => {
      if (b.platform !== target.platform) return false
      if (target.selfId && target.selfId.trim() && b.selfId !== target.selfId.trim()) return false
      return true
    })

    if (matchedBots.length === 0) {
      logger.warn(`[${modeTag} - ${src}] 未找到匹配的在线 Bot: platform=${target.platform}, selfId=${target.selfId || '*'}`)
      return
    }

    for (const bot of matchedBots) {
      try {
        if (typeof (bot as any).session === 'function') {
          const session = (bot as any).session({
            type: 'message',
            subtype: 'group',
            channelId: target.channelId,
            platform: target.platform,
            selfId: bot.selfId,
          })
          await dispatchWeeklyOutput(ctx, session, config, detail, config.defaultTop, config.showCover, undefined, undefined, notice)
        } else {
          const msg = formatWeeklyText(
            detail,
            config.defaultTop,
            config.showCover,
            config.textDetailedMode ?? 'standard',
            undefined,
            config.textShowRenderInfo ?? true,
            notice
          )
          await bot.sendMessage(target.channelId, msg)
        }
        logger.info(`[${modeTag} - ${src}] Bot(${bot.selfId}) 成功推送到 [${target.platform}:${target.channelId}]`)
      } catch (sendErr) {
        logger.warn(`[${modeTag} - ${src}] Bot(${bot.selfId}) 发送到 [${target.platform}:${target.channelId}] 失败: ${sendErr}`)
      }
    }
  }

  const checkAndBroadcastNew = async (src: BillboardSource) => {
    try {
      const latest = await service.getLatest(src)
      const currentIssue = latest.detail.issue
      if (currentIssue <= lastKnownIssues[src]) return

      logger.info(`[新榜突发广播 - ${src}] 检测到新一期发布！第 ${currentIssue} 期，准备广播...`)
      const detail = latest.detail
      const notice = config.broadcastIntervalText || '🎉 检测到本周最新术力口周榜出炉，第一时间为你抢鲜送达！'

      const activeTargets = (config.broadcastTargets || []).filter(t => t.enableNewCheck && t.channelId)
      for (const target of activeTargets) {
        await sendToTarget(target, detail, src, notice, '新榜广播')
      }
      lastKnownIssues[src] = currentIssue
    } catch (err: any) {
      logger.warn(`检查并广播 [${src}] 周榜异常: ${err.message || err}`)
    }
  }

  ctx.on('ready', async () => {
    // 初始化基线期数
    for (const src of sources) {
      try {
        const latest = await service.getLatest(src)
        lastKnownIssues[src] = latest.detail.issue
        logger.info(`[${src}] 周榜自动推送已启动，当前基线期数: 第 ${lastKnownIssues[src]} 期`)
      } catch (e) {
        logger.warn(`[${src}] 初始化周榜期数失败: ${e}`)
      }
    }

    // 1. Cron 专属定时回顾调度（到点即推最新榜单，不受新期数变动限制）
    if ((ctx as any).cron) {
      for (const target of (config.broadcastTargets || [])) {
        if (target.enableCronPush && target.cron?.trim() && target.channelId) {
          (ctx as any).cron(target.cron.trim(), async () => {
            for (const src of sources) {
              try {
                const latest = await service.getLatest(src)
                const notice = config.broadcastCronText || '📅 周末将至，一起来回顾本周三出炉的最新术力口周榜吧！'
                await sendToTarget(target, latest.detail, src, notice, 'Cron定时回顾')
              } catch (err: any) {
                logger.warn(`[Cron定时回顾 - ${src}] 获取并发送周榜异常: ${err.message || err}`)
              }
            }
          })
          logger.info(`[广播] 已成功为目标 [${target.platform}:${target.channelId}] 挂载 Cron 定时回顾: ${target.cron.trim()}`)
        }
      }
    }

    // 2. Interval 周期性轮询调度（仅在检测到新榜更新时推送给开启 enableNewCheck 的目标）
    ctx.setInterval(async () => {
      for (const src of sources) {
        await checkAndBroadcastNew(src)
      }
    }, config.checkInterval * 60 * 1000)
  })
}
