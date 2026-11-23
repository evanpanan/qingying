import { lazy, Suspense, useEffect, useState } from 'react'
import StudioNav from './components/StudioNav'
import Landing from './pages/Landing'
import { useDesktopLinks } from './lib/desktop'
import { flushStatsEvents } from './lib/stats'
import type { Page } from './types'

const Converter = lazy(() => import('./pages/Convert'))
const Compressor = lazy(() => import('./components/Compressor'))
function currentPage(): Page {
  const name = window.location.hash.slice(1)
  return ['home', 'download', 'convert', 'compress'].includes(name) ? name as Page : 'home'
}

function App() {
  useDesktopLinks()
  const [page, setPage] = useState<Page>(currentPage)
  const [visited, setVisited] = useState<Set<Page>>(() => new Set([currentPage()]))
  useEffect(() => { void flushStatsEvents() }, [])
  useEffect(() => {
    const handle = () => { const next = currentPage(); setPage(next); setVisited((old) => new Set([...old, next])) }
    window.addEventListener('hashchange', handle)
    return () => window.removeEventListener('hashchange', handle)
  }, [])
  function navigate(next: Page) {
    setPage(next)
    setVisited((old) => new Set([...old, next]))
    window.location.hash = next
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  // 保持任务组件挂载，切换工具不打断下载或转换。
  return (
    <div className="studio">
      <StudioNav page={page} onNavigate={navigate} />
      <div hidden={page !== 'home' && page !== 'download'}><Landing onNavigate={navigate} /></div>
      <Suspense fallback={<div className="workspace-page"><span className="signal-bars"><i /><i /><i /></span></div>}>
        {visited.has('convert') && <div hidden={page !== 'convert'}><Converter active={page === 'convert'} /></div>}
        {visited.has('compress') && <div hidden={page !== 'compress'} className="legacy-tool"><div className="page-intro"><span className="eyebrow">03 / COMPRESS</span><h1>更轻一点，<em>分享快一点。</em></h1><p>视频留在本机，原文件保持不变。</p></div><Compressor active={page === 'compress'} /></div>}
      </Suspense>
    </div>
  )
}

export default App
