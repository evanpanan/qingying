import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const publicDir = path.join(root, 'public')
const logo = readFileSync(path.join(publicDir, 'lightvid.svg'), 'utf8')
const content = logo.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)?.[1]
if (!content || !logo.includes('id="brand-mark"')) throw new Error('Logo 源文件缺少 brand-mark')
const triangle = content.match(/<path d="([^"]+)"/)?.[1]
if (!triangle) throw new Error('Logo 源文件缺少播放标记')
const scratch = mkdtempSync(path.join(tmpdir(), 'lightvid-icons-'))
const cli = path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js')
const paper = '#f7f6f2'

function generate(source, output, sizes = []) {
  const args = [cli, 'icon', source, '--output', output, '--ios-color', paper]
  for (const size of sizes) args.push('--png', String(size))
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('图标生成失败')
}

function appSvg(rounded) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="${paper}"/>
  <g transform="translate(8 8)">${content}</g>
</svg>
`
}

// ICO 容器内使用多尺寸 PNG，避免另加图像处理依赖。
function ico(sizes, directory) {
  const frames = sizes.map((size) => ({ size, png: readFileSync(path.join(directory, `${size}x${size}.png`)) }))
  const header = Buffer.alloc(6 + frames.length * 16)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(frames.length, 4)
  let offset = header.length
  frames.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16
    header[entry] = header[entry + 1] = size === 256 ? 0 : size
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...frames.map(({ png }) => png)])
}

try {
  writeFileSync(path.join(publicDir, 'favicon.svg'), logo)
  writeFileSync(path.join(publicDir, 'safari-pinned-tab.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#000" fill-rule="evenodd" d="M24 0a24 24 0 1 0 0 48a24 24 0 1 0 0-48Z ${triangle}"/></svg>\n`)
  writeFileSync(path.join(root, '..', 'website', 'favicon.svg'), logo)
  writeFileSync(path.join(publicDir, 'app-icon.svg'), appSvg(true))
  const webAppSource = path.join(scratch, 'web-app.svg')
  writeFileSync(webAppSource, appSvg(false))
  generate(path.join(publicDir, 'lightvid.svg'), path.join(scratch, 'favicon'), [16, 32, 48, 64, 256])
  generate(webAppSource, path.join(scratch, 'web'), [180, 192, 512])
  for (const size of [16, 32]) copyFileSync(path.join(scratch, 'favicon', `${size}x${size}.png`), path.join(publicDir, `favicon-${size}x${size}.png`))
  const touch = path.join(scratch, 'web', '180x180.png')
  for (const name of ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png', 'apple-touch-icon-v2.png']) copyFileSync(touch, path.join(publicDir, name))
  for (const size of [192, 512]) copyFileSync(path.join(scratch, 'web', `${size}x${size}.png`), path.join(publicDir, `lightvid-${size}.png`))
  copyFileSync(path.join(scratch, 'web', '512x512.png'), path.join(publicDir, 'lightvid-maskable-512.png'))
  writeFileSync(path.join(publicDir, 'favicon.ico'), ico([16, 32, 48, 64, 256], path.join(scratch, 'favicon')))
  generate(path.join(publicDir, 'app-icon.svg'), path.join(root, 'src-tauri', 'icons'))
  // 历史自定义尺寸不在 Tauri 默认导出列表中。
  generate(path.join(publicDir, 'app-icon.svg'), path.join(scratch, 'extra'), [64])
  copyFileSync(path.join(scratch, 'extra', '64x64.png'), path.join(root, 'src-tauri', 'icons', '64x64.png'))
  console.log('LightVid 网站、Apple Touch、ICO 与原生图标已统一生成')
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
