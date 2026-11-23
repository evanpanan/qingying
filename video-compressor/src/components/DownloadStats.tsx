import { useEffect, useRef, useState } from 'react'
import NumberFlow, { useCanAnimate } from '@number-flow/react'
import useSWR from 'swr'
import { fetchStats, flushStatsEvents, STATS_ENDPOINT } from '../lib/stats'

export default function DownloadStats() {
  const root = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const canAnimate = useCanAnimate()
  const { data, error, isLoading } = useSWR(visible ? STATS_ENDPOINT : null, fetchStats, {
    refreshInterval: 5000, refreshWhenHidden: false, refreshWhenOffline: false,
    dedupingInterval: 3000, keepPreviousData: true, shouldRetryOnError: false,
  })

  useEffect(() => {
    const node = root.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(node)
    const online = () => { void flushStatsEvents() }
    window.addEventListener('online', online)
    return () => { observer.disconnect(); window.removeEventListener('online', online) }
  }, [])

  const status = error ? data ? '暂离线 · 上次统计' : '统计暂不可用' : data ? '全站统计 · 近实时更新' : '正在连接统计'
  return <div className="download-stats" ref={root} data-status={error ? 'unavailable' : data ? 'ready' : 'loading'} data-downloads={data?.downloads} data-devices={data?.devices} aria-label="全站视频下载统计" aria-busy={isLoading}>
    <dl className="stats-metrics">
      {[{ label: '视频下载次数', value: data?.downloads }, { label: '参与下载设备', value: data?.devices }].map(metric => <div key={metric.label}>
        <dt>{metric.label}</dt>
        <dd>{metric.value === undefined ? <span className="stats-placeholder">—</span> : <NumberFlow value={metric.value} locales="zh-CN" trend={1} animated={visible && canAnimate} transformTiming={{ duration: 650, easing: 'ease-out' }} onAnimationsStart={event => {
          if (canAnimate) (event.target as HTMLElement).animate([{ color: '#6d8c50' }, { color: '#37432d' }], { duration: 650 })
        }} />}</dd>
      </div>)}
    </dl>
    <span className="stats-status" title="仅在完整接收视频并触发浏览器保存，或桌面文件写入完成后上报。设备按浏览器或安装实例的匿名标识去重，清除本机数据会生成新标识。统计表不保存视频链接、标题或 IP；部署平台可能保留正常访问日志。"><span className="chip-dot" />{status}</span>
  </div>
}
