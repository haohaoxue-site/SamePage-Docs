const HTML_TAG_PATTERN = /<[^>]+>/g
const WHITESPACE_PATTERN = /\s+/g

/**
 * 移除 HTML 标签，返回纯文本
 */
export function stripHtmlTags(html: string): string {
  return html.replace(HTML_TAG_PATTERN, '').trim()
}

/**
 * 从 HTML 内容中提取摘要（前 maxLength 个字符的纯文本）
 */
export function summarizeHtml(html: string, maxLength = 120, fallback = '暂无摘要'): string {
  const plainText = html
    .replace(HTML_TAG_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim()

  return plainText.slice(0, maxLength) || fallback
}
