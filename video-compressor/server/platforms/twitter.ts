import type { MediaImage, ParseResult } from '../types'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'

interface TxMedia {
  type?: string
  url?: string
  thumbnail_url?: string
  width?: number
  height?: number
}

/**
 * X（Twitter）：使用 fxtwitter 的免密钥公开接口，直接返回结构化媒体信息。
 * 相比自行抓取需要登录态的 GraphQL，这条路径最稳定。
 */
export async function parseTwitter(shareUrl: string): Promise<ParseResult> {
  const id = shareUrl.match(/(?:status|statuses)\/(\d+)/)?.[1]
  if (!id) throw new Error('无法从链接中提取推文 ID')

  const res = await fetch(`https://api.fxtwitter.com/status/${id}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  })
  const json: any = await res.json().catch(() => null)
  if (!res.ok || json?.code !== 200 || !json?.tweet) {
    throw new Error(json?.message || '推文不存在、已删除或账号不可见')
  }

  const tweet = json.tweet
  const media = tweet.media ?? {}
  const author = tweet.author?.screen_name
    ? `@${tweet.author.screen_name}`
    : tweet.author?.name ?? undefined
  const avatar = tweet.author?.avatar_url
  const text = String(tweet.text ?? '')

  const all: TxMedia[] = Array.isArray(media.all) ? media.all : []
  const videos: TxMedia[] = (Array.isArray(media.videos) && media.videos.length
    ? media.videos
    : all.filter((m) => m?.type === 'video' || m?.type === 'gif')
  ).filter((m: TxMedia) => m?.url)
  const photos: TxMedia[] = (Array.isArray(media.photos) && media.photos.length
    ? media.photos
    : all.filter((m) => m?.type === 'photo')
  ).filter((m: TxMedia) => m?.url)

  if (videos.length) {
    return {
      platform: 'twitter',
      platformName: 'X',
      type: 'video',
      id,
      title: text,
      caption: text,
      author,
      avatar,
      cover: videos[0].thumbnail_url,
      url: videos[0].url,
    }
  }

  if (photos.length) {
    const images: MediaImage[] = photos.map((p) => ({
      url: String(p.url),
      width: p.width,
      height: p.height,
    }))
    return {
      platform: 'twitter',
      platformName: 'X',
      type: 'image',
      id,
      title: text,
      caption: text,
      author,
      avatar,
      images,
    }
  }

  throw new Error('该推文不包含视频或图片')
}
