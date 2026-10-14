import { History, Trash2, FolderOpen, FileVideo, Copy, Trash, Inbox, TrendingDown } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import type { HistoryRecord } from '../lib/history'
import { formatBytes } from '../lib/ffmpeg'

interface HistoryListProps {
  records: HistoryRecord[]
  onRemove: (id: string) => void
  onClear: () => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function HistoryList({ records, onRemove, onClear }: HistoryListProps) {
  const revealInFinder = async (path: string) => {
    try {
      await invoke('reveal_in_finder', { path })
    } catch (e) {
      console.error(e)
    }
  }

  const copyPath = async (path: string) => {
    try {
      await writeText(path)
    } catch (e) {
      console.error(e)
    }
  }

  const totalSaved = records.reduce((s, r) => s + (r.originalSize - r.compressedSize), 0)

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
            <History className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <h2 className="text-[15px] font-semibold text-gray-800">历史记录</h2>
          {records.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {records.length}
            </span>
          )}
        </div>
        {records.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash className="w-3.5 h-3.5" />
            清空
          </button>
        )}
      </div>

      {records.length > 0 ? (
        <>
          {totalSaved > 0 && (
            <p className="text-xs text-green-600 mb-3 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              累计节省 <span className="font-semibold tabular-nums">{formatBytes(totalSaved)}</span>
            </p>
          )}

          <div className="space-y-2.5">
            {records.map((r) => {
              const savedPercent =
                r.originalSize > 0
                  ? Math.round(((r.originalSize - r.compressedSize) / r.originalSize) * 100)
                  : 0
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-gray-100 p-3.5 flex items-center gap-3 hover:shadow-sm transition-shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <FileVideo className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400 tabular-nums mt-0.5">
                      {formatBytes(r.originalSize)} →{' '}
                      <span className="text-green-600 font-medium">{formatBytes(r.compressedSize)}</span>
                      <span className="text-gray-300 mx-1">·</span>
                      <span className="text-green-600">-{savedPercent}%</span>
                      <span className="text-gray-300 mx-1">·</span>
                      {formatDate(r.compressedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => revealInFinder(r.outputPath)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                      title="在访达中显示"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => copyPath(r.outputPath)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="复制路径"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(r.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                      title="删除记录"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 border-dashed p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500 font-medium">暂无压缩记录</p>
          <p className="text-xs text-gray-400 mt-1">压缩完成的视频会显示在这里</p>
        </div>
      )}
    </section>
  )
}
