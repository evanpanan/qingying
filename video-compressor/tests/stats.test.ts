import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Pool } from 'pg'
import { createStatsHandler, allowedStatsOrigin } from '../api/stats.ts'
import { createStatsStore, statsPoolConfig, StatsRateLimitError } from '../server/stats-store.ts'
import { isDownloadEvent, isStatsSnapshot } from '../src/lib/stats-contract.ts'
import { StatsReporter, DEVICE_KEY, QUEUE_KEY } from '../src/lib/stats-reporter.ts'

const event = () => ({ eventId: randomUUID(), deviceId: randomUUID() })
const snapshot = (downloads = 0, devices = 0) => ({ downloads, devices, updatedAt: new Date().toISOString() })
function response() {
  return {
    code: 0, data: undefined as any, headers: {} as Record<string, any>,
    setHeader(key: string, value: any) { this.headers[key] = value },
    status(code: number) { this.code = code; return this },
    json(data: any) { this.data = data }, end() {},
  }
}

test('统计仅接受匿名 UUID 和合法计数，不接受链接或伪造字段', () => {
  assert(isDownloadEvent(event()))
  assert(!isDownloadEvent({ ...event(), url: 'https://example.com/video' }))
  assert(!isDownloadEvent({ eventId: '1', deviceId: 'person@example.com' }))
  assert(isStatsSnapshot(snapshot()))
  assert(!isStatsSnapshot(snapshot(0, 1)))
  assert(!isStatsSnapshot(snapshot(-1, 0)))
  assert(!isStatsSnapshot({ ...snapshot(), updatedAt: 'invalid' }))
})

test('统计 API 支持原站与桌面 CORS，拒绝其他来源及错误事件', async () => {
  assert(allowedStatsOrigin('https://qingying-rosy.vercel.app', 'qingying-rosy.vercel.app'))
  assert(allowedStatsOrigin('tauri://localhost', 'qingying-rosy.vercel.app'))
  assert(!allowedStatsOrigin('https://evil.example', 'qingying-rosy.vercel.app'))
  let calls = 0
  const handler = createStatsHandler(() => ({ read: async () => snapshot(), record: async () => { calls++; return snapshot(1, 1) } }))
  const bad = response()
  await handler({ method: 'POST', headers: {}, body: { ...event(), title: 'private title' } }, bad)
  assert.equal(bad.code, 400)
  assert.equal(calls, 0)
  const good = response()
  await handler({ method: 'POST', headers: {}, body: JSON.stringify(event()) }, good)
  assert.equal(good.code, 200)
  assert.equal(good.data.data.downloads, 1)
  const get = response()
  await handler({ method: 'GET', headers: {} }, get)
  assert.equal(get.headers['Cache-Control'], 'public, max-age=0, s-maxage=3')
  const preflight = response()
  await handler({ method: 'OPTIONS', headers: { origin: 'tauri://localhost' } }, preflight)
  assert.equal(preflight.code, 204)
  assert.equal(preflight.headers['Access-Control-Allow-Origin'], 'tauri://localhost')
})

test('数据库断连返回 503，不生成虚假数字，不暴露连接信息', async () => {
  const handler = createStatsHandler(() => { throw new Error('postgresql://private:secret@database.example/db') })
  const result = response()
  await handler({ method: 'GET', headers: {} }, result)
  assert.equal(result.code, 503)
  assert.equal(result.headers['Cache-Control'], 'no-store')
  assert(!('data' in result.data))
  assert(!JSON.stringify(result.data).includes('secret'))
})

test('远端 PostgreSQL 强制校验证书，本机测试连接例外', () => {
  const remote = statsPoolConfig('postgresql://test:example@db.example/postgres?sslmode=require&ssl=false')
  assert.deepEqual(remote.ssl, { rejectUnauthorized: true })
  assert(!remote.connectionString?.includes('sslmode'))
  assert.equal(statsPoolConfig('postgresql://test@127.0.0.1/postgres').ssl, false)
})

