import { createHash } from 'node:crypto'
import { Pool, type PoolConfig, type QueryResultRow } from 'pg'
import { isStatsSnapshot, type DownloadEvent, type StatsSnapshot } from '../src/lib/stats-contract.ts'

export class StatsUnavailableError extends Error {}
export class StatsRateLimitError extends Error {}

const READ_TOTALS = 'SELECT downloads, devices, updated_at FROM lightvid_stats.totals WHERE id = 1'
const RECORD_DOWNLOAD = `
  WITH recorded AS (
    INSERT INTO lightvid_stats.downloads (event_id, device_hash)
    VALUES ($1::uuid, $2)
    ON CONFLICT DO NOTHING
    RETURNING device_hash
  ), new_device AS (
    INSERT INTO lightvid_stats.devices (device_hash)
    SELECT device_hash FROM recorded
    ON CONFLICT DO NOTHING
    RETURNING device_hash
  )
  UPDATE lightvid_stats.totals
  SET downloads = downloads + (SELECT count(*) FROM recorded),
      devices = devices + (SELECT count(*) FROM new_device),
      updated_at = CASE WHEN EXISTS (SELECT 1 FROM recorded)
        THEN clock_timestamp() ELSE updated_at END
  WHERE id = 1
  RETURNING downloads, devices, updated_at
`

function snapshot(row: QueryResultRow | undefined): StatsSnapshot {
  if (!row) throw new StatsUnavailableError('统计数据尚未初始化')
  const result = {
    downloads: Number(row.downloads), devices: Number(row.devices),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
  if (!isStatsSnapshot(result)) throw new StatsUnavailableError('统计数据格式异常')
  return result
}

export function statsPoolConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new StatsUnavailableError('需要 PostgreSQL 连接')
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  // URL sslmode=require can override pg's certificate verification.
  for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key)
  return {
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: true, ...(process.env.LIGHTVID_STATS_CA ? { ca: process.env.LIGHTVID_STATS_CA } : {}) },
    max: 2, connectionTimeoutMillis: 4000, statement_timeout: 4000,
    query_timeout: 5000, idleTimeoutMillis: 10000, allowExitOnIdle: true,
  }
}

export function createStatsStore(pool: Pool) {
  return {
    async read() {
      const result = await pool.query(READ_TOTALS)
      return snapshot(result.rows[0])
    },
    async record(event: DownloadEvent) {
      const deviceHash = createHash('sha256').update(event.deviceId.toLowerCase()).digest('hex')
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        // Serialize a device's quota checks, while different devices remain concurrent.
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [deviceHash])
        const duplicate = await client.query('SELECT 1 FROM lightvid_stats.downloads WHERE event_id = $1::uuid', [event.eventId])
        if (!duplicate.rowCount) {
          const recent = await client.query(`
            SELECT count(*) AS count FROM lightvid_stats.downloads
            WHERE device_hash = $1 AND received_at > clock_timestamp() - interval '1 minute'
          `, [deviceHash])
          if (Number(recent.rows[0].count) >= 12) throw new StatsRateLimitError('统计事件过于频繁')
        }
        const result = await client.query(RECORD_DOWNLOAD, [event.eventId, deviceHash])
        const data = snapshot(result.rows[0])
        await client.query('COMMIT')
        return data
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        throw error
      } finally { client.release() }
    },
  }
}

let store: ReturnType<typeof createStatsStore> | undefined
export function getStatsStore() {
  if (store) return store
  const connection = process.env.LIGHTVID_STATS_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL
  if (!connection) throw new StatsUnavailableError('统计数据库尚未连接')
  const pool = new Pool(statsPoolConfig(connection))
  pool.on('error', () => { /* Statistics outages never interrupt media downloads. */ })
  store = createStatsStore(pool)
  return store
}
