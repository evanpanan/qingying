import { UploadCloud, FileVideo } from 'lucide-react'
import { SUPPORTED_FORMATS } from '../lib/constants'

interface UploadZoneProps {
  onPickFiles: () => void
}

export default function UploadZone({ onPickFiles }: UploadZoneProps) {
  return (
    <div
      onClick={onPickFiles}
      className="group cursor-pointer rounded-3xl border-2 border-dashed border-gray-200 bg-white hover:border-blue-400 hover:bg-gradient-to-b hover:from-blue-50/50 hover:to-indigo-50/30 p-12 text-center transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5"
    >
      <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 shadow-xl shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300">
        <FileVideo className="w-9 h-9 text-white" />
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center">
          <UploadCloud className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-1.5 tracking-tight">
        选择视频文件
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        点击或拖入视频，支持批量选择多个文件
      </p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onPickFiles()
        }}
        className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-medium text-sm hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
      >
        <UploadCloud className="w-4.5 h-4.5" />
        添加本地视频
      </button>

      <p className="mt-6 text-xs text-gray-400 leading-relaxed">
        支持 {SUPPORTED_FORMATS} 等格式
      </p>
    </div>
  )
}
