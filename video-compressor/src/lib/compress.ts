import type { CompressionSettings } from '../types'
import { isTauri } from './env'
import {
  compressVideo as compressVideoTauri,
  pickVideoFiles as pickVideoFilesTauri,
  formatBytes,
  deriveOutputPath,
} from './ffmpeg'
import { compressVideoWasm } from './ffmpeg.wasm'

export interface CompressInput {
  // For Tauri: absolute file path. For web: File object.
  file: string | File
  name: string
  size: number
}

export interface CompressResult {
  // For Tauri: output path. For web: Blob URL.
  output: string
  blob?: Blob
  originalSize: number
  compressedSize: number
}

/**
 * Pick video files using the platform-appropriate method.
 * Returns file descriptors with path/File, name, and size.
 */
export async function pickVideoFiles(): Promise<CompressInput[] | null> {
  if (isTauri()) {
    const paths = await pickVideoFilesTauri()
    if (!paths) return null
    // Tauri: we don't know the size until backend reads it.
    return paths.map((p) => {
      const name = p.split('/').pop() || p
      return { file: p, name, size: 0 }
    })
  }

  // Web: use a hidden file input.
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'video/*'
    input.onchange = () => {
      if (!input.files || input.files.length === 0) {
        resolve(null)
        return
      }
      const inputs: CompressInput[] = Array.from(input.files).map((f) => ({
        file: f,
        name: f.name,
        size: f.size,
      }))
      resolve(inputs)
    }
    // Handle cancel (some browsers don't fire change on cancel).
    input.click()
  })
}

/**
 * Compress a video using the platform-appropriate engine.
 */
export async function compressVideo(
  input: CompressInput,
  outputHint: string,
  settings: CompressionSettings,
  onProgress: (progress: number) => void,
): Promise<CompressResult> {
  if (isTauri()) {
    const tauriResult = await compressVideoTauri(
      input.file as string,
      outputHint,
      settings,
      onProgress,
    )
    return {
      output: outputHint,
      originalSize: tauriResult.originalSize,
      compressedSize: tauriResult.compressedSize,
    }
  }

  // Web: FFmpeg.wasm
  const wasmResult = await compressVideoWasm(
    input.file as File,
    settings,
    onProgress,
  )
  const url = URL.createObjectURL(wasmResult.blob)
  return {
    output: url,
    blob: wasmResult.blob,
    originalSize: wasmResult.originalSize,
    compressedSize: wasmResult.compressedSize,
  }
}

export { formatBytes, deriveOutputPath }
