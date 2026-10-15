import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion'

const INK = '#13110f'
const AMBER = '#955905'
const MUTED = '#65635f'
const PAPER = '#faf7f2'
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame()
  const duration = 195

  const outT = interpolate(frame, [duration - 8, duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // wordmark letterpress
  const WORDMARK = '轻影 LightVid'
  const letters = WORDMARK.split('')

  const rule = interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) })
  const tag = interpolate(frame, [70, 85], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // dust particles
  const DUST = Array.from({ length: 15 }, (_, i) => ({
    x: (i * 439 + 137) % 1920,
    y0: (i * 613 + 271) % 1080,
    rise: 0.3 + (i % 5) * 0.1,
    swayAmp: 9 + (i % 4) * 5,
    swayFreq: 0.022 + (i % 3) * 0.008,
    phase: (i * 0.83) % (Math.PI * 2),
    size: 2 + (i % 3) * 0.5,
    opacity: 0.15 + ((i * 7) % 5) * 0.05,
  }))

  // stage light
  const stageLight = interpolate(frame, [40, 55, 70], [0, 0.5, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, opacity: 1 - outT }}>
      {/* dust */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {DUST.map((d, i) => {
          const y = (((d.y0 - frame * d.rise) % 1080) + 1080) % 1080
          const x = d.x + Math.sin(frame * d.swayFreq + d.phase) * d.swayAmp
          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: x, top: y,
                width: d.size, height: d.size, borderRadius: '50%',
                background: '#c9a84a', opacity: d.opacity,
              }}
            />
          )
        })}
      </AbsoluteFill>

      {/* stage light */}
      {stageLight > 0 && (
        <AbsoluteFill style={{
          pointerEvents: 'none',
          background: `radial-gradient(700px 360px at 960px 470px, rgba(255,246,228,0.95), rgba(255,246,228,0.35) 55%, rgba(255,246,228,0) 75%)`,
          opacity: stageLight,
        }} />
      )}

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: 148, fontWeight: 600, color: INK, letterSpacing: '-0.01em', display: 'flex', justifyContent: 'center' }}>
            {letters.map((ch, i) => {
              const delay = Math.round(40 + i * 2)
              const t = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.75, 0.3, 1) })
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block', opacity: t,
                    transform: `translateY(${(1 - t) * 30}px) scale(${1.35 - 0.35 * t})`,
                    filter: `blur(${(1 - t) * 8}px)`, whiteSpace: 'pre',
                  }}
                >
                  {ch}
                </span>
              )
            })}
          </div>
          <div style={{ position: 'relative', height: 6, width: 280, margin: '36px auto 0' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: AMBER, transform: `scaleX(${rule})` }} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: '0.14em', color: MUTED, marginTop: 32, opacity: tag, textTransform: 'uppercase' }}>
            视频压缩工具 · 本地处理 · 隐私安全
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
