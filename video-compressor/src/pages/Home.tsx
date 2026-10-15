import { useState } from 'react'
import {
  Play,
  Zap,
  Shield,
  Sparkles,
  Lock,
  Gauge,
  Monitor,
  Smartphone,
  Download,
  ChevronDown,
  ArrowRight,
  Cloud,
  Copy,
  Check,
  Info,
} from 'lucide-react'

interface HomeProps {
  onNavigate: (page: 'home' | 'compress') => void
}

const FEATURES = [
  {
    icon: Zap,
    title: '极速压缩',
    desc: '基于 FFmpeg 引擎，H.264 编码，压缩速度快、画质损失小',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Shield,
    title: '本地处理',
    desc: '所有压缩在本地完成，视频不会上传到任何服务器',
    color: 'from-emerald-500 to-green-600',
  },
  {
    icon: Sparkles,
    title: '多种画质',
    desc: '无损、高清、标准、高压缩四档预设，灵活选择',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    icon: Monitor,
    title: '分辨率调整',
    desc: '支持 4K、1080p、720p、480p 多档分辨率一键切换',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: Lock,
    title: '隐私安全',
    desc: '开源透明，无网络请求，保护你的视频隐私',
    color: 'from-rose-500 to-pink-600',
  },
  {
    icon: Gauge,
    title: '实时进度',
    desc: '可视化压缩进度，压缩率一目了然',
    color: 'from-cyan-500 to-teal-600',
  },
]

const STEPS = [
  {
    num: '01',
    title: '选择视频',
    desc: '点击选择视频文件，支持 MP4、MOV、MKV 等多种格式',
  },
  {
    num: '02',
    title: '调整参数',
    desc: '选择画质预设和目标分辨率，按需定制压缩效果',
  },
  {
    num: '03',
    title: '下载结果',
    desc: '压缩完成后自动保存，体积大幅缩小，画质依旧清晰',
  },
]

const FAQS = [
  {
    q: '压缩后的视频画质会损失吗？',
    a: '采用 H.264 编码，「标准」模式下画质几乎无损，体积可减小 50%-80%。「无损」模式画质完全不变。',
  },
  {
    q: '支持哪些视频格式？',
    a: '支持 MP4、MOV、MKV、AVI、WMV、FLV、WEBM、M4V 等主流视频格式，输出统一为 MP4。',
  },
  {
    q: '在线压缩会上传视频吗？',
    a: '不会。在线压缩使用 FFmpeg.wasm 在浏览器本地运行，视频全程不离开你的电脑。',
  },
  {
    q: '桌面端和在线版有什么区别？',
    a: '桌面端性能更强、支持大文件；在线版无需安装，打开即用。核心压缩能力一致。',
  },
  {
    q: 'Windows 版本什么时候发布？',
    a: 'Windows 版本正在开发中，敬请期待。目前 macOS 版本已可下载使用。',
  },
  {
    q: '打开应用时提示"已损坏"怎么办？',
    a: '这是 macOS Gatekeeper 的安全提示。最简单的方法是使用下载区的「终端一键安装」命令，会自动完成安装并移除隔离属性。也可以手动将 app 拖入应用程序后右键选择"打开"。',
  },
]

