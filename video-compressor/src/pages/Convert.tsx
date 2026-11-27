import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowDown, Plus, FileVideo, Check, FolderOpen, X, ShieldCheck } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { pickVideoFiles, formatBytes, type CompressInput } from '../lib/compress'
import { convertVideo } from '../lib/convert'
import { FORMATS, type OutputFormat } from '../lib/media'
import { isTauri } from '../lib/env'
import { useDesktopVideoDrop } from '../lib/desktop'

interface Job {
  id: string; input: CompressInput; state: 'ready' | 'working' | 'done' | 'error'
  progress: number; output?: string; name?: string; size?: number; error?: string
}

export default function Converter({ active = true }: { active?: boolean }) {
  const [format, setFormat] = useState<OutputFormat>('mp4')
  const [jobs, setJobs] = useState<Job[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const busyRef = useRef(false)
  const urls = useRef<string[]>([])
  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), [])
  function add(inputs: CompressInput[]) {
    setJobs((old) => [...old, ...inputs.map((input) => ({ id: crypto.randomUUID(), input, state: 'ready' as const, progress: 0 }))])
  }
  useDesktopVideoDrop(active && !busy, add)
  async function pick() {
    try { const files = await pickVideoFiles(); if (files) add(files) } catch (e) { setError((e as Error).message) }
  }
  async function start() {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setError('')
    const update = (id: string, patch: Partial<Job>) => setJobs((old) => old.map((j) => j.id === id ? { ...j, ...patch } : j))
    try {
      for (const job of jobs.filter((j) => j.state === 'ready' || j.state === 'error')) {
        update(job.id, { state: 'working', progress: 0, error: undefined })
        try {
          const result = await convertVideo(job.input, format, (progress) => update(job.id, { progress }))
          if (!isTauri()) urls.current.push(result.output)
          update(job.id, { state: 'done', progress: 100, ...result })
        } catch (e) { update(job.id, { state: 'error', error: (e as Error).message }) }
      }
    } finally { busyRef.current = false; setBusy(false) }
  }
  return <main className="workspace-page">
    <div className="page-intro reveal"><span className="eyebrow">03 / CONVERT</span><h1>换个格式，<em>继续创作。</em></h1><p>视频格式转换，或只留下你喜欢的声音。</p></div>
    <div className="conversion-layout">
      <section className="studio-panel">
        <div className="section-label"><span>选择输出格式</span><ShieldCheck size={17} /></div>
        <div className="converter-formats">{FORMATS.map((f) => <button key={f.id} disabled={busy} className={format === f.id ? 'selected' : ''} onClick={() => setFormat(f.id)} aria-pressed={format === f.id}><span>{f.name}</span><small>{f.description}</small>{format === f.id && <Check size={16} />}</button>)}</div>
        <div className={`drop-zone ${busy ? 'disabled' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!busy && !isTauri()) add(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(f.name)).map((f) => ({ file: f, name: f.name, size: f.size }))) }}>
          <div className="format-orbit" aria-hidden="true"><FileVideo size={30} /><ArrowRight size={18} /><span>{format.toUpperCase()}</span></div>
          <h2>把视频放进来</h2><p>{isTauri() ? '支持拖入与批量选择 · 原目录保存，不覆盖源文件' : '支持拖入与批量选择 · 500 MB 内 · 本地转换'}</p>
          <button className="primary-button" onClick={() => void pick()} disabled={busy}><Plus size={18} />选择视频</button>
        </div>
        {error && <p role="alert" className="tool-error">{error}</p>}
        <div className="conversion-bottom"><span>{jobs.length ? `${jobs.length} 个文件` : '无需上传到服务器'}</span><button className="primary-button" disabled={busy || !jobs.some((j) => j.state === 'ready' || j.state === 'error')} onClick={() => void start()}>{busy ? <span className="signal-bars"><i /><i /><i /></span> : <ArrowRight size={18} />}{busy ? '转换中' : `转换为 ${format.toUpperCase()}`}</button></div>
      </section>
      <aside className="studio-panel job-panel"><div className="section-label"><span>文件与记录</span><span>{jobs.filter((j) => j.state === 'done').length} / {jobs.length}</span></div>
        {!jobs.length && <div className="empty-jobs"><FileVideo size={36} /><p>你的文件，会在这里变身。</p><span>完成后可直接保存</span></div>}
        {jobs.map((job) => <article className="media-job reveal" key={job.id}><div className="job-title"><FileVideo size={19} /><strong title={job.input.name}>{job.input.name}</strong><button className="icon-button" aria-label={`移除 ${job.input.name}`} disabled={busy} onClick={() => { if (job.output?.startsWith('blob:')) URL.revokeObjectURL(job.output); setJobs((old) => old.filter((j) => j.id !== job.id)) }}><X size={16} /></button></div><small>{job.input.size ? formatBytes(job.input.size) : '本地文件'}{job.size ? ` → ${formatBytes(job.size)}` : ''}</small>
          {job.state === 'working' && <><div className={`job-progress ${job.progress === 0 ? 'indeterminate' : ''}`} role="progressbar" aria-label="转换进度" aria-valuenow={job.progress}><span style={{ width: job.progress ? `${job.progress}%` : '30%' }} /></div><small>{job.progress ? `${job.progress}%` : '正在准备转换引擎'}</small></>}
          {job.state === 'error' && <p className="tool-error" role="alert">{job.error}</p>}
          {job.state === 'done' && <div className="job-complete"><span><Check size={16} />{job.name?.split('.').pop()?.toUpperCase()}</span>{isTauri() ? <button className="quiet-button" onClick={() => void invoke('reveal_in_finder', { path: job.output }).catch(() => setError('无法打开目录'))}><FolderOpen size={16} />打开目录</button> : <a className="quiet-button" href={job.output} download={job.name}><ArrowDown size={16} />保存文件</a>}</div>}
        </article>)}
      </aside>
    </div>
  </main>
}

