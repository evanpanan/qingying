import type { Platform } from './types'

/** 从任意分享文案中提取第一个 URL（兼容中文标点边界）。 */
const URL_RE = /https?:\/\/[^\s"'“”‘’，。、；：）)】》>]+/i

export function firstUrl(text: string): string {
  const m = URL_RE.exec(text || '')
  if (!m) throw new Error('未找到有效的分享链接')
  return m[0]
}

const PLATFORM_HOSTS: { platform: Platform; hosts: string[] }[] = [
  { platform: 'douyin', hosts: ['douyin.com', 'iesdouyin.com'] },
  { platform: 'xiaohongshu', hosts: ['xiaohongshu.com', 'xhslink.com'] },
  { platform: 'instagram', hosts: ['instagram.com', 'instagr.am', 'ig.me'] },
  { platform: 'twitter', hosts: ['twitter.com', 'x.com', 't.co'] },
]

/** 根据链接域名判定平台。 */
export function detectPlatform(text: string): Platform | null {
  let host = ''
  try {
    host = new URL(firstUrl(text)).hostname.toLowerCase()
  } catch {
    return null
  }
  for (const { platform, hosts } of PLATFORM_HOSTS) {
    if (hosts.some((h) => host === h || host.endsWith('.' + h))) return platform
  }
  return null
}
