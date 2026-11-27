import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { isTauri } from '../src/lib/env.ts'

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
test('Tauri 2 检测不依赖旧全局 API，浏览器保持独立', () => {
  const runtime = globalThis as typeof globalThis & { isTauri?: boolean }
  const original = runtime.isTauri
  try {
    runtime.isTauri = false
    assert.equal(isTauri(), false)
    runtime.isTauri = true
    assert.equal(isTauri(), true)
  } finally {
    if (original === undefined) delete runtime.isTauri
    else runtime.isTauri = original
  }
})

test('桌面支持原生剪贴板、外部链接与当前工具拖放', () => {
  const desktop = source('src/lib/desktop.ts')
  assert.match(desktop, /isTauri\(\) \? readText\(\)/)
  assert.match(desktop, /void open\(link.href\)/)
  assert.match(desktop, /latest.current.enabled/)
  assert.match(desktop, /disposed\) off\(\)/)
  for (const file of ['src/pages/Convert.tsx', 'src/components/Compressor.tsx']) assert.match(source(file), /useDesktopVideoDrop\(active && !/)
  const capabilities = JSON.parse(source('src-tauri/capabilities/default.json'))
  assert(capabilities.permissions.includes('clipboard-manager:allow-read-text'))
})

test('页脚使用 Dissolve 礼花、中文反馈和动画偏好保护', () => {
  const footer = source('src/components/FooterAppreciation.tsx')
  assert.match(footer, /LikeButton/)
  assert.match(footer, /感谢您的喜欢/)
  assert.match(footer, /clearTimeout\(timer.current\)/)
  const core = source('src/components/dissolve/like-button.core.ts')
  assert.match(core, /if \(reducedMotion\(\)\)/)
  assert.match(core, /document.hidden/)
  assert.match(core, /SPARKS = 10/)
  assert.match(source('src/studio-polish.css'), /author-breathe 4.8s/)
})

test('新版网站下载入口与桌面版本一致', () => {
  const config = JSON.parse(source('src-tauri/tauri.conf.json'))
  assert.equal(config.version, '1.6.0')
  assert(source('src/pages/Landing.tsx').includes(`https://github.com/evanpanan/qingying/releases/download/v${config.version}/_${config.version}_aarch64.dmg`))
  assert(source('src-tauri/Cargo.toml').includes(`version = "${config.version}"`))
})


test('AI 修复有桌面入口、系统菜单和打包模型，网页只提示下载', () => {
  assert.match(source('src/components/DesktopApp.tsx'), /id: 'cleanup'/)
  assert.match(source('src-tauri/src/main.rs'), /CmdOrCtrl\+2/)
  const repair = source('src/pages/Cleanup.tsx')
  assert.match(repair, /使用 AI 修复需要下载桌面版/)
  assert.match(repair, /mode!=='ai'\|\|native/)
  assert.doesNotMatch(repair, /loadRepairModel|\.onnx|MODEL_URL/)
  const config = JSON.parse(source('src-tauri/tauri.conf.json'))
  assert.equal(config.bundle.resources['../desktop-ai/'], 'desktop-ai/')
  assert.match(source('scripts/prepare-desktop-ai.mjs'), /1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6/)
})

test('网页、桌面和系统菜单的修复入口在第二位且使用 ⌘2',()=>{
 const web=source('src/components/StudioNav.tsx'),desktop=source('src/components/DesktopApp.tsx'),native=source('src-tauri/src/main.rs')
 assert.deepEqual([...web.matchAll(/page: '(download|cleanup|convert|compress)'/g)].map(m=>m[1]),['download','cleanup','convert','compress'])
 assert.deepEqual([...desktop.matchAll(/id: '(download|cleanup|convert|compress)'/g)].map(m=>m[1]),['download','cleanup','convert','compress'])
 assert.match(native,/"cleanup", "画面修复", true, Some\("CmdOrCtrl\+2"\)/)
 assert.match(native,/"convert", "格式转换", true, Some\("CmdOrCtrl\+3"\)/)
 assert.match(native,/"compress", "视频压缩", true, Some\("CmdOrCtrl\+4"\)/)
})
