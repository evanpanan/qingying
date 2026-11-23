import { useEffect, useRef } from 'react'
import { mountParticleWordmark } from '../lib/particle-wordmark'

export default function ParticleWordmark() {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (boxRef.current && canvasRef.current) {
      return mountParticleWordmark(boxRef.current, canvasRef.current)
    }
  }, [])
  return <div className="particle-wordmark" ref={boxRef} role="button" tabIndex={0} aria-label="LIGHTVID 粒子文字，点击或按回车散开后重新聚合">
    <span className="particle-wordmark-fallback" aria-hidden="true">LIGHTVID</span>
    <canvas ref={canvasRef} aria-hidden="true" />
    <span className="particle-wordmark-hint" aria-hidden="true">划过，让它流动 · 轻触，散开再相聚</span>
  </div>
}
