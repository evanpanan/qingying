export const PLATFORMS = [
  { name: 'YouTube', hosts: ['youtube.com', 'youtu.be'], engine: 'extract' },
  { name: '抖音', hosts: ['douyin.com', 'iesdouyin.com'], engine: 'extract' },
  { name: 'Instagram', hosts: ['instagram.com', 'instagr.am'], engine: 'extract' },
  { name: '小红书', hosts: ['xiaohongshu.com', 'xhslink.com'], engine: 'extract' },
  { name: '快手', hosts: ['kuaishou.com', 'gifshow.com'], engine: 'extract' },
  { name: 'X', hosts: ['x.com', 'twitter.com', 't.co'], engine: 'extract' },
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
  { name: '网易云音乐', hosts: ['music.163.com'], engine: 'extract' },
  { name: 'QQ 音乐', hosts: ['y.qq.com'], engine: 'extract' },
  { name: '西瓜视频', hosts: ['ixigua.com'], engine: 'extract' },
  { name: '优酷', hosts: ['youku.com'], engine: 'extract' },
  { name: '爱奇艺', hosts: ['iqiyi.com'], engine: 'extract' },
  { name: '腾讯视频', hosts: ['v.qq.com'], engine: 'extract' },
  { name: 'Niconico', hosts: ['nicovideo.jp'], engine: 'extract' },
  { name: 'Mixcloud', hosts: ['mixcloud.com'], engine: 'extract' },
  { name: 'Audiomack', hosts: ['audiomack.com'], engine: 'extract' },
  { name: 'Archive.org', hosts: ['archive.org'], engine: 'extract' },
  { name: 'PeerTube', hosts: ['framatube.org'], engine: 'extract' },
  { name: 'Rumble', hosts: ['rumble.com'], engine: 'extract' },
  { name: 'Odysee', hosts: ['odysee.com'], engine: 'extract' },
  { name: 'Bluesky', hosts: ['bsky.app'], engine: 'extract' },
  { name: 'LinkedIn', hosts: ['linkedin.com'], engine: 'extract' },
  { name: 'Snapchat', hosts: ['snapchat.com'], engine: 'extract' },
  { name: '9GAG', hosts: ['9gag.com'], engine: 'extract' },
  { name: 'Coub', hosts: ['coub.com'], engine: 'extract' },
  { name: 'Imgur', hosts: ['imgur.com'], engine: 'extract' },
  { name: 'Kick', hosts: ['kick.com'], engine: 'extract' },
  { name: 'Bitchute', hosts: ['bitchute.com'], engine: 'extract' },
  { name: 'Sohu', hosts: ['tv.sohu.com'], engine: 'extract' },
  { name: 'ESPN', hosts: ['espn.com'], engine: 'extract' },
  { name: 'BBC', hosts: ['bbc.com', 'bbc.co.uk'], engine: 'extract' },
  { name: 'CNN', hosts: ['cnn.com'], engine: 'extract' },
  { name: 'ARTE', hosts: ['arte.tv'], engine: 'extract' },
  { name: 'ZDF', hosts: ['zdf.de'], engine: 'extract' },
  { name: 'SBS', hosts: ['sbs.com.au'], engine: 'extract' },
  { name: 'NRK', hosts: ['nrk.no'], engine: 'extract' },
  { name: 'Khan Academy', hosts: ['khanacademy.org'], engine: 'extract' },
  { name: 'Udemy', hosts: ['udemy.com'], engine: 'extract' },
  { name: 'Coursera', hosts: ['coursera.org'], engine: 'extract' },
] as const

export function shareUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s"'“”‘’，。、；：）)】》>]+/i)
  if (!match) throw new Error('请粘贴包含链接的分享文案')
  const url = new URL(match[0])
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (url.protocol !== 'https:' || url.username || url.password ||
      (url.port && url.port !== '443') || !host.includes('.') ||
      /^[\d.]+$/.test(host) || host.includes(':') ||
      /\.(localhost|local|internal)$/.test(host)) {
    throw new Error('请使用公开网站的 HTTPS 作品链接')
  }
  return url.href
}

export function identifyPlatform(text: string) {
  try {
    const host = new URL(shareUrl(text)).hostname.toLowerCase()
    return PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ??
      { name: host.replace(/^www\./, ''), hosts: [host], engine: 'extract' as const }
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
  engine?: EngineInfo
}

export interface EngineInfo {
  name: string
  version: string
  extractors: number
  generic: boolean
  thirdPartyParser: boolean
}
