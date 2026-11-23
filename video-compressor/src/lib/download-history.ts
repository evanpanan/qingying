export const HISTORY_KEY = 'lightvid.downloads.v1'
export const HISTORY_EVENT = 'lightvid:download-history'
export interface DownloadRecord {
  title: string
  url: string
  date: string
}
let memory: DownloadRecord[] = []

export function downloadRecord(title: string, url: string): DownloadRecord {
  return { title, url, date: new Date().toLocaleDateString('zh-CN') }
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
