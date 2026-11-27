export interface DownloadTiming {
  parseMs?: number
  queueMs?: number
  downloadMs?: number
  totalMs?: number
}

export function formatElapsed(ms: number) {
  const tenths = Math.max(0, Math.round(ms / 100))
  if (tenths < 600) return `${(tenths / 10).toFixed(1)} 秒`
  const seconds = Math.floor(tenths / 10)
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
}

export function validTiming(value: unknown): value is DownloadTiming {
  return typeof value === 'object' && value !== null &&
    ['parseMs', 'queueMs', 'downloadMs', 'totalMs'].every(key => {
      const ms = (value as Record<string, unknown>)[key]
      return ms === undefined || typeof ms === 'number' && Number.isFinite(ms) && ms >= 0
    })
}
