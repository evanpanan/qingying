import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Check, Clipboard, Link2, X, FolderOpen, History } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isTauri } from '../lib/env'
import { identifyPlatform, shareUrl, type DownloadData, type DownloadFormat } from '../lib/media'

interface RecordItem { title: string; url: string; date: string }
function loadHistory(): RecordItem[] {
  try {
    const items = JSON.parse(localStorage.getItem('lightvid.downloads.v1') || '[]')
    return Array.isArray(items) ? items.filter((i) => typeof i?.title === 'string' && typeof i?.url === 'string').slice(0, 6) : []
  } catch { return [] }
}
function historyItem(title: string, url: string): RecordItem {
  return { title, url, date: new Date().toLocaleDateString('zh-CN') }
}

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

export default function DownloadTool() {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<DownloadData | null>(null)
  const [selected, setSelected] = useState(0)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [savedPath, setSavedPath] = useState('')
  const [history, setHistory] = useState(loadHistory)
  const [showHistory, setShowHistory] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const sourceRef = useRef('')
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const platform = identifyPlatform(input)

  useEffect(() => () => requestRef.current?.abort(), [])

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

  function remember() {
    const item = historyItem(data?.title || '视频', sourceRef.current)
    const next = [item, ...history.filter((i) => i.url !== item.url)].slice(0, 6)
    setHistory(next)
    try { localStorage.setItem('lightvid.downloads.v1', JSON.stringify(next)) } catch { /* 存储关闭不影响下载。 */ }
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
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}&download=${encodeURIComponent(name)}`, { signal: controller.signal })
        if (!response.ok) {
          const json = await response.json().catch(() => null)
          throw new Error(json?.error || '文件下载失败，请重新解析获取新链接')
        }
        const imageExt: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }
        const actualExt = imageExt[response.headers.get('content-type')?.split(';')[0] || '']
        if (actualExt) name = name.replace(/\.[^.]+$/, `.${actualExt}`)
        const total = Number(response.headers.get('content-length')) || 0
        if (total > 500 * 1024 * 1024) { controller.abort(); throw new Error('大于 500 MB 的文件请使用桌面版下载') }
        const reader = response.body?.getReader()
        if (!reader) throw new Error('未收到下载文件')
        const chunks: ArrayBuffer[] = []
        let received = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          received += value.byteLength
          if (received > 500 * 1024 * 1024) { controller.abort(); throw new Error('大文件请使用桌面版下载') }
          chunks.push(value.slice().buffer as ArrayBuffer)
          if (total) setProgress(Math.min(99, Math.round(received / total * 100)))
        }
        if (!received) throw new Error('文件为空，请重新解析')
        const objectUrl = URL.createObjectURL(new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' }))
        const anchor = document.createElement('a')
        anchor.href = objectUrl; anchor.download = name
        document.body.appendChild(anchor); anchor.click(); anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
        setSavedPath(name)
      }
      setProgress(100); remember()
    } catch (e) { setError((e as Error).name === 'AbortError' ? '下载已取消' : (e as Error).message) }
    finally { setSaving(false) }
  }

  const formats = data?.formats?.length ? data.formats : data?.url ? [{ id: 'original', label: '原文件', url: data.url, ext: data.type === 'audio' ? 'm4a' : 'mp4' }] : []
  const current = formats[selected]
  return (
    <div className="download-tool">
      <div className="tool-topline"><span><span className={`status-dot ${busy ? 'working' : ''}`} /> {busy ? '正在寻找你的文件' : '一个链接，从这里开始'}</span><span>01 / DOWNLOAD</span></div>
      <label className="sr-only" htmlFor="share-link">视频分享链接</label>
      <div className={`link-field ${busy ? 'scanning' : ''}`}>
        <Link2 size={22} />
        <textarea id="share-link" ref={fieldRef} value={input} disabled={busy || saving} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void parse() } }} placeholder="粘贴视频链接，或整段分享文案…" rows={2} />
        {input && !busy && !saving && <button className="icon-button" aria-label="清空链接" onClick={() => { setInput(''); setData(null); setError(''); fieldRef.current?.focus() }}><X size={18} /></button>}
      </div>
      <div className="tool-actions">
        <button className="primary-button" disabled={busy || saving} onClick={() => void parse()}>{busy ? <span className="signal-bars"><i /><i /><i /></span> : <ArrowDown size={18} />}{busy ? '正在解析' : '解析并下载'}</button>
        <button className="quiet-button" disabled={busy || saving} onClick={async () => { try { setInput(await navigator.clipboard.readText()); fieldRef.current?.focus() } catch { setError('浏览器未允许读取剪贴板，请直接粘贴链接') } }}><Clipboard size={16} />粘贴</button>
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
      {showHistory && <div className="download-history">{history.length ? history.map((item) => <button key={item.url} disabled={busy || saving} onClick={() => { setInput(item.url); setData(null); setError(''); fieldRef.current?.focus() }}><span>{item.title}</span><small>{item.date}</small><ArrowUpRight size={16} /></button>) : <p>还没有记录，保存第一个视频后会出现在这里。</p>}{history.length > 0 && <button className="quiet-button" onClick={() => { setHistory([]); localStorage.removeItem('lightvid.downloads.v1') }}>清除记录</button>}</div>}
    </div>
  )
}
