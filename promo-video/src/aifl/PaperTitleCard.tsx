import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion'

const INK = '#13110f'
const ACCENT = '#955905'
const MUTED = '#65635f'
const PAPER = '#f9f6f1'
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export const PaperTitleCard: React.FC<{
  duration: number
  words: { text: string; accent?: boolean }[]
  sub?: string
  subDigits?: string
}> = ({ duration, words }) => {
  const frame = useCurrentFrame()
  const fadeOut = interpolate(frame, [duration - 8, duration], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const underline = interpolate(frame, [16, 34], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PAPER, justifyContent: 'center', alignItems: 'center', opacity: fadeOut,
        backgroundImage: 'radial-gradient(1100px 750px at 50% 42%, rgba(255,252,245,0.85), transparent 65%)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 1500 }}>
        <div
          style={{
            fontFamily: SERIF, fontSize: 116, fontWeight: 600, lineHeight: 1.14,
            color: INK, letterSpacing: '-0.012em',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.26em',
          }}
        >
          {words.map((w, i) => {
            const delay = 4 + i * 4
            const t = interpolate(frame, [delay, delay + 9], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.75, 0.3, 1),
            })
            return (
              <span
                key={i}
                style={{
                  opacity: t, transform: `scale(${1.28 - 0.28 * t})`,
                  filter: `blur(${(1 - t) * 7}px)`, display: 'inline-block',
                  color: w.accent ? ACCENT : undefined,
                }}
              >
                {w.text}
              </span>
            )
          })}
        </div>
        <div
          style={{
            height: 6, width: 220, margin: '38px auto 0', borderRadius: 3,
            background: ACCENT, transform: `scaleX(${underline})`,
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
