import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Check, Clipboard, Link2, X, FolderOpen, History } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isTauri } from '../lib/env'
import { identifyPlatform, shareUrl, type DownloadData, type DownloadFormat } from '../lib/media'
import { downloadMedia } from '../lib/download'
import { canReportStats, reportCompletedVideoDownload } from '../lib/stats'
import { readClipboard } from '../lib/desktop'
import { downloadRecord, loadDownloadHistory, saveDownloadHistory, subscribeDownloadHistory } from '../lib/download-history'

function normalizeNative(info: any, platformName: string): DownloadData {
  if (!info || ['playlist', 'multi_video'].includes(info._type)) throw new Error('请使用单个作品链接')
  if (info.is_live) throw new Error('暂不支持持续录制直播，请使用已发布的作品')
  const source = info.formats || [info]
  const video = source.some((f: any) => f.vcodec ? f.vcodec !== 'none' : ['mp4', 'mov', 'webm', 'mkv', 'm4v', 'avi'].includes(f.ext))
  const formats: DownloadFormat[] = source.filter((f: any) =>
    f.url?.startsWith('https://') && !f.has_drm && f.acodec !== 'none' &&
    ['https', 'http', undefined].includes(f.protocol),
  ).map((f: any) => ({ id: String(f.format_id), label: f.height ? `${f.height}p · ${f.ext}` : `原文件 · ${f.ext}`, url: f.url, ext: f.ext, audioOnly: f.vcodec === 'none' })).reverse()
  return { title: info.title, author: info.uploader, platformName, type: video ? 'video' : 'audio', formats, url: formats[0]?.url }
}

