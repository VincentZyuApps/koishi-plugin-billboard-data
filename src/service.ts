import { Context } from 'koishi'
import type { Config, BillboardSource, DataSourceConfig } from './config'
import type { IndexData, WeeklyDetail, IssueMeta } from './types'
import { CrawlerManager } from './crawler'
import { CacheService } from './storage/cache'
import { LocalBackupService } from './storage/backup'
import { summarizeForLog } from './utils/log'

export class BillboardService {
  private crawlerManager: CrawlerManager
  public cacheService: CacheService
  public backupService: LocalBackupService

  private purgedUrls = new Set<string>()

  public lastApiDurationMs = 0
  public lastAttemptSourcesCount = 1

  constructor(private ctx: Context, private config: Config) {
    this.crawlerManager = new CrawlerManager(ctx, config)
    this.cacheService = new CacheService(ctx, config)
    this.backupService = new LocalBackupService(ctx, config)
  }

  private isGitHubUrl(url: string): boolean {
    return /^https?:\/\/(raw\.githubusercontent\.com|github\.com|gist\.githubusercontent\.com)/i.test(url)
  }

  private isJsdelivrUrl(url: string): boolean {
    return /^https?:\/\/cdn\.jsdelivr\.net\//i.test(url)
  }

  private async purgeJsdelivr(url: string): Promise<void> {
    if (!this.config.autoPurgeJsdelivr) return
    if (!this.isJsdelivrUrl(url)) return
    if (this.purgedUrls.has(url)) return

    const purgeUrl = url.replace('https://cdn.jsdelivr.net/', 'https://purge.jsdelivr.net/')
    this.purgedUrls.add(url)
    try {
      await this.ctx.http.get(purgeUrl, { timeout: 5000 })
      this.ctx.logger('billboard').debug(`⚡ 成功触发 jsDelivr purge 刷新: ${purgeUrl}`)
    } catch (err: any) {
      this.ctx.logger('billboard').debug(`⚡ 触发 jsDelivr purge 跳过: ${err.message || err}`)
    }
  }

