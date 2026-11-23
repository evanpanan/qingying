export const HISTORY_KEY = 'lightvid.downloads.v1'
export const HISTORY_EVENT = 'lightvid:download-history'
export interface DownloadRecord {
  title: string
  url: string
  date: string
  type?: 'video' | 'audio' | 'image'
  statsEventId?: string
  statsReported?: boolean
  legacyVerified?: boolean
}
let memory: DownloadRecord[] = []

export function downloadRecord(title: string, url: string, type: NonNullable<DownloadRecord['type']>, statsEventId?: string): DownloadRecord {
  return { title, url, type, date: new Date().toLocaleDateString('zh-CN'), ...(statsEventId ? { statsEventId } : {}) }
}

export function loadDownloadHistory(): DownloadRecord[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(items) ? items.filter(item => typeof item?.title === 'string' &&
      typeof item?.url === 'string' && typeof item?.date === 'string').slice(0, 6) : []
  } catch { return memory }
}

export function saveDownloadHistory(items: DownloadRecord[]) {
  memory = items.slice(0, 6)
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(memory)) } catch { /* Downloads still work without storage. */ }
  window.dispatchEvent(new Event(HISTORY_EVENT))
}

export function subscribeDownloadHistory(callback: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === HISTORY_KEY || event.key === null) callback() }
  window.addEventListener(HISTORY_EVENT, callback)
  window.addEventListener('storage', storage)
  return () => {
    window.removeEventListener(HISTORY_EVENT, callback)
    window.removeEventListener('storage', storage)
  }
}

export function markDownloadReported(eventId: string) {
  const history = loadDownloadHistory()
  if (!history.some(item => item.statsEventId === eventId && !item.statsReported)) return
  saveDownloadHistory(history.map(item => item.statsEventId === eventId ? { ...item, statsReported: true } : item))
}

export function unreportedLegacyRecords(history: DownloadRecord[]) {
  return history.filter(item => !item.statsReported && (item.legacyVerified ||
    (!item.type && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(item.date) &&
      Date.parse(item.date) < Date.parse('2026-11-23T00:00:00'))))
}
