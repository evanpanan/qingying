import { ArrowDown, ArrowRightLeft, Play, Monitor, Eraser } from 'lucide-react'
import type { Page } from '../types'
import { isTauri } from '../lib/env'

const links = [
  { page: 'download' as Page, name: '视频下载', icon: ArrowDown },
  { page: 'cleanup' as Page, name: '画面修复', icon: Eraser },
  { page: 'convert' as Page, name: '格式转换', icon: ArrowRightLeft },
  { page: 'compress' as Page, name: '视频压缩', icon: Play },
]
export default function StudioNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  return <header className="studio-nav"><div className="nav-inner">
    <button className="brand" aria-label="轻影首页" onClick={() => onNavigate('home')}><span className="brand-symbol"><svg viewBox="0 0 48 48" width="35" height="35" aria-hidden="true"><use href="/lightvid.svg?v=2#brand-mark" /></svg></span><strong>轻影<span>LIGHTVID</span></strong></button>
    <nav aria-label="主导航" data-current={Math.max(0, links.findIndex(link => link.page === page))}><span className="nav-glider" aria-hidden="true" />{links.map((link) => <button key={link.page} className={page === link.page || (page === 'home' && link.page === 'download') ? 'active' : ''} onClick={() => onNavigate(link.page)} aria-current={page === link.page || (page === 'home' && link.page === 'download') ? 'page' : undefined}><link.icon size={15} /><span>{link.name}</span></button>)}</nav>
    {!isTauri() && <button className="nav-desktop" onClick={() => { onNavigate('home'); window.setTimeout(() => document.getElementById('desktop')?.scrollIntoView({ behavior: 'smooth' }), 100) }}><Monitor size={16} /><span>桌面版</span></button>}
  </div></header>
}

