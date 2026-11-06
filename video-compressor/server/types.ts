export type Platform = 'douyin' | 'xiaohongshu' | 'instagram' | 'twitter'

export interface MediaImage {
  url: string
  width?: number
  height?: number
}

export interface ParseResult {
  platform: Platform
  platformName: string
  type: 'video' | 'image'
  id?: string
  title?: string
  caption?: string
  author?: string
  avatar?: string
  cover?: string
  /** 无水印视频直链（type=video 时存在） */
  url?: string
  /** 图集原图（type=image 时存在） */
  images?: MediaImage[]
}
