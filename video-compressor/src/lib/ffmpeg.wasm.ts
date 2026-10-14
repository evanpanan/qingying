import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { CompressionSettings } from '../types'
import { QUALITY_OPTIONS, RESOLUTION_OPTIONS } from './constants'

// FFmpeg core CDN (single-threaded version, no COOP/COEP needed)
const FFMPEG_CORE_VERSION = '0.12.6'
const FFMPEG_CORE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`

let ffmpegInstance: FFmpeg | null = null
let isLoading = false

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
  const ffmpeg = await getFfmpeg()

  const inputName = 'input.mp4'
  const outputName = 'output.mp4'

  // Write input file to FFmpeg's virtual FS.
  await ffmpeg.writeFile(inputName, await fetchFile(file))

  // Build ffmpeg args.
  const args: string[] = [
    '-y',
    '-i',
    inputName,
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

  args.push(outputName)

  // Track progress via the 'log' or 'progress' events.
  // FFmpeg.wasm emits 'log' events; we parse time= to estimate progress.
  // For simplicity we use a coarse progress based on execution phases.
  let onLog: (({ message }: { message: string }) => void) | null = null

  // We'll parse the Duration from the first log lines to compute progress.
  let durationSec = 0

  onLog = ({ message }: { message: string }) => {
    // Parse Duration: HH:MM:SS.xx
    const durMatch = message.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/)
    if (durMatch) {
      const h = parseInt(durMatch[1], 10)
      const m = parseInt(durMatch[2], 10)
      const s = parseFloat(durMatch[3])
      durationSec = h * 3600 + m * 60 + s
      return
    }

    // Parse out_time_ms or time=HH:MM:SS.xx
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
    await ffmpeg.exec(args)
    onProgress(100)
  } finally {
    if (onLog) {
      // @ffmpeg/ffmpeg doesn't expose off in 0.12 easily; we just null it out.
      // The instance is reused, so we must remove the listener.
      try {
        ffmpeg.off('log', onLog)
      } catch {
        // ignore
      }
    }
  }

  // Read the output file.
  const data = (await ffmpeg.readFile(outputName)) as Uint8Array
  // Copy to a fresh ArrayBuffer to avoid SharedArrayBuffer type issues.
  const buffer = new ArrayBuffer(data.byteLength)
  new Uint8Array(buffer).set(data)
  const blob = new Blob([buffer], { type: 'video/mp4' })

  // Clean up virtual FS.
  try {
    await ffmpeg.deleteFile(inputName)
    await ffmpeg.deleteFile(outputName)
  } catch {
    // ignore
  }

  return {
    blob,
    originalSize: file.size,
    compressedSize: blob.size,
  }
}
