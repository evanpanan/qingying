import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion'

const INK = '#13110f'
const AMBER = '#955905'
const MUTED = '#65635f'
const PAPER = '#faf7f2'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

const PRESETS = [
  { name: '无损', crf: 18, desc: '画质不变', color: '#16a34a', bg: '#f0fdf4' },
  { name: '高清', crf: 22, desc: '高清画质', color: '#3b82f6', bg: '#eff6ff' },
  { name: '标准', crf: 26, desc: '推荐选择', color: '#6366f1', bg: '#f5f3ff' },
  { name: '高压缩', crf: 32, desc: '体积最小', color: '#f59e0b', bg: '#fffbeb' },
]

export const SceneQuality: React.FC = () => {
  const frame = useCurrentFrame()
  const duration = 240

  const outT = interpolate(frame, [duration - 8, duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, opacity: 1 - outT }}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1100 }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontFamily: MONO, fontSize: 14, color: AMBER, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Quality Presets</div>
            <div style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 48, fontWeight: 600, color: INK }}>四档画质预设</div>
          </div>

          {/* Preset cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20 }}>
            {PRESETS.map((p, i) => {
              const delay = i * 12
              const cardIn = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 1.1, 0.3, 1) })
              const isSelected = i === 2 // standard selected
              const selectedPulse = isSelected ? interpolate(frame, [delay + 30, delay + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0

              return (
                <div
                  key={p.name}
                  style={{
                    padding: 28,
                    background: p.bg,
                    borderRadius: 16,
                    opacity: cardIn,
                    transform: `translateY(${(1 - cardIn) * 30}px) scale(${cardIn})`,
                    boxShadow: isSelected ? `0 0 0 3px ${p.color}, 0 20px 40px rgba(0,0,0,0.1)` : '0 4px 12px rgba(0,0,0,0.05)',
                    position: 'relative',
                  }}
                >
                  {/* Selected indicator */}
                  {isSelected && selectedPulse > 0 && (
                    <div style={{ position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: selectedPulse, transform: `scale(${selectedPulse})` }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    </div>
                  )}
                  <div style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: MUTED, marginBottom: 16 }}>CRF {p.crf}</div>
                  <div style={{ fontSize: 13, color: MUTED }}>{p.desc}</div>
                </div>
              )
            })}
          </div>

          {/* CRF scale */}
          <div style={{ marginTop: 48, padding: '0 20px' }}>
            <div style={{ height: 6, background: '#e5e5e5', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', background: 'linear-gradient(90deg, #16a34a, #3b82f6, #6366f1, #f59e0b)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: MONO, fontSize: 12, color: MUTED }}>
              <span>无损</span>
              <span>体积小 ← → 画质高</span>
              <span>高压缩</span>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
