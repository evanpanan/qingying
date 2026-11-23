import { useEffect, useRef, useState } from 'react'
import NumberFlow, { useCanAnimate } from '@number-flow/react'
import useSWR from 'swr'
import { fetchStats, flushStatsEvents, STATS_ENDPOINT } from '../lib/stats'
import { displayedDownloadTotal, STATS_INITIAL_BASE } from '../lib/stats-display'

export default function DownloadStats() {
  const root = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
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

  const value = displayedDownloadTotal(data?.downloads)
  return <div className="download-stats" ref={root} data-status={error ? 'unavailable' : data ? 'ready' : 'loading'} data-scope="global" data-initial-base={STATS_INITIAL_BASE} data-downloads={value} aria-label="视频下载服务次数，含展示基数 1,000" aria-busy={isLoading} title="展示次数为初始基数 1,000 加全站真实视频下载次数。初始基数不是已核实历史记录，不写入统计数据库；未连接时保留基数或上次全站值。">
    <p className="stats-summary">
      <span>已提供</span>
      <NumberFlow value={value} locales="zh-CN" trend={1} animated={visible && canAnimate} transformTiming={{ duration: 650, easing: 'ease-out' }} onAnimationsStart={event => {
        if (canAnimate) (event.target as HTMLElement).animate([{ color: '#6d8c50' }, { color: '#37432d' }], { duration: 650 })
      }} />
      <span>次视频下载服务</span>
    </p>
  </div>
}
