import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion'

const INK = '#13110f'
const AMBER = '#955905'
const MUTED = '#65635f'
const PAPER = '#faf7f2'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

const RESOLUTIONS = [
  { name: '原始', width: '3840×2160', desc: '保持原分辨率', selected: false },
  { name: '1080p', width: '1920×1080', desc: '全高清', selected: true },
  { name: '720p', width: '1280×720', desc: '高清', selected: false },
  { name: '480p', width: '854×480', desc: '标清', selected: false },
]

export const SceneResolution: React.FC = () => {
  const frame = useCurrentFrame()
  const duration = 240

  const outT = interpolate(frame, [duration - 8, duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // preview video scale based on selected resolution
  const previewScale = interpolate(frame, [20, 60], [0.3, 0.56], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, opacity: 1 - outT }}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1100, display: 'flex', gap: 48, alignItems: 'center' }}>
          {/* Left: resolution options */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 14, color: AMBER, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Resolution</div>
            <div style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 44, fontWeight: 600, color: INK, marginBottom: 36 }}>分辨率自由调整</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {RESOLUTIONS.map((r, i) => {
                const delay = i * 10 + 10
                const optIn = interpolate(frame, [delay, delay + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 1.1, 0.3, 1) })
                return (
                  <div
                    key={r.name}
                    style={{
                      padding: '16px 20px',
                      background: r.selected ? '#eff6ff' : '#fff',
                      borderRadius: 12,
                      border: r.selected ? '2px solid #3b82f6' : '1px solid #e5e5e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: optIn,
                      transform: `translateX(${(1 - optIn) * -20}px)`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>{r.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 12, color: MUTED, marginTop: 2 }}>{r.width}</div>
                    </div>
                    <div style={{ fontSize: 13, color: MUTED }}>{r.desc}</div>
                    {r.selected && (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: video preview */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              width: 440, aspectRatio: '16/9', borderRadius: 12,
              background: 'linear-gradient(135deg, #1e293b, #334155)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: `scale(${previewScale})`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Play button */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
              </div>
              {/* Resolution label */}
              <div style={{ position: 'absolute', bottom: 16, right: 16, fontFamily: MONO, fontSize: 14, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 6 }}>
                1920×1080
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
