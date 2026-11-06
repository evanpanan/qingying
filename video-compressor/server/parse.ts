import type { ParseResult, Platform } from './types'
import { detectPlatform, firstUrl } from './extract'
import { relayParse } from './relay'
import { parseTwitter } from './platforms/twitter'

/** 本地兜底解析器：仅覆盖可稳定自建解析的平台（中转不可用时生效）。 */
const FALLBACKS: Partial<Record<Platform, (url: string) => Promise<ParseResult>>> = {
  twitter: parseTwitter,
}

/** 解析入口：识别平台后经中转服务解析，失败时回退到本地解析器。 */
export async function parseShare(input: string): Promise<ParseResult> {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('请粘贴分享链接')

  const platform = detectPlatform(text)
  if (!platform) {
    throw new Error('暂不支持该平台，目前支持：抖音、小红书、Instagram、X')
  }

  const url = firstUrl(text)
  try {
    return await relayParse(url, platform)
  } catch (relayError: any) {
    const fallback = FALLBACKS[platform]
    if (fallback) {
      try {
        return await fallback(url)
      } catch {
        // 兜底同样失败，抛出中转错误
      }
    }
    throw relayError
  }
}
