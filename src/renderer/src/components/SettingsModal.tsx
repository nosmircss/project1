import { X } from 'lucide-react'
import type { AppSettings } from '../lib/types'

interface UnitToggleProps {
  label: string
  options: [string, string]
  values: [string, string]
  current: string
  onChange: (value: string) => void
}

function UnitToggle({ label, options, values, current, onChange }: UnitToggleProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-text-secondary font-mono text-sm">{label}</span>
      <div className="flex border border-neon-cyan/30 rounded overflow-hidden">
        {options.map((opt, i) => (
          <button
            key={opt}
            onClick={() => onChange(values[i])}
            className={`px-3 py-1 font-mono text-sm transition-colors ${
              current === values[i]
                ? 'bg-neon-cyan/20 text-neon-cyan neon-text-glow-cyan'
                : 'text-text-dim hover:text-text-secondary hover:bg-neon-cyan/5'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SettingsModalProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
  onClose: () => void
}

const REFRESH_OPTIONS = [1, 5, 10, 15, 30]

export function SettingsModal({ settings, onUpdate, onClose }: SettingsModalProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-card border border-neon-cyan/30 rounded-lg p-6 w-80 shadow-[0_0_24px_rgba(0,240,255,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-neon-cyan font-mono text-lg tracking-wide neon-text-glow-cyan">
              Settings
            </h2>
            <button
              onClick={onClose}
              className="text-text-dim hover:text-neon-cyan transition-colors"
              aria-label="Close settings"
            >
              <X size={18} />
            </button>
          </div>

          {/* Unit toggles */}
          <div className="flex flex-col gap-4 mb-6">
            <UnitToggle
              label="Temperature"
              options={['°F', '°C']}
              values={['fahrenheit', 'celsius']}
              current={settings.temperatureUnit}
              onChange={(v) => onUpdate('temperatureUnit', v as AppSettings['temperatureUnit'])}
            />
            <UnitToggle
              label="Wind Speed"
              options={['mph', 'km/h']}
              values={['mph', 'kmh']}
              current={settings.windSpeedUnit}
              onChange={(v) => onUpdate('windSpeedUnit', v as AppSettings['windSpeedUnit'])}
            />
          </div>

          {/* Refresh interval */}
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary font-mono text-sm">
              Auto-refresh interval
            </label>
            <select
              value={settings.refreshInterval}
              onChange={(e) => onUpdate('refreshInterval', Number(e.target.value))}
              className="
                bg-bg-dark border border-neon-cyan/30 rounded px-3 py-1.5
                font-mono text-sm text-text-primary
                focus:outline-none focus:border-neon-cyan/60 focus:shadow-[0_0_8px_rgba(0,240,255,0.2)]
                appearance-none cursor-pointer
              "
            >
              {REFRESH_OPTIONS.map(n => (
                <option key={n} value={n}>{n} min</option>
              ))}
            </select>
          </div>
        </div>
      </div>
  )
}
