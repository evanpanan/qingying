import { Film } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-30 glass border-b border-gray-200/60">
      <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <Film className="w-4.5 h-4.5" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-gray-900 text-[15px] tracking-tight">轻影</div>
            <div className="text-[10px] text-gray-400">LightVid · 视频压缩</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-soft" />
          <span className="text-[11px] text-green-700 font-medium">本地处理</span>
        </div>
      </div>
    </header>
  )
}
