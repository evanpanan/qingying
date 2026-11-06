/** 解析需请求外部平台，放宽函数执行时长。 */
export const config = { maxDuration: 30 }

type Platform = 'douyin' | 'xiaohongshu' | 'instagram' | 'twitter'

interface MediaImage {
  url: string
  width?: number
  height?: number
}

interface ParseResult {
  platform: Platform
  platformName: string
  type: 'video' | 'image'
  title?: string
  author?: string
  url?: string
  images?: MediaImage[]
}

interface RelayVariant {
  url?: string
  downloadUrl?: string
}

interface RelayImage {
  url?: string
  downloadUrl?: string
}

interface RelayResponse {
  title?: string
  author?: string
  type?: string
  videoUrl?: string
  videoVariants?: RelayVariant[]
  images?: RelayImage[]
  error?: string
}

const URL_RE = /https?:\/\/[^\s"'“”‘’，。、；：）)】》>]+/i
const RELAY_ENDPOINT = 'https://douyin.laobaitv.net/dl/api/parse'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
const PLATFORM_HOSTS: { platform: Platform; hosts: string[] }[] = [
  { platform: 'douyin', hosts: ['douyin.com', 'iesdouyin.com'] },
  { platform: 'xiaohongshu', hosts: ['xiaohongshu.com', 'xhslink.com'] },
  { platform: 'instagram', hosts: ['instagram.com', 'instagr.am', 'ig.me'] },
  { platform: 'twitter', hosts: ['twitter.com', 'x.com', 't.co'] },
]
const PLATFORM_NAMES: Record<Platform, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  instagram: 'Instagram',
  twitter: 'X',
}

function firstUrl(text: string): string {
  const match = URL_RE.exec(text || '')
  if (!match) throw new Error('未找到有效的分享链接')
  return match[0]
}

function detectPlatform(text: string): Platform | null {
  let host = ''
  try {
    host = new URL(firstUrl(text)).hostname.toLowerCase()
  } catch {
    return null
  }
  for (const { platform, hosts } of PLATFORM_HOSTS) {
    if (hosts.some((item) => host === item || host.endsWith('.' + item))) return platform
  }
  return null
}

async function relayParse(url: string, platform: Platform): Promise<ParseResult> {
  let response: Response
  try {
    response = await fetch(RELAY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ url }),
    })
  } catch {
    throw new Error('解析服务连接失败，请稍后重试')
  }

  if (!response.ok) {
    throw new Error(`解析服务异常（HTTP ${response.status}）`)
  }

  const data = (await response.json().catch(() => null)) as RelayResponse | null
  if (!data) throw new Error('解析服务返回异常数据')
  if (data.error) throw new Error(data.error)

  const base = {
    platform,
    platformName: PLATFORM_NAMES[platform],
    title: data.title || undefined,
    author: data.author || undefined,
  }

  const videoUrl = data.videoUrl || data.videoVariants?.[0]?.downloadUrl || data.videoVariants?.[0]?.url
  if (data.type === 'video' && videoUrl) {
    return { ...base, type: 'video', url: videoUrl }
  }

  const images = (data.images ?? [])
    .map((item) => item.downloadUrl || item.url)
    .filter((item): item is string => Boolean(item))
    .map((item) => ({ url: item }))

  if (images.length) {
    return { ...base, type: 'image', images }
  }

  throw new Error('未解析到可下载的媒体，请确认链接是否有效')
}

async function parseTwitter(shareUrl: string): Promise<ParseResult> {
  const id = shareUrl.match(/(?:status|statuses)\/(\d+)/)?.[1]
  if (!id) throw new Error('无法从链接中提取推文 ID')

  const response = await fetch(`https://api.fxtwitter.com/status/${id}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  })
  const json: any = await response.json().catch(() => null)
  if (!response.ok || json?.code !== 200 || !json?.tweet) {
    throw new Error(json?.message || '推文不存在、已删除或账号不可见')
  }

  const tweet = json.tweet
  const media = tweet.media ?? {}
  const all = Array.isArray(media.all) ? media.all : []
  const videos = (Array.isArray(media.videos) && media.videos.length
    ? media.videos
    : all.filter((item: any) => item?.type === 'video' || item?.type === 'gif')
  ).filter((item: any) => item?.url)
  const photos = (Array.isArray(media.photos) && media.photos.length
    ? media.photos
    : all.filter((item: any) => item?.type === 'photo')
  ).filter((item: any) => item?.url)

  if (videos.length) {
    return {
      platform: 'twitter',
      platformName: 'X',
      type: 'video',
      title: String(tweet.text ?? ''),
      author: tweet.author?.screen_name
        ? `@${tweet.author.screen_name}`
        : tweet.author?.name ?? undefined,
      url: videos[0].url,
    }
  }

  if (photos.length) {
    return {
      platform: 'twitter',
      platformName: 'X',
      type: 'image',
      title: String(tweet.text ?? ''),
      author: tweet.author?.screen_name
        ? `@${tweet.author.screen_name}`
        : tweet.author?.name ?? undefined,
      images: photos.map((item: any) => ({
        url: String(item.url),
        width: item.width,
        height: item.height,
      })),
    }
  }

  throw new Error('该推文不包含视频或图片')
}

async function parseShare(input: string): Promise<ParseResult> {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('请粘贴分享链接')

  const platform = detectPlatform(text)
  if (!platform) {
    throw new Error('暂不支持该平台，目前支持：抖音、小红书、Instagram、X')
  }

  const url = firstUrl(text)
  try {
    return await relayParse(url, platform)
  } catch (error) {
    if (platform === 'twitter') return parseTwitter(url)
    throw error
  }
}

/**
 * POST /api/parse
 * 请求体：{ url: string }（可直接粘贴含分享文案的整段文本）
 * 响应：{ ok: true, data: ParseResult } | { ok: false, error: string }
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: '仅支持 POST 请求' })
    return
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}
    const input = body.url ?? body.text ?? ''
    const data = await parseShare(String(input))
    res.status(200).json({ ok: true, data })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || '解析失败，请稍后重试' })
  }
}
