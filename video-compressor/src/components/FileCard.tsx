import {
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
  Copy,
  X,
  TrendingDown,
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import type { CompressionResult } from '../types'
import { formatBytes } from '../lib/ffmpeg'

interface FileCardProps {
  result: CompressionResult
  onRemove: (id: string) => void
}

export default function FileCard({ result, onRemove }: FileCardProps) {
  const {
    name,
    originalSize,
    compressedSize,
    outputPath,
    status,
    progress,
    error,
  } = result

  const savedBytes = originalSize - compressedSize
  const savedPercent =
    compressedSize > 0 && originalSize > 0
      ? Math.round((savedBytes / originalSize) * 100)
      : 0

  const revealInFinder = async () => {
    if (outputPath) {
      try {
        await invoke('reveal_in_finder', { path: outputPath })
      } catch (e) {
        console.error('reveal failed', e)
      }
    }
  }

  const copyPath = async () => {
    if (outputPath) {
      try {
        await writeText(outputPath)
      } catch (e) {
        console.error('copy failed', e)
      }
    }
  }

  // Get the directory path for display.
  const displayDir = outputPath ? outputPath.substring(0, outputPath.lastIndexOf('/')) : ''

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 animate-fade-in">
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center flex-shrink-0">
          <FileVideo className="w-5 h-5 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate text-[14px]">{name}</p>
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
                    读取文件信息中…
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(result.id)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors"
              aria-label="移除"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status / progress */}
          <div className="mt-3.5">
            {status === 'pending' && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                等待处理
              </div>
            )}

            {status === 'processing' && (
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-blue-600 flex items-center gap-1.5 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    压缩中…
                  </span>
                  <span className="text-gray-500 tabular-nums font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {status === 'done' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                    <span className="text-green-700 font-medium">压缩完成</span>
                    <span className="inline-flex items-center gap-0.5 bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums">
                      <TrendingDown className="w-3 h-3" />
                      -{savedPercent}%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={revealInFinder}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    在访达中显示
                  </button>
                </div>

                {/* Output path */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                  <span className="text-xs text-gray-500 truncate flex-1 font-mono" title={outputPath}>
                    {displayDir}
                  </span>
                  <button
                    type="button"
                    onClick={copyPath}
                    className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
                    title="复制路径"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs">{error || '压缩失败'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
