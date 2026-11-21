import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const file = (name: string) => readFileSync(new URL(name, root))
const text = (name: string) => file(name).toString('utf8')

function pngSize(name: string) {
  const data = file(name)
  assert.equal(data.subarray(1, 4).toString(), 'PNG')
  assert.equal(data.subarray(12, 16).toString(), 'IHDR')
  return [data.readUInt32BE(16), data.readUInt32BE(20)]
}

test('网站与历史 favicon 使用同一份新 Logo', () => {
  const logo = text('public/lightvid.svg')
  assert.match(logo, /id="brand-mark"/)
  assert.match(logo, /fill="#d54b38"/)
  assert.equal(text('public/favicon.svg'), logo)
  assert.equal(text('../website/favicon.svg'), logo)
  assert(text('public/app-icon.svg').includes(logo.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)![1]))
  for (const name of ['src/components/StudioNav.tsx', 'src/components/Navbar.tsx']) {
    assert.match(text(name), /href="\/lightvid\.svg\?v=2#brand-mark"/)
  }
})

test('Safari 和安装清单图标有显式声明且资源存在', () => {
  const html = text('index.html')
  assert.match(html, /rel="apple-touch-icon"[^>]*href="\/apple-touch-icon-v2\.png"/)
  assert.match(html, /rel="manifest"[^>]*href="\/site\.webmanifest\?v=2"/)
  assert.match(html, /name="apple-mobile-web-app-title" content="轻影"/)
  for (const link of html.matchAll(/<link\b[^>]*href="([^"]+)"/g)) {
    const local = link[1].split(/[?#]/)[0].replace(/^\//, '')
    assert(existsSync(new URL(`public/${local}`, root)), `图标资源不存在: ${local}`)
  }
  const manifest = JSON.parse(text('public/site.webmanifest'))
  assert.equal(manifest.name, '轻影 LightVid')
  assert.equal(manifest.short_name, '轻影')
  assert.equal(manifest.start_url, '/')
  assert(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable'))
  for (const icon of manifest.icons) {
    assert.deepEqual(pngSize(`public/${icon.src.split('?')[0].slice(1)}`), icon.sizes.split('x').map(Number))
  }
})

test('PNG 和 ICO 覆盖浏览器及 Apple Touch 尺寸', () => {
  assert.deepEqual(pngSize('public/favicon-16x16.png'), [16, 16])
  assert.deepEqual(pngSize('public/favicon-32x32.png'), [32, 32])
  assert.deepEqual(pngSize('public/apple-touch-icon-v2.png'), [180, 180])
  for (const name of ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png']) {
    assert.deepEqual(file(`public/${name}`), file('public/apple-touch-icon-v2.png'))
  }
  const ico = file('public/favicon.ico')
  assert.equal(ico.readUInt16LE(2), 1)
  assert.equal(ico.readUInt16LE(4), 5)
  const sizes = Array.from({ length: 5 }, (_, index) => ico[6 + index * 16] || 256)
  assert.deepEqual(sizes, [16, 32, 48, 64, 256])
})

test('原生图标格式和 Safari 单色镂空 Logo 正确', () => {
  assert.deepEqual(pngSize('src-tauri/icons/icon.png'), [512, 512])
  assert.deepEqual(pngSize('src-tauri/icons/64x64.png'), [64, 64])
  assert.equal(file('src-tauri/icons/icon.icns').subarray(0, 4).toString(), 'icns')
  assert.equal(file('src-tauri/icons/icon.ico').readUInt16LE(2), 1)
  assert.match(text('public/safari-pinned-tab.svg'), /fill-rule="evenodd"/)
  const triangle = text('public/lightvid.svg').match(/<path d="([^"]+)"/)![1]
  assert(text('public/safari-pinned-tab.svg').includes(triangle))
})
