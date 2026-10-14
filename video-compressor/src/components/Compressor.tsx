import { useCallback, useRef, useState } from 'react'
import {
  Play,
  Shield,
  Sparkles,
  CheckCircle2,
  Loader2,
  Download,
  FolderOpen,
  Copy,
  X,
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import SettingsPanel from './SettingsPanel'
import { pickVideoFiles, compressVideo, formatBytes } from '../lib/compress'
import { isTauri } from '../lib/env'
import type {
  CompressionSettings,
  CompressionResult,
} from '../types'

const DEFAULT_SETTINGS: CompressionSettings = {
  quality: 'standard',
  resolution: 'original',
  outputFormat: 'mp4',
}

interface CompressInput {
  file: string | File
  name: string
  size: number
}

interface FileState extends CompressionResult {
  input?: CompressInput
}

export default function Compressor() {
  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_SETTINGS)
  const [results, setResults] = useState<FileState[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const inputMapRef = useRef<Map<string, CompressInput>>(new Map())

  const handlePickFiles = useCallback(async () => {
    const inputs = await pickVideoFiles()
    if (!inputs || inputs.length === 0) return

    const newResults: FileState[] = inputs.map((input) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      inputMapRef.current.set(id, input)
      return {
        id,
        path: isTauri() ? (input.file as string) : '',
        name: input.name,
        originalSize: input.size,
        compressedSize: 0,
        outputPath: '',
        status: 'pending',
        progress: 0,
        input,
      }
    })
    setResults((prev) => [...prev, ...newResults])
  }, [])

  const handleRemove = useCallback((id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id))
    inputMapRef.current.delete(id)
  }, [])

  const updateResult = useCallback(
    (id: string, patch: Partial<FileState>) => {
      setResults((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      )
    },
    [],
  )

  const startCompression = useCallback(async () => {
    if (isProcessing) return
    setIsProcessing(true)

    const pending = results.filter((r) => r.status === 'pending')

    for (const item of pending) {
      const input = inputMapRef.current.get(item.id)
      if (!input) continue

      const outputHint = isTauri()
        ? deriveOutputPathWeb(input.file as string)
        : ''

      updateResult(item.id, {
        status: 'processing',
        progress: 0,
        outputPath: outputHint,
      })

      try {
        const result = await compressVideo(
          input,
          outputHint,
          settings,
          (progress) => updateResult(item.id, { progress }),
        )

        updateResult(item.id, {
          status: 'done',
          progress: 100,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          outputPath: result.output,
        })
      } catch (err) {
        updateResult(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    setIsProcessing(false)
  }, [isProcessing, results, settings, updateResult])

  const hasPending = results.some((r) => r.status === 'pending')
  const totalOriginal = results.reduce((s, r) => s + r.originalSize, 0)
  const totalCompressed = results
    .filter((r) => r.status === 'done')
    .reduce((s, r) => s + r.compressedSize, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-gray-100">
      <div className="max-w-3xl mx-auto px-5 py-8">
        {/* Header badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" />
            {isTauri() ? '桌面端 · 本地处理' : '在线压缩 · 浏览器本地处理'}
          </div>
        </div>

        {/* Upload zone */}
        <div
          onClick={handlePickFiles}
          className="group cursor-pointer rounded-3xl border-2 border-dashed border-gray-200 bg-white hover:border-blue-400 hover:bg-gradient-to-b hover:from-blue-50/50 hover:to-indigo-50/30 p-10 text-center transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 mb-6"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
            <Play className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">选择视频文件</h3>
          <p className="text-sm text-gray-500 mb-4">点击或拖入视频，支持批量选择</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handlePickFiles()
            }}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-medium text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            添加视频
          </button>
        </div>

        {results.length > 0 && (
          <>
            <SettingsPanel
              settings={settings}
              onChange={setSettings}
              disabled={isProcessing}
            />

            {/* Action bar */}
            <div className="sticky bottom-4 z-20 bg-white/90 backdrop-blur rounded-2xl border border-gray-100 shadow-lg p-4 flex items-center justify-between gap-3 mt-5">
              <div className="text-sm">
                <span className="text-gray-500">
                  共 <span className="font-semibold text-gray-700 tabular-nums">{results.length}</span> 个文件
                </span>
                {totalCompressed > 0 && (
                  <span className="ml-3 inline-flex items-center gap-1 text-green-600 font-semibold tabular-nums">
                    <CheckCircle2 className="w-4 h-4" />
                    已节省 {formatBytes(totalOriginal - totalCompressed)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={startCompression}
                disabled={!hasPending || isProcessing}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    压缩中…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    开始压缩
                  </>
                )}
              </button>
            </div>

            {/* File list */}
            <div className="space-y-3 mt-5">
              {results.map((r) => (
                <FileRow
                  key={r.id}
                  result={r}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function deriveOutputPathWeb(inputPath: string): string {
  const lastDot = inputPath.lastIndexOf('.')
  const base = lastDot > 0 ? inputPath.slice(0, lastDot) : inputPath
  return `${base}_compressed.mp4`
}

function FileRow({
  result,
  onRemove,
}: {
  result: FileState
  onRemove: (id: string) => void
}) {
  const { name, originalSize, compressedSize, outputPath, status, progress, error } = result

  const savedPercent =
    compressedSize > 0 && originalSize > 0
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : 0

  const revealInFinder = async () => {
    if (isTauri() && outputPath) {
      try {
        await invoke('reveal_in_finder', { path: outputPath })
      } catch {
        // ignore
      }
    }
  }

  const copyPath = async () => {
    if (outputPath) {
      try {
        await writeText(outputPath)
      } catch {
        // ignore
      }
    }
  }

  const displayDir =
    outputPath && isTauri()
      ? outputPath.substring(0, outputPath.lastIndexOf('/'))
      : ''

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Play className="w-5 h-5 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-800 truncate text-sm">{name}</p>
              <p className="text-xs text-gray-400 tabular-nums mt-0.5">
                {originalSize > 0 ? (
                  <>
                    {formatBytes(originalSize)}
                    {status === 'done' && (
                      <>
                        {' → '}
                        <span className="text-green-600 font-medium">
                          {formatBytes(compressedSize)}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
                    读取中…
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(result.id)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3">
            {status === 'pending' && (
              <p className="text-xs text-gray-400">等待处理…</p>
            )}

            {status === 'processing' && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-blue-600 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    压缩中…
                  </span>
                  <span className="text-gray-500 tabular-nums font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {status === 'done' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-700 font-medium">完成</span>
                    <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums">
                      -{savedPercent}%
                    </span>
                  </div>
                  {isTauri() ? (
                    <button
                      type="button"
                      onClick={revealInFinder}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      在访达中显示
                    </button>
                  ) : (
                    <a
                      href={outputPath}
                      download={`${name.replace(/\.[^.]+$/, '')}_compressed.mp4`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      下载
                    </a>
                  )}
                </div>

                {isTauri() && displayDir && (
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs text-gray-500 truncate flex-1 font-mono">
                      {displayDir}
                    </span>
                    <button
                      type="button"
                      onClick={copyPath}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs">{error || '压缩失败'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
