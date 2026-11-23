import { useEffect, useMemo, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react'
import { useMotionActivity } from '../lib/motion-activity'
import { useSurfaceMotion } from '../lib/surface-motion'
import { PLATFORMS } from '../lib/media'

type Platform = (typeof PLATFORMS)[number]

export default function PlatformCarousel({ items, onChoose }: { items: readonly Platform[]; onChoose: () => void }) {
  const [playing, setPlaying] = useState(true)
  const [selected, setSelected] = useState(0)
  const [count, setCount] = useState(1)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const { root, active } = useMotionActivity<HTMLDivElement>()
  const surface = useSurfaceMotion()
  const running = playing && active && count > 1 && !hovered && !focused
  const autoplay = useMemo(() => Autoplay({
    delay: 4200, active: running, stopOnInteraction: false,
    stopOnMouseEnter: true, stopOnFocusIn: true,
    rootNode: node => node.parentElement!,
  }), [running])
  const [viewport, api] = useEmblaCarousel({ align: 'start', loop: true, slidesToScroll: 'auto' }, [autoplay])

  useEffect(() => {
    if (!api) return
    const update = () => {
      setSelected(api.selectedScrollSnap())
      setCount(api.scrollSnapList().length)
    }
    update()
    api.on('select', update).on('reInit', update)
    return () => { api.off('select', update).off('reInit', update) }
  }, [api])

  return <div className="platform-carousel" ref={root} role="region" aria-roledescription="轮播" aria-label="代表性视频平台" data-motion={running ? 'running' : 'paused'}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true) }}
    onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <div className="platform-viewport" ref={viewport}>
      <div className="platform-track">
        {items.map((platform, index) => <div className="platform-slide" key={platform.name} role="group" aria-roledescription="幻灯片" aria-label={`${index + 1} / ${items.length}`}>
          <button className="platform-tile" onClick={onChoose} onFocus={() => {
            const snap = api?.internalEngine().slideRegistry.findIndex(group => group.includes(index))
            if (snap !== undefined && snap >= 0) api?.scrollTo(snap, true)
          }} onPointerMove={surface.onPointerMove} onPointerLeave={surface.onPointerLeave} aria-label={`使用${platform.name}作品链接`}>
            <span className={`platform-mark mark-${index % 5}`}>{platform.name === 'YouTube' ? <Play size={18} fill="currentColor" /> : platform.name.slice(0, 2)}</span>
            <span className="platform-tile-name">{platform.name}<small>{platform.hosts[0]}</small></span>
            <ArrowUpRight size={16} />
          </button>
        </div>)}
      </div>
    </div>
    <div className="platform-carousel-controls">
      <span className="carousel-caption"><span className="chip-dot" />精选平台 · 更多网站直接粘贴链接</span>
      <div className="carousel-navigation">
        <button className="icon-button" aria-label="上一组平台" disabled={count <= 1} onClick={() => api?.scrollPrev()}><ArrowLeft size={15} /></button>
        <span className="carousel-counter" aria-live="off">{String(selected + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span>
        <button className="icon-button" aria-label="下一组平台" disabled={count <= 1} onClick={() => api?.scrollNext()}><ArrowRight size={15} /></button>
        <button className="icon-button" aria-label={playing ? '暂停平台轮播' : '播放平台轮播'} aria-pressed={!playing} disabled={count <= 1} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={13} /> : <Play size={13} />}</button>
      </div>
    </div>
  </div>
}
