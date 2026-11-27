import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { spawn } from 'node:child_process'
import { rmSync, readdirSync, mkdirSync, copyFileSync, createReadStream } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 本地开发时挂载 Vercel API 函数（api/*.ts），
 * 自有 Python 解析与媒体代理在本地和部署端使用相同实现。
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
          if (!['POST', 'GET'].includes(req.method || '')) {
            res.statusCode = 405
            res.end()
            return
          }
          const chunks: Buffer[] = []
          let size = 0
          for await (const chunk of req) {
            size += chunk.length
            if (size > 16384) {
              res.statusCode = 413
              res.end(JSON.stringify({ ok: false, error: '链接内容过长' }))
              return
            }
            chunks.push(Buffer.from(chunk))
          }
          const args = ['api/extract.py', ...(req.method === 'GET' ? ['--info'] : [])]
          const child = spawn(process.env.LIGHTVID_PYTHON || 'python3', args, { cwd: process.cwd() })
          let output = ''
          let finished = false
          const finish = (data: string) => {
            if (finished) return
            finished = true
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            try { res.statusCode = JSON.parse(data).ok ? 200 : 400 } catch { res.statusCode = 502 }
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

        const chunks: Buffer[] = []
        let size = 0
        for await (const chunk of req) {
          size += chunk.length
          if (size > 16384) {
            res.statusCode = 413
            res.end(JSON.stringify({ ok: false, error: '请求内容过长' }))
            return
          }
          chunks.push(Buffer.from(chunk))
        }
        const raw = Buffer.concat(chunks)
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

function desktopAssets(): Plugin {
  return {
    name: 'lightvid-desktop-assets',
    closeBundle() {
      if (process.env.TAURI_ENV_PLATFORM) {
        // Website installers must never be embedded recursively in the app.
        rmSync(resolve('dist/downloads'), { recursive: true, force: true })
      }
    },
  }
}


function speechRuntime(): Plugin {
 const root=resolve('node_modules/onnxruntime-web/dist')
 const allowed=(name:string)=>/^ort-wasm-simd-threaded(?:\.jsep)?\.(?:mjs|wasm)$/.test(name)
 return {name:'lightvid-speech-runtime',configureServer(server){server.middlewares.use('/speech-runtime',(req,res,next)=>{const name=(req.url||'').split('?')[0].replace(/^\//,'');if(!allowed(name))return next();res.setHeader('Content-Type',name.endsWith('.wasm')?'application/wasm':'text/javascript');createReadStream(resolve(root,name)).on('error',()=>{res.statusCode=404;res.end()}).pipe(res)})},closeBundle(){mkdirSync(resolve('dist/speech-runtime'),{recursive:true});for(const name of readdirSync(root).filter(allowed))copyFileSync(resolve(root,name),resolve('dist/speech-runtime',name))}}
}

function localVideoEngine(): Plugin {
  const roots: Record<string, string> = {
    '/ffmpeg-core': resolve('node_modules/@ffmpeg/core/dist/esm'),
    '/ffmpeg-worker': resolve('node_modules/@ffmpeg/ffmpeg/dist/esm'),
  }
  return {
    name: 'lightvid-local-video-engine',
    configureServer(server) {
      for (const [prefix, root] of Object.entries(roots)) server.middlewares.use(prefix, (req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\//, '')
        if (!/^[a-zA-Z0-9_.-]+\.(?:js|wasm)$/.test(name)) return next()
        res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
        createReadStream(resolve(root, name)).on('error', () => { res.statusCode = 404; res.end() }).pipe(res)
      })
    },
    closeBundle() {
      for (const [prefix, root] of Object.entries(roots)) {
        const target = resolve('dist' + prefix)
        mkdirSync(target, { recursive: true })
        for (const name of readdirSync(root).filter(name => /\.(?:js|wasm)$/.test(name))) copyFileSync(resolve(root, name), resolve(target, name))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  worker: {format: 'es'},
  plugins: [react(), speechRuntime(), apiDevServer(), desktopAssets(),  localVideoEngine()],
  // Tauri expects the dev server on port 1420
  server: {
    port: 1420,
    strictPort: true,
    // Native build output can contain an /Applications symlink.
    watch: { ignored: ['**/src-tauri/**'], followSymlinks: false },
  },
  preview: {
    port: 8080,
    strictPort: true,
  },
  // Prevent Vite from clearing the screen (Tauri dev output is useful).
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
})

