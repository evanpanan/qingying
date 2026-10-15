import { interpolate, useCurrentFrame } from 'remotion'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export const Caption: React.FC<{
  text: string
  duration: number
}> = ({ text, duration }) => {
  const frame = useCurrentFrame()
  const inT = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const outT = interpolate(frame, [duration - 8, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 72,
        display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 14,
        fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: '#575552',
        opacity: inT * outT, transform: `translateY(${(1 - inT) * 8}px)`,
        pointerEvents: 'none',
      }}
    >
      <span style={{ width: 6, height: 6, background: '#955905', display: 'inline-block' }} />
      <span>{text}</span>
    </div>
  )
}
