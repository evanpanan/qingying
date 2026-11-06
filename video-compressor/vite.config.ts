import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

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
      try {
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
