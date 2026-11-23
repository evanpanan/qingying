import assert from 'node:assert/strict'
import test from 'node:test'
import { downloadMedia } from '../src/lib/download.ts'

test('分段保存完整文件、保留校验器并汇总进度', async () => {
  const source = new Uint8Array(600000).map((_, index) => index % 251)
  let calls = 0
  const progress: number[] = []
  const request: typeof fetch = async (_url, init) => {
    const headers = new Headers(init?.headers)
    const [, start, end] = /^bytes=(\d+)-(\d+)$/.exec(headers.get('range')!)!.map(Number)
    if (calls++) assert.equal(headers.get('if-range'), '"stable"')
    const last = Math.min(end, source.length - 1)
    return new Response(source.slice(start, last + 1), { status: 206, headers: {
      'Content-Range': `bytes ${start}-${last}/${source.length}`,
      'Content-Length': String(last - start + 1), 'Content-Type': 'video/mp4', ETag: '"stable"',
    } })
  }
  const blob = await downloadMedia('/proxy', new AbortController().signal, value => progress.push(value), request)
  assert.equal(calls, 3)
  assert.equal(blob.type, 'video/mp4')
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), source)
  assert.equal(progress.at(-1), 99)
})

test('不支持 Range 的来源仍可保存完整文件', async () => {
  const request: typeof fetch = async () => new Response('complete', { headers: { 'Content-Length': '8' } })
  assert.equal(await (await downloadMedia('/proxy', new AbortController().signal, () => {}, request)).text(), 'complete')
})

test('拒绝缺损文件、错误分段以及超大文件', async () => {
  for (const headers of [
    { 'Content-Length': '9' },
    { 'Content-Range': 'bytes 2-9/10', 'Content-Length': '8' },
    { 'Content-Range': 'bytes 0-7/999999999', 'Content-Length': '8' },
  ]) {
    const request: typeof fetch = async () => new Response('complete', {
      status: 'Content-Range' in headers ? 206 : 200, headers,
    })
    await assert.rejects(downloadMedia('/proxy', new AbortController().signal, () => {}, request))
  }
})

test('中途忽略 Range 不得拼接重复文件', async () => {
  let calls = 0
  const request: typeof fetch = async () => ++calls === 1
    ? new Response('part', { status: 206, headers: { 'Content-Range': 'bytes 0-3/8' } })
    : new Response('wholefile')
  await assert.rejects(downloadMedia('/proxy', new AbortController().signal, () => {}, request), /不再支持分段/)
})

test('资源版本变化不得继续拼接', async () => {
  let calls = 0
  const request: typeof fetch = async () => {
    const start = calls++ * 4
    return new Response('part', { status: 206, headers: {
      'Content-Range': `bytes ${start}-${start + 3}/8`, ETag: `"v${calls}"`,
    } })
  }
  await assert.rejects(downloadMedia('/proxy', new AbortController().signal, () => {}, request), /发生变化/)
})
