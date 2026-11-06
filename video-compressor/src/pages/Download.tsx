import { useState } from 'react'
import {
  Link as LinkIcon,
  Download,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
  Info,
} from 'lucide-react'

interface MediaImage {
  url: string
  width?: number
  height?: number
}

interface ParseData {
  platform: string
  platformName: string
  type: 'video' | 'image'
  title?: string
  author?: string
  url?: string
  images?: MediaImage[]
}

const PLATFORMS = ['抖音', '小红书', 'Instagram', 'X']

const STEPS = [
  { num: '01', title: '复制链接', desc: '在 App 内点击分享，复制作品链接' },
  { num: '02', title: '粘贴解析', desc: '粘贴到输入框，点击「立即解析」' },
  { num: '03', title: '无水印下载', desc: '预览确认后一键保存原片' },
]

const FAQS = [
  {
    q: '为什么视频要在本站中转播放？',
    a: '平台直链带有防盗链校验，浏览器直接打开会 403。这里由服务器代为取流，保证预览和下载都可用。',
  },
  {
    q: '支持哪些链接格式？',
    a: '支持抖音、小红书、Instagram、X 的分享链接（含短链）。直接粘贴整段分享文案也可以，会自动识别其中的链接。',
  },
  {
    q: '会保存我的链接记录吗？',
    a: '不会。解析在服务端即时完成，不落库、不留存。',
  },
]

/** 拼接媒体中转地址；带 download 时触发浏览器另存为。 */
function proxyUrl(url: string, download?: string): string {
  const base = `/api/proxy?url=${encodeURIComponent(url)}`
  return download ? `${base}&download=${encodeURIComponent(download)}` : base
}

function safeName(base: string, index?: number): string {
  const t = (base || '轻影').replace(/[\\/:*?"<>|\n\r\t]/g, '_').trim().slice(0, 40)
  return index === undefined ? t : `${t}_${index + 1}`
}

export default function Downloader() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ParseData | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleParse() {
    const text = input.trim()
    if (!text) {
      setError('请先粘贴分享链接')
      return
    }
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: text }),
      })
      const json = await res.json().catch(() => null)
      if (!json?.ok) throw new Error(json?.error || '解析失败，请稍后重试')
      setData(json.data as ParseData)
    } catch (e: any) {
      setError(e?.message || '解析失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setData(null)
    setError('')
    setInput('')
  }

  async function copyCaption() {
    const text = [data?.title, data?.author].filter(Boolean).join('\n')
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-violet-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-br from-blue-200/40 to-indigo-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur border border-blue-100 text-blue-700 text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            无水印 · 原画质 · 多平台
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
            视频
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              去水印下载
            </span>
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto leading-relaxed">
            粘贴分享链接，一键解析无水印原片，支持视频与图集。
          </p>

          <div className="flex items-center justify-center gap-2 flex-wrap mt-6">
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className="px-3 py-1.5 rounded-lg bg-white/70 backdrop-blur border border-gray-200 text-sm font-medium text-gray-700"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Input */}
      <section className="max-w-4xl mx-auto px-6 -mt-2">
        <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur shadow-sm p-5 md:p-6">
          <div className="relative">
            <LinkIcon className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse()
              }}
              rows={3}
              placeholder="粘贴抖音 / 小红书 / Instagram / X 的分享链接或整段分享文案…"
              className="w-full resize-none rounded-xl border border-gray-200 pl-11 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <button
              type="button"
              onClick={handleParse}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  解析中…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  立即解析
                </>
              )}
            </button>
            {(data || input) && (
              <button
                type="button"
                onClick={reset}
                className="px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
              >
                清空
              </button>
            )}
            <span className="text-xs text-gray-400">支持短链，粘贴整段文案也可识别</span>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </section>

      {/* Result */}
      {data && (
        <section className="max-w-4xl mx-auto px-6 mt-8">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 md:px-6 py-4 border-b border-gray-100">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                    {data.platformName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {data.type === 'video' ? '视频' : `图集 · ${data.images?.length ?? 0} 张`}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {data.title || '（无标题）'}
                </p>
                {data.author && <p className="text-xs text-gray-500 truncate">@{data.author}</p>}
              </div>
              <button
                type="button"
                onClick={copyCaption}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '复制文案'}
              </button>
            </div>

            <div className="p-5 md:p-6">
              {data.type === 'video' && data.url && (
                <div className="space-y-4">
                  <div className="rounded-xl overflow-hidden bg-black/95 flex justify-center">
                    <video
                      src={proxyUrl(data.url)}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-[520px] w-auto"
                    />
                  </div>
                  <a
                    href={proxyUrl(data.url, `${safeName(data.title || '轻影')}.mp4`)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition hover:shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    下载无水印视频
                  </a>
                </div>
              )}

              {data.type === 'image' && data.images && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {data.images.map((img, i) => (
                    <a
                      key={img.url}
                      href={proxyUrl(img.url, `${safeName(data.title || '轻影', i)}.jpg`)}
                      className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[3/4]"
                    >
                      <img
                        src={proxyUrl(img.url)}
                        alt={`图 ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition group-hover:scale-105"
                      />
                      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-xs backdrop-blur">
                        <Download className="w-3 h-3" />
                        保存
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Steps */}
      <section className="max-w-4xl mx-auto px-6 mt-14">
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <div key={s.num} className="relative rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
              <div className="text-xs font-bold text-blue-600 mb-2">{s.num}</div>
              <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
                {i === 0 && <LinkIcon className="w-3.5 h-3.5 text-gray-400" />}
                {i === 1 && <Sparkles className="w-3.5 h-3.5 text-gray-400" />}
                {i === 2 && <Download className="w-3.5 h-3.5 text-gray-400" />}
                {s.title}
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 mt-12 pb-20">
        <div className="flex items-center gap-2 mb-5">
          <ImageIcon className="w-4 h-4 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">常见问题</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-gray-900">{f.q}</span>
                <ArrowRight
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                    openFaq === i ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {openFaq === i && (
                <p className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
