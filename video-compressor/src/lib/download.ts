const LIMIT = 500 * 1024 * 1024
// 4 MiB avoids hundreds of serial function/TLS round trips for ordinary videos.
export const DOWNLOAD_CHUNK = 4 * 1024 * 1024
const TRANSIENT = new Set([408, 429, 500, 502, 503, 504])
class RetryableDownloadError extends Error {}

export async function downloadMedia(
  url: string,
  signal: AbortSignal,
  onProgress: (value: number) => void,
  request: typeof fetch = fetch,
) {
  const chunks: ArrayBuffer[] = []
  let received = 0, total = 0, validator = '', contentType = ''
  while (true) {
    let complete = false, finished = false
    for (let attempt = 0; attempt < 3 && !complete; attempt++) {
      signal.throwIfAborted()
      const headers: Record<string, string> = { Range: `bytes=${received}-${received + DOWNLOAD_CHUNK - 1}` }
      if (validator) headers['If-Range'] = validator
      try {
        let response: Response
        try { response = await request(url, { signal, headers }) }
        catch (error) { if (signal.aborted) throw error; throw new RetryableDownloadError('连接中断') }
        if (!response.ok) {
          const error = await response.json().catch(() => null)
          if (TRANSIENT.has(response.status)) throw new RetryableDownloadError(error?.error || '媒体源暂时不可用')
          throw new Error(error?.error || '文件下载失败，请重新解析获取新链接')
        }
        const length = Number(response.headers.get('content-length')) || 0
        let expected = length, nextTotal = length, nextValidator = validator
        if (response.status === 206) {
          const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range') || '')
          if (!range) { await response.body?.cancel(); throw new Error('资源分段信息异常，请重新解析') }
          const [, start, end, size] = range.map(Number)
          if (start !== received || end < start || end >= size || end >= received + DOWNLOAD_CHUNK || (total && total !== size)) {
            await response.body?.cancel(); throw new Error('资源在下载期间发生变化，请重新解析')
          }
          nextTotal = size; expected = end - start + 1
          const version = response.headers.get('etag') || response.headers.get('last-modified') || ''
          if (validator && version && validator !== version) {
            await response.body?.cancel(); throw new Error('资源在下载期间发生变化，请重新解析')
          }
          nextValidator ||= version
        } else if (received) { await response.body?.cancel(); throw new Error('资源不再支持分段下载，请重新解析') }
        if (nextTotal > LIMIT) { await response.body?.cancel(); throw new Error('大于 500 MB 的文件请使用桌面版下载') }
        const reader = response.body?.getReader()
        if (!reader) throw new RetryableDownloadError('未收到下载文件')
        const segmentChunks: ArrayBuffer[] = []
        let segment = 0
        // Pin identity before reading so a failed segment retry cannot mix file versions.
        total = nextTotal; validator = nextValidator
        try {
          while (true) {
            let part: ReadableStreamReadResult<Uint8Array>
            try { part = await reader.read() }
            catch (error) { if (signal.aborted) throw error; throw new RetryableDownloadError('媒体传输中断') }
            if (part.done) break
            segment += part.value.byteLength
            if (received + segment > LIMIT || (expected && segment > expected)) {
              await reader.cancel(); throw new Error('下载文件大小异常或过大，请使用桌面版')
            }
            segmentChunks.push(part.value.slice().buffer as ArrayBuffer)
            if (total) onProgress(Math.min(99, Math.round((received + segment) / total * 100)))
          }
        } finally { reader.releaseLock() }
        if (!segment || (expected && segment !== expected)) throw new RetryableDownloadError('文件传输不完整')
        chunks.push(...segmentChunks); received += segment
        contentType ||= response.headers.get('content-type') || 'application/octet-stream'
        finished = response.status !== 206 || received === total
        complete = true
      } catch (error) {
        if (signal.aborted) throw error
        if (!(error instanceof RetryableDownloadError)) throw error
        if (attempt === 2) throw new Error('媒体传输多次中断，请重试；慢速源或大文件建议使用桌面版')
        // Back off briefly, and make cancellation interrupt the wait.
        await new Promise<void>((resolve, reject) => {
          const stop = () => { clearTimeout(timer); reject(signal.reason) }
          const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve() }, 250 * 2 ** attempt)
          signal.addEventListener('abort', stop, { once: true })
          if (signal.aborted) { signal.removeEventListener('abort', stop); stop() }
        })
        // Retrying requests the same byte offset; partial segment bytes are discarded.
      }
    }
    if (finished) break
  }
  return new Blob(chunks, { type: contentType })
}
