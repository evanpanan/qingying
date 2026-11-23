import assert from 'node:assert/strict'
import test from 'node:test'
import { loadDownloadHistory, saveDownloadHistory, subscribeDownloadHistory, unreportedLegacyRecords, markDownloadReported, type DownloadRecord } from '../src/lib/download-history.ts'

test('旧记录真实显示两条，确认补报后保留事件 ID，清除不影响全站数据', () => {
  const values = new Map<string, string>()
  const globals = globalThis as any
  const oldWindow = globals.window
  const oldStorage = globals.localStorage
  globals.window = new EventTarget()
  globals.localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) }
  try {
    const history: DownloadRecord[] = [
      { title: '旧视频一', url: 'https://www.douyin.com/video/1', date: '2026/11/21' },
      { title: '旧视频二', url: 'https://www.douyin.com/video/2', date: '2026/11/21' },
    ]
    let changes = 0
    const off = subscribeDownloadHistory(() => changes++)
    saveDownloadHistory(history)
    assert.equal(loadDownloadHistory().length, 2)
    assert.equal(unreportedLegacyRecords(history).length, 2)
    assert.equal(unreportedLegacyRecords([{ ...history[0], type: 'audio' }]).length, 0)
    assert.equal(unreportedLegacyRecords([{ ...history[0], date: 'invalid' }]).length, 0)
    const id = '44bcfe46-76a9-4bf4-9b54-b63d72801262'
    saveDownloadHistory([{ ...history[0], type: 'video', statsEventId: id, legacyVerified: true }, history[1]])
    markDownloadReported(id)
    assert.equal(loadDownloadHistory()[0].statsEventId, id)
    assert.equal(loadDownloadHistory()[0].statsReported, true)
    assert.equal(unreportedLegacyRecords(loadDownloadHistory()).length, 1)
    saveDownloadHistory([])
    assert.equal(loadDownloadHistory().length, 0)
    assert.equal(changes, 4)
    off()
  } finally {
    globals.window = oldWindow
    globals.localStorage = oldStorage
  }
})
