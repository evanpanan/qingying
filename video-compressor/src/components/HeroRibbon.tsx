import { memo } from 'react'
import { ArrowRight, Check, FileVideo, Link2, Pause, Play } from 'lucide-react'

function HeroRibbon({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return <div className="hero-ribbon">
    <div className="hero-link-journey" aria-hidden="true">
      <span className="journey-link"><Link2 size={15} /><span>一个好链接</span></span>
      <span className="journey-path"><i /><i /><i /><ArrowRight size={15} /></span>
      <span className="journey-file"><FileVideo size={16} /><span>留在身边</span><Check size={12} /></span>
    </div>
    <div className="hero-ribbon-caption"><span>灵感流动 · 动画演示</span><button className="icon-button" onClick={onToggle} aria-label={playing ? '暂停首屏动效' : '播放首屏动效'} aria-pressed={!playing}>{playing ? <Pause size={12} /> : <Play size={12} />}</button></div>
  </div>
}

export default memo(HeroRibbon)
