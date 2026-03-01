import { useState, type FormEvent } from 'react'
import { resolveZip } from '../lib/zipLookup'
import type { LocationInfo } from '../lib/types'

interface WelcomeScreenProps {
  onLocationAdd: (location: LocationInfo) => void
}

/**
 * First-launch zip code entry screen.
 * Per user decision: "First launch shows a dedicated welcome screen"
 * Invalid zip shows red/orange glow on input field with error text below.
 */
export function WelcomeScreen({ onLocationAdd }: WelcomeScreenProps): React.JSX.Element {
  const [zip, setZip] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const location = resolveZip(zip)
    if (!location) {
      setError('Invalid zip code')
      return
    }
    setError(null)
    onLocationAdd(location)
  }

  const handleZipChange = (value: string) => {
    // Only allow digits, max 5
    const digits = value.replace(/\D/g, '').slice(0, 5)
    setZip(digits)
    if (error && digits.length === 0) {
      setError(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-dark cyber-grid px-8">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
        {/* Welcome heading */}
        <h1 className="font-mono text-2xl font-bold text-neon-cyan neon-text-glow-cyan tracking-wide uppercase">
          Welcome to WeatherDeck
        </h1>

        {/* Subtext */}
        <p className="text-text-secondary text-sm leading-relaxed">
          Enter your zip code to get started
        </p>

        {/* Zip code form */}
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3 w-full">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            placeholder="00000"
            value={zip}
            onChange={(e) => handleZipChange(e.target.value)}
            className={[
              'w-40 px-4 py-3 rounded',
              'bg-bg-card font-mono text-neon-cyan text-center text-2xl',
              'outline-none transition-all',
              error
                ? 'border-2 border-error neon-glow-error'
                : 'border border-border-neon focus:border-neon-cyan focus:neon-glow-cyan'
            ].join(' ')}
          />

          {/* Inline error message */}
          {error && (
            <p className="font-mono text-xs text-error">{error}</p>
          )}

          <button
            type="submit"
            className="px-6 py-2 rounded border border-neon-cyan/50 text-neon-cyan font-mono text-sm hover:bg-neon-cyan/10 transition-colors cursor-pointer"
          >
            Get Weather
          </button>
        </form>

        {/* Decorative neon line */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-40" />
      </div>
    </div>
  )
}