export default function Home({ onNavigate }: HomeProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [copiedCmd, setCopiedCmd] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-violet-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-blue-200/40 to-indigo-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight mb-5">
            让视频更轻，
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              让分享更快
            </span>
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            基于 FFmpeg 的开源视频压缩工具，支持 macOS 桌面端和在线浏览器压缩。
            本地处理，隐私安全，画质高清，体积骤减。
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigate('compress')}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full hover:shadow-xl hover:shadow-blue-500/30 transition-all"
            >
              <Play className="w-4.5 h-4.5" />
              立即在线压缩
            </button>
            <a
              href="#download"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-gray-700 font-semibold rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <Download className="w-4.5 h-4.5" />
              下载桌面版
            </a>
          </div>

          <p className="text-xs text-gray-400 mt-4 inline-flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            本地处理 · 无需上传 · 隐私安全
          </p>

          {/* Product Promo Video */}
          <div className="mt-14 max-w-4xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/20 ring-1 ring-gray-200/60 bg-gray-900">
              <video
                src="/qingying-promo.mp4"
                autoPlay
                muted
                loop
                playsInline
                poster=""
                className="w-full h-auto block"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              轻影 LightVid · 一分钟了解产品核心功能
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">为什么选择轻影</h2>
          <p className="text-gray-500">简洁、高效、安全的视频压缩体验</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-md`}
              >
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">三步完成压缩</h2>
            <p className="text-gray-500">简单易用，无需专业知识</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full shadow-sm">
                  <div className="text-5xl font-bold text-gray-100 mb-3 tabular-nums">{s.num}</div>
                  <h3 className="font-semibold text-gray-800 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 w-6 h-6 text-gray-300 z-10 bg-white rounded-full p-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Online CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-10 md:p-14 text-center">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-2xl" />
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-2xl" />
          </div>
          <div className="relative">
            <Cloud className="w-12 h-12 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-3">不想下载？在线即用</h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              打开浏览器即可压缩视频，FFmpeg.wasm 本地运行，无需安装，无需上传
            </p>
            <button
              type="button"
              onClick={() => onNavigate('compress')}
              className="inline-flex items-center gap-2 px-7 py-3 bg-white text-blue-600 font-semibold rounded-full hover:bg-blue-50 transition-colors"
            >
              <Play className="w-4.5 h-4.5" />
              开始在线压缩
            </button>
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">下载桌面版</h2>
            <p className="text-gray-500">更强性能，支持大文件，无网络也能压缩</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* macOS */}
            <a
              href="/downloads/轻影_1.0.0_aarch64.dmg"
              download
              className="group bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">macOS</h3>
                  <p className="text-xs text-gray-400">Apple Silicon / Intel</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">版本 1.0.0 · DMG 安装包 · 27 MB</p>
              <span className="inline-flex items-center gap-2 text-blue-600 font-medium text-sm group-hover:gap-3 transition-all">
                <Download className="w-4 h-4" />
                下载 macOS 版
              </span>
            </a>

            {/* Windows */}
            <div className="bg-white rounded-2xl border border-gray-100 p-7 opacity-70">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Windows</h3>
                  <p className="text-xs text-gray-400">Windows 10 / 11</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">即将发布 · 敬请期待</p>
              <span className="inline-flex items-center gap-2 text-gray-400 font-medium text-sm">
                <Download className="w-4 h-4" />
                Windows 版开发中
              </span>
            </div>
          </div>

          {/* macOS 安装说明 */}
          <div className="max-w-3xl mx-auto mt-10 bg-amber-50 border border-amber-100 rounded-2xl p-6 md:p-7">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">macOS 安装说明（首次打开必读）</h3>
                <p className="text-xs text-gray-500">由于应用未经 Apple 公证，首次打开可能提示"已损坏"。推荐使用方案一自动安装。</p>
              </div>
            </div>

            {/* 方案一：终端一键安装 */}
            <div className="bg-white rounded-xl border border-amber-200 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">推荐</span>
                <h4 className="font-semibold text-gray-800 text-sm">方案一：终端一键安装（最可靠）</h4>
              </div>
              <p className="text-xs text-gray-500 mb-3">打开「终端」（Launchpad → 其他 → 终端），复制粘贴以下命令并回车：</p>
              <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2.5">
                <code className="flex-1 text-green-400 text-xs font-mono overflow-x-auto whitespace-nowrap">
                  {`hdiutil attach ~/Downloads/轻影_1.0.0_aarch64.dmg -nobrowse && cp -R "/Volumes/轻影/轻影.app" /Applications/ && hdiutil detach "/Volumes/轻影" && xattr -cr /Applications/轻影.app && open /Applications/轻影.app`}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('hdiutil attach ~/Downloads/轻影_1.0.0_aarch64.dmg -nobrowse && cp -R "/Volumes/轻影/轻影.app" /Applications/ && hdiutil detach "/Volumes/轻影" && xattr -cr /Applications/轻影.app && open /Applications/轻影.app')
                    setCopiedCmd(true)
                    setTimeout(() => setCopiedCmd(false), 2000)
                  }}
                  className="flex-shrink-0 flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  {copiedCmd ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-xs">{copiedCmd ? '已复制' : '复制'}</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">命令会自动完成：挂载 DMG → 安装到应用程序 → 移除安全隔离 → 启动应用。</p>
            </div>

            {/* 方案二：手动安装 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-800 text-sm mb-3">方案二：手动安装</h4>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center">1</span>
                  <span>双击 <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-amber-700">轻影_1.0.0_aarch64.dmg</code> 打开磁盘映像。</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center">2</span>
                  <span>将「轻影」图标拖入 <strong>Applications（应用程序）</strong> 文件夹。</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center">3</span>
                  <span>打开「应用程序」，<strong>右键点击「轻影」</strong>，选择<strong>「打开」</strong>，在弹窗中再次点击「打开」。</span>
                </li>
              </ol>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">如果右键仍提示"已损坏"，请运行以下命令后重新打开：</p>
                <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2.5">
                  <code className="flex-1 text-green-400 text-xs font-mono overflow-x-auto whitespace-nowrap">
                    xattr -cr /Applications/轻影.app
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('xattr -cr /Applications/轻影.app')
                      setCopiedCmd(true)
                      setTimeout(() => setCopiedCmd(false), 2000)
                    }}
                    className="flex-shrink-0 flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-xs">{copiedCmd ? '已复制' : '复制'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">常见问题</h2>
          <p className="text-gray-500">关于轻影的常见疑问</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-800">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                    openFaq === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 text-gray-800 font-semibold mb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
            轻影 LightVid
          </div>
          <p className="text-sm text-gray-400">
            开源视频压缩工具 · 基于 FFmpeg · 本地处理，隐私安全
          </p>
          <p className="text-xs text-gray-300 mt-2">
            © 2026 轻影 LightVid
          </p>
        </div>
      </footer>
    </div>
  )
}
