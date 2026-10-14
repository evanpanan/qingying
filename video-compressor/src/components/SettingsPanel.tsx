import { Settings2, Gauge, MonitorPlay } from 'lucide-react'
import type { CompressionSettings, QualityPreset, ResolutionPreset } from '../types'
import { QUALITY_OPTIONS, RESOLUTION_OPTIONS } from '../lib/constants'

interface SettingsPanelProps {
  settings: CompressionSettings
  onChange: (settings: CompressionSettings) => void
  disabled: boolean
}

export default function SettingsPanel({
  settings,
  onChange,
  disabled,
}: SettingsPanelProps) {
  const update = (patch: Partial<CompressionSettings>) =>
    onChange({ ...settings, ...patch })

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Settings2 className="w-4.5 h-4.5 text-blue-600" />
        </div>
        <h3 className="font-semibold text-gray-900 text-[15px]">压缩设置</h3>
      </div>

      {/* Quality */}
      <div className="mb-6">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-3">
          <Gauge className="w-4 h-4 text-gray-400" />
          画质预设
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {QUALITY_OPTIONS.map((opt) => {
            const active = settings.quality === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => update({ quality: opt.id as QualityPreset })}
                className={`relative text-left p-3.5 rounded-2xl border transition-all duration-200 ${
                  active
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 ring-2 ring-blue-500/15 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                )}
                <div className="text-xl mb-1.5">{opt.icon}</div>
                <div
                  className={`text-sm font-semibold ${
                    active ? 'text-blue-700' : 'text-gray-800'
                  }`}
                >
                  {opt.label}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                  {opt.description}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Resolution */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-3">
          <MonitorPlay className="w-4 h-4 text-gray-400" />
          输出分辨率
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {RESOLUTION_OPTIONS.map((opt) => {
            const active = settings.resolution === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() =>
                  update({ resolution: opt.id as ResolutionPreset })
                }
                className={`relative p-3.5 rounded-2xl border transition-all duration-200 text-center ${
                  active
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 ring-2 ring-blue-500/15 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                )}
                <div
                  className={`text-sm font-semibold ${
                    active ? 'text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">输出格式</span>
        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
          MP4 · H.264 · AAC
        </span>
      </div>
    </div>
  )
}
