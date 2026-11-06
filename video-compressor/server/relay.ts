import type { MediaImage, ParseResult, Platform } from './types'

/** 中转解析服务：复用稳定的第三方解析能力，零配置、开箱即用。 */
const RELAY_ENDPOINT = 'https://douyin.laobaitv.net/dl/api/parse'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'

const PLATFORM_NAMES: Record<Platform, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  instagram: 'Instagram',
  twitter: 'X',
}

interface RelayVariant {
  url?: string
  downloadUrl?: string
  quality?: string
  label?: string
}

interface RelayImage {
  url?: string
  downloadUrl?: string
  thumb?: string
  ext?: string
}

interface RelayResponse {
  platform?: string
  type?: string
  title?: string
  author?: string
  videoUrl?: string
  videoVariants?: RelayVariant[]
  images?: RelayImage[]
  error?: string
}

/**
 * 通过中转服务解析分享链接。
 * 抖音等平台的直链需要签名（a_bogus），自建成本高且极易失效；
 * 这里统一走中转，保证多平台可用。
 */
export async function relayParse(url: string, platform: Platform): Promise<ParseResult> {
  let res: Response
  try {
    res = await fetch(RELAY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ url }),
    })
  } catch {
    throw new Error('解析服务连接失败，请稍后重试')
  }
  if (!res.ok) throw new Error(`解析服务异常（HTTP ${res.status}）`)

  const data = (await res.json().catch(() => null)) as RelayResponse | null
  if (!data) throw new Error('解析服务返回异常数据')
  if (data.error) throw new Error(data.error)

  const base = {
    platform,
    platformName: PLATFORM_NAMES[platform],
    title: data.title || undefined,
    author: data.author || undefined,
  }

  const videoUrl = data.videoUrl || data.videoVariants?.[0]?.url
  if (data.type === 'video' && videoUrl) {
    return { ...base, type: 'video', url: videoUrl }
  }

  const images: MediaImage[] = (data.images ?? [])
    .map((img) => img.url || img.downloadUrl)
    .filter((u): u is string => !!u)
    .map((u) => ({ url: u }))

  if (images.length) {
    return { ...base, type: 'image', images }
  }

  throw new Error('未解析到可下载的媒体，请确认链接是否有效')
}
