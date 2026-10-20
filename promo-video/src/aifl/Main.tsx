import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion'
import { SceneOpen } from './SceneOpen'
import { SceneProduct } from './SceneProduct'
import { SceneQuality } from './SceneQuality'
import { SceneResolution } from './SceneResolution'
import { SceneBatch } from './SceneBatch'
import { SceneOutro } from './SceneOutro'
import { PaperTitleCard } from './PaperTitleCard'
import { FlashCut } from './FlashCut'
import { Caption } from './Caption'

// ~60s @ 30fps — 轻影 LightVid 宣传片
export const SHOTS = {
  open: { from: 0, duration: 240 },        // 0–8s 品牌开场
  card1: { from: 240, duration: 75 },      // 8–10.5s 字卡1
  product: { from: 315, duration: 270 },   // 10.5–19.5s 产品压缩展示
  card2: { from: 585, duration: 75 },       // 19.5–22s 字卡2
  quality: { from: 660, duration: 240 },   // 22–30s 画质预设
  card3: { from: 900, duration: 75 },       // 30–32.5s 字卡3
  resolution: { from: 975, duration: 240 },  // 32.5–40.5s 分辨率
  card4: { from: 1215, duration: 75 },       // 40.5–43s 字卡4
  batch: { from: 1290, duration: 240 },    // 43–51s 批量压缩
  card5: { from: 1530, duration: 75 },       // 51–53.5s 字卡5
  outro: { from: 1605, duration: 195 },     // 53.5–60s 结尾
} as const

export const TOTAL = 1800

export const TITLE_CARDS = {
  card1: { text: '让视频更轻，让分享更快' },
  card2: { text: '本地处理，隐私安全' },
  card3: { text: '多种画质，按需选择' },
  card4: { text: '分辨率自由调整' },
  card5: { text: '批量压缩，效率翻倍' },
} as const

export const parseWords = (text: string): { text: string; accent?: boolean }[] =>
  text.split(/\s+/).filter(Boolean).map((w) => {
    const m = w.match(/^\*(.+)\*$/)
    return m ? { text: m[1], accent: true } : { text: w }
  })

export const FLASH_CUTS = [
  SHOTS.product.from, SHOTS.quality.from, SHOTS.resolution.from, SHOTS.batch.from,
]

export const CAPTIONS = [
  { from: 330, duration: 60, text: '一键压缩 · 体积骤减 80%' },
  { from: 420, duration: 70, text: '画质依旧清晰' },
  { from: 680, duration: 70, text: '无损 / 高清 / 标准 / 高压缩' },
  { from: 990, duration: 70, text: '4K · 1080p · 720p · 480p' },
  { from: 1310, duration: 70, text: '多个视频同时处理' },
] as const

export const SFX: { from: number; src: string; volume: number }[] = [
  { from: 12, src: 'transition-soft.mp3', volume: 0.4 },
  { from: 90, src: 'whoosh-fast.mp3', volume: 0.45 },
  { from: 150, src: 'whoosh-big.mp3', volume: 0.5 },
  { from: 170, src: 'sparkle.mp3', volume: 0.35 },
  { from: 240, src: 'swoosh-quick.mp3', volume: 0.4 },
  { from: 320, src: 'transition-soft.mp3', volume: 0.4 },
  { from: 380, src: 'whoosh-big.mp3', volume: 0.5 },
  { from: 450, src: 'click-camera.mp3', volume: 0.6 },
  { from: 585, src: 'swoosh-quick.mp3', volume: 0.4 },
  { from: 665, src: 'transition-soft.mp3', volume: 0.45 },
  { from: 720, src: 'click-camera.mp3', volume: 0.45 },
  { from: 900, src: 'swoosh-quick.mp3', volume: 0.4 },
  { from: 980, src: 'transition-soft.mp3', volume: 0.45 },
  { from: 1050, src: 'whoosh-fast.mp3', volume: 0.4 },
  { from: 1215, src: 'swoosh-quick.mp3', volume: 0.4 },
  { from: 1295, src: 'transition-soft.mp3', volume: 0.4 },
  { from: 1360, src: 'pop.mp3', volume: 0.4 },
  { from: 1370, src: 'pop.mp3', volume: 0.37 },
  { from: 1380, src: 'pop.mp3', volume: 0.34 },
  { from: 1530, src: 'swoosh-quick.mp3', volume: 0.4 },
  { from: 1610, src: 'riser-cine.mp3', volume: 0.5 },
  { from: 1660, src: 'impact-cine.mp3', volume: 0.55 },
  { from: 1690, src: 'sparkle.mp3', volume: 0.3 },
]

