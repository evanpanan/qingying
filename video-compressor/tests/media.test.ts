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

test('推荐平台准确识别，其他公开网站不受白名单限制', () => {
  for (const platform of PLATFORMS) {
    assert.equal(identifyPlatform(`https://${platform.hosts[0]}/video`)?.name, platform.name)
  }
  assert.equal(identifyPlatform('https://youtube.com.attacker.example/video')?.name, 'youtube.com.attacker.example')
  assert.equal(identifyPlatform('https://unlisted.example.org/video')?.engine, 'extract')
  assert(PLATFORMS.every((platform) => platform.engine === 'extract'))
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

test('旧解析入口保留 POST 并重定向到自有引擎', async () => {
  const get = response()
  await parse({ method: 'GET' }, get)
  assert.equal(get.code, 405)
  const post = response()
  await parse({ method: 'POST', body: { url: 'https://example.org/video' } }, post)
  assert.equal(post.code, 307)
  assert.equal(post.headers.Location, '/api/extract')
})

test('分享文案与百分号签名保留，非公开入口被拒绝', () => {
  assert.equal(shareUrl('分享 https://v.douyin.com/example/?sig=a%2Fb 复制链接'), 'https://v.douyin.com/example/?sig=a%2Fb')
  for (const url of ['https://127.0.0.1/a', 'https://[::1]/a', 'https://host.local/a', 'http://example.org/a', 'https://example.org:8000/a']) {
    assert.throws(() => shareUrl(url))
  }
})

test('媒体代理拒绝本机资源和非 HTTPS', async () => {
  for (const url of ['https://127.0.0.1/secret', 'https://localhost/secret', 'http://example.com/file']) {
    const res = response()
    await proxy({ query: { url }, headers: {} }, res)
    assert.equal(res.data.ok, false)
  }
})
