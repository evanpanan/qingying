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

  // Web: use a hidden file input attached to the DOM.
  // NOTE: the input must be appended to the document for .click() to
  // reliably open the file picker in all browsers (Safari / WebKit in
  // particular ignore clicks on detached file inputs).
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'video/*'
    input.style.cssText =
      'position:absolute;left:-9999px;top:0;width:0;height:0;opacity:0'
    document.body.appendChild(input)

    const cleanup = () => {
      try {
        document.body.removeChild(input)
      } catch {
        /* already removed */
      }
    }

    input.onchange = () => {
      if (!input.files || input.files.length === 0) {
        cleanup()
        resolve(null)
        return
      }
      const inputs: CompressInput[] = Array.from(input.files).map((f) => ({
        file: f,
        name: f.name,
        size: f.size,
      }))
      cleanup()
      resolve(inputs)
    }

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
