import assert from 'node:assert/strict'
import test from 'node:test'
import { FORMATS, PLATFORMS, identifyPlatform, outputName, shareUrl } from '../src/lib/media.ts'
import parse from '../api/parse.ts'
import proxy from '../api/proxy.ts'

function response() {
  return {
    code: 200, data: undefined as any, headers: {} as Record<string, string>,
    setHeader(key: string, value: string) { this.headers[key] = value },
    status(code: number) { this.code = code; return this },
    json(data: unknown) { this.data = data },
    end() {},
  }
}

test('支持平台可识别且拒绝仿冒域名', () => {
  for (const platform of PLATFORMS) {
    assert.equal(identifyPlatform(`https://${platform.hosts[0]}/video`)?.name, platform.name)
  }
  assert.equal(identifyPlatform('https://youtube.com.attacker.example/video'), undefined)
  assert.equal(identifyPlatform('https://127.0.0.1/video'), undefined)
  assert.throws(() => shareUrl('https://user:password@youtube.com/video'))
  assert.equal(shareUrl('分享：https://youtu.be/abc 复制链接'), 'https://youtu.be/abc')
})

test('五种格式配置及非破坏性命名', () => {
  assert.deepEqual(FORMATS.map((f) => f.id), ['mp4', 'mov', 'mkv', 'webm', 'mp3'])
  assert.equal(outputName('holiday.mov', 'mp4'), 'holiday_converted.mp4')
  assert(FORMATS.find((f) => f.id === 'mp3')?.args.includes('-vn'))
  assert(FORMATS.find((f) => f.id === 'webm')?.args.includes('libopus'))
})

test('解析函数限制方法与输入', async () => {
  const get = response()
  await parse({ method: 'GET' }, get)
  assert.equal(get.code, 405)
  const malformed = response()
  await parse({ method: 'POST', body: '{' }, malformed)
  assert.equal(malformed.code, 400)
  const unsupported = response()
  await parse({ method: 'POST', body: { url: 'https://localhost/foo' } }, unsupported)
  assert.equal(unsupported.data.ok, false)
})

test('抖音分享文案与百分号签名不被二次解码', async () => {
  const original = globalThis.fetch
  let requestBody = ''
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body)
    return Response.json({ type: 'video', title: '测试', videoUrl: 'https://example.com/video?sig=a%2Fb' })
  }
  try {
    const res = response()
    await parse({ method: 'POST', body: { url: '分享 https://v.douyin.com/example/ 复制链接' } }, res)
    assert.equal(JSON.parse(requestBody).url, 'https://v.douyin.com/example/')
    assert.equal(res.data.data.url, 'https://example.com/video?sig=a%2Fb')
  } finally { globalThis.fetch = original }
})

test('媒体代理拒绝本机资源和非 HTTPS', async () => {
  for (const url of ['https://127.0.0.1/secret', 'https://localhost/secret', 'http://example.com/file']) {
    const res = response()
    await proxy({ query: { url }, headers: {} }, res)
    assert.equal(res.data.ok, false)
  }
})
