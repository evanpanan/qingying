import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { PLATFORMS, REPRESENTATIVE_PLATFORMS, identifyPlatform } from '../src/lib/media.ts'

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('精选轮播只含代表平台，完整解析目录仍保留', () => {
  assert.equal(REPRESENTATIVE_PLATFORMS.length, 8)
  assert.equal(new Set(REPRESENTATIVE_PLATFORMS.map(platform => platform.name)).size, 8)
  assert(PLATFORMS.length > REPRESENTATIVE_PLATFORMS.length)
  for (const name of ['YouTube', '抖音', 'Instagram', 'Bilibili', 'TikTok', '快手']) {
    assert(REPRESENTATIVE_PLATFORMS.some(platform => platform.name === name), name)
  }
  assert.equal(identifyPlatform('https://www.arte.tv/video/example')?.name, 'ARTE')
  assert.equal(identifyPlatform('https://unlisted.example/watch')?.engine, 'extract')
})

test('从链接开始引导到输入框，不是桌面锚点滚动', () => {
  const landing = source('src/pages/Landing.tsx')
  assert.match(landing, /aria-controls="share-link"/)
  assert.match(landing, /从一个链接开始 <span><ArrowRight/)
  assert.doesNotMatch(landing, /className="text-link" href=/)
  const tool = source('src/components/DownloadTool.tsx')
  assert.match(tool, /field\.focus\(\{ preventScroll: true \}\)/)
  assert.match(tool, /bounds\.top < 100 \|\| bounds\.bottom > window\.innerHeight/)
  assert.match(tool, /animation\?\.cancel\(\)/)
  assert.match(tool, /role="status"/)
})

test('两排反向自动流动，没有播放控制且尊重系统动画偏好', () => {
  const carousel = source('src/components/PlatformCarousel.tsx')
  assert.match(carousel, /embla-carousel-react/)
  assert.match(carousel, /embla-carousel-auto-scroll/)
  assert.match(carousel, /direction="forward"/)
  assert.match(carousel, /direction="backward"/)
  assert.match(carousel, /!hovered && !focused/)
  assert.match(carousel, /onFocusCapture=/)
  for (const file of ['src/components/HeroRibbon.tsx', 'src/components/PlatformCarousel.tsx', 'src/components/ExperienceGallery.tsx']) {
    assert.doesNotMatch(source(file), /暂停|播放平台轮播|motion-toggle/)
  }
  const activity = source('src/lib/motion-activity.ts')
  for (const contract of ['IntersectionObserver', 'document.hidden', 'prefers-reduced-motion', 'observer.disconnect()', 'removeEventListener']) {
    assert(activity.includes(contract), contract)
  }
})
