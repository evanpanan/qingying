import { AbsoluteFill, Img, interpolate, useCurrentFrame, Easing } from 'remotion'

const INK = '#13110f'
const AMBER = '#955905'
const MUTED = '#65635f'
const PAPER = '#faf7f2'
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export const SceneProduct: React.FC = () => {
  const frame = useCurrentFrame()
  const duration = 270

  // window entrance
  const winIn = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 1.1, 0.3, 1) })
  const winScale = interpolate(frame, [0, 20], [0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const winY = interpolate(frame, [0, 20], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // progress bar
  const progress = interpolate(frame, [30, 200], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.2, 1) })

  // before/after sizes
  const original = 156.8
  const compressed = original * (1 - (progress / 100) * 0.75)
  const savedPct = Math.round((progress / 100) * 75)

  // quality badge pop
  const badgeIn = interpolate(frame, [210, 225], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 1.3, 0.3, 1) })

  const outT = interpolate(frame, [duration - 8, duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, opacity: 1 - outT }}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ transform: `scale(${winScale}) translateY(${winY}px)`, opacity: winIn, filter: `blur(${(1 - winIn) * 10}px)` }}>
          <div style={{
            width: 1200, height: 720, borderRadius: 16, background: '#fff',
            boxShadow: '0 30px 90px rgba(40,30,20,0.2), 0 0 0 1px rgba(0,0,0,0.06)',
            overflow: 'hidden', position: 'relative',
          }}>
            {/* Title bar */}
            <div style={{ height: 44, background: '#f8f8f8', borderBottom: '1px solid #eaeaea', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
              <div style={{ display: 'flex', gap: 7 }}>
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: '#999', marginLeft: 14 }}>轻影 · 视频压缩</div>
            </div>

            <div style={{ padding: 36, fontFamily: MONO }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, color: INK, fontWeight: 600 }}>summer_trip_2026.mp4</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>MP4 · 3840×2160 · 4:12</div>
                  </div>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                  background: '#f0fdf4', borderRadius: 20, opacity: badgeIn, transform: `scale(${badgeIn})`,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#16a34a"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>压缩完成</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12 }}>
                  <span style={{ color: MUTED }}>{progress >= 100 ? '压缩完成' : '正在压缩…'}</span>
                  <span style={{ color: '#3b82f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{Math.round(progress)}%</span>
                </div>
                <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 4 }} />
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                <div style={{ padding: 20, background: '#f9fafb', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>原始大小</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>{original.toFixed(1)}<span style={{ fontSize: 14, color: MUTED }}> MB</span></div>
                </div>
                <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>压缩后</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{compressed.toFixed(1)}<span style={{ fontSize: 14, color: MUTED }}> MB</span></div>
                </div>
                <div style={{ padding: 20, background: '#fffbeb', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>节省空间</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: AMBER, fontVariantNumeric: 'tabular-nums' }}>{savedPct}%</div>
                </div>
              </div>

              {/* Settings preview */}
              <div style={{ marginTop: 28, display: 'flex', gap: 16 }}>
                <div style={{ padding: '12px 18px', background: '#eff6ff', borderRadius: 10, fontSize: 13, color: '#1d4ed8' }}>
                  画质：标准
                </div>
                <div style={{ padding: '12px 18px', background: '#f5f3ff', borderRadius: 10, fontSize: 13, color: '#6d28d9' }}>
                  分辨率：1080p
                </div>
                <div style={{ padding: '12px 18px', background: '#f0fdf4', borderRadius: 10, fontSize: 13, color: '#166534' }}>
                  编码：H.264
                </div>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
