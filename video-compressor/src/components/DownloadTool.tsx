import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowDown, ArrowUpRight, Check, Clipboard, Link2, X, FolderOpen, History, RotateCcw } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isTauri } from '../lib/env'
import { identifyPlatform, shareUrl, type DownloadData, type DownloadFormat } from '../lib/media'
import { downloadMedia } from '../lib/download'
import { canReportStats, reportCompletedVideoDownload } from '../lib/stats'
import { readClipboard } from '../lib/desktop'
import { downloadRecord, loadDownloadHistory, saveDownloadHistory, subscribeDownloadHistory } from '../lib/download-history'
import { DownloadQueue, DOWNLOAD_CONCURRENCY, type DownloadJob } from '../lib/download-queue'

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

async function executeDownload(job: DownloadJob, signal: AbortSignal, onProgress: (value: number) => void) {
  const input = job.input
  if (input.native) {
    const unlisten = await listen<{ task_id: string; progress: number }>('download-progress', event => {
      if (event.payload.task_id === job.id) onProgress(event.payload.progress)
    })
    try { return await invoke<string>('native_download', { url: input.sourceUrl, taskId: job.id }) }
    finally { unlisten() }
  }
  if (!input.mediaUrl) throw new Error('此作品请使用桌面版下载')
  let name = `${input.title.replace(/[\\/:*?"<>|\n\r]/g, '_').slice(0, 60)}${input.index === undefined ? '' : `_${input.index + 1}`}.${input.ext.replace(/[^a-z0-9]/gi, '')}`
  const blob = await downloadMedia(`/api/proxy?url=${encodeURIComponent(input.mediaUrl)}`, signal, onProgress)
  signal.throwIfAborted()
  const imageExt: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }
  const actualExt = imageExt[blob.type.split(';')[0] || '']
  if (actualExt) name = name.replace(/\.[^.]+$/, `.${actualExt}`)
  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = objectUrl; anchor.download = name
    document.body.appendChild(anchor); anchor.click(); anchor.remove()
  } finally { window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000) }
  return name
}

function rememberDownload(job: DownloadJob) {
  const video = job.input.type === 'video'
  const statsEventId = video && canReportStats() ? crypto.randomUUID() : undefined
  const item = downloadRecord(job.input.title, job.input.sourceUrl, job.input.type, statsEventId)
  saveDownloadHistory([item, ...loadDownloadHistory().filter(i => i.url !== item.url)])
  const eventId = statsEventId
  if (eventId) void reportCompletedVideoDownload(eventId)
}

