import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import type { CompressionSettings } from '../types'

/**
 * Open the native macOS file picker to select video files.
 */
export async function pickVideoFiles(): Promise<string[] | null> {
  const selected = await open({
    multiple: true,
    filters: [
      {
        name: '视频文件',
        extensions: [
          'mp4', 'mov', 'mkv', 'avi', 'wmv', 'flv', 'webm', 'm4v',
          '3gp', 'mpg', 'mpeg', 'ts', 'm2ts', 'vob', 'ogv',
        ],
      },
    ],
  })
  if (!selected) return null
  return Array.isArray(selected) ? selected : [selected]
}

/**
 * Open a native save dialog to choose where to save the compressed video.
 */
export async function pickOutputPath(defaultName: string): Promise<string | null> {
  // We'll just place output next to the input with a suffix; Tauri save dialog
  // is optional. For now return null and let the backend decide.
  void defaultName
  return null
}

/**
 * Derive the output file path from the input path.
 * e.g. /path/to/input.mp4 -> /path/to/input_compressed.mp4
 */
export function deriveOutputPath(inputPath: string): string {
  const lastDot = inputPath.lastIndexOf('.')
  const base = lastDot > 0 ? inputPath.slice(0, lastDot) : inputPath
  return `${base}_compressed.mp4`
}

interface ProgressPayload {
  task_id: string
  progress: number
}

/**
 * Compress a video file using the native FFmpeg bundled with the app.
 *
 * @param inputPath Absolute path to the source video.
 * @param outputPath Absolute path for the compressed output.
 * @param settings Compression settings.
 * @param onProgress Progress callback (0-100).
 * @returns Compression result with sizes.
 */
export async function compressVideo(
  inputPath: string,
  outputPath: string,
  settings: CompressionSettings,
  onProgress: (progress: number) => void,
): Promise<{ originalSize: number; compressedSize: number }> {
  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  let unlisten: UnlistenFn | undefined
  try {
    unlisten = await listen<ProgressPayload>('compress-progress', (event) => {
      if (event.payload.task_id === taskId) {
        onProgress(event.payload.progress)
      }
    })

    const result = await invoke<{
      output_path: string
      original_size: number
      compressed_size: number
    }>('compress_video', {
      taskId,
      inputPath,
      outputPath,
      settings,
    })

    return {
      originalSize: result.original_size,
      compressedSize: result.compressed_size,
    }
  } finally {
    unlisten?.()
  }
}

/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Extract just the filename from a full path.
 */
export function basename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}
