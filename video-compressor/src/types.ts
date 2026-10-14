export type QualityPreset = 'lossless' | 'high' | 'standard' | 'high-compress'

export interface QualityOption {
  id: QualityPreset
  label: string
  description: string
  crf: number
  icon: string
}

export type ResolutionPreset = 'original' | '1080p' | '720p' | '480p'

export interface ResolutionOption {
  id: ResolutionPreset
  label: string
  width: number | null
}

export interface CompressionSettings {
  quality: QualityPreset
  resolution: ResolutionPreset
  outputFormat: 'mp4'
}

export interface VideoFile {
  id: string
  path: string
  name: string
  size: number
}

export type CompressionStatus = 'pending' | 'processing' | 'done' | 'error'

export interface CompressionResult {
  id: string
  path: string
  name: string
  originalSize: number
  compressedSize: number
  outputPath: string
  status: CompressionStatus
  progress: number
  error?: string
}
