import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUpRight, ArrowRight, Pause, Play, Monitor, AudioLines, FileVideo, Maximize2, X, Volume2, VolumeX } from 'lucide-react'
import DownloadTool from '../components/DownloadTool'
import { FORMATS, PLATFORMS } from '../lib/media'
import type { Page } from '../types'
import { isTauri } from '../lib/env'

const cards = [
  { title: '喜欢的内容，留下来。', label: 'DOWNLOAD', icon: ArrowDown, description: '公开作品链接，一处收集。' },
  { title: '换个格式，继续创作。', label: 'CONVERT', icon: FileVideo, description: 'MP4 / MOV / MKV / WebM / MP3' },
  { title: '更轻一点，分享快一点。', label: 'COMPRESS', icon: AudioLines, description: '视频留在本机，体积轻下来。' },
]
const faq = [
  ['哪些网站可以下载？', `当前接入 ${PLATFORMS.length} 个常用平台，包括 YouTube、抖音、Instagram、快手、小红书、X、B站、TikTok 和 Vimeo 等。可用性取决于作品公开状态与平台访问限制。`],
  ['在线版与桌面版有什么不同？', '在线版无需安装，下载可直接保存的完整文件；桌面版内置下载与转换引擎，可合并音视频，适合高清和大文件。格式转换与压缩均在本机完成。'],
  ['能转换成哪些格式？', 'MP4、MOV、MKV、WebM 四种视频格式，以及从视频中提取 MP3 音频。转换后的文件不会覆盖源视频。'],
  ['下载失败怎么办？', '请确认链接是公开的单个作品。登录限制、地区限制、版权保护或平台风控可能阻止解析；也可以使用桌面版重试。轻影不会绕过付费权限或 DRM。'],
]

