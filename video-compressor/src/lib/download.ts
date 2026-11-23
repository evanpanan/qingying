const LIMIT = 500 * 1024 * 1024
const CHUNK = 256 * 1024

export async function downloadMedia(
  url: string,
  signal: AbortSignal,
  onProgress: (value: number) => void,
  request: typeof fetch = fetch,
) {
  const chunks: ArrayBuffer[] = []
  let received = 0, total = 0, validator = '', contentType = ''
  while (true) {
    const headers: Record<string, string> = { Range: `bytes=${received}-${received + CHUNK - 1}` }
    if (validator) headers['If-Range'] = validator
    const response = await request(url, { signal, headers })
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.error || '文件下载失败，请重新解析获取新链接')
    }
    contentType ||= response.headers.get('content-type') || 'application/octet-stream'
    const length = Number(response.headers.get('content-length')) || 0
    let expected = length
    if (response.status === 206) {
      const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range') || '')
      if (!range) { await response.body?.cancel(); throw new Error('资源分段信息异常，请重新解析') }
      const [, start, end, size] = range.map(Number)
      if (start !== received || end < start || end >= size || end >= received + CHUNK ||
          (total && total !== size)) {
        await response.body?.cancel()
        throw new Error('资源在下载期间发生变化，请重新解析')
      }
      total = size
      expected = end - start + 1
      const nextValidator = response.headers.get('etag') || response.headers.get('last-modified') || ''
      if (validator && nextValidator && validator !== nextValidator) {
        await response.body?.cancel()
        throw new Error('资源在下载期间发生变化，请重新解析')
      }
      validator ||= nextValidator
    } else {
      if (received) { await response.body?.cancel(); throw new Error('资源不再支持分段下载，请重新解析') }
      total = length
    }
    if (total > LIMIT) { await response.body?.cancel(); throw new Error('大于 500 MB 的文件请使用桌面版下载') }
    const reader = response.body?.getReader()
    if (!reader) throw new Error('未收到下载文件')
    let segment = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        segment += value.byteLength
        received += value.byteLength
        if (received > LIMIT || (expected && segment > expected)) {
          await reader.cancel()
          throw new Error('下载文件大小异常或过大，请使用桌面版')
        }
        chunks.push(value.slice().buffer as ArrayBuffer)
        if (total) onProgress(Math.min(99, Math.round(received / total * 100)))
      }
    } catch (error) {
      if (signal.aborted) throw error
      throw new Error('媒体传输中断，请重试；极慢源或大文件建议使用桌面版')
    } finally {
      reader.releaseLock()
    }
    if (!segment || (expected && segment !== expected)) throw new Error('文件传输不完整，请重新下载')
    if (response.status !== 206 || received === total) break
  }
  // Each range gets its own server budget; no request holds a slow file open indefinitely.
  return new Blob(chunks, { type: contentType })
}
