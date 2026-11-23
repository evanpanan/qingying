import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { PLATFORMS, REPRESENTATIVE_PLATFORMS, identifyPlatform } from '../src/lib/media.ts'

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('精选轮播只含代表平台，完整解析目录仍保留', () => {
  assert.equal(REPRESENTATIVE_PLATFORMS.length, 12)
  assert.equal(new Set(REPRESENTATIVE_PLATFORMS.map(platform => platform.name)).size, 12)
  assert(PLATFORMS.length > REPRESENTATIVE_PLATFORMS.length)
  for (const name of ['YouTube', '抖音', 'Instagram', 'Bilibili', 'TikTok', 'SoundCloud']) {
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

test('轮播和首屏动效支持暂停、减少动画、离屏与隐藏标签', () => {
  const carousel = source('src/components/PlatformCarousel.tsx')
  assert.match(carousel, /embla-carousel-react/)
  assert.match(carousel, /stopOnMouseEnter: true, stopOnFocusIn: true/)
  assert.match(carousel, /active: running/)
  assert.match(carousel, /!hovered && !focused/)
  assert.match(carousel, /onFocusCapture=/)
  assert.match(source('src/components/HeroRibbon.tsx'), /暂停首屏动效/)
  const activity = source('src/lib/motion-activity.ts')
  for (const contract of ['IntersectionObserver', 'document.hidden', 'prefers-reduced-motion', 'observer.disconnect()', 'removeEventListener']) {
    assert(activity.includes(contract), contract)
  }
})
