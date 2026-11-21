import { Readable } from 'node:stream'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { pipeline } from 'node:stream/promises'

/** 媒体透传可能耗时较长（大文件下载）。 */
export const config = { maxDuration: 60 }

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'

const PASS_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'last-modified',
  'etag',
]

async function publicUrl(raw: string): Promise<URL> {
  const url = new URL(raw)
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('仅支持公开 HTTPS 媒体地址')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  // 不代理私网、IPv6 和 IP 直连，重定向每一跳都复核。
  if (isIP(host) || host === 'localhost' || !host.includes('.')) throw new Error('不支持此资源地址')
  const records = await lookup(host, { all: true, family: 4 })
  if (!records.length || records.some(({ address }) => {
    if (isIP(address) !== 4) return true
    const [a, b] = address.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127)
  })) throw new Error('不支持此资源地址')
  return url
}

/**
 * GET /api/proxy?url=<encoded>
 * 媒体中转：平台直链大多有防盗链（校验 Referer），浏览器直接播放会 403。
 * 这里由服务端以中性请求头拉取后透传，保证预览与下载可用。
 */
export default async function handler(req: any, res: any) {
  const raw = req.query?.url
  if (!raw) {
    res.status(400).json({ ok: false, error: '缺少 url 参数' })
    return
  }

  let target: string
  try {
    target = String(Array.isArray(raw) ? raw[0] : raw)
  } catch {
    res.status(400).json({ ok: false, error: 'url 参数格式错误' })
    return
  }
  if (!/^https?:\/\//i.test(target)) {
    res.status(400).json({ ok: false, error: '仅支持 http/https 地址' })
    return
  }

  try {
    const headers: Record<string, string> = { 'User-Agent': UA }
    if (req.headers?.range) headers.Range = String(req.headers.range)

    let current = await publicUrl(target)
    let upstream: Response | undefined
    for (let hop = 0; hop < 6; hop++) {
      upstream = await fetch(current, { headers, redirect: 'manual', signal: AbortSignal.timeout(50000) })
      if (![301, 302, 303, 307, 308].includes(upstream.status)) break
      const location = upstream.headers.get('location')
      await upstream.body?.cancel()
      if (!location) throw new Error('资源重定向异常')
      current = await publicUrl(new URL(location, current).href)
      upstream = undefined
    }
    if (!upstream) throw new Error('资源重定向次数过多')
    if (!upstream.ok && upstream.status !== 206) {
      res.status(upstream.status).json({
        ok: false,
        error: `资源获取失败（HTTP ${upstream.status}）`,
      })
      return
    }

    const contentType = upstream.headers.get('content-type') || ''
    if (!/^(video\/|audio\/|image\/|application\/octet-stream)/i.test(contentType)) {
      await upstream.body?.cancel()
      res.status(400).json({ ok: false, error: '该地址不是可下载的媒体文件' })
      return
    }
    res.status(upstream.status)
    for (const key of PASS_HEADERS) {
      const value = upstream.headers.get(key)
      if (value) res.setHeader(key, value)
    }
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // 带 download 参数时触发浏览器另存为
    const download = req.query?.download
    if (download) {
      const name = String(Array.isArray(download) ? download[0] : download).replace(/[\r\n]/g, '').slice(0, 160)
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`)
    }

    if (!upstream.body) {
      res.end()
      return
    }
    await pipeline(Readable.fromWeb(upstream.body as any), res)
  } catch (e: any) {
    if (res.headersSent) res.destroy()
    else res.status(502).json({ ok: false, error: e?.message || '媒体代理请求失败' })
  }
}
