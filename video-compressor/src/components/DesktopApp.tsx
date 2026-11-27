import { lazy, Suspense, useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Download, ArrowLeftRight, Minimize2, PanelLeft, Keyboard, Eraser } from 'lucide-react'
import DownloadTool from './DownloadTool'
import DesktopUpdater from './DesktopUpdater'
import { useDesktopLinks } from '../lib/desktop'
import '../desktop.css'

const Convert = lazy(() => import('../pages/Convert'))
const Cleanup = lazy(() => import('../pages/Cleanup'))
const Compress = lazy(() => import('./Compressor'))
const tools = [
  { id: 'download', name: '视频下载', detail: '保存视频、音频与图集', icon: Download },
  { id: 'cleanup', name: '画面修复', detail: '修补选区、离线 AI 与英文配音字幕', icon: Eraser },
  { id: 'convert', name: '格式转换', detail: '转换格式与提取音频', icon: ArrowLeftRight },
  { id: 'compress', name: '视频压缩', detail: '调整画质、分辨率与体积', icon: Minimize2 },
] as const
type Tool = typeof tools[number]['id']
function isTool(value: string): value is Tool { return tools.some(tool => tool.id === value) }

export default function DesktopApp() {
  useDesktopLinks()
  const [page, setPage] = useState<Tool>('download')
  const [visited, setVisited] = useState<Set<Tool>>(() => new Set(['download']))
  const [sidebar, setSidebar] = useState(true)
  const [guidance, setGuidance] = useState(0)
  function navigate(next: Tool) {
    setVisited(old => new Set([...old, next]))
    setPage(next)
  }
  useEffect(() => {
    let disposed = false
    let off: (() => void) | undefined
    void listen<string>('desktop:navigate', event => {
      if (isTool(event.payload)) navigate(event.payload)
    }).then(unlisten => { if (disposed) unlisten(); else off = unlisten }).catch(console.error)
    return () => { disposed = true; off?.() }
  }, [])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const tool = tools[Number(event.key) - 1]
      if (tool) { event.preventDefault(); navigate(tool.id) }
      if (event.key.toLowerCase() === 'l') {
        event.preventDefault(); navigate('download'); setGuidance(value => value + 1)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])
  const current = tools.find(tool => tool.id === page)!
  return <div className="studio desktop-app" data-sidebar={sidebar}>
    <aside className="desktop-sidebar" aria-label="工具侧边栏">
      <div className="desktop-brand"><span className="brand-symbol"><svg viewBox="0 0 48 48" width="35" height="35" aria-hidden="true"><use href="/lightvid.svg?v=2#brand-mark" /></svg></span><strong>轻影<span>LIGHTVID</span></strong></div>
      <div className="desktop-sidebar-label">工具</div>
      <nav aria-label="媒体工具">{tools.map((tool, index) => <button key={tool.id} aria-current={page === tool.id ? 'page' : undefined} onClick={() => navigate(tool.id)}><tool.icon size={18} /><span>{tool.name}</span><kbd>⌘{index + 1}</kbd></button>)}</nav>
      <div className="desktop-sidebar-bottom"><span className="status-dot" /> 本机处理<p>转换、压缩与 AI 修复在本机完成<br />原文件保持不变</p></div>
    </aside>
    <section className="desktop-main">
      <header className="desktop-toolbar"><button className="icon-button" aria-label={sidebar ? '隐藏侧边栏' : '显示侧边栏'} aria-expanded={sidebar} onClick={() => setSidebar(value => !value)}><PanelLeft size={19} /></button><div><h1>{current.name}</h1><span>{current.detail}</span></div><span className="desktop-toolbar-hint"><Keyboard size={15} /> ⌘1 / ⌘2 / ⌘3 / ⌘4</span></header>
      <div className="desktop-content">
        <section hidden={page !== 'download'} aria-label="视频下载工作区"><div className="desktop-section-heading"><h2>新建下载</h2><span>粘贴分享链接或整段文案 · ⌘L</span></div><DownloadTool guidanceKey={guidance} /></section>
        <Suspense fallback={<p role="status">正在打开工具…</p>}>
          {visited.has('convert') && <section hidden={page !== 'convert'} aria-label="格式转换工作区"><Convert active={page === 'convert'} /></section>}
          {visited.has('cleanup') && <section hidden={page !== 'cleanup'} aria-label="画面修复工作区"><Cleanup /></section>}
          {visited.has('compress') && <section hidden={page !== 'compress'} aria-label="视频压缩工作区"><div className="desktop-compressor legacy-tool"><Compress active={page === 'compress'} /></div></section>}
        </Suspense>
      </div>
      <footer className="desktop-statusbar"><span>轻影 1.7.0 · 更新于 2026-11-27</span><DesktopUpdater /></footer>
    </section>
  </div>
}
