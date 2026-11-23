import { memo, useEffect, useMemo, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import AutoScroll from 'embla-carousel-auto-scroll'
import { ArrowUpRight, Play } from 'lucide-react'
import { useMotionActivity } from '../lib/motion-activity'
import { useSurfaceMotion } from '../lib/surface-motion'
import { PLATFORMS } from '../lib/media'

type Platform = (typeof PLATFORMS)[number]

function PlatformTile({ platform, index, duplicate = false, onChoose, onFocus }: {
  platform: Platform; index: number; duplicate?: boolean; onChoose: () => void; onFocus?: () => void
}) {
  const surface = useSurfaceMotion()
  return <button className="platform-tile" tabIndex={duplicate ? -1 : undefined} onClick={onChoose} onFocus={onFocus} onPointerMove={surface.onPointerMove} onPointerLeave={surface.onPointerLeave} aria-label={`使用${platform.name}作品链接`}>
    <span className={`platform-mark mark-${index % 5}`}>{platform.name === 'YouTube' ? <Play size={18} fill="currentColor" /> : platform.name.slice(0, 2)}</span>
    <span className="platform-tile-name">{platform.name}<small>{platform.hosts[0]}</small></span>
    <ArrowUpRight size={16} />
  </button>
}

const PlatformRow = memo(function PlatformRow({ items, direction, onChoose }: {
  items: readonly Platform[]; direction: 'forward' | 'backward'; onChoose: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const { root, active } = useMotionActivity<HTMLDivElement>()
  const running = active && !hovered && !focused
  const scrolling = useMemo(() => AutoScroll({
    direction, speed: 0.65, startDelay: 0, playOnInit: false,
    stopOnInteraction: true, stopOnMouseEnter: false, stopOnFocusIn: false,
  }), [direction])
  const [viewport, api] = useEmblaCarousel({ align: 'start', loop: true, dragFree: true }, [scrolling])

  useEffect(() => {
    if (!api) return
    const sync = () => { if (running) scrolling.play(0); else scrolling.stop() }
    const resume = () => { if (running) scrolling.play(350) }
    sync()
    api.on('reInit', sync).on('pointerUp', resume)
    return () => { api.off('reInit', sync).off('pointerUp', resume); scrolling.stop() }
  }, [api, running, scrolling])

  return <div className="platform-row" ref={root} data-direction={direction === 'forward' ? 'left' : 'right'} data-motion={running ? 'running' : 'paused'}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true) }}
    onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <div className="platform-viewport" ref={viewport}>
      <div className="platform-track">
        {[...items, ...items].map((platform, index) => <div className="platform-slide" key={`${index}-${platform.name}`} aria-hidden={index >= items.length ? true : undefined}>
          <PlatformTile platform={platform} index={index} duplicate={index >= items.length} onChoose={onChoose} onFocus={() => { if (index < items.length) api?.scrollTo(index, true) }} />
        </div>)}
      </div>
    </div>
  </div>
})

export default function PlatformCarousel({ items, searching = false, onChoose }: {
  items: readonly Platform[]; searching?: boolean; onChoose: () => void
}) {
  return <div className="platform-carousel" role="region" aria-label="代表性视频平台">
    {searching ? <div className="platform-search-results">{items.slice(0, 8).map((platform, index) => <PlatformTile key={platform.name} platform={platform} index={index} onChoose={onChoose} />)}</div> : <>
      <PlatformRow items={items.slice(0, 4)} direction="forward" onChoose={onChoose} />
      <PlatformRow items={items.slice(4, 8)} direction="backward" onChoose={onChoose} />
    </>}
    <span className="carousel-caption"><span className="chip-dot" />{searching ? `找到 ${items.length} 个平台${items.length > 8 ? ' · 展示前 8 项' : ''}` : '精选平台 · 自动流动 · 可拖动浏览'} · 更多网站直接粘贴链接</span>
  </div>
}
