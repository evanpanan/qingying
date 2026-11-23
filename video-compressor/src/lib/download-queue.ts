export const DOWNLOAD_CONCURRENCY = 2

export interface DownloadInput {
  sourceUrl: string
  title: string
  type: 'video' | 'audio' | 'image'
  mediaUrl?: string
  ext: string
  index?: number
  native: boolean
}

export interface DownloadJob {
  id: string
  input: DownloadInput
  status: 'queued' | 'downloading' | 'done' | 'error' | 'cancelled'
  progress: number | null
  output?: string
  error?: string
}

interface QueueOptions {
  execute: (job: DownloadJob, signal: AbortSignal, progress: (value: number) => void) => Promise<string>
  onCompleted: (job: DownloadJob) => void
}

function sameDownload(a: DownloadInput, b: DownloadInput) {
  return a.sourceUrl === b.sourceUrl && a.mediaUrl === b.mediaUrl &&
    a.ext === b.ext && a.index === b.index && a.native === b.native
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
    this.jobs = [...this.jobs, { id, input: { ...input }, status: 'queued', progress: null }]
    this.emit()
    this.pump()
    return id
  }

  retry(id: string) {
    const job = this.jobs.find(item => item.id === id)
    if (!job || this.active.has(id) || !['error', 'cancelled'].includes(job.status)) return
    if (this.jobs.some(item => item.id !== id && ['queued', 'downloading'].includes(item.status) && sameDownload(item.input, job.input))) return
    this.patch(id, { status: 'queued', progress: null, error: undefined, output: undefined })
    this.pump()
  }

  cancel(id: string) {
    const job = this.jobs.find(item => item.id === id)
    if (!job || !['queued', 'downloading'].includes(job.status)) return
    // The native command cannot cancel an already running process.
    if (job.input.native && job.status === 'downloading') return
    this.patch(id, { status: 'cancelled', progress: null })
    this.active.get(id)?.abort()
  }

  cancelAll() {
    for (const job of this.jobs) this.cancel(job.id)
  }

  clearFinished() {
    this.jobs = this.jobs.filter(job => ['queued', 'downloading'].includes(job.status))
    this.emit()
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
      this.patch(next.id, { status: 'downloading' })
      void this.run(next, controller)
    }
  }

  private async run(job: DownloadJob, controller: AbortController) {
    try {
      const output = await this.options.execute(job, controller.signal, value => {
        if (!controller.signal.aborted) this.patch(job.id, { progress: Math.max(0, Math.min(99, Math.round(value))) })
      })
      controller.signal.throwIfAborted()
      const completed: DownloadJob = { ...job, status: 'done', progress: 100, output }
      this.patch(job.id, completed)
      try { this.options.onCompleted(completed) } catch { /* Optional history must not fail a saved file. */ }
    } catch (error) {
      this.patch(job.id, controller.signal.aborted
        ? { status: 'cancelled', progress: null }
        : { status: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      this.active.delete(job.id)
      this.pump()
    }
  }
}
