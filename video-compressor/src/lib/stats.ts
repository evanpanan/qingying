import { mutate } from 'swr'
import { isTauri } from './env'
import { isStatsSnapshot, type StatsSnapshot } from './stats-contract.ts'
import { StatsReporter } from './stats-reporter.ts'

export const STATS_ENDPOINT = isTauri()
  ? new URL('/api/stats', import.meta.env?.VITE_PUBLIC_SITE_URL || 'https://qingying-rosy.vercel.app').href
  : '/api/stats'

let latest: StatsSnapshot | undefined
function acceptSnapshot(snapshot: StatsSnapshot) {
  // A previously cached response must not roll cumulative counters backwards.
  if (!latest || (snapshot.downloads >= latest.downloads && snapshot.devices >= latest.devices)) latest = snapshot
  return latest
}

let reporter: StatsReporter | undefined
function getReporter() {
  if (navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return
  reporter ??= new StatsReporter({
    storage: localStorage, uuid: () => crypto.randomUUID(), now: () => Date.now(),
    request: async event => {
      const response = await fetch(STATS_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event), credentials: 'omit', keepalive: true,
        signal: AbortSignal.timeout(5000),
      })
      const result = await response.json().catch(() => null)
      return { ok: response.ok && result?.ok === true, data: result?.data }
    },
    onSnapshot: snapshot => { void mutate(STATS_ENDPOINT, acceptSnapshot(snapshot), { revalidate: false }) },
  })
  return reporter
}

export async function reportCompletedVideoDownload() {
  try { await getReporter()?.record() } catch { /* Anonymous statistics are optional. */ }
}

export async function flushStatsEvents() {
  try { await getReporter()?.flush() } catch { /* Offline reporting never blocks the tool. */ }
}

export async function fetchStats(endpoint: string) {
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000), credentials: 'omit' })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.ok || !isStatsSnapshot(result.data)) throw new Error('全站统计暂不可用')
  void flushStatsEvents()
  return acceptSnapshot(result.data)
}
