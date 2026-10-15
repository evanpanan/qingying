import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion'

const INK = '#13110f'
const AMBER = '#955905'
const MUTED = '#65635f'
const PAPER = '#faf7f2'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

const FILES = [
  { name: 'wedding.mp4', size: 245, status: 'done', saved: 72 },
  { name: 'birthday.mp4', size: 128, status: 'done', saved: 68 },
  { name: 'travel.mp4', size: 312, status: 'done', saved: 75 },
  { name: 'concert.mp4', size: 189, status: 'processing', saved: 0 },
  { name: 'meeting.mp4', size: 96, status: 'pending', saved: 0 },
]

export const SceneBatch: React.FC = () => {
  const frame = useCurrentFrame()
  const duration = 240

  const outT = interpolate(frame, [duration - 8, duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // processing file progress
  const procProgress = interpolate(frame, [40, 200], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // total savings counter
  const totalSaved = interpolate(frame, [30, 180], [0, 612], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) })

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, opacity: 1 - outT }}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1100 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontFamily: MONO, fontSize: 14, color: AMBER, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Batch Compression</div>
            <div style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 48, fontWeight: 600, color: INK }}>批量压缩，效率翻倍</div>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 60, marginBottom: 36 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 42, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>5</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>个文件</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 42, fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>3</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>已完成</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 42, fontWeight: 700, color: AMBER, fontVariantNumeric: 'tabular-nums' }}>{Math.round(totalSaved)}<span style={{ fontSize: 20 }}>MB</span></div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>已节省</div>
            </div>
          </div>

          {/* File list */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
            {FILES.map((f, i) => {
              const delay = i * 8 + 5
              const rowIn = interpolate(frame, [delay, delay + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 1.1, 0.3, 1) })
              const showProgress = f.status === 'processing'

              return (
                <div
                  key={f.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
                    borderRadius: 12, opacity: rowIn, transform: `translateY(${(1 - rowIn) * 10}px)`,
                    background: f.status === 'processing' ? '#f8fafc' : 'transparent',
                  }}
                >
                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: f.status === 'done' ? 'linear-gradient(135deg, #16a34a, #22c55e)' : f.status === 'processing' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {f.status === 'done' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    ) : f.status === 'processing' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#9ca3af"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: INK, fontWeight: 500 }}>{f.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 12, color: MUTED, marginTop: 2 }}>{f.size} MB</div>
                  </div>

                  {/* Status */}
                  {f.status === 'done' && (
                    <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: '#16a34a' }}>-{f.saved}%</div>
                  )}
                  {f.status === 'processing' && showProgress && (
                    <div style={{ width: 120 }}>
                      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${procProgress}%`, background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 3 }} />
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginTop: 4, textAlign: 'right' }}>{Math.round(procProgress)}%</div>
                    </div>
                  )}
                  {f.status === 'pending' && (
                    <div style={{ fontFamily: MONO, fontSize: 12, color: MUTED }}>等待中</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
