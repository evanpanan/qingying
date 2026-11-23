import type { Pool } from 'pg'

/** Import one verified, pre-tracking total. Never synthesize device identities. */
export async function importHistoricalDownloads(pool: Pool, downloads: number, source: string) {
  if (!Number.isSafeInteger(downloads) || downloads < 1 || !source.trim() || source.length > 240) {
    throw new Error('需要正整数历史下载次数和最多 240 字的核实来源说明')
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const totals = await client.query('SELECT downloads FROM lightvid_stats.totals WHERE id = 1 FOR UPDATE')
    if (!totals.rowCount) throw new Error('请先初始化统计表')
    const old = await client.query('SELECT downloads, verified_source FROM lightvid_stats.history WHERE id = 1')
    if (old.rowCount) {
      if (Number(old.rows[0].downloads) !== downloads || old.rows[0].verified_source !== source.trim()) {
        throw new Error('历史基数已导入且与本次不同，请核对记录，禁止重复或覆盖导入')
      }
      await client.query('COMMIT')
      return false
    }
    if (!Number.isSafeInteger(Number(totals.rows[0].downloads) + downloads)) throw new Error('累计次数超出安全整数范围')
    await client.query('INSERT INTO lightvid_stats.history (id, downloads, verified_source) VALUES (1, $1, $2)', [downloads, source.trim()])
    await client.query('UPDATE lightvid_stats.totals SET downloads = downloads + $1, updated_at = clock_timestamp() WHERE id = 1', [downloads])
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
}
