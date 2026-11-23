import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'

test('统计 API 编译成 JavaScript 后能够启动，不再引用缺失的 .ts 文件', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const temp = mkdtempSync('/tmp/lightvid-stats-build-')
  try {
    writeFileSync(`${temp}/package.json`, '{"type":"module"}')
    symlinkSync(`${root}/node_modules`, `${temp}/node_modules`)
    for (const file of ['api/stats.ts', 'server/stats-store.ts', 'src/lib/stats-contract.ts']) {
      const compiled = ts.transpileModule(readFileSync(`${root}/${file}`, 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
      }).outputText
      assert.doesNotMatch(compiled, /from ['"][^'"]+\.ts['"]/)
      const output = `${temp}/${file.replace(/\.ts$/, '.js')}`
      mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true })
      writeFileSync(output, compiled)
    }
    const module = await import(pathToFileURL(`${temp}/api/stats.js`).href)
    const result = { code: 0, headers: {} as Record<string, string>, setHeader(key: string, value: string) { this.headers[key] = value }, status(code: number) { this.code = code; return this }, end() {} }
    await module.default({ method: 'OPTIONS', headers: { origin: 'tauri://localhost' } }, result)
    assert.equal(result.code, 204)
    assert.equal(result.headers['Access-Control-Allow-Origin'], 'tauri://localhost')
  } finally { rmSync(temp, { recursive: true, force: true }) }
})
