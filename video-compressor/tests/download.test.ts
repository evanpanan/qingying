import assert from 'node:assert/strict'
import test from 'node:test'
import { downloadMedia, DOWNLOAD_CHUNK } from '../src/lib/download.ts'

test('分段保存完整文件、保留校验器并汇总进度', async () => {
  const source = new Uint8Array(DOWNLOAD_CHUNK * 2 + 1000).map((_, index) => index % 251)
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


test('分段传输中断后重取相同位置，不拼接残缺数据', async () => {
  let calls = 0
  const ranges: string[] = []
  const request: typeof fetch = async (_url, init) => {
    ranges.push(new Headers(init?.headers).get('range')!)
    if (++calls === 1) return new Response(new ReadableStream({start(controller) {
      controller.enqueue(new Uint8Array([88,88])); controller.error(new Error('connection reset'))
    }}), {status:206,headers:{'Content-Range':'bytes 0-3/4',ETag:'"same"'}})
    return new Response('good',{status:206,headers:{'Content-Range':'bytes 0-3/4',ETag:'"same"'}})
  }
  const result=await downloadMedia('/proxy',new AbortController().signal,()=>{},request)
  assert.equal(await result.text(),'good')
  assert.equal(calls,2)
  assert.equal(ranges[0],ranges[1])
})

test('临时 503 会重试，永久 403 不会盲目重试', async () => {
  let calls=0
  const request:typeof fetch=async()=>++calls===1?new Response('{}',{status:503}):new Response('ok')
  assert.equal(await (await downloadMedia('/proxy',new AbortController().signal,()=>{},request)).text(),'ok')
  assert.equal(calls,2)
  calls=0
  await assert.rejects(downloadMedia('/proxy',new AbortController().signal,()=>{},async()=>{calls++;return new Response('{}',{status:403})}))
  assert.equal(calls,1)
})
