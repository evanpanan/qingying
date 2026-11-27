import { memo, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowUpRight, ArrowRight, Check, FileVideo, Play, AudioLines } from 'lucide-react'
import { useSurfaceMotion } from '../lib/surface-motion'
import type { Page } from '../types'

const scenes = [
  { title: '喜欢的内容，留下来。', label: 'DOWNLOAD', icon: ArrowDown, page: 'download', description: '一个链接，把喜欢带回身边。' },
  { title: '换个格式，继续创作。', label: 'CONVERT', icon: FileVideo, page: 'convert', description: '给下一个灵感，恰好的格式。' },
  { title: '更轻一点，分享快一点。', label: 'COMPRESS', icon: AudioLines, page: 'compress', description: '留下好画面，放下多余的体积。' },
] as const

function DownloadScene() {
  return <div className="download-scene">
    <div className="scene-orbit orbit-one" /><div className="scene-orbit orbit-two" />
    <div className="film-stack">
      <div className="film-back back-two" /><div className="film-back back-one" />
      <div className="film-front">
        <div className="film-topline"><span>YOUR GOOD FIND</span><span>00:12</span></div>
        <div className="film-picture"><div className="landscape-sun" /><div className="landscape-ridge ridge-back" /><div className="landscape-ridge ridge-front" /><span className="film-play"><Play size={16} fill="currentColor" /></span></div>
        <div className="film-bottomline"><span>somewhere nice.mp4</span><span className="film-download"><ArrowDown size={17} /></span></div>
      </div>
    </div>
    <div className="saved-chip"><span className="saved-check"><Check size={13} /></span>好内容，已收藏<span className="chip-dot" /></div>
  </div>
}

function ConvertScene() {
  return <div className="convert-scene">
    <div className="conversion-orbit" />
    <span className="satellite satellite-mov">MOV</span><span className="satellite satellite-mkv">MKV</span><span className="satellite satellite-mp3">MP3</span>
    <div className="conversion-files">
      <div className="convert-file source-file"><FileVideo size={25} /><span>MOV</span><small>原文件</small></div>
      <div className="conversion-bridge"><span className="bridge-dot" /><span className="bridge-arrow"><ArrowRight size={20} /></span><span className="bridge-dot" /></div>
      <div className="convert-file target-file"><span className="file-fold" /><FileVideo size={25} /><div className="format-reel"><span>MP4</span><span>WebM</span><span>MP3</span><span>MP4</span></div><small>新的可能</small><div className="convert-sparkles">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--spark': i } as CSSProperties} />)}</div></div>
    </div>
    <div className="format-caption"><span className="chip-dot" />同一个视频，不止一种可能</div>
  </div>
}

function CompressScene() {
  return <div className="compress-scene">
    <div className="compression-window">
      <div className="compression-topline"><span><i /><i /><i /></span><small>LESS SIZE. SAME STORY.</small></div>
      <div className="spectrum">{Array.from({ length: 25 }, (_, i) => <i key={i} style={{ height: `${20 + ((i * 13) % 7) * 9}px`, animationDelay: `${i * -0.13}s` }} />)}</div>
      <div className="compression-size"><span>轻一点<span className="size-line" /></span><span className="size-reel"><span>100 MB</span><span>42 MB</span><span>100 MB</span></span></div>
      <div className="compression-track"><span /></div>
    </div>
    <div className="compression-chip"><Check size={13} />原文件，始终保留</div>
  </div>
}

const illustrations = [DownloadScene, ConvertScene, CompressScene]

function ExperienceGallery({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [selected, setSelected] = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const [reduced, setReduced] = useState(false)
  const root = useRef<HTMLElement>(null)
  const surface = useSurfaceMotion()
  const active = hovered ?? focused ?? selected
  const running = visible && tabVisible && !reduced

  useEffect(() => {
    const node = root.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 })
    observer.observe(node)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const preference = () => setReduced(motion.matches)
    const visibility = () => setTabVisible(!document.hidden)
    preference(); visibility()
    motion.addEventListener('change', preference)
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); motion.removeEventListener('change', preference); document.removeEventListener('visibilitychange', visibility) }
  }, [])

  useEffect(() => {
    // 悬停只临时接管选中卡片，离开后自动恢复轮换。
    if (!running || hovered !== null || focused !== null) return
    const timer = window.setInterval(() => setSelected((i) => (i + 1) % scenes.length), 5600)
    return () => clearInterval(timer)
  }, [running, hovered, focused])

  return <section className="experience-section" ref={root} data-motion={running ? 'running' : 'paused'}>
    <div className="section-heading"><div><span className="eyebrow">A LIGHTER WAY.</span><h2>把复杂交给工具。<br /><em>把创作留给你。</em></h2></div><span className="motion-status"><span className="chip-dot" />自动演示 · 轻触互动</span></div>
    <div className="experience-cards">
      {scenes.map((scene, index) => {
        const Illustration = illustrations[index]
        return <button key={scene.label} className={`experience-card scene-${index} ${active === index ? 'active' : ''}`} aria-pressed={active === index} aria-label={`查看${scene.label === 'DOWNLOAD' ? '视频下载' : scene.label === 'CONVERT' ? '格式转换' : '视频压缩'}互动演示`}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(index) }}
          onPointerMove={surface.onPointerMove}
          onPointerLeave={(e) => { surface.onPointerLeave(e); setHovered(null) }}
          onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setFocused(index) }}
          onBlur={() => setFocused(null)}
          onClick={() => setSelected(index)}>
          <div className="card-label"><span>LIGHTVID STUDIO</span><span>{scene.page === 'download' ? '01' : scene.page === 'convert' ? '03' : '04'} / {scene.label}</span></div>
          <div className="motion-art" aria-hidden="true"><Illustration /></div>
          <div className="card-bottom"><span className="card-icon"><scene.icon size={18} /></span><h3>{scene.title}</h3><p>{scene.description}</p><span className="card-cta"><span>轻轻触碰，看看变化</span><ArrowUpRight size={14} /></span></div>
        </button>
      })}
    </div>
    <div className="experience-controls"><div className="scene-pagination" role="group" aria-label="选择互动演示">{scenes.map((scene, index) => <button key={scene.label} aria-label={`选择${index + 1}号演示`} aria-pressed={selected === index} className={selected === index ? 'selected' : ''} onClick={() => setSelected(index)}><span /></button>)}<small>互动演示 · 非真实处理任务</small></div><button className="quiet-button" onClick={() => onNavigate(scenes[active].page)}>打开{active === 0 ? '下载' : active === 1 ? '转换' : '压缩'}工具 <ArrowUpRight size={16} /></button></div>
  </section>
}

export default memo(ExperienceGallery)

