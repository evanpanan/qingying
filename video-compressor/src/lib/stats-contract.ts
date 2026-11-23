export interface DownloadEvent { eventId: string; deviceId: string }
export interface StatsSnapshot { downloads: number; devices: number; updatedAt: string }

export function isAnonymousId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function isDownloadEvent(value: unknown): value is DownloadEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const event = value as Record<string, unknown>
  return Object.keys(event).length === 2 && isAnonymousId(event.eventId) && isAnonymousId(event.deviceId)
}

export function isStatsSnapshot(value: unknown): value is StatsSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as StatsSnapshot
  return Number.isSafeInteger(snapshot.downloads) && snapshot.downloads >= 0 &&
    Number.isSafeInteger(snapshot.devices) && snapshot.devices >= 0 &&
    snapshot.devices <= snapshot.downloads &&
    typeof snapshot.updatedAt === 'string' && Number.isFinite(Date.parse(snapshot.updatedAt))
}
