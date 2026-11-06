import { Readable } from 'node:stream'

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
    target = decodeURIComponent(String(Array.isArray(raw) ? raw[0] : raw))
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

    const upstream = await fetch(target, { headers, redirect: 'follow' })
    if (!upstream.ok && upstream.status !== 206) {
      res.status(upstream.status).json({
        ok: false,
        error: `资源获取失败（HTTP ${upstream.status}）`,
      })
      return
    }

    res.status(upstream.status)
    for (const key of PASS_HEADERS) {
      const value = upstream.headers.get(key)
      if (value) res.setHeader(key, value)
    }
    res.setHeader('Cache-Control', 'public, max-age=3600')

    // 带 download 参数时触发浏览器另存为
    const download = req.query?.download
    if (download) {
      const name = decodeURIComponent(String(Array.isArray(download) ? download[0] : download))
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`)
    }

    if (!upstream.body) {
      res.end()
      return
    }
    Readable.fromWeb(upstream.body as any).pipe(res)
  } catch (e: any) {
    res.status(502).json({ ok: false, error: e?.message || '媒体代理请求失败' })
  }
}
