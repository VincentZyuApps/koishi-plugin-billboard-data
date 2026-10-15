import { Context } from 'koishi'
import type { Config, BillboardSource } from '../config'
import type { IndexData, WeeklyDetail } from '../types'
import type { CacheService } from './cache'
import type { LocalBackupService } from './backup'
import { summarizeForLog } from '../utils/log'

export class BackfillService {
  constructor(
    private ctx: Context,
    private config: Config,
    private cacheService: CacheService,
    private backupService: LocalBackupService,
  ) {}

  // 固定优先级链路：直连公网 gh-proxy -> 本地自定义代理 -> GitHub 直连 -> jsDelivr CDN 直连
  private getBackfillUrls(path: string): { desc: string; url: string; options: { timeout: number; proxy?: string } }[] {
    const rawGithub = `https://raw.githubusercontent.com/VincentZyuApps/billboard-data/main/data/${path.replace(/^\/+/, '')}`
    const jsdUrl = `https://cdn.jsdelivr.net/gh/VincentZyuApps/billboard-data@main/data/${path.replace(/^\/+/, '')}`

    const urls: { desc: string; url: string; options: { timeout: number; proxy?: string } }[] = []

    if (this.config.enableGhProxy && this.config.ghProxyPrefix?.trim()) {
      const prefix = this.config.ghProxyPrefix.trim().replace(/\/+$/, '')
      urls.push({
        desc: '公网 gh-proxy 加速',
        url: `${prefix}/${rawGithub}`,
        options: { timeout: 10000 },
      })
    }

    if (this.config.enableCustomProxy && this.config.customProxyUrl?.trim()) {
      urls.push({
        desc: '本地代理',
        url: rawGithub,
        options: { timeout: 10000, proxy: this.config.customProxyUrl.trim() },
      })
    }

    urls.push({
      desc: 'GitHub 直连',
      url: rawGithub,
      options: { timeout: 10000 },
    })

    urls.push({
      desc: 'jsDelivr CDN 直连',
      url: jsdUrl,
      options: { timeout: 10000 },
    })

    return urls
  }

  private async fetch<T>(path: string): Promise<T> {
    const attempts = this.getBackfillUrls(path)
    let lastErr: any = null

    for (const a of attempts) {
      try {
        const res = await this.ctx.http.get<T>(a.url, a.options)
        if (typeof res === 'string') {
          return JSON.parse(res) as T
        }
        return res
      } catch (err: any) {
        lastErr = err
      }
    }
    const rawLast = lastErr?.message || String(lastErr)
    const lastMsg = rawLast.length > 100 ? `${rawLast.slice(0, 100)}... (truncated)` : rawLast
    throw new Error(`回溯同步请求失败 [${path}]: ${lastMsg}`)
  }

  async runBackfill(): Promise<void> {
    if (!this.config.enableColdBootBackfill) return

    const logger = this.ctx.logger('billboard')
    logger.info('🚀 检测到开启冷启动全量回溯，正在从 GitHub 静态归档同步全量历史周榜数据...')

    const sources: BillboardSource[] = ['bilibili', 'niconico']

    for (const source of sources) {
      try {
        logger.info(`正在拉取 ${source} index.json...`)
        const index = await this.fetch<IndexData>(`${source}/index.json`)
        index.source = source
        this.backupService.saveIndex(source, index)
        if (this.config.verboseConsoleLog) {
          logger.info(`[DEBUG] ${source} index.json 索引概览:\n${JSON.stringify(summarizeForLog(index), null, 2)}`)
        }

        let count = 0
        for (const meta of index.issues) {
          try {
            const relPath = meta.path.replace(/^\/+/, '')
            const fullPath = `${source}/${relPath}`
            const detail = await this.fetch<WeeklyDetail>(fullPath)
            detail.source = source

            await this.cacheService.set(source, meta.issue, detail, meta === index.issues[0])
            this.backupService.saveIssue(source, meta.issue, detail)
            count++
          } catch (itemErr: any) {
            const rawItemMsg = itemErr?.message || String(itemErr)
            const itemMsg = rawItemMsg.length > 100 ? `${rawItemMsg.slice(0, 100)}... (truncated)` : rawItemMsg
            logger.debug(`回溯第 ${meta.issue} 期跳过: ${itemMsg}`)
          }
        }
        logger.info(`✅ 成功完成 ${source} 历史归档同步，共入库 ${count} 期周榜数据！`)
      } catch (err: any) {
        const rawMsg = err?.message || String(err)
        const errMsg = rawMsg.length > 100 ? `${rawMsg.slice(0, 100)}... (truncated)` : rawMsg
        logger.warn(`同步 ${source} 历史数据失败: ${errMsg}`)
      }
    }
  }
}
