import { getStatsStore, StatsRateLimitError } from '../server/stats-store.js'
import { isDownloadEvent, type DownloadEvent, type StatsSnapshot } from '../src/lib/stats-contract.js'

interface StatsStore {
  read(): Promise<StatsSnapshot>
  record(event: DownloadEvent): Promise<StatsSnapshot>
}

export function allowedStatsOrigin(origin: unknown, host: unknown): boolean {
  if (!origin) return true
  if (typeof origin !== 'string') return false
  if (['tauri://localhost', 'http://tauri.localhost', 'https://tauri.localhost'].includes(origin)) return true
  try {
    const url = new URL(origin)
    return url.origin === origin && url.host === host && ['http:', 'https:'].includes(url.protocol)
  } catch { return false }
}

export function createStatsHandler(getStore: () => StatsStore = getStatsStore) {
  return async (req: any, res: any) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Vary', 'Origin')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const origin = req.headers?.origin
    if (!allowedStatsOrigin(origin, req.headers?.host)) {
      res.status(403).json({ ok: false, error: '来源不被允许' })
      return
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.status(204).end()
      return
    }
    if (!['GET', 'POST'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST, OPTIONS')
      res.status(405).json({ ok: false, error: '请求方式不被允许' })
      return
    }
    let event: DownloadEvent | undefined
    if (req.method === 'POST') {
      try {
        const encoded = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
        if (!encoded || Buffer.byteLength(encoded) > 1024) throw new Error()
        const body: unknown = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
        if (!isDownloadEvent(body)) throw new Error()
        event = body
      } catch {
        res.status(400).json({ ok: false, error: '统计事件格式不正确' })
        return
      }
    }
    try {
      const store = getStore()
      const data = event ? await store.record(event) : await store.read()
      if (!event) res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3')
      res.status(200).json({ ok: true, data })
    } catch (error) {
      // #region debug-point A:deployment-environment
      res.setHeader('X-Lightvid-Stats-Environment', process.env.LIGHTVID_STATS_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL ? 'present' : 'missing')
      // #endregion
      // #region debug-point B:connection-C:tls-D:schema
      const diagnostic = error as { code?: string; message?: string }
      const safeCodes = ['CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', '28P01', '28000', '3D000', '42P01', '42501', '53300', '57P03']
      res.setHeader('X-Lightvid-Stats-Diagnostic', safeCodes.includes(diagnostic?.code || '') ? diagnostic.code! : diagnostic?.message === '统计数据库尚未连接' ? 'DATABASE_MISSING' : diagnostic?.message === '统计数据尚未初始化' ? 'STATS_NOT_INITIALIZED' : /timeout/i.test(diagnostic?.message || '') ? 'CONNECTION_TIMEOUT' : 'UNKNOWN')
      // #endregion
      // #region debug-point A:active-revision
      res.setHeader('X-Lightvid-Stats-Revision', /^[a-f0-9]{40}$/i.test(process.env.VERCEL_GIT_COMMIT_SHA || '') ? process.env.VERCEL_GIT_COMMIT_SHA! : 'unknown')
      // #endregion
      if (error instanceof StatsRateLimitError) {
        res.setHeader('Retry-After', '60')
        res.status(429).json({ ok: false, error: '统计事件过于频繁，请稍后重试' })
      } else {
        res.status(503).json({ ok: false, error: '全站统计暂不可用，下载不受影响' })
      }
    }
  }
}

const handler = createStatsHandler()
export default handler
