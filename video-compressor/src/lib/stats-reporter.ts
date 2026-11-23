import { isAnonymousId, isStatsSnapshot, type DownloadEvent, type StatsSnapshot } from './stats-contract.ts'

export const DEVICE_KEY = 'lightvid.stats.device.v1'
export const QUEUE_KEY = 'lightvid.stats.events.v1'
interface PendingEvent extends DownloadEvent { queuedAt: number }
interface ReporterOptions {
  storage: Pick<Storage, 'getItem' | 'setItem'>
  request: (event: DownloadEvent) => Promise<{ ok: boolean; data?: unknown }>
  onSnapshot: (snapshot: StatsSnapshot) => void
  onReported?: (eventId: string) => void
  uuid: () => string
  now: () => number
}

export class StatsReporter {
  private options: ReporterOptions
  private inFlight: Promise<void> | undefined
  constructor(options: ReporterOptions) { this.options = options }

  private pending(): PendingEvent[] {
    try {
      const data: unknown = JSON.parse(this.options.storage.getItem(QUEUE_KEY) || '[]')
      if (!Array.isArray(data)) return []
      return data.filter((item): item is PendingEvent => item && isAnonymousId(item.eventId) &&
        isAnonymousId(item.deviceId) && Number.isFinite(item.queuedAt) &&
        this.options.now() - item.queuedAt >= 0 && this.options.now() - item.queuedAt <= 72 * 60 * 60 * 1000).slice(-100)
    } catch { return [] }
  }

  async record(eventId = this.options.uuid()) {
    return this.recordMany([eventId])
  }

  async recordMany(eventIds: string[]) {
    try {
      let deviceId = this.options.storage.getItem(DEVICE_KEY)
      if (!isAnonymousId(deviceId)) {
        deviceId = this.options.uuid()
        this.options.storage.setItem(DEVICE_KEY, deviceId)
      }
      const pending = this.pending()
      const known = new Set(pending.map(item => item.eventId))
      for (const eventId of eventIds) {
        if (!isAnonymousId(eventId) || known.has(eventId)) continue
        known.add(eventId)
        pending.push({ deviceId, eventId, queuedAt: this.options.now() })
      }
      this.options.storage.setItem(QUEUE_KEY, JSON.stringify(pending.slice(-100)))
      await this.flush()
    } catch { /* Blocked storage or reporting must never turn a successful download into an error. */ }
  }

  flush(): Promise<void> {
    if (this.inFlight) return this.inFlight
    this.inFlight = this.sendPending().catch(() => {}).finally(() => { this.inFlight = undefined })
    return this.inFlight
  }

  private async sendPending() {
    while (true) {
      const event = this.pending()[0]
      if (!event) return
      // Only random identifiers leave the browser, never links, titles or timestamps.
      const result = await this.options.request({ eventId: event.eventId, deviceId: event.deviceId })
      if (!result.ok || !isStatsSnapshot(result.data)) return
      this.options.storage.setItem(QUEUE_KEY, JSON.stringify(this.pending().filter(item => item.eventId !== event.eventId)))
      this.options.onReported?.(event.eventId)
      this.options.onSnapshot(result.data)
    }
  }
}
