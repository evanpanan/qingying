import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Monitor, Maximize2, X, Volume2, VolumeX, Search, CodeXml, ShieldCheck } from 'lucide-react'
import DownloadTool from '../components/DownloadTool'
import ExperienceGallery from '../components/ExperienceGallery'
import ParticleWordmark from '../components/ParticleWordmark'
import HeroRibbon from '../components/HeroRibbon'
import PlatformCarousel from '../components/PlatformCarousel'
import FooterAppreciation from '../components/FooterAppreciation'
import { useMotionActivity } from '../lib/motion-activity'
import { useSurfaceMotion } from '../lib/surface-motion'
import { FORMATS, PLATFORMS, REPRESENTATIVE_PLATFORMS, type EngineInfo } from '../lib/media'
import { invoke } from '@tauri-apps/api/core'
import type { Page } from '../types'
import { isTauri } from '../lib/env'
const faq = [
  ['哪些网站可以下载？', '轻影自行运行全量 yt-dlp 解析器，并探测普通网页中的公开视频，不限于下方推荐平台。解析器数量来自当前引擎，不等于独立网站数量或下载成功保证。登录、签名、地区、DRM 与格式限制仍可能阻止下载。'],
  ['在线版与桌面版有什么不同？', '在线版无需安装，下载可直接保存的完整文件；桌面版内置下载与转换引擎，可合并音视频，适合高清和大文件。格式转换与压缩均在本机完成。'],
  ['能同时下载多个视频吗？', '可以。网页下载中仍可粘贴下一条链接、解析并保存，同时下载两个任务，其余自动排队。每项有独立进度，可单独取消或失败重试。切换工具不会打断下载，刷新或关闭页面会中断未完成任务。'],
  ['能转换成哪些格式？', 'MP4、MOV、MKV、WebM 四种视频格式，以及从视频中提取 MP3 音频。转换后的文件不会覆盖源视频。'],
  ['下载失败怎么办？', '请确认链接是公开的单个作品。登录限制、地区限制、版权保护或平台风控可能阻止解析；也可以使用桌面版重试。轻影不会绕过付费权限或 DRM。'],
]

