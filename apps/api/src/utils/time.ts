/**
 * 将日期格式化为相对时间标签（如"刚刚更新"、"3 分钟前"、"2 小时前"或 ISO 日期）
 */
export function formatRelativeTime(date: Date): string {
  const elapsed = Date.now() - date.getTime()

  if (elapsed < 60_000) {
    return '刚刚更新'
  }

  if (elapsed < 3_600_000) {
    return `${Math.floor(elapsed / 60_000)} 分钟前`
  }

  if (elapsed < 86_400_000) {
    return `${Math.floor(elapsed / 3_600_000)} 小时前`
  }

  return date.toISOString().slice(0, 10)
}