const sfxDuration = (s: { from: number; src: string }) =>
  s.src === 'keyboard.mp3' ? (s.from > 700 ? 44 : 24) : 90

// BGM：house-vibez 微调至 120 BPM 后从第 52 小节裁剪 60s
// 120 BPM × 0.5s/拍 ⇒ 8s=16拍、2.5s=5拍、60s=120拍，所有场景边界精确落拍
// trimBefore 补偿 mp3 裁剪引入的 ~1.9 帧相位偏移（渲后回测校正）
export const BGM_VOLUME = 0.4
const BGM_TRIM_BEFORE = 2 // 补偿 mp3 剪辑相位偏移
const BGM_FADE_IN = 12   // 0.4s 淡入
const BGM_FADE_OUT = 60  // 2s 淡出

export const bgmVolume = (f: number) => {
  const fadeIn = Math.min(1, f / BGM_FADE_IN)
  const fadeOut = Math.min(1, Math.max(0, TOTAL - f) / BGM_FADE_OUT)
  return BGM_VOLUME * Math.min(fadeIn, fadeOut)
}

export type MainProps = { bgm?: boolean }

export const Main: React.FC<MainProps> = ({ bgm = true }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#f2eee6' }}>
      {bgm && (
        <Audio
          src={staticFile('audio/bgm-house-120.mp3')}
          trimBefore={BGM_TRIM_BEFORE}
          volume={bgmVolume}
        />
      )}

      {SFX.map((s, i) => (
        <Sequence key={`sfx-${i}`} from={s.from} durationInFrames={sfxDuration(s)}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
        </Sequence>
      ))}

      <Sequence from={SHOTS.open.from} durationInFrames={SHOTS.open.duration}>
        <SceneOpen />
      </Sequence>
      <Sequence from={SHOTS.card1.from} durationInFrames={SHOTS.card1.duration}>
        <PaperTitleCard duration={SHOTS.card1.duration} words={parseWords(TITLE_CARDS.card1.text)} />
      </Sequence>
      <Sequence from={SHOTS.product.from} durationInFrames={SHOTS.product.duration}>
        <SceneProduct />
      </Sequence>
      <Sequence from={SHOTS.card2.from} durationInFrames={SHOTS.card2.duration}>
        <PaperTitleCard duration={SHOTS.card2.duration} words={parseWords(TITLE_CARDS.card2.text)} />
      </Sequence>
      <Sequence from={SHOTS.quality.from} durationInFrames={SHOTS.quality.duration}>
        <SceneQuality />
      </Sequence>
      <Sequence from={SHOTS.card3.from} durationInFrames={SHOTS.card3.duration}>
        <PaperTitleCard duration={SHOTS.card3.duration} words={parseWords(TITLE_CARDS.card3.text)} />
      </Sequence>
      <Sequence from={SHOTS.resolution.from} durationInFrames={SHOTS.resolution.duration}>
        <SceneResolution />
      </Sequence>
      <Sequence from={SHOTS.card4.from} durationInFrames={SHOTS.card4.duration}>
        <PaperTitleCard duration={SHOTS.card4.duration} words={parseWords(TITLE_CARDS.card4.text)} />
      </Sequence>
      <Sequence from={SHOTS.batch.from} durationInFrames={SHOTS.batch.duration}>
        <SceneBatch />
      </Sequence>
      <Sequence from={SHOTS.card5.from} durationInFrames={SHOTS.card5.duration}>
        <PaperTitleCard duration={SHOTS.card5.duration} words={parseWords(TITLE_CARDS.card5.text)} />
      </Sequence>
      <Sequence from={SHOTS.outro.from} durationInFrames={SHOTS.outro.duration}>
        <SceneOutro />
      </Sequence>

      {CAPTIONS.map((c) => (
        <Sequence key={c.from} from={c.from} durationInFrames={c.duration}>
          <Caption text={c.text} duration={c.duration} />
        </Sequence>
      ))}

      {FLASH_CUTS.map((cut) => (
        <Sequence key={cut} from={cut - 5} durationInFrames={10}>
          <FlashCut duration={10} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