export default function Landing({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [open, setOpen] = useState(false)
  const [muted, setMuted] = useState(true)
  const [query, setQuery] = useState('')
  const [faqIndex, setFaqIndex] = useState<number | null>(null)
  const [engine, setEngine] = useState<EngineInfo | null>(null)
  const [guidanceKey, setGuidanceKey] = useState(0)
  const { root: heroRef, active: heroActive } = useMotionActivity<HTMLElement>()
  const { root: footerRef, active: footerActive } = useMotionActivity<HTMLElement>()
  const surface = useSurfaceMotion()
  const guideToLink = useCallback(() => setGuidanceKey(value => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const request = isTauri()
      ? invoke<EngineInfo>('native_engine_info')
      : fetch('/api/extract', { signal: controller.signal })
        .then((response) => response.json())
        .then((result) => result.ok ? result.engine as EngineInfo : null)
    void request.then((result) => { if (active && result) setEngine(result) }).catch(() => {})
    return () => { active = false; controller.abort() }
  }, [])
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'Tab') {
        const focusable = Array.from(document.querySelectorAll<HTMLElement>('.media-modal button, .media-modal video'))
        const first = focusable[0], last = focusable.at(-1)
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', handler)
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = previousOverflow; document.querySelector<HTMLButtonElement>('.video-preview')?.focus() }
  }, [open])
  const filtered = PLATFORMS.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
  return <main>
    <section className="hero-stage" ref={heroRef} data-motion={heroActive ? 'running' : 'paused'}>
      <div className="hero-copy reveal"><span className="eyebrow"><span className="tiny-orbit" />YOUR VIDEOS. WITH YOU.</span><h1>喜欢的视频，<br /><em>留在你身边。</em></h1><p>粘贴链接，保存喜欢的内容。<br />换个格式，轻一点，再出发。</p><HeroRibbon /><button className="text-link" onClick={guideToLink} aria-controls="share-link">从一个链接开始 <span><ArrowRight size={17} /></span></button><div className="hero-assurances"><span><ShieldCheck size={13} />本地转换</span><span>免费使用</span><span>开源制作</span></div></div>
      <div className="hero-tool reveal" id="download-tool" onPointerMove={surface.onPointerMove} onPointerLeave={surface.onPointerLeave}><span className="tool-caption">A GOOD FIND DESERVES TO STAY.</span><DownloadTool guidanceKey={guidanceKey} /></div>
    </section>
    <ExperienceGallery onNavigate={onNavigate} />
    <section className="platform-section" id="platforms"><div className="section-heading"><div><span className="eyebrow">ONE LINK. MANY PLACES.</span><h2>从这些地方，<em>带走灵感。</em></h2></div><div className="platform-search"><Search size={15} /><label className="sr-only" htmlFor="platform-search">搜索平台</label><input id="platform-search" placeholder="搜索平台" value={query} onChange={(e) => setQuery(e.target.value)} />{query ? <button className="icon-button" aria-label="清除平台搜索" onClick={() => setQuery('')}><X size={14} /></button> : <span className="search-hint">⌕</span>}</div></div>
      <div className="engine-capability"><span className="chip-dot" /><strong>{engine ? `${engine.extractors.toLocaleString()} 个站点解析器` : '全量站点解析器'}</strong><span>+ 通用网页探测</span><small>轻影自运行 · 不使用第三方解析{engine ? ` · v${engine.version}` : ''}</small></div>
      {filtered.length > 0 && <PlatformCarousel items={query.trim() ? filtered : REPRESENTATIVE_PLATFORMS} searching={!!query.trim()} onChoose={guideToLink} />}
      {!filtered.length && <p className="muted-note">推荐列表中未收录，仍可直接粘贴该网站的作品链接尝试解析。</p>}<p className="muted-note">以上是常用平台示例，不是支持上限，也不保证每个平台的每条链接可用。仅下载公开且获授权的作品。</p>
    </section>
    <section className="secondary-tools"><div className="section-heading"><div><span className="eyebrow">AFTER THE DOWNLOAD.</span><h2>拿到视频，<em>然后呢？</em></h2></div></div><div className="secondary-grid"><button onClick={() => onNavigate('cleanup')}><span>02 / REPAIR</span><h3>去掉干扰。</h3><p>字幕与水印，框选修补或 AI 重绘。</p><ArrowUpRight /></button><button onClick={() => onNavigate('convert')}><span>03 / CONVERT</span><h3>换个格式。</h3><p>{FORMATS.map((f) => f.name).join(' · ')}</p><ArrowUpRight /></button><button onClick={() => onNavigate('compress')}><span>04 / COMPRESS</span><h3>轻一点，快一点。</h3><p>本地压缩，原视频不上传。</p><ArrowUpRight /></button></div></section>
    {!isTauri() && <section className="desktop-section" id="desktop"><div><span className="eyebrow">ON YOUR DESKTOP.</span><h2>更大的文件，<br /><em>更从容地处理。</em></h2><p>内置自有解析、JavaScript 与转换引擎。<br />下载、转格式、压缩、AI 修复与英文配音字幕，一处完成。</p><a className="primary-button" href="https://github.com/evanpanan/qingying/releases/download/v1.9.0/_1.9.0_aarch64.dmg" download><Monitor size={18} />下载 macOS 版 <ArrowDown size={17} /></a><p className="muted-note">Apple Silicon · v1.9.0 · 安装包更新：<time dateTime="2026-11-28">2026-11-28</time></p><p className="muted-note">新版支持精细去字、高清增强、独立更换英文字幕或配音；支持的 macOS 26 设备可使用 AI 2×超分。修复模型已内置，语音模型首次自动下载。</p><details className="install-help"><summary>macOS 提示无法打开？</summary><p>将轻影拖入应用程序后，在终端运行：</p><code>xattr -cr /Applications/轻影.app</code><p>当前为开源应用的临时签名，尚未完成 Apple 公证。</p></details></div><button className="video-preview" onClick={() => setOpen(true)} aria-label="播放轻影新版功能介绍视频"><video src="/qingying-promo-v2.mp4" poster="/qingying-promo-v2-poster.jpg" preload="metadata" autoPlay muted loop playsInline /><span><Maximize2 size={17} />下载 · 转换 · 压缩</span></button></section>}
    <section className="faq-section"><span className="eyebrow">A FEW THINGS TO KNOW.</span><h2>你可能想知道。</h2>{faq.map(([question, answer], index) => <div className="faq-item" key={question}><button aria-expanded={faqIndex === index} onClick={() => setFaqIndex(faqIndex === index ? null : index)}><span>{question}</span><PlusSign open={faqIndex === index} /></button>{faqIndex === index && <p className="reveal">{answer}</p>}</div>)}</section>
    <footer className="studio-footer" ref={footerRef} data-motion={footerActive ? 'running' : 'paused'}>
      <div className="footer-top"><div className="footer-brand"><span className="eyebrow">A LITTLE TOOL. A LOT OF CARE.</span><ParticleWordmark /><div className="footer-tagline">轻影 / 让好内容，留在身边。</div><p>从一个真实的需要出发，<br />认真打磨每一点轻巧。</p></div>
        <div className="footer-maker"><span className="eyebrow">MEET THE MAKER</span><a className="author-card" href="https://x.com/Yep_Cooper" target="_blank" rel="noopener noreferrer" aria-label="访问作者 Cooper 的 X（推特）主页"><span className="author-avatar"><img src="/cooper-avatar.jpg" alt="Cooper 的头像" width={52} height={52} loading="lazy" /><span className="author-status" aria-hidden="true" title="装饰性呼吸光点，不代表实时在线状态" /></span><span className="author-details"><strong>Cooper <span className="author-x">𝕏</span></strong><small>@Yep_Cooper</small></span><span className="author-arrow"><ArrowUpRight size={19} /></span></a><p>想法、更新，和下一点新东西。<br />都在这里，欢迎来聊聊。</p><a className="footer-source" href="https://github.com/evanpanan/qingying" target="_blank" rel="noopener noreferrer"><CodeXml size={15} />查看开源代码 <ArrowUpRight size={14} /></a></div>
      </div>
      <div className="footer-bottom"><small>© 2026 LightVid · 仅下载你拥有或获授权的内容</small><FooterAppreciation /><a href="#home" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>回到顶部 <ArrowUpRight size={13} /></a></div>
    </footer>
    {open && <div className="media-modal" role="dialog" aria-modal="true" aria-label="轻影介绍" onClick={() => setOpen(false)}><div onClick={(e) => e.stopPropagation()}><button className="modal-close icon-button" autoFocus onClick={() => setOpen(false)} aria-label="关闭视频"><X /></button><video src="/qingying-promo-v2.mp4" poster="/qingying-promo-v2-poster.jpg" preload="metadata" autoPlay muted={muted} loop playsInline controls /><button className="quiet-button" onClick={() => setMuted((v) => !v)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}{muted ? '开启声音' : '静音'}</button></div></div>}
  </main>
}
function PlusSign({ open }: { open: boolean }) { return <span className={`faq-plus ${open ? 'open' : ''}`} aria-hidden="true">+</span> }

