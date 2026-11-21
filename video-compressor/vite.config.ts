import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { spawn } from 'node:child_process'

/**
 * 本地开发时挂载 Vercel API 函数（api/*.ts），
 * 让 /api/parse、/api/proxy 在 `npm run dev` 下即可用（线上由 Vercel 托管）。
 */
function apiDevServer(): Plugin {
  const mount = (server: any) => {
    if (typeof server.ssrLoadModule !== 'function') return
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (!req.url || !req.url.startsWith('/api/')) return next()
      const name = req.url.split('?')[0].slice('/api/'.length).replace(/\/+$/, '')
      if (!name) return next()
      if (!['parse', 'proxy', 'extract'].includes(name)) return next()
      try {
        if (name === 'extract') {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(Buffer.from(chunk))
          const child = spawn(process.env.LIGHTVID_PYTHON || 'python3', ['api/extract.py'], { cwd: process.cwd() })
          let output = ''
          let finished = false
          const finish = (data: string) => {
            if (finished) return
            finished = true
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(data)
          }
          const timer = setTimeout(() => child.kill(), 55000)
          child.stdout.on('data', (chunk) => { output += chunk })
          child.stderr.on('data', () => undefined)
          child.on('error', () => { clearTimeout(timer); finish(JSON.stringify({ ok: false, error: '本地 Python 下载引擎不可用' })) })
          child.on('close', () => {
            clearTimeout(timer)
            finish(output || JSON.stringify({ ok: false, error: '本地下载引擎未安装，请安装 requirements.txt 依赖' }))
          })
          child.stdin.end(Buffer.concat(chunks))
          return
        }
        const mod = await server.ssrLoadModule(`/api/${name}.ts`)
        const handler = mod?.default
        if (typeof handler !== 'function') return next()

        const raw: Buffer = await new Promise((resolve) => {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', () => resolve(Buffer.concat(chunks)))
          req.on('error', () => resolve(Buffer.alloc(0)))
        })
        req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
        req.body = raw.length ? raw.toString('utf8') : undefined
        res.status = (code: number) => {
          res.statusCode = code
          return res
        }
        res.json = (obj: unknown) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(obj))
        }
        await handler(req, res)
      } catch (e: any) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ ok: false, error: e?.message || 'API 执行失败' }))
      }
    })
  }
  return {
    name: 'api-dev-server',
    configureServer: mount,
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServer()],
  // Tauri expects the dev server on port 1420
  server: {
    port: 1420,
    strictPort: true,
  },
  preview: {
    port: 8080,
    strictPort: true,
  },
  // Prevent Vite from clearing the screen (Tauri dev output is useful).
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
})
