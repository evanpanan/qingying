import { Play, Download, Sparkles } from 'lucide-react'

interface NavbarProps {
  page: 'home' | 'compress'
  onNavigate: (page: 'home' | 'compress') => void
}

export default function Navbar({ page, onNavigate }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Play className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-900 leading-tight">轻影</div>
            <div className="text-[10px] text-gray-400 leading-tight tracking-wide">LightVid</div>
          </div>
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              page === 'home'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            首页
          </button>
          <button
            type="button"
            onClick={() => onNavigate('compress')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              page === 'compress'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            在线压缩
          </button>
          <a
            href="#download"
            onClick={(e) => {
              if (page !== 'home') {
                e.preventDefault()
                onNavigate('home')
                setTimeout(() => {
                  document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' })
                }, 50)
              }
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            下载
          </a>
        </nav>
      </div>
    </header>
  )
}
