import assert from 'node:assert/strict'
import test from 'node:test'
import { downloadRecord, loadDownloadHistory, saveDownloadHistory, subscribeDownloadHistory, type DownloadRecord } from '../src/lib/download-history.ts'

function browserStorage() {
  const values = new Map<string, string>()
  return { values, storage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } } }
}

test('本机下载记录最多保留6条，支持订阅与清空', () => {
  const { values, storage } = browserStorage()
  const globals = globalThis as any
  const oldWindow = globals.window
  const oldStorage = globals.localStorage
  globals.window = new EventTarget()
  globals.localStorage = storage
  try {
    const history: DownloadRecord[] = [
      { title: '视频一', url: 'https://www.douyin.com/video/1', date: '2026/11/23' },
      { title: '视频二', url: 'https://www.douyin.com/video/2', date: '2026/11/23' },
    ]
    let changes = 0
    const off = subscribeDownloadHistory(() => changes++)
    saveDownloadHistory(history)
    assert.equal(loadDownloadHistory().length, 2)
    assert.equal(loadDownloadHistory()[0].title, '视频一')
    assert.equal(changes, 1)
    saveDownloadHistory(Array.from({ length: 8 }, (_, index) => ({ title: `视频 ${index}`, url: `https://example.com/${index}`, date: '2026/11/23' })))
    assert.equal(loadDownloadHistory().length, 6)
    assert.equal(loadDownloadHistory()[0].url, 'https://example.com/0')
    saveDownloadHistory([])
    assert.equal(loadDownloadHistory().length, 0)
    assert.equal(changes, 3)
    off()
    assert.equal(values.has('lightvid.downloads.v1'), true)
  } finally {
    globals.window = oldWindow
    globals.localStorage = oldStorage
  }
})

test('记录只保存标题、链接与日期，不生成其他字段', () => {
  const record = downloadRecord('示例视频', 'https://www.douyin.com/video/1')
  assert.equal(record.title, '示例视频')
  assert.equal(record.url, 'https://www.douyin.com/video/1')
  assert.equal(typeof record.date, 'string')
  assert.deepEqual(Object.keys(record).sort(), ['date', 'title', 'url'])
})


test('新用时可持久保存，旧记录兼容，损坏的用时不进入显示', () => {
  const globals = globalThis as any
  const oldWindow = globals.window, oldStorage = globals.localStorage
  const {values, storage} = browserStorage()
  globals.window = new EventTarget(); globals.localStorage = storage
  try {
    const timing = {parseMs: 250, queueMs: 1000, downloadMs: 2000, totalMs: 3250}
    saveDownloadHistory([downloadRecord('有用时', 'https://example.com/1', timing)])
    assert.deepEqual(loadDownloadHistory()[0].timing, timing)
    values.set('lightvid.downloads.v1', JSON.stringify([
      {title: '旧记录', url: 'https://example.com/2', date: '2026/11/27'},
      {title: '损坏', url: 'https://example.com/3', date: '2026/11/27', timing: {downloadMs: -1}},
    ]))
    const records = loadDownloadHistory()
    assert.equal(records.length, 2)
    assert.equal(records[0].timing, undefined)
    assert.equal(records[1].timing, undefined)
  } finally {globals.window = oldWindow; globals.localStorage = oldStorage}
})
