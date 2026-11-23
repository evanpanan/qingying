/** Legacy clients keep their POST body and use our own extractor, never a relay. */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: '仅支持 POST 请求' })
    return
  }
  res.setHeader('Location', '/api/extract')
  res.setHeader('Cache-Control', 'no-store')
  res.status(307).end()
}
