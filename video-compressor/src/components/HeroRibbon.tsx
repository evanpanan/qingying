import { memo } from 'react'
import { ArrowRight, Check, FileVideo, Link2 } from 'lucide-react'

function HeroRibbon() {
  return <div className="hero-ribbon">
    <div className="hero-link-journey" aria-hidden="true">
      <span className="journey-link"><Link2 size={15} /><span>一个好链接</span></span>
      <span className="journey-path"><i /><i /><i /><ArrowRight size={15} /></span>
      <span className="journey-file"><FileVideo size={16} /><span>留在身边</span><Check size={12} /></span>
    </div>
    <div className="hero-ribbon-caption"><span>灵感流动 · 自动演示</span></div>
  </div>
}

export default memo(HeroRibbon)
