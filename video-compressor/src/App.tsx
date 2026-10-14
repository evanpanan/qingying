import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import UploadZone from './components/UploadZone'
import SettingsPanel from './components/SettingsPanel'
import FileCard from './components/FileCard'
import HistoryList from './components/HistoryList'
import {
  compressVideo,
  deriveOutputPath,
  formatBytes,
  pickVideoFiles,
} from './lib/ffmpeg'
import {
  loadHistory,
  saveToHistory,
  removeFromHistory,
  clearHistory,
  type HistoryRecord,
} from './lib/history'
import type {
  CompressionSettings,
  CompressionResult,
  VideoFile,
} from './types'
import { Play, Zap, Shield, Sparkles, Lock, CheckCircle2, Loader2 } from 'lucide-react'

const DEFAULT_SETTINGS: CompressionSettings = {
  quality: 'standard',
  resolution: 'original',
  outputFormat: 'mp4',
}

export default function App() {
  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_SETTINGS)
  const [results, setResults] = useState<CompressionResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const fileMapRef = useRef<Map<string, VideoFile>>(new Map())

  // Load history on mount.
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const handlePickFiles = useCallback(async () => {
    const paths = await pickVideoFiles()
    if (!paths || paths.length === 0) return

    const files: VideoFile[] = []
    for (const path of paths) {
      // Get file size via a head request to the local file is not possible in Tauri;
      // we read size from the result of compression. For display, use 0 initially.
      const name = path.split('/').pop() || path
      files.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        path,
        name,
        size: 0,
      })
    }

    files.forEach((f) => fileMapRef.current.set(f.id, f))
    const newResults: CompressionResult[] = files.map((f) => ({
      id: f.id,
      path: f.path,
      name: f.name,
      originalSize: 0,
      compressedSize: 0,
      outputPath: '',
      status: 'pending',
      progress: 0,
    }))
    setResults((prev) => [...prev, ...newResults])
  }, [])

  const handleRemove = useCallback((id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id))
    fileMapRef.current.delete(id)
  }, [])

  const handleRemoveHistory = useCallback((id: string) => {
    removeFromHistory(id)
    setHistory(loadHistory())
  }, [])

  const handleClearHistory = useCallback(() => {
    clearHistory()
    setHistory([])
  }, [])

  const updateResult = useCallback(
    (id: string, patch: Partial<CompressionResult>) => {
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
      const file = fileMapRef.current.get(item.id)
      if (!file) continue

      const outputPath = deriveOutputPath(file.path)
      updateResult(item.id, { status: 'processing', progress: 0, outputPath })

      try {
        const result = await compressVideo(
          file.path,
          outputPath,
          settings,
          (progress) => updateResult(item.id, { progress }),
        )

        updateResult(item.id, {
          status: 'done',
          progress: 100,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
        })

        // Save to history.
        const doneResult: CompressionResult = {
          id: item.id,
          path: file.path,
          name: file.name,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          outputPath,
          status: 'done',
          progress: 100,
        }
        saveToHistory(doneResult)
        setHistory(loadHistory())
      } catch (err) {
        updateResult(item.id, {
          status: 'error',
          error:
            err instanceof Error ? err.message : String(err),
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
      <Header />

      <main className="max-w-3xl mx-auto px-5 py-8">
        {/* Hero */}
        <section className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mb-5 border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" />
            本地处理 · 隐私安全 · 文件不上传
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            轻影
          </h1>
          <p className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            视频一键瘦身，体积减半画质不变
          </p>
          <p className="text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
            采用智能 H.264 压缩算法，最高可减少 80% 文件体积。轻松解决微信、邮件、网盘上传视频受限的烦恼。
          </p>
        </section>

        {/* Features strip */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Zap, text: '极速压缩', desc: '原生引擎' },
            { icon: Lock, text: '隐私安全', desc: '本地处理' },
            { icon: Play, text: '全格式支持', desc: 'MP4/MOV/MKV' },
          ].map(({ icon: Icon, text, desc }) => (
            <div
              key={text}
              className="flex flex-col items-center gap-1 bg-white rounded-2xl py-4 border border-gray-100 shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-1">
                <Icon className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-gray-800">{text}</span>
              <span className="text-[10px] text-gray-400">{desc}</span>
            </div>
          ))}
        </div>

        {results.length === 0 ? (
          <UploadZone onPickFiles={handlePickFiles} />
        ) : (
          <div className="space-y-5">
            <UploadZone onPickFiles={handlePickFiles} />

            <SettingsPanel
              settings={settings}
              onChange={setSettings}
              disabled={isProcessing}
            />

            {/* Action bar */}
            <div className="sticky bottom-4 z-20 glass rounded-2xl border border-gray-200/60 shadow-xl p-4 flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-gray-500">共 <span className="font-semibold text-gray-700 tabular-nums">{results.length}</span> 个文件</span>
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
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
            <div className="space-y-3">
              {results.map((r) => (
                <FileCard key={r.id} result={r} onRemove={handleRemove} />
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <HistoryList
          records={history}
          onRemove={handleRemoveHistory}
          onClear={handleClearHistory}
        />

        {/* Bottom info */}
        <footer className="mt-12 text-center text-xs text-gray-400">
          <p className="flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            所有处理均在本地完成，您的视频不会上传到任何服务器
          </p>
          <p className="mt-2">轻影 LightVid · 基于 FFmpeg 引擎 · H.264 编码 · 原生应用</p>
        </footer>
      </main>
    </div>
  )
}
