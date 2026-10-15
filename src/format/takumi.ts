import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { container, text, image, type Node } from '@takumi-rs/helpers'
import type { Context } from 'koishi'
import { h } from 'koishi'
import type { Config } from '../config'
import { type WeeklyDetail, type RenderStats, formatPublishTime, formatCount, formatDuration } from '../types'
import { ensureLxgwFont } from '../utils/font'

const nodeRequire = createRequire(
  typeof __filename === 'string' ? __filename : join(process.cwd(), 'index.js')
)
const takumiModule: typeof import('@takumi-rs/wasm/node') = nodeRequire('@takumi-rs/wasm/node')

const WIDTH = 840
const PADDING = 16
const CONTENT_WIDTH = WIDTH - PADDING * 2 // 808
const CARD_PADDING = 16
const INNER_WIDTH = CONTENT_WIDTH - CARD_PADDING * 2 // 776

const palette = {
  biliBlue: '#00AEEC',
  biliPink: '#FB7299',
  biliPinkLight: '#FFF0F5',
  biliBlueLight: '#E8F7FD',
  // 更加璀璨鲜亮的金、银、铜勋章与主题色
  gold: '#F59E0B',
  goldBg: '#FEF3C7',
  goldBorder: '#FCD34D',
  goldText: '#B45309',
  silver: '#64748B',
  silverBg: '#F1F5F9',
  silverBorder: '#CBD5E1',
  silverText: '#475569',
  bronze: '#EA580C',
  bronzeBg: '#FFEDD5',
  bronzeBorder: '#FDBA74',
  bronzeText: '#C2410C',
  bg: '#F4F5F7',
  cardBg: '#FFFFFF',
  textMain: '#18191C',
  textSub: '#61666D',
  textMuted: '#9499A0',
  border: '#E3E5E7',
}

async function loadFontBuffer(ctx: Context, config: Config): Promise<Uint8Array | null> {
  const logger = ctx.logger('billboard')
  if (config.takumiFontMode === 'none') {
    return null
  }

  if (config.takumiFontMode === 'custom' && config.takumiCustomFontPath?.trim()) {
    const customPath = config.takumiCustomFontPath.trim()
    if (existsSync(customPath)) {
      try {
        return readFileSync(customPath)
      } catch (err: any) {
        logger.warn(`⚠️ 加载自定义字体失败 (${customPath}): ${err.message || err}`)
      }
    } else {
      logger.warn(`⚠️ 自定义字体文件不存在: ${customPath}`)
    }
  }

  // 默认 release 模式
  try {
    const fontPath = await ensureLxgwFont(ctx)
    if (existsSync(fontPath)) {
      return readFileSync(fontPath)
    }
  } catch (err: any) {
    logger.warn(`⚠️ 获取 LXGW 字体失败: ${err.message || err}`)
  }

  return null
}

async function fetchImageBuffer(ctx: Context, url?: string): Promise<Uint8Array | null> {
  if (!url) return null
  try {
    const res = await ctx.http.get(url, { responseType: 'arraybuffer', timeout: 10000 })
    return new Uint8Array(res)
  } catch {
    return null
  }
}

function truncateText(str: string, maxLength: number = 42): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

function calculateCoverHeight(buffer: Uint8Array): number {
  try {
    const imageSize = nodeRequire('image-size')
    const dim = imageSize(buffer)
    if (dim && dim.width && dim.height) {
      return Math.min(420, Math.round((INNER_WIDTH * dim.height) / dim.width))
    }
  } catch {}
  return 360
}

function renderAvatarFallback(initial: string, size: number = 24): Node {
  return container({
    style: {
      width: size,
      height: size,
      borderRadius: Math.round(size / 2),
      backgroundColor: '#E3E5E7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    children: [
      text(initial || '?', {
        fontSize: Math.round(size * 0.55),
        fontWeight: 600,
        color: '#61666D',
      }),
    ],
  })
}

function renderAvatar(buffer: Uint8Array | null, initial: string, size: number = 24): Node {
  if (buffer) {
    return container({
      style: {
        width: size,
        height: size,
        borderRadius: Math.round(size / 2),
        overflow: 'hidden',
        marginRight: 8,
        display: 'flex',
      },
      children: [
        image({
          src: buffer,
          width: size,
          height: size,
          style: {
            width: size,
            height: size,
            borderRadius: Math.round(size / 2),
            objectFit: 'cover',
          },
        }),
      ],
    })
  }
  return renderAvatarFallback(initial, size)
}