export default function DownloadTool({ guidanceKey = 0 }: { guidanceKey?: number }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<DownloadData | null>(null)
  const [selected, setSelected] = useState(0)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [savedPath, setSavedPath] = useState('')
  const [history, setHistory] = useState(loadDownloadHistory)
  const [showHistory, setShowHistory] = useState(false)
  const [guided, setGuided] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const sourceRef = useRef('')
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const platform = identifyPlatform(input)

  useEffect(() => () => requestRef.current?.abort(), [])
  useEffect(() => subscribeDownloadHistory(() => setHistory(loadDownloadHistory())), [])

  useEffect(() => {
    const field = fieldRef.current
    if (!guidanceKey || !field) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const bounds = field.getBoundingClientRect()
    field.focus({ preventScroll: true })
    // Only bring an offscreen field into view; the desktop CTA points right.
    if (bounds.top < 100 || bounds.bottom > window.innerHeight - 24) {
      field.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
    }
    setGuided(true)
    const animation = reduced ? undefined : field.parentElement?.animate([
      { backgroundColor: '#f7f9f1', boxShadow: '0 0 0 0 #a6b79300' },
      { backgroundColor: '#e3edda', boxShadow: '0 0 0 6px #a6b79340', offset: 0.5 },
      { backgroundColor: '#f7f9f1', boxShadow: '0 0 0 0 #a6b79300' },
    ], { duration: 900, iterations: 2, easing: 'ease-in-out' })
    const timer = window.setTimeout(() => setGuided(false), 2200)
    return () => { animation?.cancel(); window.clearTimeout(timer) }
  }, [guidanceKey])

  async function parse() {
    if (busy || saving) return
    setError('')
    let url: string
    try { url = shareUrl(input) } catch (e) { setError((e as Error).message); return }
    setBusy(true)
    setData(null)
    setSavedPath('')
    setSelected(0)
    sourceRef.current = url
    const controller = new AbortController()
    requestRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 55000)
    try {
      let result: DownloadData
      if (isTauri()) {
        const info: any = await invoke('native_extract', { url })
        result = normalizeNative(info, platform?.name || info.extractor_key || new URL(url).hostname)
      } else {
        const response = await fetch('/api/extract', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }), signal: controller.signal,
        })
        const json = await response.json().catch(() => null)
        if (!response.ok || !json?.ok) throw new Error(json?.error || '解析暂时不可用，请稍后重试')
        result = json.data
      }
      setData(result)
    } catch (e) {
      setError((e as Error).name === 'AbortError' ? '解析超时，请稍后重试或使用桌面版' : (e as Error).message)
    } finally { clearTimeout(timeout); setBusy(false) }
  }

  function remember(video: boolean) {
    const statsEventId = video && canReportStats() ? crypto.randomUUID() : undefined
    const type = video ? 'video' : data?.type === 'image' ? 'image' : 'audio'
    const item = downloadRecord(data?.title || '视频', sourceRef.current, type, statsEventId)
    saveDownloadHistory([item, ...loadDownloadHistory().filter(i => i.url !== item.url)])
    return statsEventId
  }

  async function save(url?: string, ext = 'mp4', index?: number) {
    if (saving) return
    setSaving(true); setError(''); setProgress(null)
    try {
      if (isTauri()) {
        const taskId = crypto.randomUUID()
        const unlisten = await listen<{ task_id: string; progress: number }>('download-progress', (event) => {
          if (event.payload.task_id === taskId) setProgress(event.payload.progress)
        })
        try {
          const path = await invoke<string>('native_download', { url: sourceRef.current, taskId })
          setSavedPath(path)
        } finally { unlisten() }
      } else {
        if (!url) throw new Error('此作品请使用桌面版下载')
        let name = `${(data?.title || '轻影').replace(/[\\/:*?"<>|\n\r]/g, '_').slice(0, 60)}${index === undefined ? '' : `_${index + 1}`}.${ext.replace(/[^a-z0-9]/gi, '')}`
        const controller = new AbortController()
        requestRef.current = controller
        const blob = await downloadMedia(`/api/proxy?url=${encodeURIComponent(url)}`, controller.signal, setProgress)
        const imageExt: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }
        const actualExt = imageExt[blob.type.split(';')[0] || '']
        if (actualExt) name = name.replace(/\.[^.]+$/, `.${actualExt}`)
        const objectUrl = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = objectUrl; anchor.download = name
        document.body.appendChild(anchor); anchor.click(); anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
        setSavedPath(name)
      }
      setProgress(100)
      const video = data?.type === 'video' && (isTauri() || !current?.audioOnly)
      const eventId = remember(video)
      if (eventId) void reportCompletedVideoDownload(eventId)
    } catch (e) { setError((e as Error).name === 'AbortError' ? '下载已取消' : (e as Error).message) }
    finally { setSaving(false) }
  }

  const formats = data?.formats?.length ? data.formats : data?.url ? [{ id: 'original', label: '原文件', url: data.url, ext: data.type === 'audio' ? 'm4a' : 'mp4' }] : []
  const current = formats[selected]
  return (
    <div className="download-tool">
      <div className="tool-topline"><span><span className={`status-dot ${busy ? 'working' : ''}`} /> {busy ? '正在寻找你的文件' : guided ? '就在这里，粘贴你的链接' : '一个链接，从这里开始'}</span><span>01 / DOWNLOAD</span></div>
      {guided && <span key={guidanceKey} className="sr-only" role="status">请在视频分享链接输入框中粘贴链接。</span>}
      <label className="sr-only" htmlFor="share-link">视频分享链接</label>
      <div className={`link-field ${busy ? 'scanning' : ''}`} data-guided={guided ? 'true' : 'false'}>
        <Link2 size={22} />
        <textarea id="share-link" ref={fieldRef} value={input} disabled={busy || saving} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void parse() } }} placeholder="粘贴视频链接，或整段分享文案…" rows={2} />
        {input && !busy && !saving && <button className="icon-button" aria-label="清空链接" onClick={() => { setInput(''); setData(null); setError(''); fieldRef.current?.focus() }}><X size={18} /></button>}
      </div>
      <div className="tool-actions">
        <button className="primary-button" disabled={busy || saving} onClick={() => void parse()}>{busy ? <span className="signal-bars"><i /><i /><i /></span> : <ArrowDown size={18} />}{busy ? '正在解析' : '解析并下载'}</button>
        <button className="quiet-button" disabled={busy || saving} onClick={async () => { try { setInput(await readClipboard()); fieldRef.current?.focus() } catch { setError('未允许读取剪贴板，请直接粘贴链接') } }}><Clipboard size={16} />粘贴</button>
        <span className="detected-platform">{platform?.name || '自动识别平台'}</span>
      </div>
      {error && <p className="tool-error" role="alert">{error}</p>}
      {data && <div className="download-result reveal">
        <div className="result-heading"><span className="eyebrow">{data.platformName} / {data.type === 'image' ? 'IMAGE' : 'MEDIA'}</span><h3>{data.title || '你的文件已就绪'}</h3>{data.author && <p>{data.author}</p>}</div>
        {data.type === 'image' ? <div className="image-results">{data.images?.map((image, index) => <button key={`${index}-${image.url}`} onClick={() => void save(image.url, 'jpg', index)} disabled={saving}><img alt={`图片 ${index + 1}`} src={`/api/proxy?url=${encodeURIComponent(image.url)}`} loading="lazy" /><span><ArrowDown size={15} />保存 {index + 1}</span></button>)}</div> : <>
          {!isTauri() && formats.length > 1 && <div className="format-choices">{formats.map((f, index) => <button key={f.id} disabled={saving} className={index === selected ? 'selected' : ''} onClick={() => setSelected(index)}>{f.label}</button>)}</div>}
          {!isTauri() && current && (current.audioOnly || data.type === 'audio' ? <audio controls src={`/api/proxy?url=${encodeURIComponent(current.url)}`} /> : <video key={current.id} controls playsInline preload="none" src={`/api/proxy?url=${encodeURIComponent(current.url)}`} />)}
          <button className="primary-button" disabled={saving} onClick={() => void save(current?.url, current?.ext)}><ArrowDown size={18} />{saving ? `保存中${progress !== null ? ` ${progress}%` : ''}` : isTauri() ? data.type === 'audio' ? '保存音频' : '保存完整视频 · 最高 1080p' : `保存 ${current?.label || '文件'}`}</button>
        </>}
        {saving && <div className={`job-progress ${progress === null ? 'indeterminate' : ''}`} role="progressbar" aria-label="下载进度" aria-valuenow={progress ?? undefined}><span style={{ width: progress === null ? '35%' : `${progress}%` }} /></div>}
        {savedPath && !saving && <div className="success-note"><Check size={17} />文件已保存{isTauri() && <button className="quiet-button" onClick={() => void invoke('reveal_in_finder', { path: savedPath }).catch(() => setError('无法打开文件目录'))}><FolderOpen size={16} />打开目录</button>}</div>}
      </div>}
      <div className="history-strip"><button className="quiet-button" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}><History size={16} />最近下载<span>{history.length}</span></button><span>仅保存在本机</span></div>
      {showHistory && <div className="download-history">{history.length ? history.map((item) => <button key={item.url} disabled={busy || saving} onClick={() => { setInput(item.url); setData(null); setError(''); fieldRef.current?.focus() }}><span>{item.title}</span><small>{item.date}</small><ArrowUpRight size={16} /></button>) : <p>还没有记录，保存第一个视频后会出现在这里。</p>}{history.length > 0 && <button className="quiet-button" onClick={() => saveDownloadHistory([])}>清除记录</button>}</div>}
    </div>
  )
}
