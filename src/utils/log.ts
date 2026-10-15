/**
 * 日志调试输出截断与精简工具
 */

/**
 * 对数组进行安全截断摘要处理，避免在控制台打印巨型数组刷爆日志
 * 每次只输出最开头一项、最后一项，以及总长度和中间被省略的个数（总长度比省略数多 2）
 */
export function truncateArrayForLog<T>(arr: T[], unit = '项'): any[] {
  if (!Array.isArray(arr)) return arr
  if (arr.length <= 2) return arr
  const total = arr.length
  const omitted = total - 2
  return [
    arr[0],
    `... (总长度 ${total} ${unit}，已省略中间 ${omitted} ${unit}) ...`,
    arr[total - 1],
  ]
}

/**
 * 递归对周榜数据对象进行安全摘要精简，防止 console 日志刷爆
 */
export function summarizeForLog(data: any): any {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data
  }
  if (Array.isArray(data)) {
    return truncateArrayForLog(data.map(item => (typeof item === 'object' ? summarizeForLog(item) : item)))
  }
  const copy: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'items' && Array.isArray(value)) {
      copy[key] = truncateArrayForLog(value, '首')
    } else if (key === 'issues' && Array.isArray(value)) {
      copy[key] = truncateArrayForLog(value, '期')
    } else if (Array.isArray(value) && value.length > 2) {
      copy[key] = truncateArrayForLog(value)
    } else if (typeof value === 'object' && value !== null) {
      copy[key] = summarizeForLog(value)
    } else {
      copy[key] = value
    }
  }
  return copy
}
