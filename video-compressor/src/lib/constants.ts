import type { QualityOption, ResolutionOption } from '../types'

export const QUALITY_OPTIONS: QualityOption[] = [
  {
    id: 'lossless',
    label: '原画无损',
    description: '几乎无损，体积略有减小',
    crf: 18,
    icon: '💎',
  },
  {
    id: 'high',
    label: '高质量',
    description: '画质优秀，体积明显减小',
    crf: 22,
    icon: '✨',
  },
  {
    id: 'standard',
    label: '标准',
    description: '平衡画质与体积（推荐）',
    crf: 26,
    icon: '⚖️',
  },
  {
    id: 'high-compress',
    label: '高压缩',
    description: '体积最小，画质有所下降',
    crf: 32,
    icon: '🗜️',
  },
]

export const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { id: 'original', label: '原始分辨率', width: null },
  { id: '1080p', label: '1080p (1920×1080)', width: 1920 },
  { id: '720p', label: '720p (1280×720)', width: 1280 },
  { id: '480p', label: '480p (854×480)', width: 854 },
]

export const SUPPORTED_FORMATS =
  'MP4, MOV, MKV, AVI, WMV, FLV, WEBM, M4V, 3GP, MPG, TS'