  // 核心流水线调度器：遍历 dataSourceList 表格
  private async executePipeline<T>(
    operation: {
      type: 'static'
      path: string
    } | {
      type: 'crawler_latest'
      source: BillboardSource
    } | {
      type: 'crawler_issue'
      source: BillboardSource
      issue: number
    }
  ): Promise<T> {
    const startTime = Date.now()
    const pipeline: DataSourceConfig[] = this.config.dataSourceList && this.config.dataSourceList.length > 0
      ? this.config.dataSourceList.filter(s => s.enabled)
      : [
          { enabled: true, mode: 'crawler', network: 'proxy' },
          { enabled: true, mode: 'crawler', network: 'direct' },
          { enabled: true, mode: 'jsdelivr', network: 'proxy' },
          { enabled: true, mode: 'jsdelivr', network: 'direct' },
          { enabled: true, mode: 'github', network: 'ghproxy' },
          { enabled: true, mode: 'github', network: 'proxy' },
          { enabled: true, mode: 'github', network: 'direct' },
        ]

    const logger = this.ctx.logger('billboard')
    let lastErr: any = null
    let attempted = 0

    for (let i = 0; i < pipeline.length; i++) {
      attempted = i + 1
      const step = pipeline[i]

      // 1. 如果是本地爬虫
      if (step.mode === 'crawler') {
        if (operation.type === 'static') {
          continue
        }

        const proxy = (step.network === 'proxy' && this.config.enableCustomProxy && this.config.customProxyUrl?.trim())
          ? this.config.customProxyUrl.trim()
          : undefined

        try {
          let detail: WeeklyDetail
          if (operation.type === 'crawler_latest') {
            detail = await this.crawlerManager.fetchLatest(operation.source, proxy)
          } else {
            detail = await this.crawlerManager.fetchByIssue(operation.source, operation.issue, proxy)
          }

          this.lastApiDurationMs = Date.now() - startTime
          this.lastAttemptSourcesCount = attempted
          return detail as unknown as T
        } catch (err: any) {
          lastErr = err
          logger.warn(`本地爬虫 [${step.network === 'proxy' ? '代理' : '直连'}] 抓取失败: ${err.message || err}`)
          continue
        }
      }

      // 2. 如果是静态源 (jsdelivr 或 github)
      let baseUrl = ''
      const jsdPrefix = (this.config.customJsdelivrPrefix || 'https://cdn.jsdelivr.net').replace(/\/+$/, '')
      const ghPrefix = (this.config.customGithubRawPrefix || 'https://raw.githubusercontent.com').replace(/\/+$/, '')

      if (step.mode === 'jsdelivr') {
        baseUrl = `${jsdPrefix}/gh/VincentZyuApps/billboard-data@main/data`
      } else if (step.mode === 'github') {
        baseUrl = `${ghPrefix}/VincentZyuApps/billboard-data/main/data`
      }

      if (!baseUrl) continue

      let targetPath = ''
      if (operation.type === 'static') {
        targetPath = operation.path
      } else if (operation.type === 'crawler_issue') {
        targetPath = `${operation.source}/weekly/issue_${operation.issue}.json`
      } else {
        targetPath = `${operation.source}/index.json`
      }

      const fullUrl = `${baseUrl.replace(/\/+$/, '')}/${targetPath.replace(/^\/+/, '')}`
      await this.purgeJsdelivr(fullUrl)

      let requestUrl = fullUrl
      let requestProxy: string | undefined

      // ghproxy 仅对 GitHub 生效；若 jsdelivr 或其他模式误选 ghproxy，自动平滑回退为直连 (direct)
      if (step.network === 'ghproxy' && step.mode === 'github') {
        if (this.config.enableGhProxy && this.config.ghProxyPrefix?.trim()) {
          const prefix = this.config.ghProxyPrefix.trim().replace(/\/+$/, '')
          requestUrl = `${prefix}/${fullUrl}`
        }
      } else if (step.network === 'proxy') {
        if (this.config.enableCustomProxy && this.config.customProxyUrl?.trim()) {
          requestProxy = this.config.customProxyUrl.trim()
        }
      }

      try {
        const httpOptions: any = { timeout: 10000 }
        if (requestProxy) httpOptions.proxy = requestProxy

        let res = await this.ctx.http.get<any>(requestUrl, httpOptions)
        if (typeof res === 'string') {
          res = JSON.parse(res)
        }

        if (operation.type === 'crawler_latest') {
          const issues = res?.issues || []
          if (issues.length === 0) throw new Error('静态源 index.json 为空')
          const latestMeta = issues[0]
          const detailRel = latestMeta.path.replace(/^\/+/, '')
          const detailUrl = `${baseUrl.replace(/\/+$/, '')}/${operation.source}/${detailRel}`

          let reqDetailUrl = detailUrl
          if (step.network === 'ghproxy' && this.isGitHubUrl(detailUrl) && this.config.enableGhProxy && this.config.ghProxyPrefix?.trim()) {
            reqDetailUrl = `${this.config.ghProxyPrefix.trim().replace(/\/+$/, '')}/${detailUrl}`
          }

          let detailRes = await this.ctx.http.get<any>(reqDetailUrl, httpOptions)
          if (typeof detailRes === 'string') {
            detailRes = JSON.parse(detailRes)
          }
          detailRes.source = operation.source
          this.lastApiDurationMs = Date.now() - startTime
          this.lastAttemptSourcesCount = attempted
          return detailRes as unknown as T
        }

        if (operation.type === 'crawler_issue') {
          res.source = operation.source
        }

        this.lastApiDurationMs = Date.now() - startTime
        this.lastAttemptSourcesCount = attempted
        return res as T
      } catch (err: any) {
        lastErr = err
        const rawMsg = err?.message || String(err)
        const errMsg = rawMsg.length > 100 ? `${rawMsg.slice(0, 100)}... (truncated)` : rawMsg
        logger.warn(`静态源 [${step.mode}:${step.network}] 请求失败 (${requestUrl}): ${errMsg}`)
      }
    }

    this.lastApiDurationMs = Date.now() - startTime
    this.lastAttemptSourcesCount = attempted
    throw new Error(`所有配置的数据源及网络策略均请求失败: ${lastErr?.message || lastErr}`)
  }