export default function DownloadTool({ guidanceKey = 0 }: { guidanceKey?: number }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<DownloadData | null>(null)
  const [selected, setSelected] = useState(0)
  const [queue] = useState(() => new DownloadQueue({ execute: executeDownload, onCompleted: rememberDownload }))
  const jobs = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot)
  const [history, setHistory] = useState(loadDownloadHistory)
  const [showHistory, setShowHistory] = useState(false)
  const [guided, setGuided] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const platform = identifyPlatform(input)

  useEffect(() => () => { requestRef.current?.abort(); queue.cancelAll() }, [queue])
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
    if (busy) return
    setError('')
    let url: string
    try { url = shareUrl(input) } catch (e) { setError((e as Error).message); return }
    setBusy(true)
    setData(null)
    setSelected(0)
    setSourceUrl(url)
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

  function save(url?: string, ext = 'mp4', index?: number) {
    if (!data) return
    const native = isTauri()
    const type = data.type === 'image' ? 'image' : data.type === 'video' && (native || !current?.audioOnly) ? 'video' : 'audio'
    queue.enqueue({ sourceUrl, title: data.title || '视频', type, mediaUrl: url, ext, index, native })
  }

  const formats = data?.formats?.length ? data.formats : data?.url ? [{ id: 'original', label: '原文件', url: data.url, ext: data.type === 'audio' ? 'm4a' : 'mp4' }] : []
  const current = formats[selected]
  const currentJob = jobs.find(job => job.input.sourceUrl === sourceUrl && job.input.mediaUrl === current?.url && ['queued', 'downloading'].includes(job.status))
  const running = jobs.filter(job => job.status === 'downloading').length
  const waiting = jobs.filter(job => job.status === 'queued').length
  return (
    <div className="download-tool">
      <div className="tool-topline"><span><span className={`status-dot ${busy ? 'working' : ''}`} /> {busy ? '正在寻找你的文件' : guided ? '就在这里，粘贴你的链接' : '一个链接，从这里开始'}</span><span>01 / DOWNLOAD</span></div>
      {guided && <span key={guidanceKey} className="sr-only" role="status">请在视频分享链接输入框中粘贴链接。</span>}
      <label className="sr-only" htmlFor="share-link">视频分享链接</label>
      <div className={`link-field ${busy ? 'scanning' : ''}`} data-guided={guided ? 'true' : 'false'}>
        <Link2 size={22} />
        <textarea id="share-link" ref={fieldRef} value={input} disabled={busy} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void parse() } }} placeholder="粘贴视频链接，或整段分享文案…" rows={2} />
        {input && !busy && <button className="icon-button" aria-label="清空链接" onClick={() => { setInput(''); setData(null); setError(''); fieldRef.current?.focus() }}><X size={18} /></button>}
      </div>
      <div className="tool-actions">
        <button className="primary-button" disabled={busy} onClick={() => void parse()}>{busy ? <span className="signal-bars"><i /><i /><i /></span> : <ArrowDown size={18} />}{busy ? '正在解析' : '解析并下载'}</button>
        <button className="quiet-button" disabled={busy} onClick={async () => { try { setInput(await readClipboard()); fieldRef.current?.focus() } catch { setError('未允许读取剪贴板，请直接粘贴链接') } }}><Clipboard size={16} />粘贴</button>
        <span className="detected-platform">{platform?.name || '自动识别平台'}</span>
      </div>
      {error && <p className="tool-error" role="alert">{error}</p>}
      {data && <div className="download-result reveal">
        <div className="result-heading"><span className="eyebrow">{data.platformName} / {data.type === 'image' ? 'IMAGE' : 'MEDIA'}</span><h3>{data.title || '你的文件已就绪'}</h3>{data.author && <p>{data.author}</p>}</div>
        {data.type === 'image' ? <div className="image-results">{data.images?.map((image, index) => <button key={`${index}-${image.url}`} onClick={() => save(image.url, 'jpg', index)} disabled={jobs.some(job => job.input.sourceUrl === sourceUrl && job.input.index === index && ['queued', 'downloading'].includes(job.status))}><img alt={`图片 ${index + 1}`} src={`/api/proxy?url=${encodeURIComponent(image.url)}`} loading="lazy" /><span><ArrowDown size={15} />保存 {index + 1}</span></button>)}</div> : <>
          {!isTauri() && formats.length > 1 && <div className="format-choices">{formats.map((f, index) => <button key={f.id} className={index === selected ? 'selected' : ''} onClick={() => setSelected(index)}>{f.label}</button>)}</div>}
          {!isTauri() && current && (current.audioOnly || data.type === 'audio' ? <audio controls src={`/api/proxy?url=${encodeURIComponent(current.url)}`} /> : <video key={current.id} controls playsInline preload="none" src={`/api/proxy?url=${encodeURIComponent(current.url)}`} />)}
          <button className="primary-button" disabled={Boolean(currentJob)} onClick={() => save(current?.url, current?.ext)}><ArrowDown size={18} />{currentJob ? currentJob.status === 'queued' ? '已加入下载队列' : `下载中${currentJob.progress !== null ? ` ${currentJob.progress}%` : ''}` : isTauri() ? data.type === 'audio' ? '保存音频' : '保存完整视频 · 最高 1080p' : `保存 ${current?.label || '文件'}`}</button>
        </>}
      </div>}
      {jobs.length > 0 && <section className="download-jobs" aria-label="下载任务">
        <div className="download-jobs-heading"><h3>下载任务 <span>{running} 个下载中{waiting > 0 ? ` · ${waiting} 个等待中` : ''}</span></h3>{jobs.some(job => !['queued', 'downloading'].includes(job.status)) && <button className="quiet-button" onClick={() => queue.clearFinished()}>清理已结束</button>}</div>
        <p className="download-jobs-hint">可继续粘贴新链接 · 同时下载 {DOWNLOAD_CONCURRENCY} 个，其余自动排队</p>
        <ol className="download-job-list">{jobs.map(job => <li className="download-job" key={job.id} data-job-id={job.id} data-status={job.status}>
          <div className="download-job-top"><div className="download-job-name"><strong title={job.input.title}>{job.input.title}{job.input.index === undefined ? '' : ` · 图片 ${job.input.index + 1}`}</strong><small>{job.input.ext.toUpperCase()} · {job.status === 'queued' ? '等待下载' : job.status === 'downloading' ? `下载中${job.progress === null ? '' : ` ${job.progress}%`}` : job.status === 'done' ? '文件已保存' : job.status === 'cancelled' ? '已取消' : '下载失败'}</small></div><div className="download-job-actions">
            {job.status === 'done' && <Check size={17} aria-label="下载成功" />}
            {((job.status === 'downloading' && !job.input.native) || job.status === 'queued') && <button className="quiet-button" onClick={() => queue.cancel(job.id)} aria-label={`取消 ${job.input.title}`}><X size={15} />取消</button>}
            {['error', 'cancelled'].includes(job.status) && <button className="quiet-button" onClick={() => queue.retry(job.id)} aria-label={`重试 ${job.input.title}`}><RotateCcw size={15} />重试</button>}
            {job.status === 'done' && job.input.native && <button className="quiet-button" onClick={() => void invoke('reveal_in_finder', { path: job.output }).catch(() => setError('无法打开文件目录'))}><FolderOpen size={16} />打开目录</button>}
          </div></div>
          {job.status === 'downloading' && <div className={`job-progress ${job.progress === null ? 'indeterminate' : ''}`} role="progressbar" aria-label={`${job.input.title} 下载进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progress ?? undefined}><span style={{ width: job.progress === null ? '35%' : `${job.progress}%` }} /></div>}
          {job.status === 'error' && <p className="tool-error" role="alert">{job.error}</p>}
        </li>)}</ol>
      </section>}
      <div className="history-strip"><button className="quiet-button" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}><History size={16} />最近下载<span>{history.length}</span></button><span>仅保存在本机</span></div>
      {showHistory && <div className="download-history">{history.length ? history.map((item) => <button key={item.url} disabled={busy} onClick={() => { setInput(item.url); setData(null); setError(''); fieldRef.current?.focus() }}><span>{item.title}</span><small>{item.date}</small><ArrowUpRight size={16} /></button>) : <p>还没有记录，保存第一个视频后会出现在这里。</p>}{history.length > 0 && <button className="quiet-button" onClick={() => saveDownloadHistory([])}>清除记录</button>}</div>}
    </div>
  )
}