export default function Landing({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [card, setCard] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [open, setOpen] = useState(false)
  const [muted, setMuted] = useState(true)
  const [query, setQuery] = useState('')
  const [faqIndex, setFaqIndex] = useState<number | null>(null)
  useEffect(() => {
    if (!playing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setCard((i) => (i + 1) % cards.length), 5500)
    return () => clearInterval(timer)
  }, [playing])
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
  const filtered = PLATFORMS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  return <main>
    <section className="hero-stage">
      <div className="hero-copy reveal"><span className="eyebrow">YOUR VIDEOS. WITH YOU.</span><h1>喜欢的视频，<br /><em>留在你身边。</em></h1><p>粘贴链接，保存喜欢的内容。<br />换个格式，轻一点，再出发。</p><a className="text-link" href="#download-tool">从一个链接开始 <ArrowDown size={17} /></a></div>
      <div className="hero-tool reveal" id="download-tool"><DownloadTool /></div>
    </section>
    <section className="experience-section">
      <div className="section-heading"><div><span className="eyebrow">A LIGHTER WAY.</span><h2>把复杂交给工具。<br /><em>把创作留给你。</em></h2></div><button className="quiet-button" aria-label={playing ? '暂停卡片轮换' : '播放卡片轮换'} onClick={() => setPlaying((v) => !v)}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? '暂停' : '播放'}</button></div>
      <div className="experience-cards" onMouseEnter={() => setPlaying(false)}>
        {cards.map((item, index) => <button key={item.label} className={`experience-card ${card === index ? 'active' : ''}`} aria-pressed={card === index} onClick={() => { setCard(index); setPlaying(false) }} onFocus={() => { setCard(index); setPlaying(false) }}>
          <div className="card-label"><span>LIGHTVID</span><span>0{index + 1} / {item.label}</span></div>
          <div className={`motion-art art-${index}`} aria-hidden="true">{index === 0 ? <div className="file-stack"><div><span>YOUR VIDEO</span><ArrowDown size={34} /></div><div /><div /></div> : index === 1 ? <div className="format-art"><span>MOV</span><ArrowRight size={26} /><strong>MP4</strong></div> : <div className="wave-art">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.08}s`, height: `${18 + (i % 5) * 10}px` }} />)}</div>}</div>
          <div className="card-bottom"><item.icon size={22} /><h3>{item.title}</h3><p>{item.description}</p></div>
        </button>)}
      </div>
      <div className="experience-controls"><span>{cards[card].description}</span><button className="quiet-button" onClick={() => onNavigate(card === 0 ? 'download' : card === 1 ? 'convert' : 'compress')}>打开工具 <ArrowUpRight size={16} /></button></div>
    </section>
    <section className="platform-section" id="platforms"><div className="section-heading"><div><span className="eyebrow">ONE LINK. MANY PLACES.</span><h2>从这些地方，<em>带走灵感。</em></h2></div><label className="platform-search"><span className="sr-only">搜索平台</span><input placeholder="搜索平台" value={query} onChange={(e) => setQuery(e.target.value)} /></label></div>
      <div className="platform-grid">{filtered.map((p, i) => <button key={p.name} onClick={() => { document.getElementById('share-link')?.focus(); document.getElementById('download-tool')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}><span className={`platform-mark mark-${i % 5}`}>{p.name === 'YouTube' ? <Play size={18} fill="currentColor" /> : p.name.slice(0, 2)}</span><span>{p.name}</span><ArrowUpRight size={16} /></button>)}</div>
      {!filtered.length && <p className="muted-note">没有找到这个平台。</p>}<p className="muted-note">公开作品可尝试解析，登录、地区及平台风控可能影响下载。</p>
    </section>
    <section className="secondary-tools"><div className="section-heading"><div><span className="eyebrow">AFTER THE DOWNLOAD.</span><h2>拿到视频，<em>然后呢？</em></h2></div></div><div className="secondary-grid"><button onClick={() => onNavigate('convert')}><span>02 / CONVERT</span><h3>换个格式。</h3><p>{FORMATS.map((f) => f.name).join(' · ')}</p><ArrowUpRight /></button><button onClick={() => onNavigate('compress')}><span>03 / COMPRESS</span><h3>轻一点，快一点。</h3><p>本地压缩，原视频不上传。</p><ArrowUpRight /></button></div></section>
    {!isTauri() && <section className="desktop-section" id="desktop"><div><span className="eyebrow">ON YOUR DESKTOP.</span><h2>更大的文件，<br /><em>更从容地处理。</em></h2><p>内置下载与转换引擎。<br />下载、转格式、压缩，一处完成。</p><a className="primary-button" href="/downloads/轻影_1.1.0_aarch64.dmg" download><Monitor size={18} />下载 macOS 版 <ArrowDown size={17} /></a><p className="muted-note">Apple Silicon · v1.1.0 · Windows 安装包尚未发布</p><details className="install-help"><summary>macOS 提示无法打开？</summary><p>将轻影拖入应用程序后，在终端运行：</p><code>xattr -cr /Applications/轻影.app</code><p>当前为开源应用的临时签名，尚未完成 Apple 公证。</p></details></div><button className="video-preview" onClick={() => setOpen(true)} aria-label="播放轻影介绍视频"><video src="/qingying-promo.mp4" autoPlay muted loop playsInline /><span><Maximize2 size={17} />看看轻影</span></button></section>}
    <section className="faq-section"><span className="eyebrow">A FEW THINGS TO KNOW.</span><h2>你可能想知道。</h2>{faq.map(([question, answer], index) => <div className="faq-item" key={question}><button aria-expanded={faqIndex === index} onClick={() => setFaqIndex(faqIndex === index ? null : index)}><span>{question}</span><PlusSign open={faqIndex === index} /></button>{faqIndex === index && <p className="reveal">{answer}</p>}</div>)}</section>
    <footer className="studio-footer"><div className="footer-wordmark">LIGHTVID<span>轻影</span></div><div><span>喜欢的内容，留在身边。</span><a href="https://github.com/evanpanan/qingying" target="_blank" rel="noreferrer">开源代码 <ArrowUpRight size={15} /></a><small>© 2026 LightVid · 仅下载你拥有或获授权的内容</small></div></footer>
    {open && <div className="media-modal" role="dialog" aria-modal="true" aria-label="轻影介绍" onClick={() => setOpen(false)}><div onClick={(e) => e.stopPropagation()}><button className="modal-close icon-button" autoFocus onClick={() => setOpen(false)} aria-label="关闭视频"><X /></button><video src="/qingying-promo.mp4" autoPlay muted={muted} loop playsInline controls /><button className="quiet-button" onClick={() => setMuted((v) => !v)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}{muted ? '开启声音' : '静音'}</button></div></div>}
  </main>
}
function PlusSign({ open }: { open: boolean }) { return <span className={`faq-plus ${open ? 'open' : ''}`} aria-hidden="true">+</span> }
