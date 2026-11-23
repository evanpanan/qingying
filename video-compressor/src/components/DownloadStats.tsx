import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import NumberFlow, { useCanAnimate } from '@number-flow/react'
import useSWR from 'swr'
import { canReportStats, fetchStats, flushStatsEvents, reportVerifiedLegacyDownloads, STATS_ENDPOINT } from '../lib/stats'
import { loadDownloadHistory, subscribeDownloadHistory, unreportedLegacyRecords, type DownloadRecord } from '../lib/download-history'

const historySnapshot = () => JSON.stringify(loadDownloadHistory())
const emptyHistory = () => '[]'

export default function DownloadStats() {
  const root = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState('')
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const historyKey = useSyncExternalStore(subscribeDownloadHistory, historySnapshot, emptyHistory)
  const history: DownloadRecord[] = useMemo(() => JSON.parse(historyKey), [historyKey])
  const legacy = unreportedLegacyRecords(history)
  const canAnimate = useCanAnimate()
  const { data, error, isLoading, mutate } = useSWR(visible ? STATS_ENDPOINT : null, fetchStats, {
    refreshInterval: 5000, refreshWhenHidden: false, refreshWhenOffline: false,
    dedupingInterval: 3000, keepPreviousData: true, errorRetryInterval: 5000,
    onErrorRetry: (_error, _key, _config, revalidate, options) => {
      if (!visible || document.hidden || navigator.onLine === false) return
      clearTimeout(retry.current)
      retry.current = setTimeout(() => {
        if (!document.hidden && navigator.onLine !== false) void revalidate(options)
      }, 5000)
    },
  })

  useEffect(() => {
    const node = root.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const online = () => { void flushStatsEvents(); if (visible) void mutate() }
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
  }, [visible, mutate])

  useEffect(() => {
    if (!visible) clearTimeout(retry.current)
    return () => clearTimeout(retry.current)
  }, [visible])

  async function syncHistory() {
    if (!canReportStats()) { setSyncNote('隐私设置已暂停匿名同步'); return }
    if (!window.confirm(`确认这 ${legacy.length} 条旧记录都是成功保存的视频，并补报到全站统计？只发送匿名事件标识，不发送标题或链接。`)) return
    setSyncing(true)
    const queued = await reportVerifiedLegacyDownloads()
    setSyncNote(queued ? '历史补报已排队，连接恢复后自动同步' : '暂时无法补报，请检查隐私或存储设置')
    setSyncing(false)
    void mutate()
  }

  const status = data ? error ? '上次全站统计 · 正在重连' : '全站累计 · 近实时更新'
    : error ? '全站统计待连接 · 显示本机记录' : '正在连接全站 · 显示本机记录'
  const value = data?.downloads ?? history.length
  return <div className="download-stats" ref={root} data-status={error ? 'unavailable' : data ? 'ready' : 'loading'} data-scope={data ? 'global' : 'local'} data-downloads={value} aria-label={data ? '全站视频下载次数' : '本机下载记录'} aria-busy={isLoading}>
    <dl className="stats-metrics">
      <div>
        <dt>{data ? '视频下载次数' : '本机下载记录'}</dt>
        <dd><NumberFlow key={data ? 'global' : 'local'} value={value} locales="zh-CN" trend={1} animated={visible && canAnimate} transformTiming={{ duration: 650, easing: 'ease-out' }} onAnimationsStart={event => {
          if (canAnimate) (event.target as HTMLElement).animate([{ color: '#6d8c50' }, { color: '#37432d' }], { duration: 650 })
        }} /></dd>
      </div>
    </dl>
    <div className="stats-actions">
      <span className="stats-status" title={data ? '全站成功视频下载，失败后以相同事件 ID 重试。统计表不保存视频链接、标题或 IP。' : '全站暂未连接，此处显示最近最多 6 条、按链接去重的本机成功下载记录，不是全站总数，也不是本机全部下载次数。'}><span className="chip-dot" />{status}</span>
      {legacy.length > 0 && <button className="quiet-button stats-sync" disabled={syncing} onClick={() => void syncHistory()}>{syncing ? '正在补报…' : `同步 ${legacy.length} 条历史视频记录`}</button>}
      {syncNote && legacy.length > 0 && <span className="stats-sync-note" role="status">{syncNote}</span>}
    </div>
  </div>
}
