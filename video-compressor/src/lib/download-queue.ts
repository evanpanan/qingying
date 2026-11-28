import type { DownloadTiming } from './download-timing'

export const DOWNLOAD_CONCURRENCY = 2

export interface DownloadInput {
  sourceUrl: string
  title: string
  type: 'video' | 'audio' | 'image'
  mediaUrl?: string
  ext: string
  index?: number
  native: boolean
  outputFormat?: 'original' | 'mp3'
  sourceExt?: string
  parseMs?: number
}

export interface DownloadJob {
  id: string
  input: DownloadInput
  status: 'queued' | 'downloading' | 'done' | 'error' | 'cancelled'
  progress: number | null
  enqueuedAt: number
  startedAt?: number
  finishedAt?: number
  timing?: DownloadTiming
  output?: string
  error?: string
}

interface QueueOptions {
  now?: () => number
  execute: (job: DownloadJob, signal: AbortSignal, progress: (value: number) => void) => Promise<string>
  onCompleted: (job: DownloadJob) => void
}

function sameDownload(a: DownloadInput, b: DownloadInput) {
  return a.sourceUrl === b.sourceUrl && a.mediaUrl === b.mediaUrl &&
    a.outputFormat === b.outputFormat && a.ext === b.ext && a.index === b.index && a.native === b.native
}

export class DownloadQueue {
  private jobs: DownloadJob[] = []
  private active = new Map<string, AbortController>()
  private listeners = new Set<() => void>()
  private options: QueueOptions

  constructor(options: QueueOptions) { this.options = options }

  getSnapshot = () => this.jobs
  subscribe = (callback: () => void) => {
    this.listeners.add(callback)
    return () => { this.listeners.delete(callback) }
  }

  enqueue(input: DownloadInput) {
    const duplicate = this.jobs.find(job =>
      ['queued', 'downloading'].includes(job.status) && sameDownload(job.input, input))
    if (duplicate) return duplicate.id
    const id = crypto.randomUUID()
    this.jobs = [...this.jobs, { id, input: { ...input }, status: 'queued', progress: null, enqueuedAt: this.now() }]
    this.emit()
    this.pump()
    return id
  }

  retry(id: string) {
    const job = this.jobs.find(item => item.id === id)
    if (!job || this.active.has(id) || !['error', 'cancelled'].includes(job.status)) return
    if (this.jobs.some(item => item.id !== id && ['queued', 'downloading'].includes(item.status) && sameDownload(item.input, job.input))) return
    this.patch(id, { status: 'queued', progress: null, error: undefined, output: undefined, enqueuedAt: this.now(), startedAt: undefined, finishedAt: undefined, timing: undefined })
    this.pump()
  }

  cancel(id: string) {
    const job = this.jobs.find(item => item.id === id)
    if (!job || !['queued', 'downloading'].includes(job.status)) return
    // The native command cannot cancel an already running process.
    if (job.input.native && job.status === 'downloading') return
    const finishedAt = this.now()
    this.patch(id, { status: 'cancelled', progress: null, finishedAt, timing: this.timing(job, finishedAt) })
    this.active.get(id)?.abort()
  }

  cancelAll() {
    for (const job of this.jobs) this.cancel(job.id)
  }

  clearFinished() {
    this.jobs = this.jobs.filter(job => ['queued', 'downloading'].includes(job.status))
    this.emit()
  }

  private now() { return (this.options.now ?? (() => performance.now()))() }
  private timing(job: DownloadJob, finishedAt: number): DownloadTiming {
    const parseMs = job.input.parseMs ?? 0
    const queueMs = Math.max(0, (job.startedAt ?? finishedAt) - job.enqueuedAt)
    const downloadMs = job.startedAt === undefined ? 0 : Math.max(0, finishedAt - job.startedAt)
    return { parseMs, queueMs, downloadMs, totalMs: parseMs + queueMs + downloadMs }
  }

  private emit() { this.listeners.forEach(listener => listener()) }
  private patch(id: string, patch: Partial<DownloadJob>) {
    this.jobs = this.jobs.map(job => job.id === id ? { ...job, ...patch } : job)
    this.emit()
  }

  private pump() {
    while (this.active.size < DOWNLOAD_CONCURRENCY) {
      const next = this.jobs.find(job => job.status === 'queued' && !this.active.has(job.id))
      if (!next) break
      const controller = new AbortController()
      this.active.set(next.id, controller)
      const started = { ...next, status: 'downloading' as const, startedAt: this.now() }
      this.patch(next.id, started)
      void this.run(started, controller)
    }
  }

  private async run(job: DownloadJob, controller: AbortController) {
    try {
      const output = await this.options.execute(job, controller.signal, value => {
        if (!controller.signal.aborted) this.patch(job.id, { progress: Math.max(0, Math.min(99, Math.round(value))) })
      })
      controller.signal.throwIfAborted()
      const finishedAt = this.now()
      const completed: DownloadJob = { ...job, status: 'done', progress: 100, output, finishedAt, timing: this.timing(job, finishedAt) }
      this.patch(job.id, completed)
      try { this.options.onCompleted(completed) } catch { /* Optional history must not fail a saved file. */ }
    } catch (error) {
      const finishedAt = this.jobs.find(item => item.id === job.id)?.finishedAt ?? this.now()
      this.patch(job.id, { finishedAt, timing: this.timing(job, finishedAt), ...(controller.signal.aborted
        ? { status: 'cancelled' as const, progress: null }
        : { status: 'error' as const, error: error instanceof Error ? error.message : String(error) }) })
    } finally {
      this.active.delete(job.id)
      this.pump()
    }
  }
}