test('离线事件保留相同 ID 重试，设备去重且不传视频信息', async () => {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
  let online = false, sent = 0
  const payloads: any[] = []
  const reporter = new StatsReporter({
    storage, uuid: randomUUID, now: Date.now, onSnapshot: () => {},
    request: async body => { payloads.push(body); return online ? { ok: true, data: snapshot(++sent, 1) } : { ok: false } },
  })
  await reporter.record()
  await reporter.record()
  const queued = JSON.parse(values.get(QUEUE_KEY)!)
  assert.equal(queued.length, 2)
  assert.equal(queued[0].deviceId, queued[1].deviceId)
  assert.equal(queued[0].deviceId, values.get(DEVICE_KEY))
  online = true
  await reporter.flush()
  assert.equal(sent, 2)
  assert.deepEqual(JSON.parse(values.get(QUEUE_KEY)!), [])
  assert.equal(payloads[0].eventId, payloads.at(-2).eventId)
  assert.deepEqual(Object.keys(payloads[0]).sort(), ['deviceId', 'eventId'])
})

test('关闭本机存储不会阻止下载或导致统计请求', async () => {
  let requests = 0
  const reporter = new StatsReporter({
    storage: { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } },
    uuid: randomUUID, now: Date.now, onSnapshot: () => {},
    request: async () => { requests++; return { ok: false } },
  })
  await reporter.record()
  assert.equal(requests, 0)
})

test('统计上报位于视频保存完成之后，解析和独立音频等其他文件不参与', () => {
  const tool = readFileSync(new URL('../src/components/DownloadTool.tsx', import.meta.url), 'utf8')
  assert.match(tool, /setProgress\(100\); remember\(\)\s+if \(data\?\.type === 'video' && \(isTauri\(\) \|\| !current\?\.audioOnly\)\) void reportCompletedVideoDownload\(\)/)
})

test('PostgreSQL 真实事务验证并发、重复事件、设备去重和限流回滚', {
  skip: !process.env.LIGHTVID_STATS_TEST_DATABASE_URL,
}, async () => {
  const connection = process.env.LIGHTVID_STATS_TEST_DATABASE_URL!
  const url = new URL(connection)
  assert(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/lightvid_test', 'Integration tests only run in an explicitly named local test database')
  const pool = new Pool({ ...statsPoolConfig(connection), max: 5 })
  try {
    await pool.query(readFileSync(new URL('../server/stats-schema.sql', import.meta.url), 'utf8'))
    await pool.query('TRUNCATE lightvid_stats.downloads, lightvid_stats.devices')
    await pool.query('UPDATE lightvid_stats.totals SET downloads = 0, devices = 0 WHERE id = 1')
    const store = createStatsStore(pool)
    const same = event()
    await Promise.all(Array.from({ length: 20 }, () => store.record(same)))
    assert.equal((await store.read()).downloads, 1)
    assert.equal((await store.read()).devices, 1)
    await store.record({ eventId: same.eventId, deviceId: randomUUID() })
    assert.equal((await pool.query('SELECT count(*) FROM lightvid_stats.devices')).rows[0].count, '1')
    await Promise.all(Array.from({ length: 20 }, () => store.record(event())))
    assert.equal((await store.read()).downloads, 21)
    assert.equal((await store.read()).devices, 21)
    const deviceId = randomUUID()
    for (let i = 0; i < 12; i++) await store.record({ eventId: randomUUID(), deviceId })
    const before = await store.read()
    await assert.rejects(() => store.record({ eventId: randomUUID(), deviceId }), StatsRateLimitError)
    assert.deepEqual(await store.read(), before)
    assert.equal(before.downloads, 33)
    assert.equal(before.devices, 22)
    const hashes = await pool.query('SELECT device_hash FROM lightvid_stats.devices')
    assert(hashes.rows.every(row => /^[a-f0-9]{64}$/.test(row.device_hash)))
  } finally { await pool.end() }
})
