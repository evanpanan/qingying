import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { CompressInput } from './compress'
import { isTauri } from './env'
import { outputName, type OutputFormat } from './media'

export async function convertVideo(input: CompressInput, format: OutputFormat, onProgress: (value: number) => void) {
  if (!isTauri()) {
    const { convertVideoWasm } = await import('./ffmpeg.wasm')
    const blob = await convertVideoWasm(input.file as File, format, onProgress)
    return { output: URL.createObjectURL(blob), size: blob.size, name: outputName(input.name, format) }
  }
  const taskId = crypto.randomUUID()
  const unlisten = await listen<{ task_id: string; progress: number }>('compress-progress', (event) => {
    if (event.payload.task_id === taskId) onProgress(event.payload.progress)
  })
  try {
    const result = await invoke<{ output_path: string; compressed_size: number }>('convert_video', {
      taskId, inputPath: input.file, format,
    })
    return { output: result.output_path, size: result.compressed_size, name: outputName(input.name, format) }
  } finally {
    unlisten()
  }
}