export async function renderWeeklyTakumi(
  ctx: Context,
  config: Config,
  detail: WeeklyDetail,
  limit: number,
  showCover: boolean,
  stats?: RenderStats,
  broadcastNotice?: string
) {
  const fontBuffer = await loadFontBuffer(ctx, config)
  const renderer = new takumiModule.Renderer(fontBuffer ? { fonts: [fontBuffer] } : {})

  const items = detail.items.slice(0, Math.min(limit, detail.items.length))
  const showDetailed = (config.takumiDetailedMode ?? 'standard') === 'standard'

  // 并发加载封面图与上传者头像
  const coverPromises = items.map(async (item, index) => {
    if (!showCover || !item.pic_url) return null
    if (index === 0) {
      return await fetchImageBuffer(ctx, item.pic_url)
    }
    if (config.takumiShowAllCovers) {
      return await fetchImageBuffer(ctx, item.pic_url)
    }
    return null
  })

  const avatarPromises = items.map(async (item) => {
    if (!showDetailed || !item.video_meta?.uploader?.face) return null
    return await fetchImageBuffer(ctx, item.video_meta.uploader.face)
  })

  const [itemCovers, itemAvatars] = await Promise.all([
    Promise.all(coverPromises),
    Promise.all(avatarPromises),
  ])

  const top1CoverBuffer = itemCovers[0] || null
  const rootChildren: Node[] = []

  const isNico = detail.source === 'niconico' || detail.title.includes('ニコニコ')
  const chartTitle = isNico ? 'ニコニコ VOCALOID TOP20' : 'Bili Board 术力口周榜'

  // 1. 顶部 Header
  rootChildren.push(
    container({
      style: {
        width: CONTENT_WIDTH,
        backgroundColor: palette.cardBg,
        borderRadius: 14,
        padding: '12px 18px',
        marginBottom: 8,
        border: `1px solid ${palette.border}`,
        display: 'flex',
        flexDirection: 'column',
      },
      children: [
        container({
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          },
          children: [
            text(chartTitle, {
              fontSize: 24,
              fontWeight: 600,
              color: palette.biliBlue,
            }),
            container({
              style: {
                backgroundColor: palette.biliPink,
                padding: '3px 10px',
                borderRadius: 10,
              },
              children: [
                text(`第 ${detail.issue} 期`, {
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#FFFFFF',
                }),
              ],
            }),
          ],
        }),
        text(`发布时间: ${formatPublishTime(detail)} · 第 ${detail.week || ''} 周`, {
          fontSize: 12.5,
          fontWeight: 400,
          color: palette.textSub,
        }),
      ],
    })
  )

  // 1.1 若存在广播文案，渲染订阅广播通知横幅
  if (broadcastNotice) {
    rootChildren.push(
      container({
        style: {
          width: CONTENT_WIDTH,
          backgroundColor: '#EFF6FF',
          borderRadius: 10,
          padding: '8px 16px',
          marginBottom: 8,
          border: '1px solid #BFDBFE',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        },
        children: [
          text(`📢 [订阅广播] ${broadcastNotice}`, {
            fontSize: 13,
            fontWeight: 600,
            color: '#1D4ED8',
            lineHeight: 18,
          }),
        ],
      })
    )
  }

  // 2. TOP 1 冠军展示卡片
  if (items.length > 0) {
    const top1 = items[0]
    const top1Avatar = itemAvatars[0]
    const top1Inner: Node[] = []

    // 冠军胶囊 & BV
    top1Inner.push(
      container({
        style: {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        },
        children: [
          container({
            style: {
              backgroundColor: palette.gold,
              borderRadius: 6,
              padding: '3px 8px',
            },
            children: [
              text('TOP 1 冠军', {
                fontSize: 14,
                fontWeight: 700,
                color: '#FFFFFF',
              }),
            ],
          }),
          text(top1.bvid ? `BV: ${top1.bvid}` : '', {
            fontSize: 13,
            fontWeight: 500,
            color: palette.biliBlue,
          }),
        ],
      })
    )

    // 歌名
    top1Inner.push(
      text(top1.title, {
        fontSize: 22,
        fontWeight: 600,
        color: palette.textMain,
        marginBottom: showDetailed && top1.video_meta?.title ? 2 : (top1CoverBuffer ? 8 : 4),
      })
    )

    // TOP 1 原视频标题
    if (showDetailed && top1.video_meta?.title) {
      top1Inner.push(
        text(`原视频标题: ${truncateText(top1.video_meta.title, 52)}`, {
          fontSize: 13,
          fontWeight: 400,
          color: palette.textSub,
          marginBottom: top1CoverBuffer ? 8 : 4,
        })
      )
    }

    // 海报封面
    if (top1CoverBuffer) {
      const coverHeight = calculateCoverHeight(top1CoverBuffer)
      top1Inner.push(
        container({
          style: {
            width: INNER_WIDTH,
            height: coverHeight,
            borderRadius: 10,
            overflow: 'hidden',
            display: 'flex',
            marginBottom: showDetailed && top1.video_meta ? 8 : 0,
          },
          children: [
            image({
              src: top1CoverBuffer,
              width: INNER_WIDTH,
              height: coverHeight,
              style: {
                width: INNER_WIDTH,
                height: coverHeight,
                borderRadius: 10,
                objectFit: 'cover',
              },
            }),
          ],
        })
      )
    }

    // TOP 1 详细信息行 (视频上传者与指标)
    if (showDetailed && top1.video_meta) {
      const meta = top1.video_meta
      const uploaderName = meta.uploader?.name || '未知'
      const initial = uploaderName.trim().charAt(0) || '?'
      const dur = formatDuration(meta.duration)
      const s = meta.stat || ({} as any)

      // 上传者与时长行
      top1Inner.push(
        container({
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 6,
          },
          children: [
            renderAvatar(top1Avatar, initial, 26),
            text(`视频上传者: ${uploaderName}`, {
              fontSize: 13.5,
              fontWeight: 500,
              color: palette.textMain,
              marginRight: 12,
            }),
            text(`时长: ${dur}`, {
              fontSize: 12.5,
              fontWeight: 400,
              color: palette.textMuted,
            }),
          ],
        })
      )

      // 6项指标行
      top1Inner.push(
        container({
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F9FAFB',
            borderRadius: 8,
            padding: '6px 12px',
            border: `1px solid ${palette.border}`,
          },
          children: [
            text(`播放 ${formatCount(s.view)}`, { fontSize: 12.5, color: palette.textSub, marginRight: 12 }),
            text(`弹幕 ${formatCount(s.danmaku)}`, { fontSize: 12.5, color: palette.textSub, marginRight: 12 }),
            text(`点赞 ${formatCount(s.like)}`, { fontSize: 12.5, color: palette.textSub, marginRight: 12 }),
            text(`投币 ${formatCount(s.coin)}`, { fontSize: 12.5, color: palette.textSub, marginRight: 12 }),
            text(`收藏 ${formatCount(s.favorite)}`, { fontSize: 12.5, color: palette.textSub, marginRight: 12 }),
            text(`分享 ${formatCount(s.share)}`, { fontSize: 12.5, color: palette.textSub }),
          ],
        })
      )
    }

    rootChildren.push(
      container({
        style: {
          width: CONTENT_WIDTH,
          backgroundColor: '#FFFDF5',
          borderRadius: 14,
          padding: CARD_PADDING,
          marginBottom: 8,
          border: `2px solid ${palette.goldBorder}`,
          display: 'flex',
          flexDirection: 'column',
        },
        children: top1Inner,
      })
    )
  }

  // 3. TOP 2 ~ N 排行榜单项
  for (let i = 1; i < items.length; i++) {
    const item = items[i]
    const coverBuf = itemCovers[i]
    const avatarBuf = itemAvatars[i]
    let badgeColor = palette.biliBlueLight
    let badgeTextColor = palette.biliBlue
    let rankText = `TOP ${item.rank}`
    let cardBorder = `1px solid ${palette.border}`
    let cardBg = palette.cardBg

    if (item.rank === 2) {
      badgeColor = palette.silverBg
      badgeTextColor = palette.silverText
      rankText = 'TOP 2 亚军'
      cardBorder = `1.5px solid ${palette.silverBorder}`
      cardBg = '#F8FAFC'
    } else if (item.rank === 3) {
      badgeColor = palette.bronzeBg
      badgeTextColor = palette.bronzeText
      rankText = 'TOP 3 季军'
      cardBorder = `1.5px solid ${palette.bronzeBorder}`
      cardBg = '#FFFBF7'
    }

    if (showDetailed && item.video_meta) {
      const meta = item.video_meta
      const uploaderName = meta.uploader?.name || '未知'
      const initial = uploaderName.trim().charAt(0) || '?'
      const dur = formatDuration(meta.duration)
      const s = meta.stat || ({} as any)

      // 多行流式卡片模式
      const cardInner: Node[] = []

      // 行 1: 排名 + 歌曲标题 + BV
      const line1Children: Node[] = [
        container({
          style: {
            backgroundColor: badgeColor,
            borderRadius: 6,
            padding: '2px 7px',
            marginRight: 8,
          },
          children: [
            text(rankText, {
              fontSize: 13.5,
              fontWeight: 700,
              color: badgeTextColor,
            }),
          ],
        }),
        text(item.title, {
          fontSize: 17,
          fontWeight: 600,
          color: palette.textMain,
        }),
      ]

      cardInner.push(
        container({
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 2,
          },
          children: [
            container({
              style: {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
              },
              children: line1Children,
            }),
            text(item.bvid || '', {
              fontSize: 13,
              color: palette.biliBlue,
              fontWeight: 500,
            }),
          ],
        })
      )

      // 行 2: 原视频标题
      if (meta.title) {
        cardInner.push(
          container({
            style: {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 2,
            },
            children: [
              text(`原视频标题: ${truncateText(meta.title, 42)}`, {
                fontSize: 12.5,
                fontWeight: 400,
                color: palette.textSub,
              }),
            ],
          })
        )
      }

      // 行 3: 视频上传者 + 头像 + 时长
      const line3Children: Node[] = [
        renderAvatar(avatarBuf, initial, 22),
        text(`视频上传者: ${uploaderName}`, {
          fontSize: 13,
          fontWeight: 500,
          color: palette.textSub,
          marginRight: 10,
        }),
        text(`时长: ${dur}`, {
          fontSize: 12,
          fontWeight: 400,
          color: palette.textMuted,
        }),
      ]

      cardInner.push(
        container({
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 2,
          },
          children: line3Children,
        })
      )

      // 行 4: 播放/弹幕/点赞/投币/收藏/分享 6项指标
      cardInner.push(
        container({
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: 2,
            borderTop: '1px dashed #EBECEE',
          },
          children: [
            text(`播放 ${formatCount(s.view)}`, { fontSize: 12, color: '#4E5358', marginRight: 10, fontWeight: 500 }),
            text(`弹幕 ${formatCount(s.danmaku)}`, { fontSize: 12, color: '#4E5358', marginRight: 10, fontWeight: 500 }),
            text(`点赞 ${formatCount(s.like)}`, { fontSize: 12, color: '#4E5358', marginRight: 10, fontWeight: 500 }),
            text(`投币 ${formatCount(s.coin)}`, { fontSize: 12, color: '#4E5358', marginRight: 10, fontWeight: 500 }),
            text(`收藏 ${formatCount(s.favorite)}`, { fontSize: 12, color: '#4E5358', marginRight: 10, fontWeight: 500 }),
            text(`分享 ${formatCount(s.share)}`, { fontSize: 12, color: '#4E5358', fontWeight: 500 }),
          ],
        })
      )

      // 如果有封面图，把封面放在卡片左侧或上层
      if (coverBuf) {
        rootChildren.push(
          container({
            style: {
              width: CONTENT_WIDTH,
              backgroundColor: cardBg,
              borderRadius: 10,
              padding: '6px 10px',
              marginBottom: 6,
              border: cardBorder,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            },
            children: [
              container({
                style: {
                  width: 128,
                  height: 80,
                  borderRadius: 6,
                  overflow: 'hidden',
                  marginRight: 10,
                  display: 'flex',
                },
                children: [
                  image({
                    src: coverBuf,
                    width: 128,
                    height: 80,
                    style: {
                      width: 128,
                      height: 80,
                      borderRadius: 6,
                      objectFit: 'cover',
                    },
                  }),
                ],
              }),
              container({
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                },
                children: cardInner,
              }),
            ],
          })
        )
      } else {
        rootChildren.push(
          container({
            style: {
              width: CONTENT_WIDTH,
              backgroundColor: cardBg,
              borderRadius: 10,
              padding: '6px 12px',
              marginBottom: 6,
              border: cardBorder,
              display: 'flex',
              flexDirection: 'column',
            },
            children: cardInner,
          })
        )
      }
    } else {
      // 传统单行模式
      const leftGroupChildren: Node[] = [
        container({
          style: {
            backgroundColor: badgeColor,
            borderRadius: 6,
            padding: '3px 7px',
            marginRight: 8,
          },
          children: [
            text(rankText, {
              fontSize: 13,
              fontWeight: 700,
              color: badgeTextColor,
            }),
          ],
        }),
      ]

      if (coverBuf) {
        leftGroupChildren.push(
          container({
            style: {
              width: 64,
              height: 38,
              borderRadius: 6,
              overflow: 'hidden',
              marginRight: 10,
              display: 'flex',
            },
            children: [
              image({
                src: coverBuf,
                width: 64,
                height: 38,
                style: {
                  width: 64,
                  height: 38,
                  borderRadius: 6,
                  objectFit: 'cover',
                },
              }),
            ],
          })
        )
      }

      leftGroupChildren.push(
        text(item.title, {
          fontSize: 16,
          fontWeight: 600,
          color: palette.textMain,
        })
      )

      rootChildren.push(
        container({
          style: {
            width: CONTENT_WIDTH,
            backgroundColor: cardBg,
            borderRadius: 10,
            padding: '7px 12px',
            marginBottom: 6,
            border: cardBorder,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          children: [
            container({
              style: {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
              },
              children: leftGroupChildren,
            }),
            text(item.bvid || '', {
              fontSize: 13,
              color: palette.biliBlue,
              fontWeight: 400,
            }),
          ],
        })
      )
    }
  }

  // 4. 底栏 Footer
  rootChildren.push(
    container({
      style: {
        width: CONTENT_WIDTH,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 4px 2px 4px',
      },
      children: [
        container({
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          },
          children: [
            text(
              isNico
                ? '数据来源于 Bilibili @Elvansphere（Niconico Vocaloid Songs 周榜 TOP20 专栏）'
                : '数据来源于 Bilibili @Bili-Board_Atel（Bilibili Vocaloid Songs 周榜 TOP20 专栏）',
              {
                fontSize: 12,
                color: palette.textMuted,
                fontWeight: 400,
              }
            ),
            ...(detail.title
              ? [
                  text(`📌 专栏原标题: ${detail.title}`, {
                    fontSize: 11,
                    color: '#71767D',
                    fontWeight: 500,
                  }),
                ]
              : []),
          ],
        }),
        container({
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          },
          children: [
            text('Generated by koishi-plugin-billboard-data', {
              fontSize: 11,
              color: palette.textMuted,
              fontWeight: 500,
            }),
            text('Render Engine: Takumi-rs (WASM)', {
              fontSize: 10,
              color: '#B0B4B8',
              fontWeight: 400,
            }),
          ],
        }),
      ],
    })
  )

  const root = container({
    style: {
      width: WIDTH,
      backgroundColor: palette.bg,
      padding: PADDING,
      display: 'flex',
      flexDirection: 'column',
    },
    children: rootChildren,
  })

  const renderStartTime = Date.now()
  const dpr = config.takumiScale || 1.5
  const imageBuffer = await renderer.render(root, {
    width: Math.round(WIDTH * dpr),
    format: 'png',
    devicePixelRatio: dpr,
  })
  const renderMs = Date.now() - renderStartTime

  const imageElement = h.image(imageBuffer, 'image/png')
  if (config.takumiShowRenderInfo && stats) {
    const totalMs = Date.now() - stats.commandStartTime
    const infoText = `\n====================\n⏱️ API 请求: ${stats.apiDurationMs}ms (尝试源: ${stats.attemptSourcesCount}) | ⚡ Takumi 渲染: ${renderMs}ms (×${dpr}) | 📊 总耗时: ${totalMs}ms`
    return [imageElement, h.text(infoText)]
  }

  return imageElement
}
