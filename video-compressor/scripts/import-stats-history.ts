import { Pool } from 'pg'
import { statsPoolConfig } from '../server/stats-store.ts'
import { importHistoricalDownloads } from '../server/stats-history.ts'

const args = process.argv.slice(2)
const value = (key: string) => { const index = args.indexOf(key); return index < 0 ? '' : args[index + 1] ?? '' }
const connection = process.env.LIGHTVID_STATS_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL
if (!connection || !args.includes('--confirm-verified') || !/^[1-9]\d*$/.test(value('--downloads')) || !value('--source').trim()) {
  console.error('仅导入可核实且早于新统计的历史下载。配置服务端数据库变量后使用：--downloads <实际次数> --source <核实记录说明> --confirm-verified')
  process.exitCode = 1
} else {
  const pool = new Pool(statsPoolConfig(connection))
  pool.on('error', () => {})
  try {
    const added = await importHistoricalDownloads(pool, Number(value('--downloads')), value('--source'))
    console.log(added ? '已导入历史下载次数，后续真实下载自动叠加；设备数未推算。' : '相同历史记录已导入，本次未重复计数。')
  } catch {
    console.error('历史导入未完成，请检查表结构、连接、核实来源及已有导入记录。未暴露连接信息。')
    process.exitCode = 1
  } finally { await pool.end() }
}
