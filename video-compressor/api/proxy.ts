import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { pipeline } from 'node:stream/promises'
import { request, type RequestOptions } from 'node:https'
import type { IncomingMessage } from 'node:http'

/** 媒体透传可能耗时较长（大文件下载）。 */
export const config = { maxDuration: 300 }

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'

/** 抖音 CDN 校验来源，缺少 Referer 时图片会 403。 */
const DOUYIN_HOST = /(^|\.)(douyinpic|douyinvod|douyin|iesdouyin)\.com$/
const DOUYIN_REFERER = 'https://www.douyin.com/'

export function mediaReferer(host: string): string | undefined {
  if (DOUYIN_HOST.test(host)) return DOUYIN_REFERER
  if (/(^|\.)xhscdn\.com$/.test(host)) return 'https://www.xiaohongshu.com/'
  return undefined
}

const PASS_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'last-modified',
  'etag',
]

async function publicUrl(raw: string) {
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
      (a === 192 && (b === 168 || b === 0 || b === 2)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0) || (a === 100 && b >= 64 && b <= 127)
  })) throw new Error('不支持此资源地址')
  return { url, address: records[0].address }
}

function openPublic(target: Awaited<ReturnType<typeof publicUrl>>, headers: Record<string, string>, signal: AbortSignal) {
  return new Promise<IncomingMessage>((resolve, reject) => {
    const options: RequestOptions = {
      headers, signal, agent: false, family: 4,
      // Preserve hostname/SNI but connect only to the address validated above.
      lookup: (_host, _options, callback) => callback(null, target.address, 4),
    }
    const upstream = request(target.url, options, resolve)
    upstream.on('error', reject)
    upstream.end()
  })
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
    if (req.headers?.['if-range']) headers['If-Range'] = String(req.headers['if-range'])

    let current = await publicUrl(target)
    let upstream: IncomingMessage | undefined
    const signal = AbortSignal.timeout(280000)
    for (let hop = 0; hop < 6; hop++) {
      const referer = mediaReferer(current.url.hostname)
      const hopHeaders = referer ? { ...headers, Referer: referer } : headers
      upstream = await openPublic(current, hopHeaders, signal)
      if (![301, 302, 303, 307, 308].includes(upstream.statusCode || 0)) break
      const location = upstream.headers.location
      upstream.destroy()
      if (!location) throw new Error('资源重定向异常')
      current = await publicUrl(new URL(location, current.url).href)
      upstream = undefined
    }
    if (!upstream) throw new Error('资源重定向次数过多')
    const status = upstream.statusCode || 502
    if (status < 200 || status >= 300) {
      upstream.destroy()
      res.status(status).json({
        ok: false,
        error: `资源获取失败（HTTP ${status}）`,
      })
      return
    }

    const contentType = upstream.headers['content-type'] || ''
    if (!/^(video\/|audio\/|image\/|application\/octet-stream)/i.test(contentType)) {
      upstream.destroy()
      res.status(400).json({ ok: false, error: '该地址不是可下载的媒体文件' })
      return
    }
    res.status(status)
    for (const key of PASS_HEADERS) {
      const value = upstream.headers[key]
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

    await pipeline(upstream, res)
  } catch (e: any) {
    if (res.headersSent) res.destroy()
    else res.status(502).json({ ok: false, error: e?.message || '媒体代理请求失败' })
  }
}

