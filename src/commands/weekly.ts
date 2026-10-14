import { Context } from 'koishi'
import type { Config, BillboardSource, OutputFormat } from '../config'
import type { BillboardService } from '../service'
import { dispatchWeeklyOutput } from '../format'
import { sendReply } from '../utils/reply'

function normalizeOutputFormat(raw?: string): OutputFormat | undefined {
  if (!raw) return undefined
  const s = String(raw).trim().toLowerCase()
  if (['text', 'txt'].includes(s)) return 'text'
  if (['takumi', 'wasm'].includes(s)) return 'takumi'
  if (['puppeteer', 'pptr', 'web'].includes(s)) return 'puppeteer'
  if (['md-style', 'mdstyle', 'style', 'card'].includes(s)) return 'md-style'
  if (['md-table', 'mdtable', 'table'].includes(s)) return 'md-table'
  return undefined
}

export function registerWeeklyCommand(ctx: Context, config: Config, service: BillboardService) {
  const logger = ctx.logger('billboard')

  ctx.command('周榜 [issue:number]', '🎵 查看 VOCALOID 术力口周榜')
    .alias('术力口周榜', 'bb')
    .usage([
      '快捷指令速查：',
      '  bb [期数]         查看最新或指定期数周榜 (默认按配置数据源与多选输出格式)',
      '  bb -s bili [期数] 查看 B站本土 Bili Board 周榜',
      '  bb -s nico [期数] 查看 日本 N站 Billboard TOP20 周榜',
      '  bb -f <格式>      临时指定单一输出格式 (text/takumi/pptr/md-style/md-table)',
      '  周榜b / bbb [期数] 快捷直达 B站周榜',
      '  周榜n / nbb [期数] 快捷直达 N站周榜',
      '  bb.text           仅输出纯文本格式周榜',
      '  bb.takumi         仅输出 Takumi WASM 看板图片',
      '  bb.pptr           仅输出 Puppeteer 网页海报图片',
      '  bb.md-style       仅输出 QQ 原生 Markdown 流式卡片 (仅限 QQ 官bot 平台)',
      '  bb.md-table       仅输出 QQ 原生 Markdown 紧凑表格 (仅限 QQ 官bot 平台)',
      '  bb.history        查看最近收录的周榜期数一览',
      '  bb.search <歌名>  在近期周榜中搜索歌曲排位战绩',
      '  bb.reload         强制刷新远程数据缓存',
      '  bb.help           查看周榜帮助说明',
    ].join('\n'))
    .option('source', '-s, --source <source:string> 指定数据源 (bilibili/bili 或 niconico/nico)')
    .option('format', '-f, --format <format:string> 临时指定输出格式 (text, takumi, puppeteer/pptr, md-style, md-table)')
    .option('limit', '-n <limit:number> 展示排名前几位', { fallback: config.defaultTop })
    .option('cover', '-c, --cover <cover:string> 是否展示封面图 (y/n/yes/no/t/f/true/false)')
    .action(async ({ session, options }, targetIssue) => {
      const commandStartTime = Date.now()

      // 1. 解析数据源: 优先命令行选项 -s，否则严格从 config.defaultSource 获取
      let source: BillboardSource = config.defaultSource
      if (options?.source) {
        const s = String(options.source).trim().toLowerCase()
        if (s === 'bili' || s === 'bilibili') {
          source = 'bilibili'
        } else if (s === 'nico' || s === 'niconico') {
          source = 'niconico'
        } else {
          await sendReply(session, config, `❌ 不支持的数据源「${options.source}」，仅支持 bilibili 或 niconico`)
          return
        }
      }

      if (!source) {
        throw new Error('未在配置中指定 defaultSource 且未提供 -s 参数')
      }

      // 2. 解析单一输出格式覆盖选项 -f
      let overrideFormats: OutputFormat[] | undefined
      if (options?.format) {
        const parsed = normalizeOutputFormat(options.format)
        if (!parsed) {
          await sendReply(session, config, `❌ 不支持的输出格式「${options.format}」，支持: text, takumi, puppeteer, md-style, md-table`)
          return
        }
        overrideFormats = [parsed]
      }

      const limit = Math.max(1, Math.min(20, options?.limit || config.defaultTop))
      let showCover = config.showCover
      if (options?.cover !== undefined && options?.cover !== null) {
        const val = String(options.cover).trim().toLowerCase()
        if (['y', 'yes', 't', 'true'].includes(val)) {
          showCover = true
        } else if (['n', 'no', 'f', 'false'].includes(val)) {
          showCover = false
        }
      }

      let waitingHintMsgId: string | undefined
      if (config.enableWaitingHint && session) {
        try {
          const sent = await sendReply(session, config, '🎨 正在获取并渲染周榜数据，请稍候... ⏳')
          waitingHintMsgId = Array.isArray(sent) ? sent[0] : (typeof sent === 'string' ? sent : undefined)
        } catch {}
      }

      try {
        let detail
        if (targetIssue) {
          detail = await service.getWeekly(source, targetIssue)
        } else {
          const res = await service.getLatest(source)
          detail = res.detail
        }

        const stats = {
          apiDurationMs: service.lastApiDurationMs,
          attemptSourcesCount: service.lastAttemptSourcesCount,
          commandStartTime,
        }

        await dispatchWeeklyOutput(ctx, session, config, detail, limit, showCover, stats, overrideFormats)
      } catch (err: any) {
        logger.error(err)
        await sendReply(session, config, `❌ 获取周榜数据失败: ${err.message || err}`)
      } finally {
        if (waitingHintMsgId && session?.bot?.deleteMessage && session?.channelId) {
          try {
            await session.bot.deleteMessage(session.channelId, waitingHintMsgId)
          } catch {}
        }
      }
    })

  // 快捷指令：周榜b / bbb (重定向至 bb -s bilibili)
  ctx.command('周榜b [issue:number]', '📺 查看 Bili Board 术力口周榜 (B站本土榜单)')
    .alias('bbb')
    .action(async ({ session }, targetIssue) => {
      if (!session) return
      const arg = targetIssue ? ` ${targetIssue}` : ''
      return await session.execute(`bb -s bilibili${arg}`)
    })

  // 快捷指令：周榜n / nbb (重定向至 bb -s niconico)
  ctx.command('周榜n [issue:number]', '🎵 查看 ニコニコ VOCALOID SONGS TOP20 (日本N站榜单)')
    .alias('nbb')
    .action(async ({ session }, targetIssue) => {
      if (!session) return
      const arg = targetIssue ? ` ${targetIssue}` : ''
      return await session.execute(`bb -s niconico${arg}`)
    })

  // 5 大输出格式的子指令 (全部使用 session.execute 重定向至 bb -f <format>)
  const FORMAT_SUBCOMMANDS: { name: string; format: OutputFormat; desc: string; aliases: string[] }[] = [
    { name: 'text', format: 'text', desc: '📝 仅以纯文本格式查看周榜', aliases: ['bb.text', '周榜文本'] },
    { name: 'takumi', format: 'takumi', desc: '⚡ 仅以 Takumi WASM 极速看板出图查看周榜', aliases: ['bb.takumi', '周榜takumi'] },
    { name: 'pptr', format: 'puppeteer', desc: '🎨 仅以 Puppeteer 网页精美海报出图查看周榜', aliases: ['bb.pptr', 'bb.puppeteer', '周榜海报'] },
    { name: 'md-style', format: 'md-style', desc: '💫 仅以 QQ 原生 Markdown 流式卡片查看周榜 (仅限 QQ 官bot 平台)', aliases: ['bb.md-style', '周榜卡片'] },
    { name: 'md-table', format: 'md-table', desc: '📊 仅以 QQ 原生 Markdown 紧凑表格查看周榜 (仅限 QQ 官bot 平台)', aliases: ['bb.md-table', '周榜表格'] },
  ]

  for (const sub of FORMAT_SUBCOMMANDS) {
    ctx.command(`周榜.${sub.name} [issue:number]`, sub.desc)
      .alias(...sub.aliases)
      .option('source', '-s, --source <source:string> 指定数据源')
      .option('limit', '-n <limit:number> 展示前几名')
      .action(async ({ session, options }, targetIssue) => {
        if (!session) return
        const opts: string[] = [`-f ${sub.format}`]
        if (options?.source) opts.push(`-s ${options.source}`)
        if (options?.limit) opts.push(`-n ${options.limit}`)
        const issueArg = targetIssue ? ` ${targetIssue}` : ''
        return await session.execute(`bb ${opts.join(' ')}${issueArg}`)
      })
  }

  ctx.command('周榜.帮助', '❓ 查看周榜相关指令与选项帮助 (bb.help)')
    .alias('周榜帮助', 'bb.help')
    .action(async ({ session }) => {
      if (!session) return
      return await session.execute('bb -h')
    })
}
