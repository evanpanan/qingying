import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const text = (name: string) => readFileSync(new URL(name, root), 'utf8')

test('下载链路没有第三方解析地址或中转分支', () => {
  for (const name of ['api/parse.ts', 'api/extract.py', 'src/components/DownloadTool.tsx', 'src-tauri/src/main.rs']) {
    assert.doesNotMatch(text(name), /douyin\.laobaitv\.net|api\.fxtwitter\.com|native_relay_parse|native_media_download/)
  }
  assert.match(text('src/components/DownloadTool.tsx'), /fetch\('\/api\/extract'/)
  assert.doesNotMatch(text('src/components/DownloadTool.tsx'), /if \(!platform\)/)
})

test('网站与桌面打包共用受限网络引擎', () => {
  assert.match(text('api/extract.py'), /from lightvid_engine import LightVidDL/)
  assert.match(text('scripts/ytdlp_entry.py'), /yt_dlp\.YoutubeDL = LightVidDL/)
  assert.match(text('lightvid_engine.py'), /socket\.socket\(family, kind, proto\)/)
  assert.match(text('api/proxy.ts'), /callback\(null, target\.address, 4\)/)
  const config = JSON.parse(text('src-tauri/tauri.conf.json'))
  assert(config.bundle.externalBin.includes('binaries/node'))
  assert.match(text('src-tauri/src/main.rs'), /"--ignore-config"/)
  assert.doesNotMatch(text('src-tauri/src/main.rs'), /which::which\("yt-dlp"\)/)
  const deployment = JSON.parse(text('vercel.json'))
  assert.equal(deployment.functions['api/proxy.ts'].maxDuration, 300)
  assert.match(text('api/proxy.ts'), /AbortSignal\.timeout\(280000\)/)
  assert.match(text('api/proxy.ts'), /headers\['If-Range'\]/)
  assert.match(text('vite.config.ts'), /followSymlinks: false/)
  assert(text('vite.config.ts').includes("ignored: ['**/src-tauri/**']"))
})

test('粒子页脚保留可访问触发方式与生命周期清理', () => {
  assert.match(text('src/components/ParticleWordmark.tsx'), /role="button" tabIndex=\{0\}/)
  const animation = text('src/lib/particle-wordmark.ts')
  for (const requirement of ['prefers-reduced-motion', 'visibilitychange', 'IntersectionObserver', 'ResizeObserver', 'cancelAnimationFrame', 'intersection.disconnect()', 'resize.disconnect()', "event.key === 'Enter'"]) {
    assert(animation.includes(requirement), requirement)
  }
})

test('粒子字标保持原版页脚比例并归位品牌区', () => {
  assert.match(text('src/pages/Landing.tsx'), /className="footer-brand".*<ParticleWordmark \/>/)
  assert.match(text('src/studio-polish.css'), /width: min\(100%, 480px\); height: clamp\(66px, 9vw, 125px\)/)
  assert.match(text('src/studio-polish.css'), /width: min\(100%, 400px\); height: clamp\(58px, 16\.2vw, 106px\)/)
  assert.match(text('src/lib/particle-wordmark.ts'), /height = nextHeight/)
  assert.doesNotMatch(text('src/lib/particle-wordmark.ts'), /Math\.min\(270/)
})
