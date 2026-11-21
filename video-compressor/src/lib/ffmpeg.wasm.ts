import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { CompressionSettings } from '../types'
import { QUALITY_OPTIONS, RESOLUTION_OPTIONS } from './constants'
import { FORMATS, type OutputFormat } from './media'

// FFmpeg core CDN (single-threaded version, no COOP/COEP needed)
const FFMPEG_CORE_VERSION = '0.12.6'
const FFMPEG_CORE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`

let ffmpegInstance: FFmpeg | null = null
let isLoading = false
let jobQueue: Promise<unknown> = Promise.resolve()

/**
 * Lazily load the FFmpeg.wasm instance.
 */
async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  if (isLoading) {
    // Wait for the ongoing load.
    while (isLoading) {
      await new Promise((r) => setTimeout(r, 100))
    }
    if (ffmpegInstance) return ffmpegInstance
  }

  isLoading = true
  try {
    const ffmpeg = new FFmpeg()

    const baseURL = FFMPEG_CORE_URL
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    ffmpegInstance = ffmpeg
    return ffmpeg
  } finally {
    isLoading = false
  }
}

/**
 * Get the CRF value for a quality preset.
 */
function getCrf(quality: CompressionSettings['quality']): number {
  return QUALITY_OPTIONS.find((q) => q.id === quality)?.crf ?? 26
}

/**
 * Get the scale filter for a resolution preset.
 */
function getScaleFilter(resolution: CompressionSettings['resolution']): string | null {
  const opt = RESOLUTION_OPTIONS.find((r) => r.id === resolution)
  if (!opt || !opt.width) return null
  // -2 keeps aspect ratio
  return `scale=${opt.width}:-2`
}

/**
 * Compress a video in the browser using FFmpeg.wasm.
 *
 * @param file The input File object.
 * @param settings Compression settings.
 * @param onProgress Progress callback (0-100).
 * @returns Object with the compressed Blob.
 */
export async function compressVideoWasm(
  file: File,
  settings: CompressionSettings,
  onProgress: (progress: number) => void,
): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const args: string[] = [
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    String(getCrf(settings.quality)),
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
  ]

  const scale = getScaleFilter(settings.resolution)
  if (scale) {
    args.push('-vf', scale)
  }

  const blob = await runWasmJob(file, 'mp4', args, onProgress)
  return { blob, originalSize: file.size, compressedSize: blob.size }
}

export function convertVideoWasm(file: File, format: OutputFormat, onProgress: (value: number) => void) {
  const option = FORMATS.find((item) => item.id === format)!
  return runWasmJob(file, format, option.args, onProgress)
}

function runWasmJob(file: File, format: OutputFormat, args: string[], onProgress: (value: number) => void): Promise<Blob> {
  // 一个引擎只执行一个任务，防止切换工具后同时覆盖虚拟文件。
  const job = jobQueue.then(() => executeJob(file, format, args, onProgress))
  jobQueue = job.catch(() => undefined)
  return job
}

async function executeJob(file: File, format: OutputFormat, args: string[], onProgress: (value: number) => void) {
  if (file.size > 500 * 1024 * 1024) throw new Error('超过 500 MB 的文件请使用桌面版处理')
  onProgress(0)
  const ffmpeg = await getFfmpeg()
  const inputName = `input.${file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'mp4'}`
  const outputName = `output.${format}`
  let durationSec = 0
  const onLog = ({ message }: { message: string }) => {
    const durMatch = message.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/)
    if (durMatch) {
      const h = parseInt(durMatch[1], 10)
      const m = parseInt(durMatch[2], 10)
      const s = parseFloat(durMatch[3])
      durationSec = h * 3600 + m * 60 + s
      return
    }

    if (durationSec > 0) {
      const timeMatch = message.match(/time=(\d+):(\d+):(\d+\.?\d*)/)
      if (timeMatch) {
        const h = parseInt(timeMatch[1], 10)
        const m = parseInt(timeMatch[2], 10)
        const s = parseFloat(timeMatch[3])
        const currentSec = h * 3600 + m * 60 + s
        const pct = Math.min(99, Math.round((currentSec / durationSec) * 100))
        onProgress(pct)
      }
    }
  }

  ffmpeg.on('log', onLog)
  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))
    const code = await ffmpeg.exec(['-y', '-i', inputName, ...args, outputName])
    if (code !== 0) throw new Error('转换失败，请检查源文件是否可播放，提取音频时请确认文件含音轨')
    const data = await ffmpeg.readFile(outputName)
    if (!(data instanceof Uint8Array) || !data.byteLength) throw new Error('输出文件为空')
    const buffer = new ArrayBuffer(data.byteLength)
    new Uint8Array(buffer).set(data)
    const blob = new Blob([buffer], { type: FORMATS.find((item) => item.id === format)!.mime })
    onProgress(100)
    return blob
  } finally {
    ffmpeg.off('log', onLog)
    await Promise.all([ffmpeg.deleteFile(inputName).catch(() => undefined), ffmpeg.deleteFile(outputName).catch(() => undefined)])
  }
}
