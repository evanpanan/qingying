import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion'

const INK = '#13110f'
const AMBER = '#955905'
const MUTED = '#65635f'
const PAPER = '#faf7f2'
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export const SceneOpen: React.FC = () => {
  const frame = useCurrentFrame()
  const duration = 240

  // crosshair draw
  const vDraw = interpolate(frame, [0, 9], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) })
  const hDraw = interpolate(frame, [8, 18], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear })
  const crossFade = interpolate(frame, [24, 34], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // kicker typewriter
  const KICKER = 'VIDEO COMPRESSION TOOL'
  const perChar = 0.7
  const kickStart = 28
  const kickChars = Math.floor(Math.max(0, frame - kickStart) / perChar)
  const kickDone = kickStart + KICKER.length * perChar
  const cursorOn = frame >= kickStart && frame < 80

  // brand group dissolves
  const brandOut = interpolate(frame, [80, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const brandOpacity = 1 - brandOut
  const groupY = -brandOut * 40
  const groupScale = 1 - brandOut * 0.12

  // product window fades in
  const windowIn = interpolate(frame, [95, 115], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const windowScale = interpolate(frame, [95, 115], [0.92, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 1.2, 0.3, 1) })

  // spotlight on the window
  const spotOn = interpolate(frame, [110, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const vignette = interpolate(frame, [110, 130], [0, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // hover bob
  const bob = Math.sin((frame / 40) * Math.PI * 2) * 6

  // progress bar animation
  const progress = interpolate(frame, [130, 220], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.2, 1) })

  // size text
  const originalSize = 124.5
  const compressedSize = originalSize * (1 - progress / 100 * 0.72)

  const outT = interpolate(frame, [duration - 8, duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, opacity: 1 - outT }}>
      {/* Product window */}
      {frame >= 95 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: windowIn }}>
          <div style={{ transform: `scale(${windowScale}) translateY(${bob * windowIn}px)`, filter: `blur(${(1 - windowIn) * 8}px)` }}>
            {/* Window frame */}
            <div style={{
              width: 1280, height: 760, borderRadius: 16,
              background: '#fff', boxShadow: '0 40px 120px rgba(40,30,20,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
              overflow: 'hidden', position: 'relative',
            }}>
              {/* Title bar */}
              <div style={{ height: 48, background: '#f5f5f5', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <div style={{ fontFamily: MONO, fontSize: 13, color: '#999', marginLeft: 16 }}>轻影 LightVid</div>
              </div>

              {/* Content */}
              <div style={{ padding: 40, fontFamily: MONO }}>
                {/* File info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, color: INK, fontWeight: 600 }}>vacation_video.mp4</div>
                    <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>MP4 · 1920×1080 · 2:34</div>
                  </div>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
                    <span style={{ color: MUTED }}>压缩中…</span>
                    <span style={{ color: '#3b82f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: 10, background: '#f0f0f0', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 5, transition: 'none' }} />
                  </div>
                </div>

                {/* Size comparison */}
                <div style={{ display: 'flex', gap: 40 }}>
                  <div>
                    <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>原始大小</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>{originalSize.toFixed(1)} <span style={{ fontSize: 16, color: MUTED }}>MB</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>压缩后</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{compressedSize.toFixed(1)} <span style={{ fontSize: 16, color: MUTED }}>MB</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>节省</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: AMBER, fontVariantNumeric: 'tabular-nums' }}>{Math.round(progress * 0.72)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Spotlight + vignette */}
      {frame >= 110 && (
        <AbsoluteFill style={{
          background: `radial-gradient(700px 500px at 50% 50%, rgba(255,241,214,0.4), rgba(255,241,214,0.1) 45%, rgba(70,56,38,${vignette}) 100%)`,
          pointerEvents: 'none', opacity: spotOn,
        }} />
      )}

      {/* Brand group */}
      {brandOpacity > 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', opacity: brandOpacity }}>
          <div style={{ textAlign: 'center', transform: `translateY(${groupY}px) scale(${groupScale})` }}>
            <svg width={64} height={64} viewBox="0 0 64 64" style={{ display: 'block', margin: '0 auto 34px', opacity: crossFade }}>
              <line x1={32} y1={2} x2={32} y2={62} stroke={AMBER} strokeWidth={5} strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={vDraw} />
              <line x1={2} y1={32} x2={62} y2={32} stroke={AMBER} strokeWidth={5} strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={hDraw} />
            </svg>

            <div style={{ fontFamily: SERIF, fontSize: 120, fontWeight: 600, color: INK, letterSpacing: '-0.01em', lineHeight: 1, display: 'flex', justifyContent: 'center' }}>
              {'轻影 LightVid'.split('').map((ch, i) => {
                const delay = 10 + i * 2.5
                const t = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.7, 0.25, 1) })
                return (
                  <span key={i} style={{ display: 'inline-block', opacity: t, transform: `scale(${1.6 - 0.6 * t})`, filter: `blur(${(1 - t) * 6}px)` }}>
                    {ch}
                  </span>
                )
              })}
            </div>

            <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: '0.14em', color: MUTED, marginTop: 30, textTransform: 'uppercase', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 30 }}>
              <span>{KICKER.slice(0, kickChars)}</span>
              <span style={{ display: 'inline-block', width: 12, height: 22, marginLeft: 4, background: AMBER, opacity: cursorOn ? 0.85 : 0 }} />
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  )
}