  clearCache() {
    this.cacheService.clear()
    this.purgedUrls.clear()
  }

  async getIndex(source: BillboardSource): Promise<IndexData> {
    const data = await this.executePipeline<IndexData>({
      type: 'static',
      path: `${source}/index.json`,
    })
    data.source = source
    this.backupService.saveIndex(source, data)
    if (this.config.verboseConsoleLog) {
      this.ctx.logger('billboard').info(`[DEBUG] 成功获取 [${source}] index.json 索引:\n${JSON.stringify(summarizeForLog(data), null, 2)}`)
    }
    return data
  }

  async getWeekly(source: BillboardSource, issue: number, force = false): Promise<WeeklyDetail> {
    if (!force) {
      const cached = await this.cacheService.get(source, issue, false)
      if (cached) {
        this.lastApiDurationMs = 0
        this.lastAttemptSourcesCount = 1
        if (this.config.verboseConsoleLog) {
          this.ctx.logger('billboard').info(`[DEBUG] 命中缓存 [${source}] 第 ${issue} 期周榜数据:\n${JSON.stringify(summarizeForLog(cached), null, 2)}`)
        }
        return cached
      }
    }

    const detail = await this.executePipeline<WeeklyDetail>({
      type: 'crawler_issue',
      source,
      issue,
    })

    detail.source = source
    await this.cacheService.set(source, issue, detail, false)
    this.backupService.saveIssue(source, issue, detail)
    if (this.config.verboseConsoleLog) {
      this.ctx.logger('billboard').info(`[DEBUG] 成功抓取 [${source}] 第 ${issue} 期周榜数据:\n${JSON.stringify(summarizeForLog(detail), null, 2)}`)
    }
    return detail
  }

  async getLatest(source: BillboardSource, force = false): Promise<{ meta: IssueMeta; detail: WeeklyDetail }> {
    const detail = await this.executePipeline<WeeklyDetail>({
      type: 'crawler_latest',
      source,
    })

    detail.source = source
    await this.cacheService.set(source, detail.issue, detail, true)
    this.backupService.saveIssue(source, detail.issue, detail)

    const meta: IssueMeta = {
      issue: detail.issue,
      type: detail.type || 'weekly',
      opus_id: detail.opus_id || '',
      date: detail.date,
      week: detail.week,
      title: detail.title,
      total_ranked: detail.total_ranked || (detail.items ? detail.items.length : 0),
      source_url: detail.source_url || '',
      path: `weekly/issue_${detail.issue}.json`,
    }

    if (this.config.verboseConsoleLog) {
      this.ctx.logger('billboard').info(`[DEBUG] 成功获取 [${source}] 最新第 ${detail.issue} 期周榜数据:\n${JSON.stringify(summarizeForLog(detail), null, 2)}`)
    }

    return { meta, detail }
  }

  async searchSong(source: BillboardSource, keyword: string, checkRecentCount = 20): Promise<{
    source: BillboardSource
    songTitle: string
    records: { issue: number; rank: number; title: string; author?: string; bvid: string; url: string }[]
  }> {
    const index = await this.getIndex(source)
    const targetIssues = index.issues.slice(0, checkRecentCount)
    const lowerKw = keyword.trim().toLowerCase()

    const records: { issue: number; rank: number; title: string; author?: string; bvid: string; url: string }[] = []

    for (const meta of targetIssues) {
      try {
        const detail = await this.getWeekly(source, meta.issue)
        for (const item of detail.items) {
          const titleMatches = item.title.toLowerCase().includes(lowerKw)
          const authorMatches = item.author && item.author.toLowerCase().includes(lowerKw)
          if (titleMatches || authorMatches) {
            records.push({
              issue: meta.issue,
              rank: item.rank,
              title: item.title,
              author: item.author,
              bvid: item.bvid,
              url: item.url,
            })
          }
        }
      } catch (err) {
        // 忽略单个失败期数
      }
    }

    return {
      source,
      songTitle: keyword,
      records: records.sort((a, b) => b.issue - a.issue),
    }
  }
}
