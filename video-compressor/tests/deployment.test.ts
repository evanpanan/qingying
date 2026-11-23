import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { matchesGlob } from 'node:path'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const config = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8'))

test('Python 函数排除安装包和前端文件，保留自有解析能力', () => {
  const exclusions = config.functions['api/extract.py'].excludeFiles
  assert.equal(typeof exclusions, 'string')
  for (const file of [
    'public/downloads/轻影_1.2.0_aarch64.dmg',
    'public/qingying-promo.mp4',
    'dist/downloads/轻影_1.2.0_aarch64.dmg',
    'dist/assets/index.js',
    'src/components/DownloadTool.tsx',
    'src-tauri/binaries/node-aarch64-apple-darwin',
    'node_modules/typescript/lib/typescript.js',
    '.venv/lib/python3.12/site-packages/test.py',
    'tests/test_extract.py',
  ]) {
    assert(matchesGlob(file, exclusions), file)
  }
  for (const file of ['api/extract.py', 'lightvid_engine.py', 'requirements.txt']) {
    assert(!matchesGlob(file, exclusions), file)
    assert(existsSync(new URL(file, root)), file)
  }
})

test('函数排除规则不会删除网站静态安装包或引入全局忽略', () => {
  assert(existsSync(new URL('public/downloads/轻影_1.2.0_aarch64.dmg', root)))
  assert.equal(config.functions['api/extract.py'].maxDuration, 60)
  assert.equal(config.functions['api/proxy.ts'].maxDuration, 300)
  assert.equal(config.ignoreCommand, undefined)
})
