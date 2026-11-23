import assert from 'node:assert/strict'
import test from 'node:test'
import { DownloadQueue, DOWNLOAD_CONCURRENCY, type DownloadInput, type DownloadJob } from '../src/lib/download-queue.ts'

const input = (name: string, native = false): DownloadInput => ({
  title: name, sourceUrl: `https://example.com/${name}`, mediaUrl: `https://media.example/${name}.webm`,
  type: 'video', ext: 'webm', native,
})
const settle = () => new Promise<void>(resolve => setImmediate(resolve))
function harness() {
  const pending = new Map<string, { resolve: (output: string) => void; reject: (error: Error) => void; progress: (value: number) => void; signal: AbortSignal }>()
  const started: DownloadJob[] = [], completed: DownloadJob[] = []
  const queue = new DownloadQueue({
    execute: (job, signal, progress) => {
      started.push(job)
      return new Promise<string>((resolve, reject) => pending.set(job.id, { resolve, reject, progress, signal }))
    },
    onCompleted: job => { completed.push(job) },
  })
  return { queue, pending, started, completed }
}

test('多个下载并行且上限为2，进度与原始标题链接保持独立，后续自动排队', async () => {
  const { queue, pending, started, completed } = harness()
  assert.equal(DOWNLOAD_CONCURRENCY, 2)
  const firstInput = input('first')
  const first = queue.enqueue(firstInput), second = queue.enqueue(input('second')), third = queue.enqueue(input('third'))
  assert.equal(queue.enqueue(firstInput), first)
  firstInput.title = 'changed'
  firstInput.sourceUrl = 'https://example.com/changed'
  assert.equal(started.length, 2)
  assert.equal(queue.getSnapshot().find(job => job.id === third)?.status, 'queued')
  pending.get(first)!.progress(18)
  pending.get(second)!.progress(72)
  assert.equal(queue.getSnapshot().find(job => job.id === first)?.progress, 18)
  assert.equal(queue.getSnapshot().find(job => job.id === second)?.progress, 72)
  pending.get(second)!.resolve('second.webm')
  await settle()
  assert.equal(started.length, 3)
  assert.equal(queue.getSnapshot().find(job => job.id === third)?.status, 'downloading')
  pending.get(first)!.resolve('first.webm')
  pending.get(third)!.resolve('third.webm')
  await settle()
  assert.equal(completed.length, 3)
  assert.equal(completed.find(job => job.id === first)?.input.title, 'first')
  assert.equal(completed.find(job => job.id === first)?.input.sourceUrl, 'https://example.com/first')
  assert(queue.getSnapshot().every(job => job.status === 'done' && job.progress === 100))
})

test('失败只影响自身，重试保留快照且成功回调只触发一次', async () => {
  const { queue, pending, completed } = harness()
  const first = queue.enqueue(input('failure')), second = queue.enqueue(input('success'))
  pending.get(first)!.reject(new Error('connection failed'))
  pending.get(second)!.resolve('success.webm')
  await settle()
  assert.equal(queue.getSnapshot().find(job => job.id === first)?.status, 'error')
  assert.equal(completed.length, 1)
  queue.retry(first)
  pending.get(first)!.resolve('recovered.webm')
  await settle()
  queue.retry(first)
  assert.equal(completed.length, 2)
  assert.equal(completed[1].input.title, 'failure')
  queue.clearFinished()
  assert.equal(queue.getSnapshot().length, 0)
})

test('取消排队及活动下载不计成功，不能在取消尚未结束时覆盖任务', async () => {
  const { queue, pending, started, completed } = harness()
  const first = queue.enqueue(input('cancel-active')), second = queue.enqueue(input('continue')), third = queue.enqueue(input('cancel-waiting'))
  queue.cancel(third)
  queue.cancel(first)
  queue.retry(first)
  assert(pending.get(first)!.signal.aborted)
  pending.get(first)!.resolve('must-not-count.webm')
  pending.get(second)!.resolve('continue.webm')
  await settle()
  assert.equal(started.length, 2)
  assert.equal(completed.length, 1)
  assert.equal(queue.getSnapshot().find(job => job.id === first)?.status, 'cancelled')
  queue.retry(first)
  pending.get(first)!.resolve('retry.webm')
  await settle()
  assert.equal(completed.length, 2)
})

test('原生任务 ID 独立，运行中不伪装取消，排队原生任务可取消', async () => {
  const { queue, pending, started, completed } = harness()
  const first = queue.enqueue(input('native-one', true)), second = queue.enqueue(input('native-two', true)), third = queue.enqueue(input('native-waiting', true))
  assert.notEqual(first, second)
  queue.cancel(first)
  queue.cancel(third)
  assert(!pending.get(first)!.signal.aborted)
  assert.equal(queue.getSnapshot().find(job => job.id === first)?.status, 'downloading')
  pending.get(first)!.resolve('/Downloads/native-one.webm')
  pending.get(second)!.resolve('/Downloads/native-two.webm')
  await settle()
  assert.equal(started.length, 2)
  assert.equal(completed.length, 2)
})
