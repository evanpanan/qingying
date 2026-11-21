export const PLATFORMS = [
  { name: 'YouTube', hosts: ['youtube.com', 'youtu.be'], engine: 'extract' },
  { name: '抖音', hosts: ['douyin.com', 'iesdouyin.com'], engine: 'relay' },
  { name: 'Instagram', hosts: ['instagram.com', 'instagr.am'], engine: 'relay' },
  { name: '小红书', hosts: ['xiaohongshu.com', 'xhslink.com'], engine: 'relay' },
  { name: '快手', hosts: ['kuaishou.com', 'gifshow.com'], engine: 'relay' },
  { name: 'X', hosts: ['x.com', 'twitter.com', 't.co'], engine: 'relay' },
  { name: 'Bilibili', hosts: ['bilibili.com', 'b23.tv'], engine: 'extract' },
  { name: 'TikTok', hosts: ['tiktok.com'], engine: 'extract' },
  { name: 'Vimeo', hosts: ['vimeo.com'], engine: 'extract' },
  { name: 'Facebook', hosts: ['facebook.com', 'fb.watch'], engine: 'extract' },
  { name: 'Reddit', hosts: ['reddit.com', 'redd.it'], engine: 'extract' },
  { name: 'Pinterest', hosts: ['pinterest.com', 'pin.it'], engine: 'extract' },
  { name: 'Twitch', hosts: ['twitch.tv', 'clips.twitch.tv'], engine: 'extract' },
  { name: 'Dailymotion', hosts: ['dailymotion.com', 'dai.ly'], engine: 'extract' },
  { name: 'SoundCloud', hosts: ['soundcloud.com'], engine: 'extract' },
  { name: '微博', hosts: ['weibo.com', 'weibo.cn'], engine: 'extract' },
  { name: 'AcFun', hosts: ['acfun.cn'], engine: 'extract' },
  { name: 'TED', hosts: ['ted.com'], engine: 'extract' },
  { name: 'Tumblr', hosts: ['tumblr.com'], engine: 'extract' },
  { name: 'Bandcamp', hosts: ['bandcamp.com'], engine: 'extract' },
  { name: 'Streamable', hosts: ['streamable.com'], engine: 'extract' },
] as const

export function shareUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s"'“”‘’，。、；：）)】》>]+/i)
  if (!match) throw new Error('请粘贴包含链接的分享文案')
  const url = new URL(match[0])
  if (url.username || url.password) throw new Error('链接格式不正确')
  return url.href
}

export function identifyPlatform(text: string) {
  try {
    const host = new URL(shareUrl(text)).hostname.toLowerCase()
    return PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`)))
  } catch {
    return undefined
  }
}

export type OutputFormat = 'mp4' | 'mov' | 'mkv' | 'webm' | 'mp3'
export const FORMATS: { id: OutputFormat; name: string; description: string; mime: string; args: string[] }[] = [
  { id: 'mp4', name: 'MP4', description: '通用视频', mime: 'video/mp4', args: ['-c:v', 'libx264', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart'] },
  { id: 'mov', name: 'MOV', description: '剪辑工作流', mime: 'video/quicktime', args: ['-c:v', 'libx264', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart'] },
  { id: 'mkv', name: 'MKV', description: '开放容器', mime: 'video/x-matroska', args: ['-c:v', 'libx264', '-crf', '22', '-c:a', 'aac'] },
  { id: 'webm', name: 'WebM', description: '网页视频', mime: 'video/webm', args: ['-c:v', 'libvpx', '-b:v', '1800k', '-c:a', 'libopus'] },
  { id: 'mp3', name: 'MP3', description: '提取音频', mime: 'audio/mpeg', args: ['-vn', '-c:a', 'libmp3lame', '-b:a', '192k'] },
]

export function outputName(name: string, format: OutputFormat) {
  return `${name.replace(/\.[^.]+$/, '')}_converted.${format}`
}

export interface DownloadFormat {
  id: string
  label: string
  url: string
  ext: string
  audioOnly?: boolean
}

export interface DownloadData {
  title?: string
  author?: string
  platformName: string
  type: 'video' | 'image' | 'audio'
  url?: string
  formats?: DownloadFormat[]
  images?: { url: string }[]
}
