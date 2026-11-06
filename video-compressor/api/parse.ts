import { parseShare } from '../server/parse'

/** 解析需请求外部平台，放宽函数执行时长。 */
export const config = { maxDuration: 30 }

/**
 * POST /api/parse
 * 请求体：{ url: string }（可直接粘贴含分享文案的整段文本）
 * 响应：{ ok: true, data: ParseResult } | { ok: false, error: string }
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: '仅支持 POST 请求' })
    return
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}
    const input = body.url ?? body.text ?? ''
    const data = await parseShare(String(input))
    res.status(200).json({ ok: true, data })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || '解析失败，请稍后重试' })
  }
}
